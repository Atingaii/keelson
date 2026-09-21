---
name: keelson
description: Engineering workflow for repositories with a .keelson/ directory. Apply automatically to ordinary requests to explore an idea, build or change a feature, fix a bug, create or improve an interface, continue prior work, or improve recurring engineering failures. Routes discovery, design, implementation, verification and project memory without requiring skill names or workflow commands.
---

# Keelson

Read the installed workflow with `keelson guide workflow`; load each named reference with `keelson guide <name>` (omit `.md`). Keelson constrains **state transitions and evidence**, not implementation taste. User and project instructions win.

## Classify the conversation, not the lifecycle

| Intent | Typical request | Start with |
|---|---|---|
| **Explore** | compare, explain, “what should we do?”, “stress-test this” | `discover.md` + `interview.md`; read-only until a modification is requested |
| **Change** | build, add, refactor, migrate, “also change…” | `shape.md` → `context.md`; load `model.md` for boundary/language questions, `engineer.md` for non-obvious technical choices, `design-lenses.md` only for triggered risks; spec-sized work adds `plan.md` |
| **Fix** | bug, failing test, unexpected behavior | `debug.md`, then `verify.md` |
| **Resume** | continue, pick this back up | `keelson focus --auto` + current context; use `handoff.md` only when a real ownership/machine transfer exists |
| **Improve** | repeated mistake, harness/rule/process problem, retro | `harness.md` + `reconcile.md` |

Completion is **not** an intent and never depends on the user saying “done”. It is a state transition: when the focused change has satisfied acceptance, no blocking questions/assumptions, required rollout, and fresh verification on the current tree, it becomes `ready`. Run the Finish path (`verify.md` → `land.md` → `reconcile.md`) automatically before claiming completion.

- For interface design, review, interaction or responsive work, load `frontend.md`; use `keelson design` for focused action briefs. Keep browser observations distinct from code checks.

Route from the requested outcome and repository evidence, not special vocabulary. Users describe work; the agent loads guidance and runs workflow commands. Automatically include `model.md` for conflicting terms or shared boundaries, `engineer.md` for non-obvious design choices, and `frontend.md` when the affected path includes a user interface, even without an explicit design request. During implementation use `build.md`; complete with `verify.md` → `land.md` → `reconcile.md` within existing authorization. `guide: true` adds teaching, not activation; both profiles use this workflow by default.

## Operating rules

- A conversation/session is only a focus pointer. Ending a window, going idle, or continuing to ask questions MUST NOT mark a change complete.
- `keelson new` binds the new change to the current session when session identity is available. Same-goal follow-ups stay on that change; an independent requested outcome gets a new change and focus moves.
- On Resume, use `keelson focus --auto`; branch match or a sole active change may be suggested. Never silently bind an ambiguous session.
- If `NOW.md` says “First contact”, infer and confirm `INTENT.md`; do not inventory the whole repository into specs/rules.
- Non-trivial modifying work starts from current context; shared modules get `keelson impact <files>`.
- Automatically assess discovery needs on new goals, material follow-ups and changed premises using `interview.md`; unresolved goals, connected product choices or high-impact commitments trigger deeper discovery without special wording. Clear tasks proceed directly. Ask one ready owner decision for a simple gap, or the whole ready frontier for connected uncertainty, with concrete options, a recommendation and reason; reuse settled answers and investigate facts yourself.
- Route non-obvious mechanisms/architecture through `engineer.md`: reduce to facts, outcome, constraints, and invariants; state a falsifiable hypothesis; use the cheapest experiment/ablation that can discriminate; complexity must earn its keep with evidence.
- Size only the work: trivial = minimal quick change; quick = lightweight change; spec = acceptance + behavior delta + plan within existing user authorization; clarify only unresolved owner choices.
- Before product edits, automatically run `keelson start` for the focused change, then load `keelson context --phase implement`; after new material decisions, restart only once they are settled. Users need not run these commands.
- Artifacts are information containers, not ceremony. Do not create empty roadmap/glossary/rule/task/ledger/handoff/spec files.
- When creating or updating project memory, load `writing.md`: put the useful state/outcome first, make the next action concrete, and keep full contracts and evidence accessible.
- `tasks.md` is an execution plan, not completion authority. Unchecked plan items never override satisfied acceptance + fresh evidence; reconcile or remove stale tasks when the implementation path changes.
- Knowledge maintenance is internal. During RECONCILE, automatically rewrite/split/dedupe pressured durable docs and let `land` auto-shard large specs; never ask the owner to maintain Keelson unless a product-semantic decision is required.
- Keep **code reality**, **confirmed truth**, and **planned change** distinct. Open questions block only dependent slices.
- Fresh structured `keelson check --record` evidence (review commands and use `--trust` on first execution) is required for completion claims. Never weaken acceptance to make a check pass.
- A `ready` change should be landed without waiting for a special user phrase. If landing still needs an owner decision, stop on that decision only.
- `handoff.md` is for real transfer across people/machines or deliberate ownership change; ordinary session continuity comes from durable change artifacts plus private per-machine session state.
- Repeated failures graduate to the narrowest durable control: spec → scoped rule → executable fitness check; remove redundant prose afterward.
- Use `light | standard | deep`; never persist dated model IDs.

Users normally need only `init`, `status`, `doctor`, `update`, and `uninstall`; the agent uses the rest.
