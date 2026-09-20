---
base: f9f2ff66b6
---
# cli — delta

## ADDED Requirements

### Requirement: Discoverable frontend workflows
The CLI SHALL expose a bilingual design action catalog and focused agent briefs, loading installed guidance without modifying the working directory. It SHALL distinguish prepared guidance from executed checks.

#### Scenario: Design action outside an initialized project
- WHEN a user requests a known design action with a target and language
- THEN the CLI prints the matching localized workflow, target, references and verification expectations without creating files or fetching the target

#### Scenario: Unknown design action
- WHEN a user requests an unrecognized action
- THEN the CLI fails with a useful catalog recovery command and does not execute the target

### Requirement: Discoverable installed guidance
The CLI SHALL list available installed guidance with localized titles and a machine-readable representation while preserving existing named-reference output.

#### Scenario: Reference discovery
- WHEN `keelson guide --list --json` runs
- THEN its unique reference names include workflow and every available reference, each of which can be read by name

### Requirement: Focused command help
The CLI SHALL offer compact grouped help, full option discovery and equivalent `help <command>` and `<command> --help` output without running that command.

#### Scenario: Invalid command
- WHEN a command name is unknown, including in a help request
- THEN the CLI returns exit code 2 and a focused error with a recovery command
