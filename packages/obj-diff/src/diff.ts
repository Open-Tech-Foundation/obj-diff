import { isEql, isPlainObject, isTypedArray } from "@opentf/std";
import { ADDED, CHANGED, DELETED, INSERTED, REMOVED } from "./constants";
import { maxEditDistance, myersScript } from "./lcs";
import type { DiffResult } from "./types";

type Path = Array<unknown>;
type CompareFn = (a: object, b: object) => boolean | undefined;

function cleanupRefs(a: WeakKey, b: WeakKey, refsA: WeakSet<WeakKey>, refsB: WeakSet<WeakKey>) {
  refsA.delete(a);
  refsB.delete(b);
}

/** The toStringTag (e.g. "[object Temporal.PlainDate]") if x is a Temporal value, else null. */
function temporalTag(x: unknown): string | null {
  const tag = Object.prototype.toString.call(x);
  return tag.startsWith("[object Temporal.") ? tag : null;
}

/**
 * Temporal equality. Uses the type's own `.equals()` where it exists (every
 * type except Duration); Duration has no `.equals()` — deliberately, since
 * duration value equality is ambiguous — so it is compared structurally by its
 * canonical string. The `try/catch` falls back to strings for cross-realm
 * instances (e.g. a polyfill value compared against a native one).
 */
function isSameTemporal(a: unknown, b: unknown): boolean {
  if (temporalTag(a) !== temporalTag(b)) return false;
  const ta = a as { equals?: (o: unknown) => boolean; toString(): string };
  const tb = b as { toString(): string };
  try {
    return typeof ta.equals === "function" ? ta.equals(b) : ta.toString() === tb.toString();
  } catch {
    return ta.toString() === tb.toString();
  }
}

function objDiff(
  a: unknown,
  b: unknown,
  path: Path,
  refsA: WeakSet<WeakKey>,
  refsB: WeakSet<WeakKey>,
  fn?: CompareFn,
): DiffResult[] {
  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) {
    return Object.is(a, b) ? [] : [{ type: CHANGED, path, value: b }];
  }

  // Circular reference guard
  if (refsA.has(a) || refsB.has(b)) {
    if (refsA.has(a) && refsB.has(b)) return [];
    return [{ type: CHANGED, path, value: b }];
  }

  refsA.add(a);
  refsB.add(b);

  // Custom comparator takes priority
  const customMatch = fn?.(a as object, b as object);
  if (customMatch === true) {
    cleanupRefs(a, b, refsA, refsB);
    return [{ type: CHANGED, path, value: b }];
  }
  if (customMatch === false) {
    cleanupRefs(a, b, refsA, refsB);
    return [];
  }

  // Identical references are always deeply equal
  if (a === b) {
    cleanupRefs(a, b, refsA, refsB);
    return [];
  }

  let result: DiffResult[];

  if (Array.isArray(a) && Array.isArray(b)) {
    result = diffArrays(a, b, path, refsA, refsB, fn);
  } else if (isTypedArray(a) && isTypedArray(b)) {
    result = diffTypedArrays(a, b, path);
  } else if (isPlainObject(a) && isPlainObject(b)) {
    result = diffObjects(
      a as Record<string, unknown>,
      b as Record<string, unknown>,
      path,
      refsA,
      refsB,
      fn,
    );
  } else if (a instanceof Date && b instanceof Date) {
    // Object.is treats two invalid dates (NaN timestamps) as equal
    result = Object.is(a.getTime(), b.getTime()) ? [] : [{ type: CHANGED, path, value: b }];
  } else if (a instanceof Map && b instanceof Map) {
    result = diffMaps(a, b, path, refsA, refsB, fn);
  } else if (a instanceof Set && b instanceof Set) {
    result = diffSets(a, b, path, refsA, refsB, fn);
  } else if (a instanceof ArrayBuffer && b instanceof ArrayBuffer) {
    result = isSameBytes(new Uint8Array(a), new Uint8Array(b))
      ? []
      : [{ type: CHANGED, path, value: b }];
  } else if (a instanceof DataView && b instanceof DataView) {
    result = isSameBytes(
      new Uint8Array(a.buffer, a.byteOffset, a.byteLength),
      new Uint8Array(b.buffer, b.byteOffset, b.byteLength),
    )
      ? []
      : [{ type: CHANGED, path, value: b }];
  } else if (a instanceof Error && b instanceof Error) {
    // Errors are replaced wholesale when they differ, since cloning does not
    // preserve custom properties well enough for granular patching.
    const isSame =
      Object.getPrototypeOf(a) === Object.getPrototypeOf(b) &&
      a.name === b.name &&
      a.message === b.message &&
      objDiff({ ...a }, { ...b }, path, refsA, refsB, fn).length === 0;
    result = isSame ? [] : [{ type: CHANGED, path, value: b }];
  } else if (
    (a instanceof Number && b instanceof Number) ||
    (a instanceof String && b instanceof String) ||
    (a instanceof Boolean && b instanceof Boolean)
  ) {
    result = Object.is(a.valueOf(), b.valueOf())
      ? diffObjects(
          a as unknown as Record<string, unknown>,
          b as unknown as Record<string, unknown>,
          path,
          refsA,
          refsB,
          fn,
        )
      : [{ type: CHANGED, path, value: b }];
  } else if (temporalTag(a) || temporalTag(b)) {
    // Temporal.* values (PlainDate, Instant, Duration, …) are immutable, atomic
    // leaves like Date: replaced wholesale when they differ. Detected by brand
    // (toStringTag) so it works with the native global or a polyfill.
    result = isSameTemporal(a, b) ? [] : [{ type: CHANGED, path, value: b }];
  } else if (Object.prototype.toString.call(a) !== Object.prototype.toString.call(b)) {
    result = [{ type: CHANGED, path, value: b }];
  } else if (Object.prototype.toString.call(a) === "[object Object]") {
    // Class instances: diff own enumerable properties when the prototypes
    // match, otherwise report the object as replaced.
    result =
      Object.getPrototypeOf(a) === Object.getPrototypeOf(b)
        ? diffObjects(
            a as Record<string, unknown>,
            b as Record<string, unknown>,
            path,
            refsA,
            refsB,
            fn,
          )
        : [{ type: CHANGED, path, value: b }];
  } else {
    result = String(a) === String(b) ? [] : [{ type: CHANGED, path, value: b }];
  }

  cleanupRefs(a, b, refsA, refsB);
  return result;
}

