<!-- keelson:start -->
## Keelson

This repository keeps its working facts in `.keelson/`: `INTENT.md` (why it exists, what it will not do, what the agent may decide alone), `ROADMAP.md` (current milestone), `NOW.md` (what is in flight), specs (how the system behaves today), `rules/` (conventions routed by path), `changes/` (work in progress, empty when idle). Existing project documents are referenced from `config.yaml`, never duplicated.

- Before non-trivial work, run `keelson context --paths <files>`; before editing shared modules, `keelson impact <files>`.
- Size the change yourself: trivial (just do it) · quick (write back your understanding, then proceed) · spec (clarify, draft `change.md` + delta specs + acceptance, wait for approval).
- Record decisions as confirmed or assumed; open questions block only the slices that depend on them.
- Claim "done" only with `keelson check --record`; landing refuses stale or missing evidence. `keelson land <name>` when integrated; then rewrite `NOW.md`.
- Stopping mid-change: `keelson handoff <name>` and fill it in. Resuming: check the worktree first, then `keelson status`.
- The `keelson` skill has the details; read only the reference you need.
- If `NOW.md` starts with "First contact", draft `INTENT.md` (and specs and rules for an existing codebase) from the repository and confirm with the owner; never ask them to write it.
<!-- keelson:end -->
