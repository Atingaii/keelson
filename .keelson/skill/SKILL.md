---
name: keelson
description: Engineering control plane for coding work in repositories with a .keelson/ directory. Use for exploring an idea, changing code, fixing/debugging, continuing prior work, or improving recurring engineering failures. Keeps conversation sessions separate from durable work items so users can keep asking questions without having to announce when a task starts or ends.
version: 0.3.0
---

# Keelson

The project-local kernel is `.keelson/workflow.md`. Keelson constrains **state transitions and evidence**, not implementation taste. User and project instructions win.

## Classify the conversation, not the lifecycle

| Intent | Typical request | Start with |
|---|---|---|
| **Explore** | compare, explain, “what should we do?”, “grill me” | `discover.md` + `interview.md`; read-only until a modification is requested |
| **Change** | build, add, refactor, migrate, “also change…” | `shape.md` → `context.md`; load `design-lenses.md` only for triggered risks; spec-sized work adds `plan.md` |
| **Fix** | bug, failing test, unexpected behavior | `debug.md`, then `verify.md` |
| **Resume** | continue, pick this back up | `keelson focus --auto` + current context; use `handoff.md` only when a real ownership/machine transfer exists |
| **Improve** | repeated mistake, harness/rule/process problem, retro | `harness.md` + `reconcile.md` |

Completion is **not** an intent and never depends on the user saying “done”. It is a state transition: when the focused change has satisfied acceptance, no blocking questions/assumptions, required rollout, and fresh verification on the current tree, it becomes `ready`. Run the Finish path (`verify.md` → `land.md` → `reconcile.md`) automatically before claiming completion.

## Operating rules

- A conversation/session is only a focus pointer. Ending a window, going idle, or continuing to ask questions MUST NOT mark a change complete.
- `keelson new` binds the new change to the current session when session identity is available. Same-goal follow-ups stay on that change; an independent requested outcome gets a new change and focus moves.
- On Resume, use `keelson focus --auto`; branch match or a sole active change may be suggested. Never silently bind an ambiguous session.
- If `NOW.md` says “First contact”, infer and confirm `INTENT.md`; do not inventory the whole repository into specs/rules.
- Non-trivial modifying work starts from current context; shared modules get `keelson impact <files>`.
- Ask only at the decision frontier. Use `interview.md`: one owner-owned decision at a time, plain-language scenario first, recommended default, and `not sure` as a valid route. Never ask what the repo, evidence, or agent engineering judgment can settle.
- Size only the work: trivial = direct edit; quick = lightweight change; spec = acceptance + behavior delta + plan, then approval.
- Artifacts are information containers, not ceremony. Do not create empty roadmap/glossary/rule/task/ledger/handoff/spec files.
- `tasks.md` is an execution plan, not completion authority. Unchecked plan items never override satisfied acceptance + fresh evidence; reconcile or remove stale tasks when the implementation path changes.
- Knowledge maintenance is internal. During RECONCILE, automatically rewrite/split/dedupe pressured durable docs and let `land` auto-shard large specs; never ask the owner to maintain Keelson unless a product-semantic decision is required.
- Keep **code reality**, **confirmed truth**, and **planned change** distinct. Open questions block only dependent slices.
- Fresh `keelson check --record` evidence is required for completion claims. Never weaken acceptance to make a check pass.
- A `ready` change should be landed without waiting for a special user phrase. If landing still needs an owner decision, stop on that decision only.
- `handoff.md` is for real transfer across people/machines or deliberate ownership change; ordinary session continuity comes from durable change artifacts plus `.keelson/.runtime/sessions/`.
- Repeated failures graduate to the narrowest durable control: spec → scoped rule → executable fitness check; remove redundant prose afterward.
- Use `light | standard | deep`; never persist dated model IDs.

Users normally need only `init`, `status`, `doctor`, `update`, and `uninstall`; the agent uses the rest.
