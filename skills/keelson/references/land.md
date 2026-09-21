# Integrating and releasing

A change is implemented when its slices are verified, integrated when it is on the target branch with its specs folded, and released when a tagged version ships it. These are three states, and Keelson reports them separately.

Before landing, inspect settled `decisions.json` answers. Promote only durable product contracts into delta requirements or capability-prefixed `change.md → Decisions`; preserve reasons that affect future work. Investigation trivia stays in the change. `land` folds those contracts, and the next phase context loads the updated truth.

## `keelson land <name>`
<!-- keelson: id=land.command | without: delta specs never merge, specs stop describing the current system, and unverified or unapproved work is declared integrated | sunset: never -->

Run it when the change is integrated (merged, or committed on the mainline in a solo repository). It refuses while any of these hold, and says which:

- acceptance items unchecked (task checkboxes are advisory plan state, not landing gates);
- open questions remain;
- verification is not-run, failed, partial, or stale (fingerprint differs from the working tree);
- `(assumed)` decisions exist and `--confirm-assumptions` was not passed — the owner confirms them, not you;
- the main spec changed since the delta was written and `--accept-drift` was not passed — re-read it, reconcile, then pass the flag;
- **BREAKING** without a **Rollout** section.

Then it merges each delta into the capability spec (ADDED appends, MODIFIED replaces by name, REMOVED deletes), appends the `Decisions` lines, and removes the change directory (`land: fold`, default) or archives it (`land: keep`). `--dry-run` previews all of it. `--force` exists for the owner's explicit decision, never for convenience.

Commit the landing together with the last code change, so the specs and the code that satisfies them share a revision. Ledger and handoff stay in git history; `keelson retro` reads them from there.

## Code and specs are reviewed together
<!-- keelson: id=land.same-pr | without: documentation is "caught up" at the end of a milestone, by which time nobody remembers why | sunset: never -->

The pull request that changes behaviour carries the delta spec and the decision lines. A reviewer who reads the diff without the spec cannot tell whether a behaviour change was intended.

## Collisions
<!-- keelson: id=land.collisions | without: an older decision or verification is treated as valid after another change moved the contract underneath it | sunset: never -->

When another change modified a shared contract, the target branch, or the verification environment, the older change's decisions and evidence may no longer hold. Signals: `keelson status` shared-contract warning, `land` drift refusal, a stale verification after a merge. Response: re-read the moved spec, reconcile the delta, re-run `keelson check --record`, and only then land. Spec merges preview first; they never overwrite silently.

## Release state
<!-- keelson: id=land.release | without: "merged" is reported as "shipped", and a migration or manual step is forgotten | sunset: never -->

Release state is derived from git tags: `keelson status` lists changes landed since the last tag as unreleased. A change with a **Rollout** section is not complete until its steps have run; keep them in `NOW.md → Next` until they have. Keelson can remind; it never performs production operations itself.

## Reconcile before you archive

Landing merges the delta and the decisions. The rest of what the change taught (a new term, a moved responsibility, a quality number, a constraint that can be a check, a defect that deserves a regression test) is routed by `references/reconcile.md`. Do that pass before `keelson land`, so the truth files and the code share the landing commit.

## Promote learnings, and file the debt
<!-- keelson: id=land.promote | without: the same convention is rediscovered in every change; defects found late become folklore instead of checks | sunset: never -->

Before closing, ask in one line: did this change reveal a convention worth a rule, a check worth adding to `config.yaml → check`, a contract worth a requirement, or a defect worth a regression test? Prefer, in order: an automated check, a spec requirement, a rule with a scope, then a decision line. A problem that stays a paragraph of prose will be re-learned. Known remaining problems become tracked items with an owner (in the tracker, or `ROADMAP.md → Next`), not a sentence in a summary.

## Spec `Decisions` etiquette

A decision line is one to three lines, present tense, and names the rejected option: `- messaging: consumers are idempotent; exactly-once delivery rejected because the broker does not provide it`. When a decision is reversed later, rewrite the line and keep a trailing note: `(previously: at-most-once, abandoned after duplicate-notification incident)`. Never let `Decisions` become a changelog. When the code disagrees with a confirmed requirement, report the gap; changing the spec to match the defect needs the owner's decision.
