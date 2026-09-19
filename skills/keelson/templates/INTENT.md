# {{project}}

## Why this exists
One paragraph. The problem this project solves and for whom. If this paragraph is wrong, everything built on it is wrong.

## Boundaries
- In scope: …
- Explicitly not: … (write the tempting things you have decided not to do)

## Hard constraints
- … (runtime, compatibility, performance, security, licensing)

## Authorizations
What the agent may decide alone, and what it must bring back with a recommendation.
- Decides alone: local implementation choices inside a confirmed scope; test structure; naming that follows existing patterns.
- Recommends, owner decides: anything that changes user-visible behaviour, scope, or a long-term commitment; new dependencies; public interface changes.
- Always confirms: irreversible data operations, production changes, permission widening, breaking compatibility.

## Working defaults
- Change sizing: auto (the agent decides; override per request with "treat as spec" / "just do it")
- Quick changes: proceed after write-back
- Spec changes: wait for approval
