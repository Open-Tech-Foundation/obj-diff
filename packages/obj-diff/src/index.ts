import { ADDED, CHANGED, DELETED, type DiffType, INSERTED, REMOVED } from "./constants";
import diff from "./diff";
import diffWith from "./diffWith";
import patch from "./patch";
import type { DiffResult } from "./types";
import { deserialize, serialize } from "./wire";

export {
  ADDED,
  CHANGED,
  DELETED,
  type DiffResult,
  type DiffType,
  deserialize,
  diff,
  diffWith,
  INSERTED,
  patch,
  REMOVED,
  serialize,
};
