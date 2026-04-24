import diff from "./diff";
import { DiffResult } from "./types";

/**
 * Performs a deep difference between two objects with custom comparator function.
 *
 * @example
 * diffWith({a: 1}, {a: 5}, (a, b) => {}) //=> [{type: 2, path: ['a'], value: 5}]
 */
export default function diffWith(
  obj1: unknown,
  obj2: unknown,
  fn: (a: object, b: object) => boolean | undefined
): Array<DiffResult> {
  return diff(obj1, obj2, fn);
}
