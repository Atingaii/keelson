# Reconcile and compact

Landing a change is not the end of it. Two passes keep the project's knowledge true and small: reconcile writes the new stable facts back into the current truth, and compact removes what no longer belongs there. Both are suggestions to a person, never automatic rewrites; `keelson doctor` lists what it finds.

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

## Compact: keep what is read small
<!-- keelson: id=reconcile.compact | without: documents grow without bound; the always-on set inflates every session and stale text is read as current | sunset: never -->

`config.yaml → budgets` gives each document type a line budget (INTENT, ROADMAP, NOW, GLOSSARY, spec, rule, change, handoff, and the always-on rules as a set). Crossing a budget is not an error; it is the signal to run a compaction pass on that document, choosing per paragraph:

- **Rewrite** it shorter, present tense.
- **Split** by capability, scope, or bounded context, when the requirements no longer share a purpose.
- **Delete** history that git already keeps, and facts nothing depends on.
- **Move** a constraint to the rule scoped to its paths, or a plan item to the tracker.
- **Automate** a checkable rule into `config.yaml → check` and shorten the prose to a pointer.
- **Archive** a change that has stalled (`keelson cancel` with a reason) rather than leaving it half-open.

`keelson doctor` also reports duplicated requirements across capabilities, changes idle for two weeks, changes with more than 25 tasks, always-on rules over budget, and generated documents older than the source tree. Fix what it names, in a small change, and land that like any other.

## Gardening cadence
<!-- keelson: id=reconcile.cadence | without: knowledge health is only looked at when it hurts, by which time the cleanup is a project of its own | sunset: never -->

Run `keelson doctor` when a milestone closes and whenever `keelson status` shows nothing in flight. Ten minutes then saves a rewrite later. Treat its output as a list of small, separately landable fixes, never as a mandate to restructure the project.
