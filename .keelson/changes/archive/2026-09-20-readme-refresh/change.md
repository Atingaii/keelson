---
tier: quick
created: 2026-09-20
status: in-progress
owner: ubuntu
branch: main
---

# readme-refresh

## Why
The READMEs lead with verification internals, obscure the normal conversational workflow, and leave initialization and optional vendoring difficult to understand.

## What
- Rewrite the English and Chinese READMEs around value, installation, everyday use, frontend design, and the actual initial project layout.
- Keep advanced manual operation and trust details discoverable without dominating the introduction.
- Align the Chinese getting-started command and links with the Chinese README.

## Acceptance
- [x] Both READMEs clearly describe the conversational workflow, actual initial files, progressive project growth, and optional vendoring — check: independent documentation review against the CLI and initialization implementation.
- [x] Commands, design action counts, support claims, and local links match the project; both languages cover the same scope — check: independent review and existing repository/documentation tests.
