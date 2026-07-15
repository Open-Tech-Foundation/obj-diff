import { clone, isTypedArray } from "@opentf/std";
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
  if (patches.length === 0) return clone(obj);

  let c = clone(obj);

  // Preserve null prototype if the original had one
  if (obj && typeof obj === "object" && Object.getPrototypeOf(obj) === null) {
    Object.setPrototypeOf(c, null);
  }

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
        current = current.get(key) as Record<string, unknown>;
      } else if (current instanceof Set) {
        current = [...current][key as number] as Record<string, unknown>;
      } else {
        current = (current as Record<string, unknown>)[key] as Record<string, unknown>;
      }
    }

    const lastKey = p.path[p.path.length - 1];

    // Apply the patch
    if (p.type === ADDED || p.type === CHANGED) {
      applyValue(current, lastKey, p.value);
    } else if (p.type === DELETED) {
      applyDelete(current, lastKey);
    }
  }

  packSparseArrays(c);
  return c;
}

function applyValue(
  target: Record<string, unknown> | Map<unknown, unknown> | Set<unknown>,
  key: string | number,
  value: unknown,
) {
  if (target instanceof Map) {
    target.set(key, value);
  } else if (target instanceof Set) {
    const arr = [...target];
    arr[key as number] = value;
    target.clear();
    for (const v of arr) target.add(v);
  } else {
    (target as Record<string | number, unknown>)[key] = value;
  }
}

function applyDelete(
  target: Record<string, unknown> | Map<unknown, unknown> | Set<unknown>,
  key: string | number,
) {
  if (target instanceof Map) {
    target.delete(key);
  } else if (target instanceof Set) {
    const arr = [...target];
    arr.splice(key as number, 1);
    target.clear();
    for (const v of arr) target.add(v);
  } else {
    delete (target as Record<string | number, unknown>)[key];
  }
}

/** Removes sparse holes from arrays recursively. */
function packSparseArrays(val: unknown, visited = new WeakSet()): void {
  if (!val || typeof val !== "object" || visited.has(val)) return;
  visited.add(val);

  if (Array.isArray(val)) {
    const packed = val.filter(() => true);
    if (packed.length !== val.length) {
      val.length = 0;
      for (const v of packed) val.push(v);
    }
    for (const item of val) packSparseArrays(item, visited);
  } else if (val instanceof Map || val instanceof Set) {
    for (const v of val.values()) packSparseArrays(v, visited);
  } else if (!(val instanceof Date) && !isTypedArray(val)) {
    for (const v of Object.values(val as Record<string, unknown>)) packSparseArrays(v, visited);
  }
}
