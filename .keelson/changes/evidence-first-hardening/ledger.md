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

### Dispatch: fresh-reader review → deep (gpt-5.6-terra)
Result: fail
The reviewer reproduced data loss when an interrupted Git project was moved: the old absolute recovery target could delete unrelated replacement data at the former location. It also found that attest did not resolve an original change name to its dated archive. Both findings require fixes before release.

### Ruling: validate recovery before deletion
Recovery journals now store project-relative targets and runtime-relative session targets. All entries and required backups are validated before any removal; moved legacy journals fail closed and remain available for manual recovery. Targeted transaction and landing tests passed 9/9; the two moved-project regressions both failed against the preceding implementation in an isolated counterfactual check.

### Note: review workspace correction
The reviewer accidentally initialized the main checkout and misidentified newly generated benchmark license files as its own temporary output. Its tracked edits were restored, and the deleted task-created license files were regenerated from the pinned upstream sources with verified hashes before commit. Subsequent reviewer work is read-only; cleanup must use exact paths recorded when the reviewer creates its own fixtures.
