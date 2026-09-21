# Three primary CLI hosts

## Requirement: Three primary CLI hosts

Initialization and update SHALL support Claude Code, Codex and CodeBuddy through native project discovery and workflow hook registration. Protocol differences SHALL be handled explicitly. Updates and hook removal SHALL preserve neighboring user settings and matcher groups. Codex hook trust SHALL remain host-controlled. Registration checks SHALL NOT imply live host trust or successful model execution.

### Scenario: Multiple hosts in one repository
- WHEN an owner initializes all three hosts and later disables hooks
- THEN each host has its own discovery entry and protocol adapter, and disabling removes only Keelson registrations while preserving project knowledge and user hooks
