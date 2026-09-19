---
name: keelson
description: Engineering control plane for coding work in repositories with a .keelson/ directory. Use for exploring an idea, building or changing code, fixing/debugging, continuing prior work, reviewing/finishing/landing, or improving recurring engineering failures. Routes the task into the smallest Keelson workflow while keeping project truth, evidence, and continuation state current.
---

# Keelson

The project-local kernel is `.keelson/workflow.md`. Keelson constrains **state transitions and evidence**, not implementation taste. User instructions and project instructions win. Read `.keelson/README.md` when you need the project map.

## Pick the intent, then load only what it needs

| Intent | Typical request | Start with |
|---|---|---|
| **Explore** | “what should we build?”, compare approaches, “grill me” | `discover.md` + `shape.md`; read-only until the owner asks to change the project |
| **Change** | build, add, refactor, migrate | `shape.md` → `context.md`; add `plan.md` for spec-sized work, then `build.md` |
| **Fix** | bug, failing test, unexpected behaviour | `debug.md`, then `verify.md` |
| **Resume** | continue, pick this back up, hand off | `handoff.md` + current context; resume the next proven step instead of re-planning |
| **Finish** | review, done?, wrap up, land, release | `verify.md` → `land.md` → `reconcile.md` |
| **Improve** | repeated mistake, harness/rule/process problem, retro | `harness.md` + `reconcile.md` |

Use `model.md` when vocabulary or boundaries drift and `engineer.md` only when a real design/reliability trade-off exists.

## Operating rules

- If `NOW.md` says “First contact”, inspect the repository, draft `INTENT.md`, and create specs/rules only for facts that actually exist. Ask the owner to confirm or correct the draft; never make them author the scaffolding.
- Non-trivial work starts from the current tree: `keelson context --paths <files>`; before changing a shared module, `keelson impact <files>`.
- Size the change: **trivial** = do it; **quick** = write back understanding and create a lightweight change; **spec** = acceptance + delta specs + plan, then wait for approval.
- Artifacts are containers for information, not ceremony. Do **not** create an empty ROADMAP, GLOSSARY, rule, tasks, ledger, handoff, or spec just because a template exists.
- Keep **code reality**, **confirmed truth**, and **planned change** distinct. Open questions block only dependent slices.
- Completion claims require fresh `keelson check --record` evidence on the current tree. Never silently weaken an acceptance check.
- Repeated failures graduate to the narrowest durable control: spec → scoped rule → executable fitness check. Remove redundant prose after automation carries the invariant.
- Use floating effort tiers `light | standard | deep`; never persist dated model IDs.

Use `keelson <command> --help` for mechanics; users normally only need `init`, `status`, `doctor`, `update`, and `uninstall`.
