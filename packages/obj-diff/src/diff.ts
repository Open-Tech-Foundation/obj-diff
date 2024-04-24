import { isDate, isEql, isObj, isPureObj } from "@opentf/std";
import { ADDED, CHANGED, DELETED } from "./constants";

type DiffResult = {
  t: 0 | 1 | 2;
  p: Array<string | number>;
  v?: unknown;
};

/**
 * Performs a deep difference between two objects.
 *
 * @example
 * diff({a: 1}, {a: 5}) //=> [{t: 2, p: ['a'], v: 5}]
 */
export default function diff(
  a: object,
  b: object,
  path: Array<string | number> = []
): DiffResult[] {
  if (typeof a !== typeof b) {
    return [{ t: CHANGED, p: path, v: b }];
  }

  const result: DiffResult[] = [];

  if (isPureObj(a)) {
    if (Array.isArray(a)) {
      for (let i = 0; i < a.length; i++) {
        if (i in b) {
          result.push(...diff(a[i], b[i], [...path, i]));
        } else {
          result.push({ t: DELETED, p: [...path, i] });
        }
      }

      for (let i = 0; i < (b as []).length; i++) {
        if (!(i in a)) {
          result.push({ t: ADDED, p: [...path, i], v: b[i] });
        }
      }
    }

    if (isObj(a)) {
      for (const k of Object.keys(a)) {
        if (k in b) {
          result.push(...diff(a[k], b[k], [...path, k]));
        } else {
          result.push({ t: DELETED, p: [...path, k] });
        }
      }

      for (const k of Object.keys(b)) {
        if (!(k in a)) {
          result.push({ t: ADDED, p: [...path, k], v: b[k] });
        }
      }
    }

    if (isDate(a)) {
      if (!isEql(a, b)) {
        return [{ t: CHANGED, p: path, v: b }];
      }
    }

    return result;
  }

  if (!Object.is(a, b)) {
    return [{ t: CHANGED, p: path, v: b }];
  }

  return result;
}
