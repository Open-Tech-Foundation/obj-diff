import { ADDED, CHANGED, DELETED } from "./constants";
import { DiffResult } from "./types";

function objDiff(
  a: object,
  b: object,
  path: Array<string | number>,
  _refs: WeakSet<WeakKey>
): DiffResult[] {
  const result: DiffResult[] = [];

  if (
    typeof a === "object" &&
    typeof b === "object" &&
    a !== null &&
    b !== null
  ) {
    // For circular refs
    if (_refs.has(a) && _refs.has(b)) {
      return [];
    }

    _refs.add(a as WeakKey);
    _refs.add(b as WeakKey);

    if (Array.isArray(a) && Array.isArray(b)) {
      for (let i = 0; i < a.length; i++) {
        if (Object.hasOwn(b, i)) {
          result.push(
            ...objDiff(
              a[i],
              (b as Array<unknown>)[i] as object,
              [...path, i],
              _refs
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

      _refs.delete(a);
      _refs.delete(b);

      return result;
    }

    if (
      Object.prototype.toString.call(a) === "[object Object]" &&
      Object.prototype.toString.call(b) === "[object Object]"
    ) {
      for (const k of Object.keys(a)) {
        if (Object.hasOwn(b, k)) {
          result.push(
            ...objDiff(
              (a as Record<string, unknown>)[k] as object,
              (b as Record<string, unknown>)[k] as object,
              [...path, k],
              _refs
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

      _refs.delete(a);
      _refs.delete(b);

      return result;
    }

    if (a instanceof Date && b instanceof Date) {
      if (!Object.is(a.getTime(), (b as Date).getTime())) {
        return [{ t: CHANGED, p: path, v: b }];
      }
    }

    if (a instanceof Map && b instanceof Map) {
      if (a.size !== (b as Map<unknown, unknown>).size) {
        return [{ t: CHANGED, p: path, v: b }];
      }

      for (const k of a.keys()) {
        if (!Object.is(a.get(k), (b as Map<unknown, unknown>).get(k))) {
          return [{ t: CHANGED, p: path, v: b }];
        }
      }
    }

    if (a instanceof Set && b instanceof Set) {
      if (a.size !== (b as Set<unknown>).size) {
        return [{ t: CHANGED, p: path, v: b }];
      }

      for (const v of a) {
        if (!(b as Set<unknown>).has(v)) {
          return [{ t: CHANGED, p: path, v: b }];
        }
      }
    }

    if (
      Object.prototype.toString.call(a) !== Object.prototype.toString.call(b)
    ) {
      return [{ t: CHANGED, p: path, v: b }];
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
  return objDiff(obj1, obj2, [], new WeakSet());
}
