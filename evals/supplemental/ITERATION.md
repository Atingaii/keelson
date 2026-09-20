# Post-freeze verification-guidance iteration

Declared 2026-09-20, after the first original Keelson D-17 patch failed the
frozen supplemental probe at a context-popped receiver. The original formal
comparison remains on Keelson `7b2c303`; its prompts, patches and scores do not
change. Bare and Trellis supplemental outcomes had also been inspected.

The candidate change adds one general paragraph to English and Chinese
`verify.content`: trace the full failure/cleanup path, inject simultaneous
failures in distinct phases, and inspect propagated errors and state visible to
final observers as well as the caller. It contains no Flask names, reference
patch, hidden assertions or benchmark-specific solution.

Run three fresh D-17 repetitions with the same original task prompt, baseline,
model, dependency lock, public command and original hidden acceptance. Freeze
the candidate package commit before those repetitions. Only afterward replay
the unchanged supplemental test against all three candidate patches. Report
original and supplemental pass counts for every repetition, alongside tokens,
time and completion-evidence audit. Retain all failures and environment errors.

The target is three original and three supplemental passes, with no unsupported
completion claim. This is an exploratory iteration informed by an observed
failure, not an independent held-out evaluation or a replacement five-method
ranking. A higher score alone cannot establish that the guidance caused the
improvement; stochastic model variation and concurrent execution remain
alternative explanations. Any further change requires another declared
iteration and preservation of this one.
