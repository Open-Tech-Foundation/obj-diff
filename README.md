<img align="left" src="https://open-tech-foundation.pages.dev/img/Logo.svg" width="50" height="50">

&nbsp;[OPEN TECH FOUNDATION](https://open-tech-foundation.pages.dev/)

<div align="center">

# obj-diff

[![Build](https://github.com/Open-Tech-Foundation/obj-diff/actions/workflows/build.yml/badge.svg)](https://github.com/Open-Tech-Foundation/obj-diff/actions/workflows/build.yml) &nbsp; [![JSR Score](https://jsr.io/badges/@opentf/obj-diff/score)](https://jsr.io/@opentf/obj-diff)

![Demo image](./demo.png)

</div>

> The Fast, Accurate, JavaScript Objects Diffing & Patching Library.

**[LIVE DEMO](https://obj-diff.pages.dev/)**

## Features

- Deep Objects Diffing

- Patching

- Supports comparing custom object types

- TypeScript Support

- Cross-Platform

## Supported Types

- Primitives

  - Undefined
  - Null
  - Number
  - String
  - Boolean
  - BigInt

- Objects
  - Plain Objects, eg: `{}`
  - Array
  - Date
  - Map
  - Set

## Installation

Install it using your favourite package manager.

```sh
npm install @opentf/obj-diff
```

```sh
yarn add @opentf/obj-diff
```

```sh
pnpm add @opentf/obj-diff
```

```sh
bun add @opentf/obj-diff
```

```sh
deno add @opentf/obj-diff
```

## Usage

```js
import { diff } from '@opentf/obj-diff';

diff(obj1: object, obj2: object): Array<DiffResult>
```

```ts
type DiffResult = {
  type: 0 | 1 | 2; // The type of diff, 0 - Deleted, 1 - Created, 2 - Updated
  path: Array<string | number>; // The object path
  value?: unknown; // The current value
};
```

## Examples

1. Diff two simple objects.

```js
const a = { a: 1, b: 2 };
const b = { a: 2, c: 3 };

diff(a, b);
/*
[
  {
    type: 2,
    path: ["a"],
    value: 2,
  },
  {
    type: 0,
    path: ["b"],
  },
  {
    type: 1,
    path: ["c"],
    value: 3,
  },
]
*/
```

2. Diff two arrays.

```js
const a = [1, 2, 3, 4, 5];
const b = [1, 3, 5];

diff(a, b);
/* 
[
  {
    type: 2,
    path: [1],
    value: 3,
  },
  {
    type: 2,
    path: [2],
    value: 5,
  },
  {
    type: 0,
    path: [3],
  },
  {
    type: 0,
    path: [4],
  },
]
*/
```

3. Deep diff two objects.

```js
const a = {
  foo: {
    bar: {
      a: ["a", "b"],
      b: 2,
      c: ["x", "y"],
      e: 100,
    },
  },
  buzz: "world",
};

const b = {
  foo: {
    bar: {
      a: ["a"],
      b: 2,
      c: ["x", "y", "z"],
      d: "Hello, world!",
    },
  },
  buzz: "fizz",
};

diff(a, b);
/*
[
  {
    type: 0,
    path: ["foo", "bar", "a", 1],
  },
  {
    type: 1,
    path: ["foo", "bar", "c", 2],
    value: "z",
  },
  {
    type: 0,
    path: ["foo", "bar", "e"],
  },
  {
    type: 1,
    path: ["foo", "bar", "d"],
    value: "Hello, world!",
  },
  {
    type: 2,
    path: ["buzz"],
    value: "fizz",
  },
]
*/
```

## Patching

You can apply the diff result onto the original object to get the modified object.

```js
import { diff, patch } from "@opentf/obj-diff";

const a = { a: 1, b: 2 };
const b = { a: 2, c: 3 };

const out = patch(a, diff(a, b));

assert.deepStrictEqual(out, b); // ok
```

## Comparing Custom Types

By default, the `diff` function cannot compare every object types other than the supported list above.

You can extend the default `diff` function using the `diffWith` function.

Now you can compare any object types of your own.

### Usage - diffWith()

```js
import { diffWith } from '@opentf/obj-diff';

diffWith(
  obj1: object,
  obj2: object,
  fn: (a: object, b: object) => boolean | undefined
): Array<DiffResult>
```

### Examples

Let us compare the `MongoDB` bson `ObjectId` objects.

```js
import { ObjectId } from "bson";
import { diffWith } from "@opentf/obj-diff";

const record1 = {
  _id: new ObjectId(),
  title: "Article 1",
  desc: "The article description.",
};

const record2 = {
  _id: new ObjectId(),
  title: "Article 1",
  desc: "The new article description.",
};

const result = diffWith(record1, record2, (a, b) => {
  if (a instanceof ObjectId && b instanceof ObjectId) {
    return a.toString() !== b.toString();
  }
});

console.log(result);
/*
[
  {
    type: 2,
    path: [ "_id" ],
    value: new ObjectId('663088b877dd3c9aaec482d4'),
  }, 
  {
    type: 2,
    path: [ "desc" ],
    value: "The new article description.",
  }
]
*/
```

## FAQs

### 1. **Why the standard JSON Patch protocol is not supported?**

The `JSON Patch` protocol is complicated in nature. And simply we don't want use it as our existing solution works for most of the projects.

### 2. What is the meaning of empty array `{p: []}` in path property?

The empty path denotes `Root` path, and it simply means the entire object was replaced.

For Eg:

```js
diff({}, null); //=> [{type: 2, path: [], value: null}]
```

## Benchmark

| Library | Ops/sec | Average Time | Notes |
| :--- | :--- | :--- | :--- |
| **@opentf/obj-diff** | **246,154** | **~4.0μs** | **Fastest; Full Diff + Patch support.** |
| microdiff | 158,745 | ~6.3μs | Very fast; No patching support. |
| jsondiffpatch | 157,453 | ~6.3μs | Rich features (LCS, RFC6902); Slower. |
| deep-object-diff | 151,559 | ~6.6μs | Fast; Basic diffing only. |
| deep-diff | 111,615 | ~9.0μs | Medium; Classic library. |
| recursive-diff | 79,628 | ~12.5μs | Slower; Good for complex recursion. |
| just-diff | 66,477 | ~15.0μs | Slowest in this test. |

### Running benchmarks

```sh
pnpm run build
node benchmark.js
```

## Articles

Please read our important articles:

- [Introducing Our New JavaScript Standard Library](https://ganapathy.hashnode.dev/introducing-our-new-javascript-standard-library)

- [You Don’t Need JavaScript Native Methods](https://ganapathy.hashnode.dev/you-dont-need-javascript-native-methods)

## License

Copyright (c) [Thanga Ganapathy](https://github.com/Thanga-Ganapathy) ([MIT License](./LICENSE)).
