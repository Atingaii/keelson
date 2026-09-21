# Exact delta operations

## Requirement: Exact delta operations

MODIFIED and REMOVED SHALL reference existing canonical requirement identities; ADDED SHALL introduce a new identity. Invalid or ambiguous operations SHALL fail before durable writes. Review SHALL inspect merged current truth for semantic contradictions across differently named requirements and superseded decisions.

### Scenario: Misspelled or misclassified operation
- WHEN a modified/removed requirement is absent, an added name exists or an unknown operation contains requirement blocks
- THEN preparation and merge report the invalid operation rather than silently append, overwrite or skip it

### Scenario: Replacing existing behavior
- WHEN MODIFIED names a current requirement
- THEN the replacement removes its superseded body while preserving unrelated requirements and current decisions
