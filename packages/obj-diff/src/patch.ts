import { clone, set, unset } from "@opentf/std";
import { DiffResult } from "./types";

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
    if (p.t === 1 || p.t === 2) {
      set(c, p.p, p.v);
    }

    if (p.t === 0) {
      unset(c, p.p);
    }
  }

  return c;
}
