# Concepts

Keelson is a small set of files, a thin CLI, and one skill. This page is the model behind them: what a change is, what states it moves through, what counts as evidence, and what Keelson deliberately is not.

## Design laws

Keelson borrows mature failure-control ideas from several engineering disciplines, but turns them into existing files and CLI invariants rather than new ceremonies.

| Law | Why it matters | Keelson mechanism |
|---|---|---|
| **Desired state over mutation history** | Configuration systems are easier to recover when the current target is explicit instead of inferred from every past install step | `config.yaml` + `manifest.json`; `update` reconciles stale generated surfaces |
| **Idempotent, recoverable transitions** | A retry after interruption should converge instead of making the install worse | repeatable `init/update`; generated directories keep the last complete copy until replacement is ready |
| **Recognition over recall** | Humans and agents make fewer context errors when current state is visible at the point of use | `README.md` map, `NOW.md`, scoped rules, one routed reference instead of a large prompt |
| **Explicit state machines over adjectives** | “Done” hides independent failure modes | separate work / verification / release dimensions and explicit landing gates |
| **Observability must name the repair** | A health check that only says “bad” transfers debugging work to the user | `doctor` reports drift/health with the surface and the remediation (`update`, compact, re-check) |
| **Evidence is revision-bound** | Reproducibility requires knowing which artifact a claim was measured against | `Verify:` entries bind commands and exit codes to a worktree fingerprint; edits make evidence stale |
| **Connection state is not work state** | UI/session loss must not corrupt durable lifecycle | `.runtime/sessions/` is only a focus pointer; `changes/` owns work state; `handoff.md` is reserved for real transfer |
| **Progressive disclosure beats universal checklists** | More instructions eventually reduce compliance and attention | tiny discovery shim → compact workflow → one task-specific reference → scoped project rules |
| **Golden path with escape hatches** | The common case should require almost no product-specific knowledge, while uncommon cases remain possible | user talks normally; five conversation intents route work; completion is derived automatically |

These are constraints on the harness itself. They should usually make Keelson smaller: when a principle becomes mechanically enforced, delete duplicate prose.

## Session, work item, and project truth

These lifetimes must not be conflated.

| State | Location | Lifetime | Meaning |
|---|---|---|---|
| Conversation/session focus | `.keelson/.runtime/sessions/<key>.json` | minutes–hours, machine-local | Which active change this AI window is currently about |
| Change/work item | `.keelson/changes/<name>/` | minutes–days/weeks, committed | The durable requested outcome and its acceptance/evidence state |
| Project truth | `INTENT.md`, specs, rules, glossary | months–years, committed | Facts future work should treat as current truth |
| History | Git | long-term | Chronology and superseded temporary artifacts |

Closing a session never completes a change. Switching session focus never cancels the previous change. Landing a change clears local pointers to it.

A committed `handoff.md` is not the normal session pointer; it is a deliberate transfer artifact when another person/machine needs a cold-start summary.

## Goal, milestone, change, slice

Work on a long-lived project has four conceptual levels. Keelson does not pre-create a document for every level: each artifact appears only when that level has durable information worth keeping.

| Level | Where it lives | What it answers |
|---|---|---|
| Project goal | `.keelson/INTENT.md` | Who is this for, what will it never do, what may the agent decide alone |
| Current milestone | `.keelson/ROADMAP.md → Now`, or the issue tracker | What are we delivering in this phase, what waits |
| Change | `.keelson/changes/<name>/` | What behaviour changes, why, and how anyone will know it is done |
| Slice | `## Slice:` headings in `tasks.md` | The smallest part the owner could accept on its own |

Near-term work is concrete. `ROADMAP.md` is optional: create it only when the repository needs a milestone/direction that is not already clear from its tracker. Later work is direction and dependencies, not tasks with invented steps. When the project already has a tracker, the tracker stays the authority for what is wanted and in what order; `config.yaml → refs.tasks` points at it and `change.md` links the issue.

## The seven capability areas

Keelson keeps the capabilities a long-lived project needs, and spreads them across files instead of stages the user drives.

| Capability | Lives in |
|---|---|
| Requirements, clarification, decisions | `references/shape.md`; `change.md` Decisions and Open questions; `INTENT.md` Authorizations |
| Domain model, behaviour contracts, architecture boundaries | specs (`Requirement:` and `Scenario:`), `rules/` for architecture constraints, `refs.decisions` for long-lived decision records |
| Rolling planning and change management | `ROADMAP.md`, `change.md`, `tasks.md` with slices, `keelson new`, `cancel` |
| Layered context and impact analysis | `references/context.md`, `keelson context`, `keelson impact`, rules routing |
| Continuation and parallel work | `NOW.md`, `handoff.md`, hooks, owner and branch per change, `--worktree`, shared-contract warnings |
| Feedback, debugging, review, acceptance | `references/verify.md` and `debug.md`, `keelson check --record`, acceptance mapping, fresh-reader review |
| Integration, release, long-term maintenance | `keelson land` gates, spec merge, drift check, release from tags, promoting learnings, `retro` |

These are internal capability areas, not seven steps. A trivial change touches none of them visibly.

## Discover, model, engineer, reconcile

Four references in the skill carry the engineering judgment that the file layout alone cannot. None is a stage; each is read when the situation calls for it.

