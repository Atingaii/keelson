---
tier: quick
created: 2026-09-20
status: in-progress
owner: ubuntu
branch: main
---

# npm-release-preparation

## Why
Users currently have to clone the source and keep it linked. Prepare a public npm package so installation can become a global npm install followed by one project initialization.

## What
- Explicitly configure public publication to the official npm registry while retaining the existing package name until the owner has an npm identity.
- Add bilingual first-publication and installation guidance, linked from contributor/onboarding documentation; keep unpublished status accurate.
- Inspect the actual tarball and smoke-install it in a disposable prefix, including initialization and installed guidance.
- Preserve the current release workflow and its tests. Do not publish, push a tag, create accounts or trigger CI.

## Acceptance
- [x] The tarball has the CLI and guidance, excludes repository-only/private material, and declares public npm publication — check: actual pack manifest and contents.
- [x] Installation from that tarball supports version, initialization and package guidance outside this checkout — check: isolated installation smoke run.
- [x] Documentation covers account setup, scope ownership, first publication and post-publication installation without claiming the package is already available — check: independent review and local links.

## Open questions
- Owner has no npm account yet; register an account and confirm its username/scope — blocks: final package identity and first public release.
- First public release requires the owner's explicit approval under INTENT.md — blocks: npm publish and version tag push only.
