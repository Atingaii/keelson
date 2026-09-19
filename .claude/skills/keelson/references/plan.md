# Planning

Create the change directory and its artifacts. `keelson new <name> --tier quick|spec` scaffolds from `templates/`; you fill them in.

## change.md
<!-- keelson: id=plan.change-md | without: the reasons for a change and its rejected alternatives live only in chat and are lost | sunset: never -->

Sections, in order. Quick changes need only **Why** and **What**.

- **Why** — the problem or opportunity in 1–3 sentences. Should stand on its own without the solution.
- **What** — bullet list of changes. Mark breaking ones **BREAKING**.
- **How** — technical approach, the parts a reviewer would want to know. Not a task list.
- **Alternatives** — at least two real options. For each rejected one, write its strongest argument first, then why it loses. A rejection that only lists weaknesses is a straw man.
- **Impact** — affected code, interfaces, data, other teams.
- **Decisions** — one line per durable decision, present tense, prefixed by capability: `- orders: offset pagination over cursor; cursor rejected because the table needs page jumps`. These lines are folded into `specs/<capability>/spec.md` when the change lands. Only write here what someone should still see in a year.

## Delta specs (spec tier)
<!-- keelson: id=plan.delta | without: behaviour contracts drift from code because nobody rewrites whole specs | sunset: never -->

One file per affected capability at `changes/<name>/specs/<capability>/spec.md`, using the same capability path as `.keelson/specs/`. Write only the delta:

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

A spec is a behaviour contract: observable behaviour, inputs, outputs, error conditions, external constraints. If the implementation could change without changing what a client sees, it does not belong in the spec. Check `keelson context` output for existing capability names before inventing a near-duplicate.

## tasks.md
<!-- keelson: id=plan.tasks | without: work is executed from memory; progress and effort routing are invisible across sessions | sunset: never -->

One checkbox per task. Each task carries an effort tier and, where possible, a verification command:

```markdown
- [ ] 1. Add `page`/`size` parsing to `GET /orders` (effort: light) — verify: `npm test -- orders.params`
- [ ] 2. Implement paged query in `OrderRepo` (effort: standard) — verify: `npm test -- orders.repo`
- [ ] 3. Decide ack semantics for retries and update `specs/messaging` (effort: deep)
```

Right-size: a task is the smallest unit a reviewer could reject on its own. Fold setup and scaffolding into the task that needs them. Split where a reviewer could accept one half and reject the other.

### Effort tiers
<!-- keelson: id=plan.effort | without: every task runs on the most expensive model, or the cheapest one handles design decisions | sunset: when retro shows light-tier first-pass rate above 90% for 100 dispatches, relax the light criteria -->

- **light** — mechanical, clear boundary, verification is a command: follow an existing pattern, config, renames, running and reporting tests, formatting.
- **standard** — needs context but the path is clear: most feature code, ordinary bug fixes, per-task review.
- **deep** — ambiguity, cross-layer effects, design trade-offs, security, unknown root cause: drafting change.md and delta specs, architectural rulings, hard debugging, the final fresh-reader review.

Floors from `config.yaml` (`effort.*`): reviewers are never below `standard`; planning, final verification, and any ruling are never below `deep`. A reviewer is never a lower tier than the implementer it reviews.

## ledger.md

Start it with a one-line header. Everything else is appended during build and verify (see those references). Entries are `###` headings: `Ruling:`, `Root cause:`, `Verify:`, `Dispatch:`, `Escalate:`, `Note:`.
