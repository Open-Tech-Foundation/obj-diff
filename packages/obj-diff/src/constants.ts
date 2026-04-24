export const DELETED = 0 as const;
export const ADDED = 1 as const;
export const CHANGED = 2 as const;

export type DiffType = typeof DELETED | typeof ADDED | typeof CHANGED;
