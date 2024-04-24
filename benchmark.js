import { Bench, hrtimeNow } from "tinybench";
import mdiff from "microdiff";
import { diff } from "./packages/obj-diff/src";
import { diff as deepObjDiff } from "deep-object-diff";
import { diff as justDiff } from "just-diff";
import deepDiff from "deep-diff";

const lhs = {
  foo: {
    bar: {
      a: ["a", "b"],
      b: 2,
      c: ["x", "y"],
      e: 100, // deleted
    },
  },
  buzz: "world",
  date: new Date("2024-01-01"),
};

const rhs = {
  foo: {
    bar: {
      a: ["a"], // index 1 ('b')  deleted
      b: 2, // unchanged
      c: ["x", "y", "z"], // 'z' added
      d: "Hello, world!", // added
    },
  },
  buzz: "fizz", // updated
  date: new Date("2024-01-02"),
};

const bench = new Bench({ time: 100, now: hrtimeNow });

bench
  .add("diff", () => {
    diff(lhs, rhs);
  })
  .add("microdiff", () => {
    mdiff(lhs, rhs);
  })
  .add("deep-object-diff", () => {
    deepObjDiff(lhs, rhs);
  })
  .add("just-diff", () => {
    justDiff(lhs, rhs);
  })
  .add("deep-diff", () => {
    deepDiff(lhs, rhs);
  });

await bench.warmup();
await bench.run();

console.table(bench.table());
