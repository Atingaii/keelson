# Reconcile and compact

Landing a change is not the end of it. Two passes keep the project's knowledge true and small: reconcile writes new stable facts back into current truth, and compact removes what no longer belongs there. These are normal internal Agent duties during RECONCILE, not housekeeping the owner has to request; `keelson doctor` remains a diagnostic view.

Apply `writing.md` to each human-facing document you update: current meaning first, a concrete next action for unfinished work, complete detail in its owning file. Raw signed records and evidence are retained unchanged.

## Reconcile: where does each new fact go?
<!-- keelson: id=reconcile.route | without: the change's facts stay in change.md and chat; the specs, rules, and glossary describe last quarter's system | sunset: never -->

Before `keelson land`, and again when reviewing its output, ask for each thing you learned:

| The change produced | It goes to |
|---|---|
| A new or changed stable behaviour | the capability spec, via the delta (`land` merges it) |
| A reason that will matter to a future maintainer | the spec's `Decisions` (`land` folds them) |
| A new term, or a term that now means something specific | `GLOSSARY.md` |
| A responsibility moved between modules, or a new boundary | the rules scoped to those paths; `refs.architecture` if the project keeps one |
| A quality target with a number | the spec, as a requirement with a scenario |
| A constraint that a command can check | `config.yaml → check` (a fitness check); then the prose rule can shrink |
| A defect that reached verification | a regression test, plus a `Root cause:` in the ledger |
| Work that is known but not done | the tracker, or `ROADMAP.md → Next`, with an owner |
| Anything that only mattered during the change | nowhere; it stays in git history with the change directory |

Every line above is present tense in its destination. The change directory is scaffolding and is removed; the truth files are what remain.

## Current truth is rewritten, never appended
<!-- keelson: id=reconcile.rewrite | without: specs become a chronological diary; the reader cannot tell which paragraph describes the system today | sunset: never -->

A spec, a rule, or a glossary line says how the system works now. When behaviour changes, the sentence that described the old behaviour is replaced, not followed by "as of September this is now…". The sequence of changes is in git, in the archived or folded change, and in the decision line that names the rejected option. `keelson doctor` flags requirement text that reads like history.

Before writing a delta, map each changed behavior to the current requirement name. Use MODIFIED with that exact name and its complete replacement body; use REMOVED for superseded requirements; reserve ADDED for genuinely new independent behavior. A new title does not supersede the old contract. Review `keelson review --prepare` → contracts[].after as one current specification, not a chronology. Check durable Decisions for reversed choices as well; rewrite obsolete decision lines before the final review and checks. The CLI rejects unknown MODIFIED/REMOVED names and ADDED over existing names, but semantic conflicts under different titles require the reviewer.

## Compact: keep what is read small
<!-- keelson: id=reconcile.compact | without: documents grow without bound; the always-on set inflates every session and stale text is read as current | sunset: never -->

`config.yaml → budgets` gives each document type a line budget (INTENT, ROADMAP, NOW, GLOSSARY, spec, rule, change, handoff, and the always-on rules as a set). The budget is a **soft compaction threshold**. Keelson automatically reorganizes structure before hot files grow without bound: large specs become a small index plus requirement/decision shards, and runtime caches are pruned. When a single semantic unit is itself too large, the Agent automatically rewrites or decomposes it during RECONCILE and re-verifies the result. Active change/handoff files are temporary scaffolding, so they stay lightweight but do not become durable knowledge stores. The owner is involved only when compaction would change product semantics, authorization, compatibility, or another owner decision.

When the soft budget is crossed, run a compaction pass on that document, choosing per paragraph:

- **Rewrite** it shorter, present tense.
- **Split** by capability, scope, or bounded context, when the requirements no longer share a purpose.
- **Delete** history that git already keeps, and facts nothing depends on.
- **Move** a constraint to the rule scoped to its paths, or a plan item to the tracker.
- **Automate** a checkable rule into `config.yaml → check` and shorten the prose to a pointer.
- **Archive** a change that has stalled (`keelson cancel` with a reason) rather than leaving it half-open.

`keelson doctor` also detects duplicated requirements across capabilities, idle/oversized changes, overgrown always-on rules, and stale generated docs. The Agent consumes those signals opportunistically and folds safe cleanup into the current engineering pass; it does not create owner-visible maintenance work unless semantics would change.

## Automatic maintenance is invisible
<!-- keelson: id=reconcile.automatic | without: the owner is asked to run housekeeping commands, specs become giant monoliths, or cleanup is postponed until it becomes a separate project | sunset: never -->

Treat knowledge shape as infrastructure, not user work. When `keelson context` exposes internal maintenance findings, resolve them in the same engineering pass without asking the owner:

- **Large specs** — do not summarize away requirements. `keelson land` automatically changes a large capability from one `spec.md` into a bounded index plus `requirements/*.md` and `decisions/*.md`. Total knowledge may grow; each frequently-read file stays small.
- **Rules** — split by actual path/scope and update `rules/index.md`; merge duplicate rules and replace prose with a fitness check when deterministic. If a single rule remains too broad, rewrite it automatically into the smallest invariant that preserves meaning.
- **NOW / INTENT** — never shard. Rewrite them automatically as short current-state views; history stays in git.
- **ADRs / decisions** — one durable decision per ADR when the project uses `refs.decisions`; the directory may grow, but do not inject every ADR into every session. Capability-local decisions are automatically sharded into `decisions/*.md`.
- **Runtime** — prune eligible local session and temporary runtime caches. Signed records, public keys and evidence logs in change directories or archives are durable evidence; do not summarize them away or treat them as disposable caches.

Only involve the owner when compaction would change product semantics, authorization, compatibility, or another decision they actually own. File movement, indexing, deduplication, history removal, and cache cleanup are maintenance and happen silently.

## Gardening cadence
<!-- keelson: id=reconcile.cadence | without: knowledge health is only looked at when it hurts, by which time the cleanup is a project of its own | sunset: never -->

The Agent re-evaluates knowledge health during normal context/reconcile cycles and after meaningful landings. Maintenance is incremental and silent: keep each hot document readable continuously instead of scheduling cleanup days or asking the owner to manage the control plane.
