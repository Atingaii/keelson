<!-- keelson:start -->
## Keelson

This repository keeps its working facts in `.keelson/`: `INTENT.md` (why it exists, what it will not do), `NOW.md` (what is in flight), `specs/` (how the system behaves today), `rules/` (conventions routed by path), `changes/` (work in progress).

- Before non-trivial work, run `keelson context --paths <files>` or read those files directly.
- Size the change yourself: trivial (just do it) · quick (write back your understanding, then proceed) · spec (interview, draft `change.md` + delta specs, wait for approval).
- Claim "done" only with a fresh command and its exit code. `keelson check` runs the project's checks.
- Land finished work with `keelson land <name>`; then rewrite `NOW.md`.
- The `keelson` skill has the details per phase; read only the reference you need.
<!-- keelson:end -->
