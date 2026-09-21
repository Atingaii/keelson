# Idempotent init and update

## Requirement: Idempotent init and update

Running init/update repeatedly SHALL preserve project facts and user-authored integration content, maintain one owned discovery block per selected surface, and use package guidance unless vendor mode is explicitly configured.

### Scenario: Repeated update
- WHEN update runs twice
- THEN generated desired state is stable and no unrelated content or .gitignore line changes
