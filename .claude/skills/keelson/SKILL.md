---
name: keelson
description: Engineering collaboration layer for coding work in repositories that have a .keelson/ directory. Use whenever the user asks to build, add, change, refactor, fix, debug, plan, continue, hand off, wrap up, review, or release work in such a project, and when they say "grill me", "status", "hand off", "land it", or "retro". Keeps specs as the source of truth, routes scoped rules, records decisions and open questions, separates work/verification/release state, and turns recurring mistakes into progressively stronger checks.
version: 0.3.0
---

# Keelson

The repository instruction block is the always-on kernel: **ORIENT → BOUND → BUILD → SENSE → RECONCILE**. This canonical skill is the router into deeper guidance; do not reload or restate every reference. Read `.keelson/README.md` for the human/project map. Standing project truth lives under `.keelson/`; existing project documents stay authoritative through `config.yaml → refs`.

Keelson constrains **state transitions, not implementation choices**. User instructions and the project's own instruction files take precedence. Prefer an executable invariant over more prose when a rule can be checked mechanically.

## Start from current state

If `NOW.md` starts with "First contact", inspect the repository, draft `INTENT.md` and (for existing code) capability specs plus path-scoped rules, then ask the owner to confirm or correct them in one short exchange. Never ask the owner to author the scaffolding.

For non-trivial work, follow the resident loop. If this turn has not already oriented on the current tree, use `keelson context --paths <files>`; before changing a shared module, use `keelson impact <files>`. Do not ask again for facts already recorded in code, specs, INTENT, or the current conversation.

## Size only as much process as the change needs

| Size | Boundary | Action |
|---|---|---|
| trivial | explicit one-file fix; no behaviour change | do it; no change directory |
| quick | intent clear; behaviour contract unchanged | write back understanding, `keelson new`, proceed |
| spec | behaviour/contract/capability/migration changes, or owner wants pre-code review | draft acceptance + delta specs; wait for approval |

The owner can override the size. In unattended runs, mark unresolved owner decisions `(assumed)` and stop before landing.

## Load only what the task needs

- Unclear product intent / guided discovery → `references/discover.md`
- Requirements, assumptions, authorization → `references/shape.md`
- Vocabulary, boundaries, invariants → `references/model.md`
- Context and impact → `references/context.md`
- Vertical-slice plan / delta specs → `references/plan.md`
- Design, reliability, quality trade-offs → `references/engineer.md`
- Implementation discipline → `references/build.md`
- Evidence and acceptance → `references/verify.md`
- Repeated harness failure class → `references/harness.md`
- Stop / resume / parallel continuation → `references/handoff.md`
- Integrate / release → `references/land.md`
- Write durable facts back and compact → `references/reconcile.md`
- Debugging → `references/debug.md`

## Invariants

- Keep **code reality**, **confirmed truth**, and **planned change** distinct; report drift instead of editing a spec to match a defect.
- Completion claims require fresh `keelson check --record` evidence on the current tree.
- Open questions block only the slices that depend on them.
- Repeated failures graduate to a scoped rule or executable check; do not grow chat lore.
- Use floating effort tiers `light | standard | deep`; never persist dated model IDs.

Use `keelson <command> --help` for mechanics. Main state commands: `context`, `impact`, `new`, `status`, `check --record`, `handoff`, `land`, `cancel`, `retro`.
