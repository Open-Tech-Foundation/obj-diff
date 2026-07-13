<div align="center">

# @opentf/obj-diff

**The Fast, Accurate, and Modern JavaScript Objects Diffing & Patching Library.**

[![CI Status](https://github.com/Open-Tech-Foundation/obj-diff/actions/workflows/ci.yml/badge.svg)](https://github.com/Open-Tech-Foundation/obj-diff/actions/workflows/ci.yml)
[![JSR Score](https://jsr.io/badges/@opentf/obj-diff/score)](https://jsr.io/@opentf/obj-diff)

*Part of the <img src="https://open-tech-foundation.pages.dev/img/Logo.svg" width="18" height="18" style="vertical-align: middle;"> [Open Tech Foundation](https://github.com/Open-Tech-Foundation) ecosystem.*

![Demo image](https://raw.githubusercontent.com/Open-Tech-Foundation/obj-diff/main/demo.png)

[**Live Demo**](https://obj-diff.pages.dev/) | [**Report Bug**](https://github.com/Open-Tech-Foundation/obj-diff/issues) | [**Standard Library**](https://github.com/Open-Tech-Foundation/std)

</div>

---

## 🚀 Features

- 🔍 **Deep Objects Diffing**: Detects changes at any depth.
- 🩹 **Efficient Patching**: Apply diffs to recreate target objects.
- 🛠️ **Extensible**: Support for custom object types via `diffWith()`.
- 📦 **Modern Ecosystem**: Built for Bun, Node.js, Deno, and Browser.
- 🟦 **TypeScript Native**: Full type safety and autocompletion.
- ⚡ **High Performance**: Optimized for speed and minimal memory footprint.

## 📦 Installation

Install `@opentf/obj-diff` using your preferred package manager:

```sh
# Bun
bun add @opentf/obj-diff

# pnpm
pnpm add @opentf/obj-diff

# npm
npm install @opentf/obj-diff

# Deno
deno add @opentf/obj-diff
```

## 🛠 Supported Types

The library natively supports the following types:

- **Primitives**: `Undefined`, `Null`, `Number`, `String`, `Boolean`, `BigInt`.
- **Built-in Objects**: `Plain Objects {}`, `Array`, `Date`, `Map`, `Set`.

## 📖 Usage

### `diff(obj1, obj2)`

Performs a deep comparison between two objects.

```ts
import { diff } from '@opentf/obj-diff';

const result = diff(obj1, obj2);
```

#### `DiffResult` Structure
```ts
type DiffResult = {
  type: 0 | 1 | 2;              // 0: Deleted, 1: Created, 2: Updated
  path: Array<string | number>; // The path to the property
  value?: unknown;              // The value (for Created/Updated)
};
```

### `patch(obj, patches)`

Applies an array of diff results to an object.

```ts
import { patch } from "@opentf/obj-diff";

const updatedObj = patch(originalObj, diffResults);
```

---

## 💡 Examples

### 1. Basic Objects
```js
const a = { a: 1, b: 2 };
const b = { a: 2, c: 3 };

diff(a, b);
/*
[
  { type: 2, path: ["a"], value: 2 },
  { type: 0, path: ["b"] },
  { type: 1, path: ["c"], value: 3 }
]
*/
```

### 2. Nested Structures
```js
const a = { foo: { bar: [1, 2] } };
const b = { foo: { bar: [1] } };

const d = diff(a, b);
const res = patch(a, d); // res is deep equal to b
```

### 3. ES6 Map & Set Support
Natively diff and patch modern collections.

```js
const a = new Set([1, 2]);
const b = new Set([2, 3]);

diff(a, b);
/*
[
  { type: 0, path: [0], value: 1 },
  { type: 1, path: [1], value: 3 }
]
*/
```

### 4. Circular Reference Safety
Safe comparison of recursive objects without infinite loops.

```js
const a = { id: 1 };
a.self = a;
const b = { id: 2 };
b.self = b;

diff(a, b); 
// Output: [{ type: 2, path: ["id"], value: 2 }]
```

### 5. Custom Types via `diffWith()`
Extend the diffing logic for specialized types like MongoDB `ObjectId`.

```js
import { diffWith } from "@opentf/obj-diff";
import { ObjectId } from "bson";

const result = diffWith(record1, record2, (a, b) => {
  if (a instanceof ObjectId && b instanceof ObjectId) {
    return a.toString() !== b.toString();
  }
});
```

---

## ⚠️ Caveats

### Internal Object Sharing (Aliasing)

For maximum performance, `@opentf/obj-diff` preserves internal object identity (sharing) during the `patch()` operation. 

If your original object contains multiple paths pointing to the **same object instance**, patching one of those paths will affect all its aliases.

```js
const shared = { x: 1 };
const a = { first: shared, second: shared };
const b = { first: { x: 1 }, second: { x: 2 } };

const d = diff(a, b);
const res = patch(a, d);

// res.first.x will be 2 because it shares the same instance as res.second
console.log(res.first.x); // 2
```

> [!TIP]
> If you require independent branches after patching, ensure your input objects do not share internal references that are expected to diverge.

---

## 📊 Comprehensive Benchmarks

We have rebuilt our benchmark suite using `mitata` and split it into distinct categories to provide a clear, fair, and comprehensive comparison against the libraries developers actually use.

### 1. Diff Generation (Speed)
*Testing how quickly libraries can detect differences between two structures.*

| Scenario | `@opentf/obj-diff` | `microdiff` | `deep-diff` | `just-diff` | `deep-object-diff` |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **No changes** | `1.89 µs` | `1.85 µs` | **`1.66 µs`** | `2.83 µs` | `4.37 µs` |
| **One property** | `1.93 µs` | **`1.46 µs`** | `1.24 µs` | `2.48 µs` | `3.86 µs` |
| **Deep nested** (9 lvls) | **`1.81 µs`** | `1.93 µs` | `3.18 µs` | `4.51 µs` | `3.47 µs` |
| **Mixed types** (JS native)| **`1.81 µs`** | `2.21 µs` | `2.30 µs` | `2.96 µs` | `3.70 µs` |

### 2. Diff + Patch (Complete Solution)
*Testing the full lifecycle: Generating a diff and applying it to reconstruct the target.*

| Scenario | `@opentf/obj-diff` | `fast-json-patch` | `jsondiffpatch` | `rfc6902` | `just-diff` + apply |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **One property** | `4.03 µs` | **`2.16 µs`** | `3.82 µs` | `3.78 µs` | `4.21 µs` |
| **Mixed changes** | `2.90 µs` | **`2.24 µs`** | `8.46 µs` | `9.49 µs` | `4.33 µs` |

*(Note: `fast-json-patch` is highly optimized for strict JSON, but fails on JS-native structures like Maps/Sets/Dates. Among full-featured libraries, `@opentf/obj-diff` is significantly faster at patching).*

### 3. Large Scale Payloads (Algorithmic Scalability)
*Testing performance on a generated 1 Megabyte JSON payload with one deep change and one insertion.*

| Metric (1MB JSON) | `@opentf/obj-diff` | `microdiff` | `jsondiffpatch` |
| :--- | :--- | :--- | :--- |
| **Execution Time** | `33.08 ms` | **`27.36 ms`** | `768.29 ms` (Slow) |
| **Diff Size (Bytes)** | **`130 B`** | `198 B` | `131 B` |
| **Memory Allocation** | **`~0 MB`** | `6.45 MB` | **`~0 MB`** |

### 4. JS-Native Features & Accuracy
*Testing modern JavaScript support and complex edge case handling.*

| Feature | `@opentf/obj-diff` | `microdiff` | `jsondiffpatch` | `fast-json-patch` |
| :--- | :--- | :--- | :--- | :--- |
| **Date** | ✅ | ✅ | ✅ | JSON only |
| **Map** | ✅ | ❌ | ❌ | ❌ |
| **Set** | ✅ | ❌ | ❌ | ❌ |
| **Circular Refs** | ✅ | ✅ | ✅ | ❌ |
| **RegExp** | ✅ | ✅ | ✅ | ❌ |
| **Sparse Arrays** | ✅ | ✅ | ✅ | JSON only |

**Conclusion:** `@opentf/obj-diff` offers the exactness and JS-native feature set that JSON-patch libraries lack, while remaining orders of magnitude more scalable than older, heavy libraries like `jsondiffpatch`.

### Running Benchmarks Locally
```sh
bun run benchmarks/category-a-diff.js
bun run benchmarks/category-b-patch.js
bun run benchmarks/category-c-large.js
bun run benchmarks/category-d-accuracy.js
```

---

## ❓ FAQs

### 1. Why is JSON Patch (RFC 6902) not supported?
The JSON Patch protocol is quite heavy and complex. We've optimized `@opentf/obj-diff` for performance and simplicity, which covers the vast majority of real-world use cases.

### 2. What does an empty path `path: []` mean?
An empty path denotes the **Root** of the object. It typically means the entire source was replaced by the target value (e.g., comparing an object to `null`).

---

## 📖 Articles

Explore the philosophy behind our standard library:
- [Introducing Our New JavaScript Standard Library](https://ganapathy.hashnode.dev/introducing-our-new-javascript-standard-library)
- [You Don’t Need JavaScript Native Methods](https://ganapathy.hashnode.dev/you-dont-need-javascript-native-methods)

---

## 📄 License

This project is licensed under the [MIT License](./LICENSE).
