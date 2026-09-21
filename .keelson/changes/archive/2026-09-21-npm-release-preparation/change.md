---
tier: quick
created: 2026-09-20
status: in-progress
owner: ubuntu
branch: main
---

# npm-release-preparation

## Why
Users currently have to clone the source and keep it linked. Publish a public npm package so installation becomes a global npm install followed by one project initialization.

## What
- Publish version 0.4.0 to the official public npm registry as @zyaiting/keelson, using the owner's authenticated account and explicit release authorization.
- Make npm installation the default in both READMEs and onboarding guides; update maintainer instructions and release notes.
- Inspect the actual tarball and verify installation, initialization and installed guidance from the public registry in a disposable prefix.
- Preserve the release workflow and tests. Do not create accounts or push a tag that would trigger a duplicate release or CI.

## Acceptance
- [x] The @zyaiting/keelson tarball contains the CLI and guidance, excludes repository-only/private material, and declares public npm publication — check: actual pack manifest and contents.
- [x] Version 0.4.0 is publicly available and supports version, initialization and guidance after registry installation outside this checkout — check: anonymous registry lookup and isolated installation smoke.
- [x] Bilingual README/onboarding and maintainer documentation agree on the actual package name, install/upgrade commands and publication state — check: review and local links.

## Decisions
- Publication: the owner registered as zyaiting, logged in and explicitly requested direct npm publication and README installation updates. Publish @zyaiting/keelson; retain Atingaii as the GitHub owner and project author.
- Automation: publish from this authenticated terminal. Do not push a release tag because the existing workflow would publish the same version again.
