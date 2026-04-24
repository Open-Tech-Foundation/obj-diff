import { clone } from "@opentf/std";
import type { DiffResult } from "./types";

export default function patch<T>(obj: T, patches: Array<DiffResult>): T {
  if (patches.length === 0) return clone(obj);

  let c = clone(obj);
  if (obj && typeof obj === "object" && Object.getPrototypeOf(obj) === null) {
    Object.setPrototypeOf(c, null);
  }

  for (const p of patches) {
    if (p.path.length === 0) {
      if (p.type === 1 || p.type === 2) {
        c = p.value as T;
        continue;
      }
      if (p.type === 0) {
        c = undefined as unknown as T;
        continue;
      }
    }

    let current: Record<string, unknown> | Map<unknown, unknown> | Set<unknown> = c as Record<
      string,
      unknown
    >;
    for (let i = 0; i < p.path.length - 1; i++) {
      const key = p.path[i];
      if (current instanceof Map) {
        current = current.get(key) as Record<string, unknown>;
      } else {
        current = (current as Record<string, unknown>)[key] as Record<string, unknown>;
      }
    }

    const lastKey = p.path[p.path.length - 1];

    if (p.type === 1 || p.type === 2) {
      if (current instanceof Map) {
        current.set(lastKey, p.value);
      } else if (current instanceof Set) {
        const arr = Array.from(current);
        arr[lastKey as number] = p.value;
        current.clear();
        for (const v of arr) current.add(v);
      } else {
        (current as Record<string | number, unknown>)[lastKey] = p.value;
      }
    } else if (p.type === 0) {
      if (current instanceof Map) {
        current.delete(lastKey);
      } else if (current instanceof Set) {
        const arr = Array.from(current);
        arr.splice(lastKey as number, 1);
        current.clear();
        for (const v of arr) current.add(v);
      } else {
        delete (current as Record<string | number, unknown>)[lastKey];
      }
    }
  }

  // Final pass to pack arrays and handle any post-patch cleanup
  const visited = new WeakSet();
  const packArrays = (val: unknown) => {
    if (!val || typeof val !== "object" || visited.has(val)) return;
    visited.add(val);

    if (Array.isArray(val)) {
      const packed = val.filter(() => true);
      if (packed.length !== val.length) {
        val.length = 0;
        for (const v of packed) val.push(v);
      }
      val.forEach(packArrays);
    } else if (!(val instanceof Date) && !(val instanceof Map) && !(val instanceof Set)) {
      Object.values(val).forEach(packArrays);
    }
  };

  packArrays(c);

  return c;
}
