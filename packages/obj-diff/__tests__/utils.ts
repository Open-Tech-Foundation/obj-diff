import type {
  deserialize as deserializeType,
  diff as diffType,
  diffWith as diffWithType,
  patch as patchType,
  serialize as serializeType,
} from "../src/index";

let diff: typeof diffType;
let diffWith: typeof diffWithType;
let patch: typeof patchType;
let serialize: typeof serializeType;
let deserialize: typeof deserializeType;

if (process.env.TEST_CJS) {
  const dist = require("../dist/index.cjs");
  diff = dist.diff;
  diffWith = dist.diffWith;
  patch = dist.patch;
  serialize = dist.serialize;
  deserialize = dist.deserialize;
} else if (process.env.TEST_DIST) {
  const dist = await import("../dist/index.js");
  diff = dist.diff;
  diffWith = dist.diffWith;
  patch = dist.patch;
  serialize = dist.serialize;
  deserialize = dist.deserialize;
} else {
  const src = await import("../src/index");
  diff = src.diff;
  diffWith = src.diffWith;
  patch = src.patch;
  serialize = src.serialize;
  deserialize = src.deserialize;
}

export { diff, diffWith, patch, serialize, deserialize };
