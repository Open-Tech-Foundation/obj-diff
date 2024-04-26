export type DiffResult = {
  t: 0 | 1 | 2;
  p: Array<string | number>;
  v?: unknown;
};