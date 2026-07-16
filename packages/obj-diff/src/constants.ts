export const DELETED = 0 as const;
export const ADDED = 1 as const;
export const CHANGED = 2 as const;
/** Array-only: insert the value at the index, shifting later elements right. */
export const INSERTED = 3 as const;
/** Array-only: remove the element at the index, shifting later elements left. */
export const REMOVED = 4 as const;

export type DiffType =
  | typeof DELETED
  | typeof ADDED
  | typeof CHANGED
  | typeof INSERTED
  | typeof REMOVED;
