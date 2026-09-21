# Discoverable installed guidance

## Requirement: Discoverable installed guidance

The CLI SHALL list available installed guidance with localized titles and a machine-readable representation while preserving existing named-reference output.

### Scenario: Reference discovery
- WHEN `keelson guide --list --json` runs
- THEN its unique reference names include workflow and every available reference, each of which can be read by name
