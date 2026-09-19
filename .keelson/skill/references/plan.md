# Planning

`keelson new <name> --tier quick|spec [--capability a,b] [--touches globs] [--depends other]` scaffolds the change directory and records the owner, branch, and the base of every delta spec. You fill in the artifacts. Plans exist so work survives a session boundary and so a reviewer can reject a slice on its own; they are not a script.

## Where a change sits
<!-- keelson: id=plan.hierarchy | without: either every task is re-planned from scratch or a three-month file-by-file plan is written that is wrong by week two | sunset: never -->

Project goal (`INTENT.md`) → current milestone (`ROADMAP.md → Now`, or the tracker) → a change with a clear boundary (`changes/<name>`) → slices that can be accepted independently (`tasks.md`). Only the last two are files Keelson creates. Near-term work is concrete; later work is a direction and its dependencies, under `ROADMAP.md → Next`. Do not turn an unexplored question into a task with made-up steps.

If the project has an issue tracker (`config.yaml → refs.tasks`), it stays the authority for what is wanted and in what order. `change.md` links the issue and holds only what the tracker does not: the decisions, the acceptance mapping, and the continuation state.

## change.md
<!-- keelson: id=plan.change-md | without: the reasons for a change and its rejected alternatives live only in chat and are lost | sunset: never -->

Sections, in order. Quick changes need only **Why**, **What**, and **Acceptance**.

- **Why** — the problem or opportunity in 1–3 sentences. Should stand on its own without the solution.
- **What** — bullet list of changes. A bullet that starts with **BREAKING** marks a breaking change; it needs a **Rollout** section (compatibility window, migration, rollback), and `keelson land` checks for it.
- **How** — technical approach, the parts a reviewer would want to know. Not a task list.
- **Alternatives** — at least two real options. For each rejected one, write its strongest argument first, then why it loses. A rejection that only lists weaknesses is a straw man.
- **Impact** — what you found by reading, not the diff file list. See `context.md`.
- **Acceptance** — one checkbox per criterion, each with how it is checked: `— test: name`, `— check: \`cmd\``, `— manual: how`, or `— review: what`. This is the map from the request to the evidence; `keelson land` refuses while any box is open.
- **Open questions** — `- question — blocks: <slice>`. Landing refuses while any remain; a question that blocks nothing is a note, not an open question.
- **Rollout** — only for breaking changes, migrations, or production steps.
- **Decisions** — `- capability: decision; rejected option and why`, present tense. Working assumptions are `- (assumed) capability: …`. Folded into the capability's spec on landing.

## Route the audit into existing artifacts
<!-- keelson: id=plan.assumption-routing | without: clarification creates a new diary document, or critical assumptions stay only in chat and disappear across sessions | sunset: never -->

The assumption audit is conversational scratch, not another permanent document. Persist only what changes future work:

- an explicit outcome or non-goal → `change.md → What`;
- a working assumption needed to proceed → `change.md → Decisions` as `(assumed)`;
- a user-owned load-bearing gap that is still unanswered → `change.md → Open questions` with what it blocks;
- a confirmed observable behaviour → `Acceptance` and, for spec-tier behaviour, the delta spec;
- a stable term or engineering invariant discovered along the way → `GLOSSARY.md`, a scoped rule, or a fitness check.

After landing, temporary questioning disappears with the change scaffolding. Only the current behaviour, durable decisions, rules, vocabulary, and evidence-bearing checks survive.

## Delta specs (spec tier)
<!-- keelson: id=plan.delta | without: behaviour contracts drift from code because nobody rewrites whole specs | sunset: never -->

One file per affected capability at `changes/<name>/specs/<capability>/spec.md`, same capability path as the main specs. `keelson new --capability` creates it with a `base:` stamp; if the main spec changes under you, landing asks you to re-read before `--accept-drift`. Write only the delta:

```markdown
## ADDED Requirements
### Requirement: Page size limit
The API SHALL reject `size` above 200 with HTTP 400.
#### Scenario: Oversized page
- WHEN a client requests `size=500`
- THEN the response is 400 with code `size_too_large`

## MODIFIED Requirements
### Requirement: Order listing
(full replacement text of the requirement)

## REMOVED Requirements
### Requirement: Legacy CSV export
```

A spec is a behaviour contract: observable behaviour, inputs, outputs, error conditions, external constraints. If the implementation could change without changing what a client sees, it does not belong here. Architecture constraints (who may depend on whom, which layer owns a decision) belong in `rules/`, and long-lived decision records in `refs.decisions` when the project has one; link, do not restate.

## tasks.md and slices
<!-- keelson: id=plan.tasks | without: work is executed from memory; progress, slices, and effort routing are invisible across sessions | sunset: never -->

Group tasks under `## Slice: <name>` with a `Delivers:` line stating what someone can observe when the slice is done. A quick change usually has one slice and can omit the heading. Each task carries an effort tier and, where possible, a verification command:

```markdown
## Slice: Create and access
Delivers: a link can be created and opens the shared item
- [ ] 1. Add `POST /shares` (effort: standard) — verify: `npm test -- shares.create`
- [ ] 2. Render the share page (effort: light) — verify: `npm test -- shares.page`

## Slice: Revoke and expiry
Delivers: every access path refuses a revoked or expired link
- [ ] 3. Decide expiry semantics and update `specs/sharing` (effort: deep)
```

Right-size: a task is the smallest unit a reviewer could reject on its own. Split where a reviewer could accept one half and reject the other. A slice is the smallest unit the owner could accept on its own.

### Slices are vertical
<!-- keelson: id=plan.tracer-bullet | without: the schema, then the backend, then the frontend are each finished before anything runs end to end, and the mismatch between them is found last | sunset: never -->

A slice is one real user action carried through every layer it touches (interface, API, domain, storage, response, test), thin but complete, before the next action is started. The first slice of a feature is the narrowest path that proves the layers fit: for "create issue", the form, the endpoint, validation, the domain object, the row, the response, the rendered result, and one test. Update, delete, and comment come after it runs. `keelson validate` warns when a slice is named after a layer ("database", "backend", "UI"). A layer-shaped task inside a vertical slice is fine; a layer-shaped slice is not.

### Effort tiers
<!-- keelson: id=plan.effort | without: every task runs on the most expensive model, or the cheapest one handles design decisions | sunset: when retro shows light-tier first-pass rate above 90% for 100 dispatches, relax the light criteria -->

- **light** — mechanical, clear boundary, verification is a command: follow an existing pattern, config, renames, running and reporting tests, formatting.
- **standard** — needs context but the path is clear: most feature code, ordinary bug fixes, per-task review.
- **deep** — ambiguity, cross-layer effects, design trade-offs, security, unknown root cause: drafting change.md and delta specs, architectural rulings, hard debugging, the final fresh-reader review.

Floors from `config.yaml → effort`: reviewers are never below `standard`; planning, final verification, and any ruling are never below `deep`. A reviewer is never a lower tier than the implementer it reviews.

## When requirements change mid-way
<!-- keelson: id=plan.requirement-change | without: "ok" in chat is the only record; the plan, acceptance, and decisions still describe the old requirement | sunset: never -->

Update `change.md` (What, Acceptance, Decisions), the delta spec, and the affected slice in the same turn the owner changes their mind. If the change is now a different change, `keelson cancel` the old one with a reason and start fresh.

## ledger.md

Start it with a one-line header. Everything else is appended during build and verify. Entries are `###` headings: `Ruling:`, `Root cause:`, `Verify:`, `Dispatch:`, `Escalate:`, `Note:`. `keelson check --record` writes `Verify:` entries for you, with the worktree fingerprint that makes staleness detectable.
