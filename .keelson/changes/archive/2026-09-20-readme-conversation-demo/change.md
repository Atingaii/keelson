---
tier: quick
created: 2026-09-20
status: in-progress
owner: ubuntu
branch: main
---

# readme-conversation-demo

## Why
The CLI-focused GIF does not show the owner's actual experience: make a request inside a repository, let the coding agent handle the workflow, and see the result.

## What
- Replace the terminal-command demo with a concise replay of a real coding-agent conversation in an initialized example repository.
- Keep user requests, assistant replies, and verified results prominent; condense internal tool activity.
- Reorganize both READMEs around positioning, practical problems, requirements, quick start, conversation examples, project footprint, engineering principles and documentation. Keep the introduction concise and retain enough source material to reproduce and verify the animation.
- Owner requested a prompt commit without CI/test-suite execution for this documentation/media change; perform content, media and independent review only. The example agent run may execute its own fixture tests as demonstration evidence.

## Acceptance
- [x] The visible user only speaks naturally; no manual Keelson command sequence is presented as the normal user flow — check: visual review of both GIFs.
- [x] Assistant replies and completion claims are grounded in a real agent run and independently checked repository changes — check: raw session events, diff, tests and verification records.
- [x] Both language versions are readable, concise, reproducible and accurately described in the README — check: independent review, local-link checks and asset metadata; repository CI/test suites are explicitly waived for this change.
