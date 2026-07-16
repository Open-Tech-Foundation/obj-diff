import type { DiffType } from "./constants";

/**
 * Represents the result of a single difference detected between two objects.
 *
 * @example
 * { type: 2, path: ["foo", "bar"], value: 42 }
 */
export type DiffResult = {
  /**
   * The type of change: `0` (Deleted), `1` (Added), `2` (Changed),
   * `3` (Inserted — array-only, splice in at index), `4` (Removed —
   * array-only, splice out at index).
   */
  type: DiffType;
  /**
   * The path to the changed property, e.g. `["foo", "bar", 0]`.
   *
   * Object keys are strings, array and Set indexes are numbers, and Map
   * entries use the Map key itself — which can be a value of any type.
   */
  path: Array<unknown>;
  /** The new value (present for Added and Changed types). */
  value?: unknown;
};
