import { ADDED, CHANGED, DELETED } from "./constants";
import { DiffResult } from "./types";

function objDiff(
  a: object,
  b: object,
  path: Array<string | number>,
  objRefSet1: WeakSet<WeakKey>,
  objRefSet2: WeakSet<WeakKey>
): DiffResult[] {
  if (typeof a !== typeof b) {
    return [{ t: CHANGED, p: path, v: b }];
  }

  const result: DiffResult[] = [];

  if (typeof a === "object" && a !== null && b !== null) {
    // For circular refs
    if (objRefSet1.has(a) && objRefSet2.has(b)) {
      return [];
    }

    objRefSet1.add(a as WeakKey);
    objRefSet2.add(b as WeakKey);

    if (Array.isArray(a)) {
      for (let i = 0; i < a.length; i++) {
        if (Object.hasOwn(b, i)) {
          result.push(
            ...objDiff(
              a[i],
              (b as Array<unknown>)[i] as object,
              [...path, i],
              objRefSet1,
              objRefSet2
            )
          );
        } else {
          result.push({ t: DELETED, p: [...path, i] });
        }
      }

      for (let i = 0; i < (b as []).length; i++) {
        if (!Object.hasOwn(a, i)) {
          result.push({
            t: ADDED,
            p: [...path, i],
            v: (b as Array<unknown>)[i],
          });
        }
      }

      return result;
    }

    if (Object.prototype.toString.call(a) === "[object Object]") {
      for (const k of Object.keys(a)) {
        if (Object.hasOwn(b, k)) {
          result.push(
            ...objDiff(
              (a as Record<string, unknown>)[k] as object,
              (b as Record<string, unknown>)[k] as object,
              [...path, k],
              objRefSet1,
              objRefSet2
            )
          );
        } else {
          result.push({ t: DELETED, p: [...path, k] });
        }
      }

      for (const k of Object.keys(b)) {
        if (!Object.hasOwn(a, k)) {
          result.push({
            t: ADDED,
            p: [...path, k],
            v: (b as Record<string, unknown>)[k],
          });
        }
      }

      return result;
    }

    if (a instanceof Date) {
      if (!Object.is(a.getTime(), (b as Date).getTime())) {
        return [{ t: CHANGED, p: path, v: b }];
      }
    }

    if (a instanceof Map) {
      if (a.size !== (b as Map<unknown, unknown>).size) {
        return [{ t: CHANGED, p: path, v: b }];
      }

      for (const k of a.keys()) {
        if (!Object.is(a.get(k), (b as Map<unknown, unknown>).get(k))) {
          return [{ t: CHANGED, p: path, v: b }];
        }
      }
    }

    if (a instanceof Set) {
      if (a.size !== (b as Set<unknown>).size) {
        return [{ t: CHANGED, p: path, v: b }];
      }

      for (const v of a) {
        if (!(b as Set<unknown>).has(v)) {
          return [{ t: CHANGED, p: path, v: b }];
        }
      }
    }
  } else {
    if (!Object.is(a, b)) {
      return [{ t: CHANGED, p: path, v: b }];
    }
  }

  return result;
}

/**
 * Performs a deep difference between two objects.
 *
 * @example
 * diff({a: 1}, {a: 5}) //=> [{t: 2, p: ['a'], v: 5}]
 */
export default function diff(obj1: object, obj2: object): Array<DiffResult> {
  const objRefSet1 = new WeakSet();
  const objRefSet2 = new WeakSet();

  return objDiff(obj1, obj2, [], objRefSet1, objRefSet2);
}
