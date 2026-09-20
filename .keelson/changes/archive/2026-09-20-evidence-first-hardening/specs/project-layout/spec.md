---
base: 16207cb89c
---
## ADDED Requirements

### Requirement: Markdown and path integrity
Recognized requirement edits SHALL preserve frontmatter, fenced examples and unknown sections. Sharding SHALL avoid deleting unowned files or following paths outside the capability.

#### Scenario: Unowned content
- WHEN a requirement changes in a document with custom sections
- THEN custom content remains; if safe sharding is unavailable, budget validation reports the issue without discarding content
