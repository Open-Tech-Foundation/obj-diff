import type {
  deserialize as deserializeType,
  diff as diffType,
  diffWith as diffWithType,
  parse as parseType,
  patch as patchType,
  serialize as serializeType,
  stringify as stringifyType,
} from "../src/index";

let diff: typeof diffType;
let diffWith: typeof diffWithType;
let patch: typeof patchType;
let serialize: typeof serializeType;
let deserialize: typeof deserializeType;
let stringify: typeof stringifyType;
let parse: typeof parseType;

if (process.env.TEST_CJS) {
  const dist = require("../dist/index.cjs");
  diff = dist.diff;
  diffWith = dist.diffWith;
  patch = dist.patch;
  serialize = dist.serialize;
  deserialize = dist.deserialize;
  stringify = dist.stringify;
  parse = dist.parse;
} else if (process.env.TEST_DIST) {
  const dist = await import("../dist/index.js");
  diff = dist.diff;
  diffWith = dist.diffWith;
  patch = dist.patch;
  serialize = dist.serialize;
  deserialize = dist.deserialize;
  stringify = dist.stringify;
  parse = dist.parse;
} else {
  const src = await import("../src/index");
  diff = src.diff;
  diffWith = src.diffWith;
  patch = src.patch;
  serialize = src.serialize;
  deserialize = src.deserialize;
  stringify = src.stringify;
  parse = src.parse;
}

export { diff, diffWith, patch, serialize, deserialize, stringify, parse };
