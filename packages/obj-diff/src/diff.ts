import { isObj } from "@opentf/std";
import { ADDED, CHANGED, DELETED } from "./constants";
import type { DiffResult } from "./types";

function objDiff(
  a: unknown,
  b: unknown,
  path: Array<string | number>,
  _refsA: WeakSet<WeakKey>,
  _refsB: WeakSet<WeakKey>,
  fn?: (a: object, b: object) => boolean | undefined,
): DiffResult[] {
  const result: DiffResult[] = [];

  if (typeof a === "object" && typeof b === "object" && a !== null && b !== null) {
    // For circular refs
    if (_refsA.has(a as WeakKey) && _refsB.has(b as WeakKey)) {
      return [];
    }

    _refsA.add(a as WeakKey);
    _refsB.add(b as WeakKey);

    const customMatch = fn?.(a as object, b as object);
    if (customMatch === true) {
      _refsA.delete(a as WeakKey);
      _refsB.delete(b as WeakKey);
      return [{ type: CHANGED, path, value: b }];
    }

    if (customMatch === false) {
      _refsA.delete(a as WeakKey);
      _refsB.delete(b as WeakKey);
      return [];
    }

    if (Array.isArray(a) && Array.isArray(b)) {
      const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
      for (const k of keys) {
        const i = Number.isNaN(Number(k)) ? k : Number(k);
        if (Object.hasOwn(a, k) && Object.hasOwn(b, k)) {
          result.push(
            ...objDiff(
              (a as unknown as Record<string, unknown>)[k],
              (b as unknown as Record<string, unknown>)[k],
              [...path, i],
              _refsA,
              _refsB,
              fn,
            ),
          );
        } else if (Object.hasOwn(a, k)) {
          result.push({ type: DELETED, path: [...path, i] });
        } else {
          result.push({
            type: ADDED,
            path: [...path, i],
            value: (b as unknown as Record<string, unknown>)[k],
          });
        }
      }

      _refsA.delete(a as WeakKey);
      _refsB.delete(b as WeakKey);

      return result;
    }

    if (isObj(a) && isObj(b)) {
      for (const k of Object.keys(a)) {
        if (Object.hasOwn(b, k)) {
          result.push(
            ...objDiff(
              (a as Record<string, unknown>)[k] as object,
              (b as Record<string, unknown>)[k] as object,
              [...path, k],
              _refsA,
              _refsB,
              fn,
            ),
          );
        } else {
          result.push({ type: DELETED, path: [...path, k] });
        }
      }

      for (const k of Object.keys(b)) {
        if (!Object.hasOwn(a, k)) {
          result.push({
            type: ADDED,
            path: [...path, k],
            value: (b as Record<string, unknown>)[k],
          });
        }
      }

      _refsA.delete(a as WeakKey);
      _refsB.delete(b as WeakKey);

      return result;
    }

    if (a instanceof Date && b instanceof Date) {
      if (!Object.is(a.getTime(), (b as Date).getTime())) {
        _refsA.delete(a as WeakKey);
        _refsB.delete(b as WeakKey);
        return [{ type: CHANGED, path, value: b }];
      }
      _refsA.delete(a as WeakKey);
      _refsB.delete(b as WeakKey);
      return [];
    }

    if (a instanceof Map && b instanceof Map) {
      for (const k of a.keys()) {
        if (b.has(k)) {
          result.push(...objDiff(a.get(k), b.get(k), [...path, k], _refsA, _refsB, fn));
        } else {
          result.push({ type: DELETED, path: [...path, k] });
        }
      }

      for (const k of b.keys()) {
        if (!a.has(k)) {
          result.push({
            type: ADDED,
            path: [...path, k],
            value: b.get(k),
          });
        }
      }

      _refsA.delete(a as WeakKey);
      _refsB.delete(b as WeakKey);

      return result;
    }

    if (a instanceof Set && b instanceof Set) {
      const aArr = [...a];
      const bArr = [...b];

      for (let i = 0; i < aArr.length; i++) {
        if (Object.hasOwn(bArr, i)) {
          result.push(
            ...objDiff(
              aArr[i],
              (bArr as Array<unknown>)[i] as object,
              [...path, i],
              _refsA,
              _refsB,
              fn,
            ),
          );
        } else {
          result.push({ type: DELETED, path: [...path, i], value: aArr[i] });
        }
      }

      for (let i = 0; i < (bArr as []).length; i++) {
        if (!Object.hasOwn(aArr, i)) {
          result.push({
            type: ADDED,
            path: [...path, i],
            value: (bArr as Array<unknown>)[i],
          });
        }
      }

      _refsA.delete(a as WeakKey);
      _refsB.delete(b as WeakKey);

      return result;
    }

    if (Object.prototype.toString.call(a) !== Object.prototype.toString.call(b)) {
      _refsA.delete(a as WeakKey);
      _refsB.delete(b as WeakKey);
      return [{ type: CHANGED, path, value: b }];
    }

    _refsA.delete(a as WeakKey);
    _refsB.delete(b as WeakKey);
  } else {
    if (!Object.is(a, b)) {
      return [{ type: CHANGED, path, value: b as object }];
    }
  }

  return result;
}

/**
 * Performs a deep difference between two objects.
 *
 * @example
 * diff({a: 1}, {a: 5}) //=> [{type: 2, path: ['a'], value: 5}]
 */
export default function diff(
  obj1: unknown,
  obj2: unknown,
  fn?: (a: object, b: object) => boolean | undefined,
): Array<DiffResult> {
  return objDiff(obj1, obj2, [], new WeakSet(), new WeakSet(), fn);
}
