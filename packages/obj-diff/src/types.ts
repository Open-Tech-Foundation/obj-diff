import type { DiffType } from "./constants";

/**
 * Represents the result of a single difference detected between two objects.
 *
 * @example
 * { type: 2, path: ["foo", "bar"], value: 42 }
 */
export type DiffResult = {
  /** The type of change: `0` (Deleted), `1` (Added), `2` (Changed). */
  type: DiffType;
  /** The path to the changed property, e.g. `["foo", "bar", 0]`. */
  path: Array<string | number>;
  /** The new value (present for Added and Changed types). */
  value?: unknown;
};
