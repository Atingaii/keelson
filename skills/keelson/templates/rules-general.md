# General conventions

Rules are feedforward controls. Keep each one or two lines, scoped, and checkable. State what must remain true, not a preferred implementation recipe. If a command can enforce the invariant, put it in `config.yaml → check` and keep the prose as a pointer.

## Before editing
- Match the surrounding style; do not reformat files you are not otherwise changing.
- Keep unrelated cleanup out of the current change; record it separately unless it blocks the requested work.

## Checks
- Run the cheapest relevant check while editing; before completion or landing, `keelson check --record` must pass on the current tree.
