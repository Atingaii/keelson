# Session focus routing

## Requirement: Session focus routing

Session focus SHALL live in Git-private keelson-runtime/sessions or an external per-project cache. KEELSON_SESSION_ID, CODEX_THREAD_ID or PI_SESSION_ID selects a caller-local pointer. Missing identity SHALL degrade without storing a shared focus.

### Scenario: Independent Codex threads
- WHEN two CODEX_THREAD_ID values focus different changes
- THEN each command resolves only its caller

### Scenario: Clear focus
- WHEN focus --clear runs
- THEN durable work remains active
