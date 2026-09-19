# Keelson workflow

This is the project-local operating kernel. Project truth lives under `.keelson/`; existing project documents are referenced from `config.yaml`, never duplicated. Task-specific depth lives in `.keelson/skill/` and is loaded only when needed.

Every non-trivial change follows **ORIENT → BOUND → BUILD → SENSE → RECONCILE**.

- **ORIENT** — inspect the current worktree and run `keelson context --paths <files>`; before changing a shared module run `keelson impact <files>`.
- **BOUND** — trivial: do it; quick: write back your understanding and `keelson new`; spec: clarify the acceptance boundary, draft delta specs, and wait for approval.
- **BUILD** — work one vertical slice at a time. Keep unrelated cleanup out; never silently weaken tests or change a behavioural contract.
- **SENSE** — run cheap relevant checks early. Claims such as done/fixed/passing require fresh `keelson check --record` evidence on the current tree.
- **RECONCILE** — write durable facts back to specs/rules/glossary/NOW; unfinished work gets `keelson handoff <name>`.
- Repeated failure classes become a scoped rule or executable fitness check through `keelson retro`; shrink prose once automation carries the invariant.
- If `NOW.md` starts with "First contact", draft `INTENT.md` and, for existing code, specs/rules from the repository, then ask the owner to confirm or correct them. Never make the owner author the scaffolding.

The canonical task router is `.keelson/skill/SKILL.md`. Read only the reference it routes to.
