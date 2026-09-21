# Complete ready decision frontier

## Requirement: Complete ready decision frontier

Frontier output SHALL preserve all ready owner questions, expose omitted ones as remaining by default, support --limit 1 and --all, and separate agent/reality investigations and blocked dependencies. Invalid limits SHALL fail before mutation. A complete registered graph SHALL NOT be represented as proof that all relevant decisions were discovered.

### Scenario: Complex round has five ready questions
- WHEN the agent requests --all
- THEN all five questions are returned in the same frontier, with none silently lost to the default presentation limit
