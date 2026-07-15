import mdiff from "microdiff";
import { diff as opentfDiff, patch as opentfPatch } from "../packages/obj-diff/dist/index.js";
import { detailedDiff as adobeDiff } from "@adobe/optimized-diff";
import { diff as justDiff } from "just-diff";
import deepDiff from "deep-diff";
import { getDiff as recursiveDiff } from "recursive-diff";
import * as jsondiffpatch from "jsondiffpatch";
import { diff as deepDiffTs } from "deep-diff-ts";
import { detailedDiff as deepObjectDiff } from "deep-object-diff";

// Define test cases
const createCircular = () => {
  const a = { id: 1 };
  a.self = a;
  const b = { id: 1, self: { id: 2 } };
  return [a, b];
};

const createMap = () => {
  const a = new Map([["key", 1]]);
  const b = new Map([["key", 2], ["new", 3]]);
  return [a, b];
};

const createSet = () => {
  const a = new Set([1, 2]);
  const b = new Set([2, 3]);
  return [a, b];
};

const createSparseArray = () => {
  const a = [1, , 3];
  const b = [1, 2, 3];
  return [a, b];
};

const createRegExp = () => {
  return [{ regex: /foo/g }, { regex: /bar/g }];
};

const createDate = () => {
  return [{ d: new Date("2024-01-01") }, { d: new Date("2024-01-02") }];
};

const createTypedArray = () => {
  const a = new Uint8Array([1, 2, 3]);
  const b = new Uint8Array([1, 4, 3]);
  return [a, b];
};

const testCases = [
  { name: "Nested Objects", get: () => [{ a: { b: 1 } }, { a: { b: 2 } }] },
  { name: "Dates", get: createDate },
  { name: "RegExps", get: createRegExp },
  { name: "Maps", get: createMap },
  { name: "Sets", get: createSet },
  { name: "Sparse Arrays", get: createSparseArray },
  { name: "Circular References", get: createCircular },
  { name: "TypedArrays", get: createTypedArray }
];

const libraries = [
  { name: "@opentf/obj-diff", run: (a, b) => opentfDiff(a, b) },
  { name: "microdiff", run: (a, b) => mdiff(a, b) },
  { name: "jsondiffpatch", run: (a, b) => jsondiffpatch.diff(a, b) },
  { name: "deep-diff-ts", run: (a, b) => deepDiffTs(a, b) },
  { name: "deep-diff", run: (a, b) => deepDiff(a, b) },
  { name: "recursive-diff", run: (a, b) => recursiveDiff(a, b) },
  { name: "@adobe/optimized-diff", run: (a, b) => adobeDiff(a, b) },
  { name: "deep-object-diff", run: (a, b) => deepObjectDiff(a, b) },
  { name: "just-diff", run: (a, b) => justDiff(a, b) }
];

const results = {};

for (const lib of libraries) {
  results[lib.name] = {};
  for (const tc of testCases) {
    try {
      const [a, b] = tc.get();
      const result = lib.run(a, b);
      
      if (result) {
         let hasChanges = false;
         if (Array.isArray(result)) hasChanges = result.length > 0;
         else if (typeof result === 'object') {
           hasChanges = Object.keys(result).length > 0;
           if (result.added || result.updated || result.deleted) {
             hasChanges = Object.keys(result.added || {}).length > 0 || 
                          Object.keys(result.updated || {}).length > 0 || 
                          Object.keys(result.deleted || {}).length > 0;
           }
         }
         
         if (hasChanges) {
           results[lib.name][tc.name] = "✅ Pass";
         } else {
           results[lib.name][tc.name] = "⚠️ Fail (No diff)";
         }
      } else {
        results[lib.name][tc.name] = "⚠️ Fail (No diff)";
      }
    } catch (e) {
      if (e instanceof RangeError && e.message.includes("Maximum call stack size exceeded")) {
        results[lib.name][tc.name] = "❌ Crashed (Stack overflow)";
      } else {
        results[lib.name][tc.name] = "❌ Crashed";
      }
    }
  }
}

console.table(results);
