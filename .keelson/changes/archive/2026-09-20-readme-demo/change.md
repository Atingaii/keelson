---
tier: quick
created: 2026-09-20
status: in-progress
owner: ubuntu
branch: main
---

# readme-demo

## Why
The README reads like a manual. The owner wants a concise project introduction, a short description of its capabilities, and an actual animated workflow demonstration.

## What
- Shorten both READMEs to an introduction, a real demonstration, four concrete capabilities, source installation, and conversational use.
- Add original English and Chinese GIFs rendered from real CLI runs in an isolated example project, with a reproducible development script and retained raw output.
- Keep detailed configuration, structure, host support, and verification explanations in existing linked documentation.

## Acceptance
- [x] Both READMEs are substantially shorter, equivalent in scope, and link to the full guidance without unsupported claims — check: independent documentation review and existing README/link tests.
- [x] Both GIFs show an actual failed check, an actual repair, a passing check, and completed archiving; captions and terminal text remain readable — check: raw run exits and output, GIF metadata, and visual frame inspection.
- [x] The demo is reproducible and isolates disposable project state; temporary reference material and frames are removed after review — check: script review and explicit cleanup of task-owned paths.
