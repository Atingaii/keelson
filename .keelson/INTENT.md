# keelson

## Why this exists
Coding agents start every session without the project's reasons, conventions, or state, and every task runs on the same model regardless of difficulty. Keelson keeps those facts in the repository in a form agents read at the right moment, and routes effort by task difficulty, without adding ceremony the user has to drive by hand.

## Boundaries
- In scope: the `.keelson/` directory contract, the CLI that maintains it, one skill per supported tool, hook scripts for tools that support them, the effort-tier registry.
- Explicitly not: a task runner, a test framework, a hosted service, per-tool plugins beyond files the tool already reads, any behaviour gate on the agent itself.

## Hard constraints
- Node ≥ 20, one runtime dependency (`yaml`). Hook scripts have zero dependencies.
- No dated model IDs anywhere in this repository or in generated files.
- Every piece of agent guidance carries a `without:` and a `sunset:` annotation.
- Generated surfaces are re-creatable from the package (`keelson update`) and removable (`keelson ablate`).

## Working defaults
- Change sizing: auto
- Quick changes: proceed after write-back
- Spec changes: wait for approval
