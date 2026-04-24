import { clone } from "@opentf/std";
import { DiffResult } from "./types";

function getTarget(obj: any, path: Array<string | number>) {
  let current = obj;
  for (let i = 0; i < path.length - 1; i++) {
    const key = path[i];
    if (current instanceof Map) {
      current = current.get(key);
    } else if (current instanceof Set) {
      current = Array.from(current)[key as number];
    } else {
      current = current[key];
    }
  }
  return current;
}

/**
 * You can apply the diff result onto the original object to get the modified object.
 *
 * @example
 * const a = {a: 1, b: 2};
 * const b = {a: 2, c: 3};
 * const out = patch(a, diff(a, b));
 * assert.deepStrictEqual(out, b); // ok
 */
export default function patch<T>(obj: T, patches: Array<DiffResult>): T {
  const c = clone(obj);

  for (const p of patches) {
    if (p.path.length === 0) {
      if (p.type === 1 || p.type === 2) {
        return p.value as T;
      }
      if (p.type === 0) {
        return undefined as T;
      }
    }

    const target = getTarget(c, p.path);
    const lastKey = p.path[p.path.length - 1];

    if (p.type === 1 || p.type === 2) {
      if (target instanceof Map) {
        target.set(lastKey, p.value);
      } else if (target instanceof Set) {
        const arr = Array.from(target);
        arr[lastKey as number] = p.value;
        target.clear();
        arr.forEach((v) => target.add(v));
      } else {
        target[lastKey] = p.value;
      }
    }

    if (p.type === 0) {
      if (target instanceof Map) {
        target.delete(lastKey);
      } else if (target instanceof Set) {
        const arr = Array.from(target);
        arr.splice(lastKey as number, 1);
        target.clear();
        arr.forEach((v) => target.add(v));
      } else {
        delete target[lastKey];
      }
    }
  }

  const packArrays = (val: any) => {
    if (Array.isArray(val)) {
      const packed = val.filter(() => true);
      val.length = 0;
      packed.forEach((v) => val.push(v));
      val.forEach(packArrays);
    } else if (val && typeof val === "object" && !(val instanceof Date) && !(val instanceof Map) && !(val instanceof Set)) {
      Object.values(val).forEach(packArrays);
    }
  };

  packArrays(c);

  return c;
}
