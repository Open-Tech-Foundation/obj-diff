import { isPlainObject, isTypedArray } from "@opentf/std";
import { ADDED, CHANGED, DELETED } from "./constants";
import type { DiffResult } from "./types";

type Path = Array<unknown>;
type CompareFn = (a: object, b: object) => boolean | undefined;

function cleanupRefs(a: WeakKey, b: WeakKey, refsA: WeakSet<WeakKey>, refsB: WeakSet<WeakKey>) {
  refsA.delete(a);
  refsB.delete(b);
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
    result = a.getTime() === b.getTime() ? [] : [{ type: CHANGED, path, value: b }];
  } else if (a instanceof Map && b instanceof Map) {
    result = diffMaps(a, b, path, refsA, refsB, fn);
  } else if (a instanceof Set && b instanceof Set) {
    result = diffSets(a, b, path, refsA, refsB, fn);
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
