import type { diff as diffType, diffWith as diffWithType, patch as patchType } from "../src/index";

let diff: typeof diffType;
let diffWith: typeof diffWithType;
let patch: typeof patchType;

if (process.env.TEST_CJS) {
  const dist = require("../dist/index.cjs");
  diff = dist.diff;
  diffWith = dist.diffWith;
  patch = dist.patch;
} else if (process.env.TEST_DIST) {
  const dist = await import("../dist/index.js");
  diff = dist.diff;
  diffWith = dist.diffWith;
  patch = dist.patch;
} else {
  const src = await import("../src/index");
  diff = src.diff;
  diffWith = src.diffWith;
  patch = src.patch;
}

export { diff, diffWith, patch };
