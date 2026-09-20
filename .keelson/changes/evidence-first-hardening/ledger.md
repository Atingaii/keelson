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

### Note: complete legacy ownership matrix
The baseline-derived en/zh × lean/guided × guide-on/off fixtures now cover all eight migration combinations. Exact CodeBuddy copied hooks retire; byte edits and hidden user neighbors remain. The integrated suite at `0ffa425` passes 130/130 with no skips; lint and project validation pass. Raw TAP and its digest are retained in `evals/engineering/2026-09-20-local/`. Independent review is still pending, so this result does not close its release gate.

### Note: measured CLI latency baseline
The fixed 5000-file, 30-sample CLI baseline is retained in `benchmarks/cli-performance.json`. Signed status/context, impact and check overhead exceed the declared p95 targets. Profiling identified repeated Git snapshot creation and private-runtime lookups; an optimization is in progress and must retain content-based freshness, fail closed on unreadable inputs, and preserve all earlier samples. No threshold is being relaxed to turn these misses into passes.

### Dispatch: migration ownership re-review → deep (gpt-5.6-terra)
Result: fail
The reviewer confirmed that scanning children did not reject a symbolic link at the generated directory root. Workflow and copied-hook ownership also followed file links. Matching target bytes must not authorize removing the user's link. Root-authored directory/file-link regressions both fail on `5c66985`; lstat-based protection makes both and the targeted migration selection pass (10 executed, 51 unselected). Directory links use Windows junctions in that test; file-link assertions explicitly require POSIX privileges. A further review found that the baseline's checked-in old Claude hooks differ from its CLI's newly generated hooks; both proven historical variants need separate provenance and ownership coverage.

### Ruling: separate generated hooks from installed historical snapshots
The earlier fixture represented `f6ce125:.keelson/hooks/`, while a new v0.3 install copies `f6ce125:hooks/`. Both now have explicit provenance and exact normalized hashes; ownership accepts only that known union. The fresh-hook regression fails on `b2ada9c`, then passes after the fix. The complete targeted migration selection passes 11 executed tests. Independent re-review accepted root/file-link preservation and independently regenerated all four skill trees, four workflows and two shims from the baseline, matching the static fixture manifest.

### Dispatch: final migration ownership review → deep (gpt-5.6-terra)
Result: pass
Read-only review of `599ee44` found no remaining P1/P2 in this scope. It independently matched baseline-generated language/profile/workflow/shim hashes, both exact Claude hook sources and the CodeBuddy hook, and checked directory/file-link plus hidden-neighbor preservation. The static review and syntax/diff checks pass; the root's subsequent integrated suite is recorded separately.

## 2026-09-20 complete ownership regression

`npm test` passes 133/133 with zero skips on Linux after production code 599ee44 (documentation-only 61a48e0 landed during the run). Raw TAP and SHA-256 are archived in `evals/engineering/2026-09-20-local/`. Lint, project validation and package dry run pass; package has 121 files and no `.keelson/` entries. Independent migration review is PASS. Performance and fixed model comparisons remain open; this is not the final release gate.

## 2026-09-20 first remote CI

Main 5504180 was pushed. Run https://github.com/Atingaii/keelson/actions/runs/35509408551 passed Ubuntu Node 20/22; macOS Node 20 exposed a test-fixture identity error: `/var` aliases resolve in child-process cwd, while the test computed its expected recovery key from the alias. Reproduced the exact failure on Linux using a symlinked TMPDIR, then canonicalized newly created fixture directories; the regression passes. Production permission behavior was unchanged. Matrix fail-fast is disabled so all six environments report independently; canceled jobs are not passes.

## 2026-09-20 exploratory verification guidance

The first original Keelson D-17 supplemental replay fails at the extra context-popped boundary: a late receiver exception replaces collected errors. The original acceptance still passes. Added a general English/Chinese verification paragraph covering failure chains, late observers and preserved outer state. Declared three fresh repetitions and unchanged supplemental replay in `evals/supplemental/ITERATION.md` before running them. This is a post-observation exploratory iteration, not a replacement ranking or proven causal benefit. Repository guidance checks pass 17/17 (`node --test tests/repo.test.js`).

## 2026-09-20 Windows sharing conflicts

Remote 6e2a3f8 passes Ubuntu/macOS Node 20/22. Windows Node 20 fails concurrent trust-record rename with EPERM; Node 22 fails exclusive signing-lock open with EPERM. Both raw TAP extracts are retained. Serialize trust decisions and skip identical writes; retry Windows transient sharing errors within existing lock deadlines and a one-second atomic-rename bound, never unlinking the destination or another writer’s lock. Five fault-injection cases yield four expected failures against fa7c874; the fixed cases plus the full evidence suite pass 14/14 locally. Real Windows rerun and independent review remain required.

Remote old branches were rechecked at fcfbb76 and had no unique commits. Explicit SHA leases deleted all three; `git ls-remote --heads origin` now reports only main. Local active worktrees remain until delivery.

- Independent Windows remediation review: PASS, no P1/P2 findings. The reviewer reproduced all 14 filesystem/evidence cases with no skips and verified archived CI/error-injection hashes. Linux syntax and `validate` checks pass. Real Windows CI remains the platform acceptance gate; a persistent Windows ACL error can report lock timeout after the bounded wait.

- Remote CI at 544391f is green: GitHub Actions run 35510170688 completed all six Ubuntu/macOS/Windows × Node 20/22 jobs successfully. Windows log confirms 138 tests, 135 pass, zero fail and three explicit POSIX-only skips. The API result is retained at `evals/engineering/2026-09-20-local/ci-544391f.json`; later integration requires another final CI run.
