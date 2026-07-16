import { clone, isEql, isTypedArray } from "@opentf/std";
import { ADDED, CHANGED, DELETED } from "./constants";
import type { DiffResult } from "./types";

/**
 * Applies an array of diff results onto the original object to produce the modified object.
 *
 * @param obj - The original object to patch.
 * @param patches - An array of diff results to apply.
 * @returns A new object with the patches applied.
 *
 * @example
 * const a = {a: 1, b: 2};
 * const b = {a: 2, c: 3};
 * const out = patch(a, diff(a, b));
 * assert.deepStrictEqual(out, b); // ok
 */
export default function patch<T>(obj: T, patches: Array<DiffResult>): T {
  if (patches.length === 0) {
    const cloned = clone(obj);
    restoreNullProtos(obj, cloned, new WeakSet());
    return cloned;
  }

  let c = clone(obj);
  restoreNullProtos(obj, c, new WeakSet());
  // Arrays that received deletions; their trailing holes are truncated at the end.
  const holedArrays = new Set<unknown[]>();

  for (const p of patches) {
    // Root-level replacement
    if (p.path.length === 0) {
      if (p.type === ADDED || p.type === CHANGED) {
        c = p.value as T;
      } else if (p.type === DELETED) {
        c = undefined as unknown as T;
      }
      continue;
    }

    // Walk to the parent of the target property
    let current: Record<string, unknown> | Map<unknown, unknown> | Set<unknown> = c as Record<
      string,
      unknown
    >;

    for (let i = 0; i < p.path.length - 1; i++) {
      const key = p.path[i];
      if (current instanceof Map) {
        current = current.get(resolveMapKey(current, key)) as Record<string, unknown>;
      } else if (current instanceof Set) {
        current = [...current][key as number] as Record<string, unknown>;
      } else {
        current = (current as Record<string, unknown>)[key as string] as Record<string, unknown>;
      }
    }

    const lastKey = p.path[p.path.length - 1];

    // Apply the patch
    if (p.type === ADDED || p.type === CHANGED) {
      applyValue(current, lastKey, p.value);
    } else if (p.type === DELETED) {
      applyDelete(current, lastKey, holedArrays);
    }
  }

  // A deletion at index i means the element was removed when i is beyond the
  // new length (truncate), and an intentional hole when it is interior — so
  // only trailing holes are dropped, preserving sparse targets.
  for (const arr of holedArrays) {
    let len = arr.length;
    while (len > 0 && !Object.hasOwn(arr, len - 1)) len--;
    arr.length = len;
  }

  return c;
}

function applyValue(
  target: Record<string, unknown> | Map<unknown, unknown> | Set<unknown>,
  key: unknown,
  value: unknown,
) {
  if (target instanceof Map) {
    target.set(resolveMapKey(target, key), value);
  } else if (target instanceof Set) {
    const arr = [...target];
    arr[key as number] = value;
    target.clear();
    for (const v of arr) target.add(v);
  } else {
    (target as Record<string | number, unknown>)[key as string] = value;
  }
}

function applyDelete(
  target: Record<string, unknown> | Map<unknown, unknown> | Set<unknown>,
  key: unknown,
  holedArrays: Set<unknown[]>,
) {
  if (target instanceof Map) {
    target.delete(resolveMapKey(target, key));
  } else if (target instanceof Set) {
    const arr = [...target];
    arr.splice(key as number, 1);
    target.clear();
    for (const v of arr) target.add(v);
  } else if (Array.isArray(target)) {
    delete target[key as number];
    holedArrays.add(target);
  } else {
    delete (target as Record<string | number, unknown>)[key as string];
  }
}

/**
 * clone() does not preserve null prototypes, so restore them by walking the
 * original and the clone in parallel.
 */
function restoreNullProtos(src: unknown, dest: unknown, visited: WeakSet<object>): void {
  if (
    !src ||
    !dest ||
    typeof src !== "object" ||
    typeof dest !== "object" ||
    src instanceof Date ||
    isTypedArray(src) ||
    visited.has(src)
  ) {
    return;
  }
  visited.add(src);

  if (Object.getPrototypeOf(src) === null && Object.getPrototypeOf(dest) !== null) {
    Object.setPrototypeOf(dest, null);
  }

  if (Array.isArray(src) && Array.isArray(dest)) {
    for (let i = 0; i < src.length; i++) {
      restoreNullProtos(src[i], dest[i], visited);
    }
  } else if (src instanceof Map && dest instanceof Map) {
    // Iterate values positionally; clone preserves insertion order but not
    // the reference identity of object keys.
    const destValues = [...dest.values()];
    let i = 0;
    for (const v of src.values()) {
      restoreNullProtos(v, destValues[i++], visited);
    }
  } else if (src instanceof Set && dest instanceof Set) {
    const destValues = [...dest];
    let i = 0;
    for (const v of src) {
      restoreNullProtos(v, destValues[i++], visited);
    }
  } else {
    for (const k of Object.keys(src)) {
      restoreNullProtos(
        (src as Record<string, unknown>)[k],
        (dest as Record<string, unknown>)[k],
        visited,
      );
    }
  }
}

/**
 * Map keys that are objects lose reference identity when the map is cloned,
 * so fall back to locating the structurally equal key in the map.
 */
function resolveMapKey(map: Map<unknown, unknown>, key: unknown): unknown {
  if (typeof key !== "object" || key === null || map.has(key)) return key;
  for (const k of map.keys()) {
    if (typeof k === "object" && k !== null && isEql(k, key)) return k;
  }
  return key;
}
