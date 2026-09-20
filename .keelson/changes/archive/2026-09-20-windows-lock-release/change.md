---
tier: quick
created: 2026-09-20
status: in-progress
owner: ubuntu
branch: main
---

# Windows lock release

## Why
Concurrent checks can finish their writes but fail when Windows briefly denies removal of the owned ledger lock. CI reproduced this in the sixteen-writer integration scenario.

## What
Retry only owned-lock deletion for transient Windows sharing errors, with a one-second deadline. Keep callbacks single-shot and propagate persistent or unrelated failures.

## Acceptance
- [x] Transient release failures recover without repeating the protected write; the next writer can acquire the lock — test: `node --test tests/fs.test.js`
- [x] Permanent release failures remain bounded and preserve the lock; unrelated errors are not retried — test: `node --test tests/fs.test.js`
- [x] Concurrent signed check writers retain every record and valid log reference — test: `node --test tests/evidence.test.js`
