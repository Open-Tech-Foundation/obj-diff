import { ADDED, CHANGED, DELETED } from "./constants";

type DiffResult = {
  t: 0 | 1 | 2;
  p: Array<string | number>;
  v?: unknown;
};

function objDiff(
  a: object,
  b: object,
  path: Array<string | number>,
  objRefSet1: WeakSet<WeakKey>,
  objRefSet2: WeakSet<WeakKey>
): DiffResult[] {
  // For circular refs
  if (objRefSet1.has(a as WeakKey) && objRefSet2.has(b as WeakKey)) {
    return [];
  }

  if (typeof a !== typeof b) {
    return [{ t: CHANGED, p: path, v: b }];
  }

  const result: DiffResult[] = [];

  if (typeof a === "object" && a !== null) {
    objRefSet1.add(a as WeakKey);
    objRefSet2.add(b as WeakKey);

    if (Array.isArray(a)) {
      for (let i = 0; i < a.length; i++) {
        if (i in b) {
          result.push(
            ...objDiff(a[i], b[i], [...path, i], objRefSet1, objRefSet2)
          );
        } else {
          result.push({ t: DELETED, p: [...path, i] });
        }
      }

      for (let i = 0; i < (b as []).length; i++) {
        if (!(i in a)) {
          result.push({ t: ADDED, p: [...path, i], v: b[i] });
        }
      }

      return result;
    }

    if (Object.prototype.toString.call(a) === '[object Object]') {
      for (const k of Object.keys(a)) {
        if (k in b) {
          result.push(
            ...objDiff(a[k], b[k], [...path, k], objRefSet1, objRefSet2)
          );
        } else {
          result.push({ t: DELETED, p: [...path, k] });
        }
      }

      for (const k of Object.keys(b)) {
        if (!(k in a)) {
          result.push({ t: ADDED, p: [...path, k], v: b[k] });
        }
      }

      return result;
    }

    if (a instanceof Date) {
      if (a.getTime() !== b.getTime()) {
        return [{ t: CHANGED, p: path, v: b }];
      }
    }

    if (a instanceof Map) {
      for (const k of a.keys()) {
        if (a.get(k) !== b.get(k)) {
          return [{ t: CHANGED, p: path, v: b }];
        }
      }
    }

    if (a instanceof Set) {
      for (const v of a) {
        if (!b.has(v)) {
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
