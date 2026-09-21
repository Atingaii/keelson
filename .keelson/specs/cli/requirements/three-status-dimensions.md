# Three status dimensions

## Requirement: Three status dimensions

`keelson status` SHALL report work status (from `status:` in change.md or derived from the artifacts), verification status (not-run, passed, failed, partial, stale), and release status (unreleased, or landed since the last tag) separately.

### Scenario: Code edited after verification
- WHEN a file outside `.keelson/` changes after a passing `Verify:` entry
- THEN `keelson status` shows verification `stale` while work status is unchanged
