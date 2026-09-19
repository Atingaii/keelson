# Roadmap

## Now
Make Keelson correct even when users never announce task boundaries. The durable work lifecycle is independent from chat/session lifetime; per-session focus is local convenience, readiness is derived from acceptance/evidence, and handoff is an explicit transfer artifact rather than a normal resume requirement.

Keep the product's other constraints: minimal standing control plane, one canonical runtime, seven first-class discovery/lifecycle adapters plus portable fallback, manifest reconciliation, recoverable update, drift diagnostics, and revision-bound evidence.

## Next
- Validate session focus, parallel isolation, derived `ready`, automatic land routing, `.runtime/evidence`, and legacy cleanup across Ubuntu/macOS/Windows.
- Implement and exercise native session adapters host-by-host. Kiro CLI and CodeBuddy have documented session-id hook inputs; Codex hook integration needs mode/version testing before promotion; other hosts remain safely degraded until evidenced.
- Run real scenarios with two simultaneous agent windows, topic switching, no explicit stop phrase, terminal close/reopen, changed requirements, and merge conflicts.
- Measure whether NOW/handoff usage can be reduced further now that session focus and durable changes are separated.

## Later
- Promote a host from degraded to native session focus only after deterministic lifecycle tests.
- Prefer capability metadata and safe degradation over host-specific duplicated workflows.
- Prefer deleting process to adding it once a mechanical invariant replaces prose.
