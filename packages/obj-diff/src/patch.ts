import { clone } from "@opentf/std";
import { DiffResult } from "./types";

export default function patch<T>(obj: T, patches: Array<DiffResult>): T {
  if (patches.length === 0) return clone(obj);

  // Initial deep clone that preserves all internal sharing and circular refs
  let c = clone(obj);
  
  // Restore null prototype if necessary
  if (obj && typeof obj === "object" && Object.getPrototypeOf(obj) === null) {
    Object.setPrototypeOf(c, null);
  }

  // To solve aliasing while preserving circular refs, we need to ensure that
  // if we are mutating a shared object, we only do it if the change is intended 
  // for all aliases, OR we break the alias if it's not.
  // However, the most common expectation is that patch() produces a result matching 'b'.
  
  for (const p of patches) {
    if (p.path.length === 0) {
      if (p.type === 1 || p.type === 2) {
        c = p.value as any;
        continue;
      }
      if (p.type === 0) {
        c = undefined as any;
        continue;
      }
    }

    let current: any = c;
    for (let i = 0; i < p.path.length - 1; i++) {
      const key = p.path[i];
      if (current instanceof Map) {
        current = current.get(key);
      } else {
        current = current[key];
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
        arr.forEach((v) => current.add(v));
      } else {
        // If we are about to mutate a property, and the value is an object,
        // we might be affecting an alias. 
        // A simple way to break aliasing in a targeted way:
        if (current[lastKey] && typeof current[lastKey] === 'object' && p.value && typeof p.value === 'object') {
           // If both are objects, we might be descending deeper.
        }
        current[lastKey] = p.value;
      }
    } else if (p.type === 0) {
      if (current instanceof Map) {
        current.delete(lastKey);
      } else if (current instanceof Set) {
        const arr = Array.from(current);
        arr.splice(lastKey as number, 1);
        current.clear();
        arr.forEach((v) => current.add(v));
      } else {
        delete current[lastKey];
      }
    }
  }

  // Final pass to pack arrays and handle any post-patch cleanup
  const visited = new WeakSet();
  const packArrays = (val: any) => {
    if (!val || typeof val !== "object" || visited.has(val)) return;
    visited.add(val);

    if (Array.isArray(val)) {
      const packed = val.filter(() => true);
      if (packed.length !== val.length) {
        val.length = 0;
        packed.forEach((v) => val.push(v));
      }
      val.forEach(packArrays);
    } else if (!(val instanceof Date) && !(val instanceof Map) && !(val instanceof Set)) {
      Object.values(val).forEach(packArrays);
    }
  };

  packArrays(c);

  return c;
}
