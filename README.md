<img align="left" src="https://open-tech-foundation.pages.dev/img/Logo.svg" width="50" height="50">

&nbsp;[OPEN TECH FOUNDATION](https://open-tech-foundation.pages.dev/)

<div align="center">

# obj-diff

</div>

> The Fast, Accurate, JavaScript Objects Diffing Library.

## Features

- Deep Objects Diffing

- Supports More Object Types, eg: `Map`, `Set`

- TypeScript Support

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
  t: 0 | 1 | 2; // The type of diff, 0 - Deleted, 1 - Created, 2 - Updated
  p: Array<string | number>; // The object path
  v?: unknown; // The current value
};
```

## Examples

1. Diff two simple objects.

```js
const a = {a: 1, b: 2};
const b = {a: 2, c: 3};

diff(a, b);
/*
[
  {
    t: 2,
    p: ["a"],
    v: 2,
  },
  {
    t: 0,
    p: ["b"],
  },
  {
    t: 1,
    p: ["c"],
    v: 5,
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
    t: 2,
    p: [1],
    v: 3,
  },
  {
    t: 2,
    p: [2],
    v: 5,
  },
  {
    t: 0,
    p: [3],
  },
  {
    t: 0,
    p: [4],
  },
]
*/
```

3. Deep diff two objects.

```js
const a = {
  foo: {
    bar: {
      a: ['a', 'b'],
      b: 2,
      c: ['x', 'y'],
      e: 100
    }
  },
  buzz: 'world'
};

const b = {
  foo: {
    bar: {
      a: ['a'],
      b: 2,
      c: ['x', 'y', 'z'],
      d: 'Hello, world!'
    }
  },
  buzz: 'fizz'
};

diff(a, b);
/*
[
  {
    t: 0,
    p: ["foo", "bar", "a", 1],
  },
  {
    t: 1,
    p: ["foo", "bar", "c", 2],
    v: "z",
  },
  {
    t: 0,
    p: ["foo", "bar", "e"],
  },
  {
    t: 1,
    p: ["foo", "bar", "d"],
    v: "Hello, world!",
  },
  {
    t: 2,
    p: ["buzz"],
    v: "fizz",
  },
]
*/
```

## Benchmark

```diff
┌───┬──────────────────┬─────────┬───────────────────┬────────┬─────────┐
│   │ Task Name        │ ops/sec │ Average Time (ns) │ Margin │ Samples │
├───┼──────────────────┼─────────┼───────────────────┼────────┼─────────┤
+ 0 │ diff             │ 252,694 │ 3957.346814404028 │ ±1.60% │ 25270   │
│ 1 │ microdiff        │ 218,441 │ 4577.892286564301 │ ±0.92% │ 21845   │
│ 2 │ deep-object-diff │ 121,385 │ 8238.188318642591 │ ±1.66% │ 12139   │
│ 3 │ just-diff        │ 105,292 │ 9497.35384615396  │ ±1.66% │ 10530   │
│ 4 │ deep-diff        │ 160,802 │ 6218.820533549017 │ ±1.59% │ 16081   │
└───┴──────────────────┴─────────┴───────────────────┴────────┴─────────┘
```


### Running benchmarks

```sh
$ bun run build
$ bun benchmark.js
```

## Articles

Please read our important articles:

- [Introducing Our New JavaScript Standard Library](https://ganapathy.hashnode.dev/introducing-our-new-javascript-standard-library)

- [You Don’t Need JavaScript Native Methods](https://ganapathy.hashnode.dev/you-dont-need-javascript-native-methods)

## License

Copyright (c) [Thanga Ganapathy](https://github.com/Thanga-Ganapathy) ([MIT License](./LICENSE)).
