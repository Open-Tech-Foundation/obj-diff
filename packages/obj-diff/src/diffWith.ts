import diff from "./diff";
import type { DiffResult } from "./types";

/**
 * Performs a deep difference between two objects using a custom comparator function.
 *
 * Return `true` from the comparator to mark objects as changed.
 * Return `false` to mark them as equal (skips deep comparison).
 * Return `undefined` to fall through to the default comparison.
 *
 * Note: the comparator is invoked only when both values are objects;
 * primitive values are always compared with built-in `Object.is` semantics.
 *
 * @param obj1 - The original object.
 * @param obj2 - The modified object.
 * @param fn - A custom comparator function.
 * @returns An array of differences.
 *
 * @example
 * diffWith({a: 1}, {a: 5}, (a, b) => {}) //=> [{type: 2, path: ['a'], value: 5}]
 */
export default function diffWith(
  obj1: unknown,
  obj2: unknown,
  fn: (a: object, b: object) => boolean | undefined,
): Array<DiffResult> {
  return diff(obj1, obj2, fn);
}
