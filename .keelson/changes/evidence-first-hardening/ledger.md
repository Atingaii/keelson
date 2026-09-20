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

### Dispatch: recovery re-review → deep (gpt-5.6-terra)
Result: pass
Static review of `6c33053` confirmed that moved projects and invalid or incomplete journals are validated in full before target deletion. No remaining P1/P2 was found within that recovery scope.

### Note: integrated verification and real migration
The integrated suite at `8d15bd1` passed 124/125 tests; its only failure is the repository's own lightweight installation assertion. Running the actual 0.3-to-0.4 migration exposed incorrect legacy lean-file hashes and rejection of an unchanged old discovery shim. Those defects are being fixed with fixtures captured from the actual baseline, rather than bypassed with `--force`. Generated project maps and handoff guidance now describe package guidance, durable signed logs and private runtime accurately.

### Dispatch: archived attestation review → deep (gpt-5.6-terra)
Result: fail
The new original-name resolver could confuse a legacy change named `tidy-cancelled` or `tidy-<digits>` with a suffix belonging to `tidy`. Legacy names without explicit metadata must not guess across those suffixes; an exact archive directory remains available.

### Dispatch: archived attestation re-review → deep (gpt-5.6-terra)
Result: pass
Original-name aliases now refuse uncertain legacy suffixes, including mixtures with a proven ordinary or metadata-backed candidate. Exact archive names and active changes retain priority. The two attestation tests pass; real counterfactual runs against `8d15bd1` and `703860c` each fail the relevant regression. Read-only independent review confirmed the P1 and mixed-candidate P2 are resolved.

### Ruling: benchmark code freeze and migration work
The clean implementation at this attestation fix is frozen for fresh-install Flask comparisons. The previous integrated test run passed all tests except this repository's old installation migration. That migration and user-file preservation remain release gates, but do not block measuring the already-covered fresh-install path. The report must identify the exact measured commit and separately disclose later migration-only changes; if a later change affects the measured path, assess and rerun affected experiments explicitly.

### Ruling: close existing privacy and evaluation gaps
The draft's private-ablation requirement was still uncovered: reused empty recovery directories could remain accessible to other POSIX users. Restrict them to `0700` before copying and preserve round-trip contents. This does not change the frozen benchmark's fresh-install/code-edit path. A separate frozen D-17 supplemental test checks requirements absent from the original hidden test, with the same patch-replay test for every method and no rewriting of original scores.

### Ruling: real migration and language switching
The exact baseline fixture now includes its Claude hook settings. Three root-authored regressions failed before the repair: stale copied-script registrations, mixed-group hook migration, and changing the language of an unchanged generated shim. Only exact known old commands are retired, preserving neighboring user hooks. A manifest's prior version permits recognized generated shims in either supported language; custom text still stops before config writes. The targeted migration/preservation selection passes 8/8.

### Note: integrated Codex dogfood verification
This repository successfully ran `update --codex --no-hooks` without `--force`, removing the proven old copied runtime and refreshing the Codex discovery surface. `doctor --session` reports native `CODEX_THREAD_ID`, zero errors and zero warnings. The subsequent complete suite passes 126/126, with no skips; lint and project validation pass. Package dry-run contains 121 files (174,665 compressed bytes; 495,468 unpacked bytes) and no project `.keelson/` state. Benchmark and final remote verification remain open.

### Dispatch: full legacy migration review → deep (gpt-5.6-terra)
Result: fail
Read-only review accepted exact old hook-command matching, neighboring-hook preservation, current generated-shim language switching and POSIX ablation permissions. It found incomplete legacy ownership coverage: v0.3 Chinese shims and Chinese/guided guidance were not recognized, and the known CodeBuddy copied script was missing from the retirement list. The full supported generation matrix now requires exact baseline-derived fixtures and regression coverage before release; the passing English/lean migration does not establish those variants.
