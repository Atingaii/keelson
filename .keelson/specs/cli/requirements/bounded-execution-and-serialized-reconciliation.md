# Bounded execution and serialized reconciliation

## Requirement: Bounded execution and serialized reconciliation

Checks SHALL use closed stdin, finite deadlines and output caps, and record every completed result. Landing and cancellation SHALL not race active checks.

### Scenario: Active check
- WHEN land or cancel is requested while checks execute
- THEN the operation refuses even when force is requested
