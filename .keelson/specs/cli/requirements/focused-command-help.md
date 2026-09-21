# Focused command help

## Requirement: Focused command help

The CLI SHALL offer compact grouped help, full option discovery and equivalent `help <command>` and `<command> --help` output without running that command.

### Scenario: Invalid command
- WHEN a command name is unknown, including in a help request
- THEN the CLI returns exit code 2 and a focused error with a recovery command
