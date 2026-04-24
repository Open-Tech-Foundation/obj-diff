---
"@opentf/obj-diff": minor
---

- Added comprehensive JSDoc documentation to all public API symbols (diff, diffWith, patch, DiffResult) to improve JSR score and developer experience.
- Fixed an issue where the JSR publish was failing due to uncommitted build artifacts by adding the --allow-dirty flag.
- Updated GitHub Actions to opt-in to Node.js 24, future-proofing the CI/CD pipeline.
