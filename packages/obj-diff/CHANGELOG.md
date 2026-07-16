# @opentf/obj-diff

## [Unreleased]

### Fixed
- Fixed `patch()` losing `null` prototypes of nested objects; previously only the root object's `null` prototype was preserved.
- Fixed two invalid `Date`s (`NaN` timestamps) being reported as changed; they now compare as equal, consistent with `NaN === NaN` handling for primitives.
- Fixed `Error` objects with equal messages but different custom properties (or different error classes with the same message) comparing as equal. Errors now compare by prototype, `name`, `message` and own enumerable properties, and are replaced wholesale when they differ.
- Fixed boxed primitives (`new Number()`, `new String()`, `new Boolean()`) ignoring custom properties: equal-valued boxes now diff their own enumerable properties; different values report a replacement.
- Fixed class instances always comparing as equal: non-plain objects fell through to a string comparison where both sides stringify to `[object Object]`. Instances sharing the same prototype are now diffed by their own enumerable properties, and instances of different classes are reported as replaced.
- Fixed `patch()` corrupting `Map`s that use object keys: cloning the map broke key reference identity, so patches missed the entry and inserted a duplicate key instead. Non-primitive patch keys are now matched against existing map keys by structural equality.
- Fixed `patch()` mutating the target object it was diffed against: the sparse array cleanup walked the whole result, following values inserted by reference, and compacted sparse arrays belonging to the caller's objects.
- Fixed `patch()` compacting sparse arrays that no patch touched, shifting indices of unrelated data. Array cleanup is now limited to arrays that actually received deletions, and only trailing holes are truncated — so patching to a sparse target (e.g. `[1, 2, 3]` → `[1, , 3]`) now round-trips correctly.
- Fixed `patch()` producing a wrong `Set` when shrinking it by two or more elements. `Set` deletions are now emitted in descending index order so sequential removal during patching no longer shifts pending indices.
- Fixed asymmetrical circular reference diffing to avoid false positives and stack overflows.
- Improved comparison of unhandled object types (e.g. `RegExp`) by falling back to string value comparison.
- Fixed deep `patch()` traversal failing when encountering `Set` collections.
- Fixed sparse array cleanup after patching to also cover arrays nested within `Map` values and `Set` elements.

### Changed
- `patch()` now throws a descriptive `TypeError` naming the failing path when a patch references a path that does not exist in the object, instead of an opaque error from deep inside the traversal.
- Objects that are the same reference now short-circuit as equal without a deep walk.
- The `DiffResult` `path` type widened from `Array<string | number>` to `Array<unknown>`: object keys are strings and array/Set indexes are numbers as before, but `Map` entries use the map key itself, which can be a value of any type.

### Added
- **Compact array diffs**: two new array-only op types — `INSERTED` (`type: 3`, splice the value in at the index) and `REMOVED` (`type: 4`, splice the element out) — with application-time indexes. `diff()` now trims the common prefix and suffix of arrays and emits splice ops for insertion/removal runs, so inserting one element at the front of a 10k-element array produces **1 op instead of 10,001**. Existing types `0`/`1`/`2` keep their exact semantics and previously serialized patches still apply. Sparse arrays and arrays with non-index properties keep the previous key-based diff.
- Exported the diff type constants (`DELETED`, `ADDED`, `CHANGED`, `INSERTED`, `REMOVED`) and the `DiffType` type from the package root.
- Native diffing support for `ArrayBuffer` and `DataView`: contents are compared byte-by-byte (including `byteOffset`/`byteLength` for views) instead of always comparing as equal via the string fallback.
- Native diffing and patching support for all JavaScript TypedArrays (`Uint8Array`, `Float32Array`, `BigInt64Array`, etc.) allowing precise element-level diffs and preserving array types during patching.
- Added comprehensive accuracy evaluation script (`evaluate.js`) covering ES6 collections and edge cases.
- Added updated benchmark competitors (`deep-diff-ts`, `@adobe/optimized-diff`).
- Updated README.md with detailed Accuracy vs Performance matrices.

## 0.14.0

### Minor Changes

- e475557: - Added comprehensive JSDoc documentation to all public API symbols (diff, diffWith, patch, DiffResult) to improve JSR score and developer experience.
  - Fixed an issue where the JSR publish was failing due to uncommitted build artifacts by adding the --allow-dirty flag.
  - Updated GitHub Actions to opt-in to Node.js 24, future-proofing the CI/CD pipeline.

## 0.13.1

### Patch Changes

- 5f0b4e6: Update pkg readme with updated docs.

## 0.13.0

### Minor Changes

- 5d846d9: - Modernized the entire build and test pipeline using Bun and a custom ESBuild-based bundling script.
  - Significantly improved core robustness by fixing infinite recursion on circular references in `patch()`.
  - Enhanced array diffing to correctly handle sparse array holes and non-numeric properties.
  - Added preservation for `null` prototypes during the patching process.
  - Refined `diffWith()` to support "Explicit Equality" by allowing the custom comparator to return `false` to bypass deep-diffing.
  - Consolidated GitHub Actions into streamlined CI and Release workflows with integrated JSR and NPM support.

## 0.12.0

### Minor Changes

- e5b61db: Added value prop to the Set removed diff results.

## 0.11.0

### Minor Changes

- 01f7696: Added deep diffing support for Map & Set objects.

## 0.10.0

### Minor Changes

- b32e7c8: Fixed circular refs.

## 0.9.0

### Minor Changes

- 39521b0: Fixed other object null type checking.

## 0.8.0

### Minor Changes

- 03ba9e0: Added diffWith function to compare custom object types.

## 0.7.0

### Minor Changes

- 802d3f9: Fixed mixed type comparison.

## 0.6.0

### Minor Changes

- d60d2d8: Fixed Map & Set size diff.

## 0.5.0

### Minor Changes

- f0a3e0f: Added patch function.

## 0.4.0

### Minor Changes

- e36912a: Fixed null comparisons.

## 0.3.1

### Patch Changes

- 9975840: Updated readme with demo image & url.

## 0.3.0

### Minor Changes

- 1a041b6: Added import types in index file.

## 0.2.0

### Minor Changes

- f85f616: Exported the missing DiffResult type.

## 0.1.2

### Patch Changes

- d359800: Updated pkg keywords.

## 0.1.1

### Patch Changes

- 6ac2639: docs: added missing readme.

## 0.1.0

### Minor Changes

- f565ea5: Added diff function to deep diff two objects.
