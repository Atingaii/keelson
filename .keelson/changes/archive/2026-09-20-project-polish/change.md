---
tier: spec
created: 2026-09-20
status: in-progress
owner: ubuntu
branch: main
touches: [skills/**, docs/**, src/**, tests/**, README*, registry/**]
---

# Project polish

## Why
Make Keelson a focused, complete engineering tool with actionable frontend design workflows and clear command discovery.

## What
- Outcome: discoverable bilingual design actions covering planning, review, visual craft, interaction, adaptation, performance, iteration and delivery.
- Outcome: concise CLI help, reference discovery, accurate standalone project documentation and a clean current tree.
- Non-goal: package publication, replacing the user's browser tooling, rewriting Git history or claiming identical results across models.

## How
Keep the small skill router; load focused guidance on demand. Design commands print actionable agent briefs without silently executing code or contacting a site. Preserve existing integrity, migration and lifecycle behavior.

## Impact
- Public CLI: additive design actions, guide listing and focused help.
- Documentation and package skill content in English and Chinese.
- Historical migration fixtures remain byte-exact compatibility inputs.

## Acceptance
- [x] Design actions and reference discovery work in both languages, in projects and outside them — test: `node --test tests/design.test.js`
- [x] Help is concise, scoped help is equivalent, and invalid commands fail without side effects — test: `node --test tests/design.test.js`
- [x] Guidance covers real task states, visual decisions and observed browser verification; language trees and ids agree — test: `node --test tests/repo.test.js`; review: task walkthroughs
- [x] Current docs resolve local links, published package includes every design reference, and removed material has no live links — test: repository and package checks
- [x] Full lint/test suite and project validation pass — check: configured suite; completion additionally requires the native fresh signed-evidence gate

## Open questions

## Decisions
- cli: Design actions prepare an agent workflow; the host agent implements and uses available browser tools. Printed guidance is never reported as an executed audit.
- cli: Existing user authorization covers the CLI and skill improvements. Preserve settled product decisions and existing design systems.
