# Post-freeze early failure-contract iteration

Declared 2026-09-20 after all three `fa7c874` candidate runs completed. That
iteration passed the original acceptance 3/3 and the unchanged supplemental
probe 2/3. Retain all three outcomes. In its failing repetition the agent first
read the new verification paragraph after implementation; this is an observed
sequence, not proof of the failure's cause.

This candidate adds an early reliability trigger in English and Chinese
`shape.md` and a focused pre-implementation regression step in
`design-lenses.md`. The step maps failure phases, remaining obligations,
observer-visible state and propagated errors, then tests simultaneous failures
before editing. It names no Flask API, hidden assertion, reference patch or
benchmark-specific implementation. It explicitly distinguishes contractual
acceptance from extra robustness probes.

Freeze the candidate package commit before running three fresh D-17
repetitions. Use the same original prompt, baseline, model, dependency lock,
20-minute limit, public command and original hidden acceptance. Replay the
unchanged supplemental test against all three patches afterward. Report every
original and supplemental result, time, available tokens and completion-evidence
audit, including whether the early regression step was actually followed.

The target remains original 3/3, supplemental 3/3 and no unsupported completion
claim. This is a second failure-informed exploratory iteration, not an independent
held-out evaluation, causal ablation or updated five-method ranking. Preserve
the formal 45-run comparison and the first exploration without changing their
scores or replacing unsuccessful repetitions.

## Package-scope clarification after launch

Recorded before the root reviewer observed any second-iteration result summary:
candidate `3090c729b9631abd74013674cd883cdf5e69f8a9` also includes main's
intervening CLI changes relative to `fa7c874`: Windows write/lock handling,
batched current-content fingerprints, runtime-path lookup and portable importer
matching (`src/lib/evidence.js`, `fs.js`, `git.js`, `runtime-path.js`). The four
guidance files are the new intervention at 3090c72, but the whole candidate is
not a guidance-only diff from the previous candidate. This is a product
iteration, not an isolated guidance ablation. No running candidate, prompt,
budget, probe or outcome is changed by this clarification.
