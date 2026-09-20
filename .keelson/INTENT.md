# keelson

## Why this exists
Coding agents are good at one task and bad at a project that lasts years: they forget why things were decided, let specs drift from code, treat green tests as met requirements, cannot resume each other's work, and collide when they run in parallel. Keelson is the project-local engineering control plane that keeps those facts in the repository in a form agents read at the right moment, keeps work, verification, and release state apart, and refuses to call anything done without evidence that matches the code. The user manages a conversation, not a process.

## Boundaries
- In scope: the `.keelson/` directory contract, the CLI that reconciles it, package-loaded guidance with thin discovery adapters and optional vendoring, host hooks that dispatch installed package code where a host has a documented lifecycle API, and the effort-tier registry.
- Explicitly not: a task runner, a test framework, a hosted service, per-tool plugins beyond files the tool already reads, any behaviour gate on the agent itself.

## Authorizations
- Decides alone: implementation choices inside a confirmed change; test structure; naming that follows existing patterns; which reference to read.
- Recommends, owner decides: anything that changes the `.keelson/` layout, the ledger or spec format, a CLI flag, or the skill's guidance; new dependencies.
- Always confirms: publishing to npm, pushing tags, force-landing a change, deleting user files.

## Hard constraints
- Node ≥ 20; runtime dependencies must earn their maintenance cost. Host hooks execute installed package code.
- No dated model IDs anywhere in this repository or in generated files.
- Every piece of agent guidance carries a `without:` and a `sunset:` annotation, and the Chinese mirror carries the same ids.
- Credit prior art and use reproducible comparisons; do not claim universal superiority, compliance, or hostile-agent isolation from local signatures.
- Generated surfaces are re-creatable from the package (`keelson update`), ownership-tracked, drift-diagnosable, recoverably replaced, and removable (`keelson ablate` / `uninstall`).
- A host is first-class only with verified or primary-documentation discovery paths plus init/update/doctor/uninstall and cross-platform contract coverage; guessed host directories are not support.

## Working defaults
- Change sizing: auto
- Quick changes: proceed after write-back
- Spec changes: proceed within the user's established authorization; ask only for a material unresolved owner decision.
