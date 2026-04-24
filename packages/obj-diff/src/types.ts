export type DiffResult = {
  type: 0 | 1 | 2;
  path: Array<string | number>;
  value?: unknown;
};