function diffArrays(
  a: unknown[],
  b: unknown[],
  path: Path,
  refsA: WeakSet<WeakKey>,
  refsB: WeakSet<WeakKey>,
  fn?: CompareFn,
): DiffResult[] {
  // Sparse arrays and arrays carrying non-index properties keep the legacy
  // key-based diff; compact splice ops assume packed, index-only arrays.
  if (!isPackedPlainArray(a) || !isPackedPlainArray(b)) {
    return diffArraysByKeys(a, b, path, refsA, refsB, fn);
  }
  return diffArraysCompact(a, b, path, refsA, refsB, fn);
}

/**
 * Compact array diffing: skip the longest common prefix and suffix, then
 * resolve the remaining middle window. Pure insertion/removal runs become
 * splice-style INSERTED/REMOVED ops (with application-time indices) instead
 * of one op per shifted element.
 */
function diffArraysCompact(
  a: unknown[],
  b: unknown[],
  path: Path,
  refsA: WeakSet<WeakKey>,
  refsB: WeakSet<WeakKey>,
  fn?: CompareFn,
): DiffResult[] {
  const result: DiffResult[] = [];
  const minLen = Math.min(a.length, b.length);

  let start = 0;
  while (start < minLen && isElemEqual(a[start], b[start])) start++;

  let endA = a.length - 1;
  let endB = b.length - 1;
  while (endA >= start && endB >= start && isElemEqual(a[endA], b[endB])) {
    endA--;
    endB--;
  }

  // Arrays are equal
  if (start > endA && start > endB) return result;

  // Pure insertion run: b[start..endB] slots in between prefix and suffix
  if (start > endA) {
    for (let i = start; i <= endB; i++) {
      result.push({ type: INSERTED, path: [...path, i], value: b[i] });
    }
    return result;
  }

  // Pure removal run: a[start..endA] is spliced out. Each removal shifts the
  // next candidate into the same position, so the index stays `start`.
  if (start > endB) {
    for (let i = start; i <= endA; i++) {
      result.push({ type: REMOVED, path: [...path, start] });
    }
    return result;
  }

  // Mixed middle window: find the shortest edit script (bounded Myers LCS);
  // fall back to positional alignment when the arrays are too different.
  const aWinLen = endA - start + 1;
  const bWinLen = endB - start + 1;

  const script = myersScript(
    aWinLen,
    bWinLen,
    (ai, bi) => isElemEqual(a[start + ai], b[start + bi]),
    maxEditDistance(aWinLen, bWinLen),
  );

  if (script === null) {
    diffWindowPositional(a, b, start, aWinLen, bWinLen, path, result, refsA, refsB, fn);
    return result;
  }

  // Convert the edit script into ops with application-time indexes. Adjacent
  // delete+insert runs are zipped into recursive replacements so a changed
  // element yields granular CHANGED ops instead of a remove + insert pair.
  let outIdx = start;
  let s = 0;
  while (s < script.length) {
    const op = script[s];
    if (op.t === "eq") {
      outIdx += op.n;
      s++;
      continue;
    }
    const dels: number[] = [];
    const inss: number[] = [];
    while (s < script.length && script[s].t !== "eq") {
      const edit = script[s];
      if (edit.t === "del") dels.push(edit.ai);
      else if (edit.t === "ins") inss.push(edit.bi);
      s++;
    }
    const pairs = Math.min(dels.length, inss.length);
    for (let p = 0; p < pairs; p++) {
      const sub = objDiff(
        a[start + dels[p]],
        b[start + inss[p]],
        [...path, outIdx],
        refsA,
        refsB,
        fn,
      );
      for (const d of sub) result.push(d);
      outIdx++;
    }
    for (let p = pairs; p < dels.length; p++) {
      result.push({ type: REMOVED, path: [...path, outIdx] });
    }
    for (let p = pairs; p < inss.length; p++) {
      result.push({ type: INSERTED, path: [...path, outIdx], value: b[start + inss[p]] });
      outIdx++;
    }
  }

  return result;
}

