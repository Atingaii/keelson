# Evidence is recorded with a fingerprint

## Requirement: Evidence is recorded with a fingerprint

Check --record SHALL bind full code and acceptance-input fingerprints, exact commands, exit codes, timestamps and log digests in an Ed25519 DSSE envelope. Signed JSONL and logs SHALL remain with the change when archived. Private keys and command trust SHALL stay machine-local.

### Scenario: Input-changing command
- WHEN a command edits bound inputs during execution
- THEN the record cannot satisfy normal landing

### Scenario: Command trust
- WHEN a new or changed command suite lacks local trust
- THEN no command executes until --trust explicitly authorizes it
