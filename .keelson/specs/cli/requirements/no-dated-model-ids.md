# No dated model IDs

## Requirement: No dated model IDs

`keelson validate` SHALL fail when any file under `.keelson/` contains a dated model identifier.

### Scenario: Dated ID in a ledger
- WHEN a ledger contains a model identifier ending in an eight-digit date
- THEN `keelson validate` exits 1 and names the file