/** Positional window alignment used when the LCS cost cap is exceeded. */
function diffWindowPositional(
  a: unknown[],
  b: unknown[],
  start: number,
  aWinLen: number,
  bWinLen: number,
  path: Path,
  result: DiffResult[],
  refsA: WeakSet<WeakKey>,
  refsB: WeakSet<WeakKey>,
  fn?: CompareFn,
): void {
  const winMin = Math.min(aWinLen, bWinLen);

  for (let i = 0; i < winMin; i++) {
    const sub = objDiff(a[start + i], b[start + i], [...path, start + i], refsA, refsB, fn);
    for (const d of sub) result.push(d);
  }
  for (let i = winMin; i < bWinLen; i++) {
    result.push({ type: INSERTED, path: [...path, start + i], value: b[start + i] });
  }
  for (let i = winMin; i < aWinLen; i++) {
    result.push({ type: REMOVED, path: [...path, start + winMin] });
  }
}

/** Cheap-first element equality used for prefix/suffix trimming. */
function isElemEqual(x: unknown, y: unknown): boolean {
  if (Object.is(x, y)) return true;
  if (x === null || y === null || typeof x !== "object" || typeof y !== "object") return false;
  return isEql(x, y);
}

/** A packed array has no holes and no own non-index properties. */
function isPackedPlainArray(arr: unknown[]): boolean {
  const keys = Object.keys(arr);
  if (keys.length !== arr.length) return false;
  return keys.length === 0 || keys[keys.length - 1] === String(arr.length - 1);
}

/** Legacy key-based array diff for sparse arrays and non-index properties. */
function diffArraysByKeys(
  a: unknown[],
  b: unknown[],
  path: Path,
  refsA: WeakSet<WeakKey>,
  refsB: WeakSet<WeakKey>,
  fn?: CompareFn,
): DiffResult[] {
  const result: DiffResult[] = [];
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);

  for (const k of keys) {
    const i = Number.isNaN(Number(k)) ? k : Number(k);
    const aHas = Object.hasOwn(a, k);
    const bHas = Object.hasOwn(b, k);

    if (aHas && bHas) {
      const sub = objDiff(
        (a as unknown as Record<string, unknown>)[k],
        (b as unknown as Record<string, unknown>)[k],
        [...path, i],
        refsA,
        refsB,
        fn,
      );
      for (const d of sub) result.push(d);
    } else if (aHas) {
      result.push({ type: DELETED, path: [...path, i] });
    } else {
      result.push({
        type: ADDED,
        path: [...path, i],
        value: (b as unknown as Record<string, unknown>)[k],
      });
    }
  }

  return result;
}

