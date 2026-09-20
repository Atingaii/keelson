# Work notes

### Root cause: implicit-assumption
Lock acquisition already tolerated transient Windows sharing violations, but release assumed that closing the owning descriptor made immediate removal infallible. The Windows Node 20 CI job failed with EPERM while removing ledger.md.lock in the sixteen-writer scenario. The two new release-retry regression tests fail against the previous implementation. The fix retries deletion of the acquired lock only, never the callback; direct unlink avoids the extra metadata lookup in rm. Successful removal stops immediately. Persistent or unrelated failures remain errors.

CI reproduction: https://github.com/Atingaii/keelson/actions/runs/35518522398/job/106098453383

### Verify: targeted regression
The new tests first failed against the previous implementation. With the fix, all 17 filesystem and evidence tests pass, including sixteen concurrent writers. The configured full signed suite remains the completion gate; remote Windows CI must confirm platform behavior.

### Review: independent filesystem review
The reviewer found no blocking issues: lock ownership remains exclusive, successful deletion stops before any successor can be removed, callbacks are single-shot, and permanent or unrelated errors propagate. The reviewer independently ran all eight filesystem tests successfully. Actual Windows behavior remains subject to the new CI run.

### Verify: checks pass
`npm run lint` exit 0; `npm run test` exit 0 · tree 48776af729e813ad115f51b4417ca99ad0dfe0ef4550e4dd423157e56298c472
