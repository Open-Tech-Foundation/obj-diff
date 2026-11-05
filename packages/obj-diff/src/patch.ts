import { clone, isEql, isTypedArray } from "@opentf/std";
import { ADDED, CHANGED, DELETED, INSERTED, REMOVED } from "./constants";
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
  // Maps original object keys to their cloned counterparts so that Map
  // entries can be resolved to the exact cloned key during patching,
  // instead of picking the first structurally-equal key (which is wrong
  // when a map holds several structurally-equal keys).
  const keyIdentity = new WeakMap<object, unknown>();

  if (patches.length === 0) {
    const cloned = clone(obj);
    restoreNullProtos(obj, cloned, new WeakSet(), keyIdentity);
    return cloned;
  }

  let c = clone(obj);
  restoreNullProtos(obj, c, new WeakSet(), keyIdentity);
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

    assertPatchTarget(current, p.path, 0);

    for (let i = 0; i < p.path.length - 1; i++) {
      const key = p.path[i];
      if (current instanceof Map) {
        current = current.get(resolveMapKey(current, key, keyIdentity)) as Record<string, unknown>;
      } else if (current instanceof Set) {
        current = [...current][key as number] as Record<string, unknown>;
      } else {
        current = (current as Record<string, unknown>)[key as string] as Record<string, unknown>;
      }
      assertPatchTarget(current, p.path, i + 1);
    }

    const lastKey = p.path[p.path.length - 1];

    // Apply the patch
    if (p.type === ADDED || p.type === CHANGED) {
      applyValue(current, lastKey, p.value, p.type, keyIdentity);
    } else if (p.type === DELETED) {
      applyDelete(current, lastKey, keyIdentity, holedArrays);
    } else if (p.type === INSERTED) {
      assertArrayTarget(current, p);
      current.splice(lastKey as number, 0, p.value);
    } else if (p.type === REMOVED) {
      assertArrayTarget(current, p);
      current.splice(lastKey as number, 1);
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
  type: DiffResult["type"],
  keyIdentity: WeakMap<object, unknown>,
) {
  if (target instanceof Map) {
    if (type === ADDED) {
      // A newly added entry must not structurally match an existing key —
      // a map may legitimately hold several structurally-equal keys, and
      // resolving against them would overwrite one instead of adding.
      target.set(key, value);
    } else {
      target.set(resolveMapKey(target, key, keyIdentity), value);
    }
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
  keyIdentity: WeakMap<object, unknown>,
  holedArrays: Set<unknown[]>,
) {
  if (target instanceof Map) {
    target.delete(resolveMapKey(target, key, keyIdentity));
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

/** INSERTED/REMOVED are array-only splice operations. */
function assertArrayTarget(target: unknown, p: DiffResult): asserts target is unknown[] {
  if (!Array.isArray(target)) {
    throw new TypeError(
      `patch: op type ${p.type} at path "${p.path.map(String).join(".")}" targets a non-array; INSERTED/REMOVED apply to arrays only.`,
    );
  }
}

/** Ensures the value a patch path resolved to can receive the next segment. */
function assertPatchTarget(target: unknown, path: Array<unknown>, depth: number): void {
  if (target !== null && typeof target === "object") return;
  const fullPath = path.map(String).join(".");
  const at = depth === 0 ? "the patched object" : `"${path.slice(0, depth).map(String).join(".")}"`;
  throw new TypeError(
    `patch: invalid path "${fullPath}" — ${at} is not an object, cannot resolve it.`,
  );
}

/**
 * clone() does not preserve null prototypes, so restore them by walking the
 * original and the clone in parallel. In the same pass, the original key
 * object of every Map entry is paired with its cloned counterpart so that
 * patch ops referencing the original key can resolve to the exact clone.
 */
function restoreNullProtos(
  src: unknown,
  dest: unknown,
  visited: WeakSet<object>,
  keyIdentity: WeakMap<object, unknown>,
): void {
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
      restoreNullProtos(src[i], dest[i], visited, keyIdentity);
    }
  } else if (src instanceof Map && dest instanceof Map) {
    // Iterate entries positionally; clone preserves insertion order but not
    // the reference identity of object keys. Pair each original key with its
    // cloned counterpart for exact resolution during patching.
    const destEntries = [...dest.entries()];
    let i = 0;
    for (const [k, v] of src) {
      const [dk, dv] = destEntries[i++] ?? [undefined, undefined];
      if (typeof k === "object" && k !== null && dk !== undefined) {
        keyIdentity.set(k as object, dk);
      }
      restoreNullProtos(v, dv, visited, keyIdentity);
    }
  } else if (src instanceof Set && dest instanceof Set) {
    const destValues = [...dest];
    let i = 0;
    for (const v of src) {
      restoreNullProtos(v, destValues[i++], visited, keyIdentity);
    }
  } else {
    for (const k of Object.keys(src)) {
      restoreNullProtos(
        (src as Record<string, unknown>)[k],
        (dest as Record<string, unknown>)[k],
        visited,
        keyIdentity,
      );
    }
  }
}

/**
 * Resolve a patch path key to the map key it refers to.
 *
 * Maps original object keys to their cloned counterparts via `keyIdentity`
 * (exact resolution, even when the map holds several structurally-equal keys).
 * The structural fallback exists for untracked maps and remains first-match,
 * matching the historical behavior.
 */
function resolveMapKey(
  map: Map<unknown, unknown>,
  key: unknown,
  keyIdentity: WeakMap<object, unknown>,
): unknown {
  if (typeof key !== "object" || key === null || map.has(key)) return key;
  const identified = keyIdentity.get(key);
  if (identified !== undefined && map.has(identified)) return identified;
  for (const k of map.keys()) {
    if (typeof k === "object" && k !== null && isEql(k, key)) return k;
  }
  return key;
}
