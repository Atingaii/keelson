---
tier: spec
status: in-progress
owner: Atingaii
branch: main
---
# Evidence-first hardening

## Why
Implement the reviewed remediation plan with verifiable checks, durable contracts, a small installation footprint, and reproducible local Codex comparisons.

## What
Signed verification, bounded execution, Markdown preservation, small host installs, durable decisions, local comparative measurements and accurate documentation.

## How
Implement CLI primitives with independent parser/installation review, then run fixed local Codex tasks and preserve raw evidence.

## Alternatives
Keep prose verification was rejected because it cannot distinguish generated claims from executed evidence. A daemon/service was rejected because local file-backed state meets the requested scope.

## Impact
Legacy prose needs a new check. Default guidance loads from the installed package; vendor mode remains available. No npm release is performed.

## Acceptance
- [x] Structured evidence rejects prose forgery, tampering, stale code/contracts, partial checks, and checks that modify inputs. — test: tests/evidence.test.js
- [x] Atomic writes, concurrent records, command trust and bounded execution have regression coverage. — test: tests/evidence.test.js and tests/transaction.test.js
- [x] Markdown contracts preserve code fences and Unicode through parsing, merging and sharding. — test: tests/markdown.test.js and tests/land.test.js
- [x] Default Codex installation stays small, preserves user content and does not edit .gitignore. — test: tests/cli.test.js
- [x] Decision records support bounded questions and prevent silent reopening of settled decisions. — test: tests/decisions.test.js
- [x] Fixed open-source tasks are evaluated using local Codex with gpt-5.6-terra against OpenSpec, Trellis and Superpowers; raw evidence and limitations are retained. — manual: benchmarks/README.md and retained run records
- [x] English and Chinese README, migration/security documentation and generated wide banner match shipped behavior. — manual: README.md, README_CN.md, docs/verification.md and docs/assets/keelson-banner.png
- [x] All required local checks pass, main is pushed, and remote branch cleanup is verified. — manual: npm run lint, npm test (154/154 on final shipping code), keelson validate, main 93f0822 push and git ls-remote (only main)

## Decisions
- The user's 2026-09-20 instruction authorizes implementation, dependencies needed for correctness, documentation, benchmark execution and remote main submission.
- Keep .keelson versioned; no generated .gitignore changes.
- Evaluate claims from original results rather than inheriting the draft's superiority or compliance claims.

## Rollout
Legacy specifications remain readable. Legacy prose evidence must be rechecked. Machine-local runtime relocates outside tracked files. npm publication is separate from the requested Git push.
