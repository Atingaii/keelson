# Phase-specific contract injection

## Requirement: Phase-specific contract injection

Implementation and checking SHALL receive original request, change, decisions, relevant current/delta specs and rules, plus declared per-phase context files. Missing declared files SHALL fail visibly. Touches globs SHALL conservatively include narrower applicable rules. Claude and CodeBuddy Agent/Task hooks SHALL preserve original input while appending the phase pack using the host protocol. Codex SHALL supply child phase context without granting tool permission to rewrite arguments: tracked dispatch includes an explicit change marker and the child automatically binds it and loads its phase pack. Child hooks SHALL use the child thread identity, never infer the direct parent from the shared root session ID. Generic subagent startup SHALL preserve the assigned task scope and SHALL NOT overwrite an unknown phase. Injection caches SHALL distinguish agents, and session compaction SHALL restore context.

### Scenario: Independent review preparation
- WHEN a fresh reviewer is assigned the check phase
- THEN it receives the request and contracts without treating the implementer's summary as proof, and guidance assigns repairs to the implementer before affected-scope re-review
