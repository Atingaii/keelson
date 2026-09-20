# Engineering record

### Ruling: scope and authority
The owner's remediation request authorizes the new evidence format, small installation layout, required dependencies, local comparative evaluations, documentation and remote main submission. Keep `.keelson/` versioned without generating ignore rules. npm publication and tags remain separate actions.

### Ruling: baseline and acceptance
Baseline `f6ce125` passed all 88 tests locally. Historical failures and superiority claims in the draft are hypotheses, not current results. The fixed engineering and benchmark criteria are recorded in `docs/remediation-assessment.md`; all benchmark attempts, including environment failures, remain visible.

### Dispatch: core implementation and independent review → deep (gpt-5.6-terra reviewer)
Result: pass
Independent read-only review covered evidence, check activity, landing recovery, lifecycle gates and Git fingerprints. It confirmed that a newly copied foreign signature cannot inherit trust from an older local success. Moving check registration before change lookup and refusing recovery during active checks closed two lifecycle races.

### Ruling: deadline and concurrent file scan repairs
The reviewer reproduced an escaped child holding output pipes after the process group was killed. Checking now has an idempotent completion path and a bounded pipe-close fallback, reporting `terminationUnconfirmed` instead of claiming that escaped processes were reaped. A concurrent-writer run exposed a separate exists/lstat race on atomically renamed temporary keys; one lstat with missing-entry handling fixes it and also rejects dangling symlinks.

### Note: core verification
`node --test tests/evidence.test.js tests/transaction.test.js tests/git.test.js tests/decisions.test.js` passed 17/17 after those repairs. This is a targeted result, not authorization to land: installation migration, lossless sharding integration, full-suite checks and the frozen comparisons are still being completed.

### Ruling: test contract updates
Tests that required copied package guidance, in-project private runtime or generated ignore rules must be updated to the explicitly requested installation contract. Behavioral assertions for preservation, lossless sharding, verification and gates stay in place. The full integration run exposed two sharding regressions; these are implementation defects to fix, not assertions to remove.
