---
"@opentf/obj-diff": minor
---

- Modernized the entire build and test pipeline using Bun and a custom ESBuild-based bundling script.
- Significantly improved core robustness by fixing infinite recursion on circular references in `patch()`.
- Enhanced array diffing to correctly handle sparse array holes and non-numeric properties.
- Added preservation for `null` prototypes during the patching process.
- Refined `diffWith()` to support "Explicit Equality" by allowing the custom comparator to return `false` to bypass deep-diffing.
- Consolidated GitHub Actions into streamlined CI and Release workflows with integrated JSR and NPM support.