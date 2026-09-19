# Evolving the harness

A useful harness does two jobs: it makes the desired path easier **before** the agent acts, and it gives the agent cheap signals to self-correct **after** it acts. The goal is not to script the model. The goal is to move stable engineering knowledge out of chat and into the smallest control that can reliably carry it.

## Enforce invariants, not implementation taste
<!-- keelson: id=harness.invariants | without: prose micromanages implementation details, goes stale with the code, and agents satisfy the recipe while violating the real boundary | sunset: never -->

Write the durable thing that must remain true: dependency direction, API compatibility, data validation at a boundary, an acceptance condition, a latency budget. Do not prescribe a library, class layout, or sequence of edits unless that choice is itself part of the contract.

Route the invariant to the narrowest authority:

- observable product behaviour → capability spec;
- path-specific engineering convention → `.keelson/rules/`;
- measurable invariant → `config.yaml → check` with `kind: fitness`;
- temporary implementation choice → `change.md`, then delete it when the change lands.

A good mechanical check reports **what invariant failed and where**, then lets the agent choose the repair.

## Put each control at the cheapest useful point
<!-- keelson: id=harness.control-loop | without: everything becomes always-on prose or a late CI surprise, wasting context before the edit and feedback time after it | sunset: never -->

| | Before generation (feedforward) | After generation (feedback) |
|---|---|---|
| inferential | resident block, skill, scoped rules, specs | fresh-reader review, semantic review |
| computational | codemods, typed APIs, generators | lint, typecheck, unit/integration tests, structural/fitness checks |

Keep cheap deterministic controls close to the edit. Run targeted checks inside the BUILD loop, the configured full check set before completion, and slower/expensive review only when risk justifies it. Do not duplicate the same rule across resident instructions, skill prose, a rule file, and CI; choose one source of truth and point to it.

## Promote repeated mistakes instead of growing prompts
<!-- keelson: id=harness.promotion | without: recurring mistakes live as chat folklore, while every incident adds more prose and the always-on context grows without becoming more enforceable | sunset: when project-specific controls can no longer be traced to a live invariant or recurring failure -->

Use this promotion ladder:

1. **First occurrence:** fix the defect; record the root cause if it reached verification.
2. **Repeated class of failure:** run `keelson retro`; name the stable invariant the failures have in common.
3. **Semantic prevention:** add or tighten the narrowest spec/rule/reference that helps the agent choose correctly before editing.
4. **Deterministic prevention:** if a script can detect the violation reliably, make it a `fitness` check; if it is fast enough, wire it into the normal local/CI path.
5. **After automation proves reliable:** shrink or remove prose that merely repeats what the check now enforces.

Do not automate one-off taste disagreements. Promotion is justified when the failure is recurring, costly, and has a stable signal.

## Preserve failure attribution and regression power
<!-- keelson: id=harness.attribution | without: the agent fixes failures that pre-date its change or records green checks that would also pass with the bug restored | sunset: never -->

Before risky work, establish a targeted baseline when otherwise you could not tell whether a failure is pre-existing. During implementation, prefer the smallest check that localizes the current slice. For a bug fix, keep a negative regression check: with the fix removed, the new test must fail. At completion, run the fresh configured check set against the exact tree you are claiming about.

A failing baseline is not permission to ignore the suite. Record the pre-existing failure, avoid widening it, and verify the changed surface independently until the baseline can be repaired.

## Keep the harness revisable
<!-- keelson: id=harness.adaptive | without: the repository accumulates workarounds for old model limitations and every future agent pays their context and process cost | sunset: when every non-permanent control has an explicit removal trigger and retro is run regularly -->

Every harness rule encodes an assumption about what the agent or project cannot safely do unaided. Re-test those assumptions. Prefer controls tied to project invariants over controls tied to one model's current quirks. When a control exists only to compensate for observed agent behaviour, give it a sunset condition or measurable reason to keep it.

`keelson retro` is the maintenance loop: use evidence from ledgers and failures to **add, strengthen, weaken, or remove** guidance. A mature harness gets more precise, not merely larger.
