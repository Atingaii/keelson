# Preserve generated runtime ownership across upgrades

## Requirement: Preserve generated runtime ownership across upgrades

Published unmodified 0.4.0/0.4.1 discovery and vendor surfaces SHALL upgrade without force. New installations SHALL record runtime content digests for later upgrades. Edited generated files and unknown neighboring files SHALL be preserved, and conflicts SHALL fail before configuration mutation.

### Scenario: Customized workflow during upgrade
- WHEN an installed workflow differs from its recorded generated content
- THEN update reports the conflict and preserves the workflow and existing configuration
