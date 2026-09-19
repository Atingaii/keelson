<!-- keelson:start -->
## Keelson

This repository keeps project facts in `.keelson/`; existing docs are referenced from `config.yaml`, never duplicated. The `keelson` skill holds the workflow details and loads deeper references only when needed.

- **Orient:** before non-trivial edits inspect the worktree and run `keelson context --paths <files>`; before shared modules run `keelson impact <files>`.
- **Bound:** trivial = do it; quick = write back your understanding + `keelson new`; spec = clarify, draft acceptance + delta specs, wait for approval.
- **Build:** one vertical slice at a time. Keep unrelated cleanup out; do not silently weaken tests or change a behavioural contract.
- **Sense:** run cheap relevant checks early; claim done/fixed/passing only after fresh `keelson check --record` evidence on the current tree.
- **Reconcile:** write durable facts back to specs/rules/NOW; unfinished work gets `keelson handoff <name>`.
- If the same failure class repeats, run `keelson retro`; promote the pattern to a scoped rule or executable fitness check, then shrink redundant prose.
- If `NOW.md` starts with "First contact", draft `INTENT.md` (and specs/rules for existing code) from the repository and ask the owner to confirm; never make them author the scaffolding.
<!-- keelson:end -->
