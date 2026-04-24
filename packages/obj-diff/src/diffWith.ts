import diff from "./diff";
import { DiffResult } from "./types";

/**
 * Performs a deep difference between two objects with custom comparator function.
 *
 * @example
 * diffWith({a: 1}, {a: 5}, (a, b) => {}) //=> [{t: 2, p: ['a'], v: 5}]
 */
export default function diffWith(
  obj1: object,
  obj2: object,
  fn: (a: object, b: object) => boolean | undefined
): Array<DiffResult> {
  return diff(obj1, obj2, fn);
}
