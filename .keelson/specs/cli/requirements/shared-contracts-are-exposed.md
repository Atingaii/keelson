# Shared contracts are exposed

## Requirement: Shared contracts are exposed

`keelson status` SHALL warn when two active changes carry delta specs for the same capability or declare overlapping `touches` paths.

### Scenario: Two deltas on one capability
- WHEN two active changes both have `specs/orders/spec.md`
- THEN `keelson status` prints a shared-contract warning naming both
