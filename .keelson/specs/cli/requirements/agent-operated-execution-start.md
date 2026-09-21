# Agent-operated execution start

## Requirement: Agent-operated execution start

Product-edit guidance SHALL create the smallest useful tracked change and call start before implementation. The CLI SHALL reject open or assumed decisions, unresolved prose questions, missing concrete acceptance, blocked states and unfinished prerequisites. Successful start SHALL record the current plan and bind the session. Supported Claude Code and CodeBuddy file-edit hooks and Codex apply_patch hooks SHALL deny modification when the session has no focus or the start record is absent or stale; planning artifacts remain editable. This guard SHALL preserve host permissions and SHALL NOT claim to cover arbitrary shell or MCP writes.

### Scenario: Decision or plan changes after starting
- WHEN a registered decision reopens or the change scope or delta changes
- THEN the file-tool guard rejects product modification until the current plan passes start again
