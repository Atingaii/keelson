# Keelson workflow

This is the project-local operating kernel. Project truth lives under `.keelson/`; existing project documents are referenced from `config.yaml`, never duplicated. Task-specific depth lives in `.keelson/skill/` and is loaded only when needed.

Every non-trivial change follows **ORIENT → BOUND → BUILD → SENSE → RECONCILE**.

- **ORIENT** — inspect the current worktree and run `keelson context --paths <files>`; before changing a shared module run `keelson impact <files>`.
- **BOUND** — trivial: do it; quick: write back understanding and create the smallest useful change artifact; spec: clarify acceptance, write the behavior delta and plan, then wait for approval.
- **BUILD** — work one vertical slice at a time. Keep unrelated cleanup out; never silently weaken tests or change a behavioral contract.
- **SENSE** — run cheap relevant checks early. Claims such as done/fixed/passing require fresh `keelson check --record` evidence on the current tree.
- **RECONCILE** — fold durable facts into specs/rules/glossary/NOW; unfinished cross-session work gets `keelson handoff <name>`.
- **Create artifacts lazily.** An empty document is not progress. ROADMAP, GLOSSARY, rules, specs, tasks, ledger, and handoff appear only when they carry information another person or session would need.
- Repeated failure classes become a scoped rule or executable fitness check through `keelson retro`; shrink prose once automation carries the invariant.
- If `NOW.md` starts with "First contact", draft `INTENT.md` from the repository and ask the owner to confirm or correct it. Do not inventory the repository; create specs/rules only as real work exposes a durable contract or invariant.

The canonical task router is `.keelson/skill/SKILL.md`. It chooses the user intent first, then loads only the references needed for that intent.