type TypedArray =
  | Int8Array
  | Uint8Array
  | Uint8ClampedArray
  | Int16Array
  | Uint16Array
  | Int32Array
  | Uint32Array
  | Float32Array
  | Float64Array
  | BigInt64Array
  | BigUint64Array;

function diffTypedArrays(a: TypedArray, b: TypedArray, path: Path): DiffResult[] {
  if (
    a.length !== b.length ||
    Object.prototype.toString.call(a) !== Object.prototype.toString.call(b)
  ) {
    return [{ type: CHANGED, path, value: b }];
  }

  const result: DiffResult[] = [];
  for (let i = 0; i < a.length; i++) {
    if (!Object.is(a[i], b[i])) {
      result.push({ type: CHANGED, path: [...path, i], value: b[i] });
    }
  }

  return result;
}

function isSameBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

function diffObjects(
  a: Record<string, unknown>,
  b: Record<string, unknown>,
  path: Path,
  refsA: WeakSet<WeakKey>,
  refsB: WeakSet<WeakKey>,
  fn?: CompareFn,
): DiffResult[] {
  const result: DiffResult[] = [];

  for (const k of Object.keys(a)) {
    if (Object.hasOwn(b, k)) {
      const sub = objDiff(a[k], b[k], [...path, k], refsA, refsB, fn);
      for (const d of sub) result.push(d);
    } else {
      result.push({ type: DELETED, path: [...path, k] });
    }
  }

  for (const k of Object.keys(b)) {
    if (!Object.hasOwn(a, k)) {
      result.push({ type: ADDED, path: [...path, k], value: b[k] });
    }
  }

  return result;
}

function diffMaps(
  a: Map<unknown, unknown>,
  b: Map<unknown, unknown>,
  path: Path,
  refsA: WeakSet<WeakKey>,
  refsB: WeakSet<WeakKey>,
  fn?: CompareFn,
): DiffResult[] {
  const result: DiffResult[] = [];

  for (const k of a.keys()) {
    if (b.has(k)) {
      const sub = objDiff(a.get(k), b.get(k), [...path, k], refsA, refsB, fn);
      for (const d of sub) result.push(d);
    } else {
      result.push({ type: DELETED, path: [...path, k] });
    }
  }

  for (const k of b.keys()) {
    if (!a.has(k)) {
      result.push({ type: ADDED, path: [...path, k], value: b.get(k) });
    }
  }

  return result;
}

function diffSets(
  a: Set<unknown>,
  b: Set<unknown>,
  path: Path,
  refsA: WeakSet<WeakKey>,
  refsB: WeakSet<WeakKey>,
  fn?: CompareFn,
): DiffResult[] {
  const result: DiffResult[] = [];
  const aArr = [...a];
  const bArr = [...b];
  const minLen = Math.min(aArr.length, bArr.length);

  for (let i = 0; i < minLen; i++) {
    const sub = objDiff(aArr[i], bArr[i], [...path, i], refsA, refsB, fn);
    for (const d of sub) result.push(d);
  }

  // Emit deletions in descending index order so that sequential splice-based
  // removal during patching does not shift the indices of pending deletions.
  for (let i = aArr.length - 1; i >= bArr.length; i--) {
    result.push({ type: DELETED, path: [...path, i], value: aArr[i] });
  }

  for (let i = aArr.length; i < bArr.length; i++) {
    result.push({ type: ADDED, path: [...path, i], value: bArr[i] });
  }

  return result;
}

/**
 * Performs a deep difference between two objects.
 *
 * @param obj1 - The original object.
 * @param obj2 - The modified object.
 * @param fn - Optional custom comparator for specialized types.
 * @returns An array of differences between the two objects.
 *
 * @example
 * diff({a: 1}, {a: 5}) //=> [{type: 2, path: ['a'], value: 5}]
 */
export default function diff(obj1: unknown, obj2: unknown, fn?: CompareFn): Array<DiffResult> {
  return objDiff(obj1, obj2, [], new WeakSet(), new WeakSet(), fn);
}