| Reference | Read when | What it carries |
|---|---|---|
| `discover.md` | The owner is not sure what they want, or is learning | Scenario before technology: ask which use is at the centre before any storage or framework question. Which unknowns to raise: read what the code answers, follow existing conventions, decide the reversible, default the technical, ask only what changes the product, confirm what destroys data or touches production. A scope guard that names bundled domains and proposes an order. Explore before committing: a spike, prototype, mock, or benchmark when a cheap experiment beats an abstract decision |
| `model.md` | Words or boundaries are drifting | One meaning per term in `.keelson/GLOSSARY.md`; a term that means two things in two parts of the system marks a boundary, and the two parts talk through an explicit translation. Invariants per capability. Interfaces that hide what changes rather than mirror the implementation. Two design sketches before choosing, the rejected one recorded with its strongest argument |
| `engineer.md` | A design or reliability question | Engineering lenses grouped by delivery, structure, evolution, and operation; the agent picks the one to four that change this design and never runs the whole list. Named patterns are shared vocabulary for a shape that already fits, never a requirement. Quality targets are numbers with a scope, written as requirements with scenarios, and turned into a `fitness` check when a command can measure them |
| `reconcile.md` | After landing, and when `keelson status` shows nothing in flight | Where each new fact goes: behaviour to the spec, reasons to `Decisions`, terms to the glossary, moved responsibilities to rules, checkable constraints to `check:`, defects to regression tests, remaining work to the tracker. Current truth is rewritten, never appended. Budgets and the compaction moves: rewrite, split, delete, move, automate, archive |

Slices follow the same judgment: `plan.md` asks for vertical slices, one real user action carried through every layer, thin but complete, before the next action starts. `keelson validate` warns when a slice is named after a layer.

### Guided mode

`config.yaml → guide: true` (set by `keelson init --guide`) says the owner is learning engineering by building. The artifacts, gates, and states are identical. What changes is the conversation: choices are presented as scenarios with a recommendation, the reason, the alternatives, and the trade-off, in the owner's words; the engineering term comes after the decision, as a name for what was just chosen; a rule is explained in one sentence when it is applied; and a spec change closes with a short teaching note (the key decision, why, the idea it is an instance of, when to revisit it) that stays in the conversation and never in the project files.

## Knowledge health

Project material grows with the project; what is read per task must not grow with the whole history. `config.yaml → budgets` gives each document type a line budget, and `keelson doctor` reports documents over budget, requirement text that reads like history, duplicated requirement names across capabilities, changes idle for two weeks or more, changes with more than 25 tasks, always-on rules over budget, and generated documents older than the source tree. Every finding is a suggestion for a small, separately landable fix. Nothing is rewritten automatically.

## Decision states

The agent keeps four states apart in conversation and in `change.md`:

| State | Meaning | Where |
|---|---|---|
| Suggestion | What the agent recommends, with consequences. Not in effect | Conversation |
| Confirmed | What the owner chose | `## Decisions`, plain line |
| Authorized | What `INTENT.md → Authorizations` lets the agent decide alone | `## Decisions`, plain line, decided by the agent |
| Open | Still needs an answer | `## Open questions`, with `— blocks: <slice>` |

A fifth marker covers the gap between them: `- (assumed) capability: …` is a working assumption the agent proceeds under when nobody can answer. `keelson land` refuses to fold assumed lines into the specs until the owner passes `--confirm-assumptions`.

Open questions block only the slices that depend on them. The rest of the change keeps moving.

## Three status dimensions

A single “done” conflates implementation, evidence, integration, and release. Keelson reports them separately.

### Work

`clarifying`, `in-progress`, `blocked`, **`ready`**, `in-review` (legacy/manual-compatible), `integrated`, `cancelled`.

The important transition is `ready`, which is **derived rather than announced by the user**. A change is ready when:

- all existing tasks are complete (no tasks is valid for quick changes);
- required acceptance is complete;
- no blocking open questions remain;
- no unconfirmed assumptions remain;
- a breaking change has its rollout contract;
- the latest verification passes on the current worktree.

A session ending has no effect on this state. Once ready, the agent should land automatically before claiming completion. Explicit `blocked`, `integrated`, and `cancelled` remain durable overrides.

### Verification

`not-run`, `passed`, `failed`, `partial`, `stale`.

Derived from the last `Verify:` entry. A passing record belongs only to the worktree fingerprint it measured; later edits make it stale.

### Release

`unreleased` unless frontmatter says otherwise. Project-level release state is derived from Git tags. Integration/landing and production rollout are not the same event.

## Record validity and content validity

Evidence fails in two independent ways.

**Record validity** asks whether the check really ran, against this code, in full. `keelson check --record` answers it mechanically: it runs the configured commands, saves their output under `.keelson/.runtime/evidence/`, and writes a `Verify:` entry that names each command, its exit code, and the worktree fingerprint. Any later edit to the code makes that entry stale.

**Content validity** asks whether what ran covers what was asked. No tool can answer it; the agent does, against `change.md → Acceptance` and the original request. Each acceptance item names how it is checked (`test:`, `check:`, `manual:`, `review:`) and is ticked only when that check has run. A fresh-reader review on spec changes catches the author's blind spots. A test edited to pass is a change to the acceptance criteria and needs the owner's decision.

## Committed and local

| Information | Location | In git |
|---|---|---|
| Project facts/specs/rules | `.keelson/` | Yes |
| Active durable work | `.keelson/changes/<name>/` | Yes until folded; then Git history |
| Explicit transfer package | `changes/<name>/handoff.md` | Yes, only when transfer is needed |
| Session focus + check output | `.keelson/.runtime/` | No |
| User model cache / ablation stash | `~/.keelson/` | No |

A colleague on another machine gets durable work state from Git; ordinary local chat focus is intentionally not shared.

## What Keelson is not

- Not a project manager. It does not prioritise, estimate, or assign; the tracker does.
- Not an agent runtime. It has no daemon, no database, no model calls of its own. The host agent does the semantic work.
- Not a correctness proof. It makes missing evidence visible and refuses to land without it; it cannot make a wrong test right.
- Not a lock. Files on disk and branches do not coordinate machines; pull requests and CI do.
- Not a production tool. It reminds about rollout steps and never runs them.
