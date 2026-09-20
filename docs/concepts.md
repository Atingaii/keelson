# Concepts

Keelson keeps project facts, planned changes and observed results separate.

| Record | Purpose | Lifetime |
|---|---|---|
| `INTENT.md` | Purpose, boundaries and authority | Project |
| Specs and scoped rules | Confirmed behavior and recurring constraints | Project |
| `changes/<name>/change.md` | Requested outcome, acceptance, impact | Change |
| `decisions.json` | Owner, prerequisites, answer, basis and history | Change/archive |
| `tasks.md` | Optional mutable execution plan | Change |
| `ledger.jsonl` and `evidence/` | Signed checks and their output | Change/archive |
| Private session state | Which change this conversation is about | Machine/session |

A session ending does not finish a change. An unchecked plan item is not by itself a completion gate. Acceptance must be satisfied, blocking decisions resolved, rollout described where needed, and a complete current check record available.

A signature establishes integrity relative to a key, not truth relative to a requirement. Review whether the tests cover the requested behavior. [Verification and trust](verification.md) explains freshness, local trust and the limits of the record.
