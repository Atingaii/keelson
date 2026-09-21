# Discoverable frontend workflows

## Requirement: Discoverable frontend workflows

The CLI SHALL expose a bilingual design action catalog and focused agent briefs, loading installed guidance without modifying the working directory. It SHALL distinguish prepared guidance from executed checks.

### Scenario: Design action outside an initialized project
- WHEN a user requests a known design action with a target and language
- THEN the CLI prints the matching localized workflow, target, references and verification expectations without creating files or fetching the target

### Scenario: Unknown design action
- WHEN a user requests an unrecognized action
- THEN the CLI fails with a useful catalog recovery command and does not execute the target
