import { ADDED, CHANGED, DELETED, type DiffType, INSERTED, REMOVED } from "./constants";
import diff from "./diff";
import diffWith from "./diffWith";
import patch from "./patch";
import type { DiffResult } from "./types";

export {
  ADDED,
  CHANGED,
  DELETED,
  type DiffResult,
  type DiffType,
  diff,
  diffWith,
  INSERTED,
  patch,
  REMOVED,
};
