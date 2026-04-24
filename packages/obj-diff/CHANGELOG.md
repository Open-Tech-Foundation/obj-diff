# @opentf/obj-diff

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
