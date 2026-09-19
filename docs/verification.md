# Verification

Completion is a claim with evidence attached. Evidence can fail in two independent ways: the record can be invalid (the check never ran, ran against older code, or ran partially), and the content can be invalid (it ran, passed, and still did not check what was asked). Keelson handles the first mechanically and gives the agent a structure for the second.

## Record validity

### keelson check --record

```bash
keelson check --record "pagination end to end"
```

The command:

1. runs every command under `config.yaml → check`, in order, through the shell, with colour disabled;
2. prints each command's output (unless `--quiet`) and its exit code;
3. saves the full output of each command to `.keelson/.local/evidence/<timestamp>-<n>.log`;
4. computes the worktree fingerprint;
5. appends a `Verify:` entry to the active change's `ledger.md` (or the one named with `--change`):

```markdown
### Verify: pagination end to end
`npm run lint` exit 0; `npm run test` exit 0 · tree 5bcb829dae
```

Without `--record` it prints the entry instead of appending it. A single extra command can be run and recorded with `keelson check "npm test -- orders" --record`. The command exits 1 when any check failed; the entry is still written, with the failing exit code, so the failure is on record.

### The worktree fingerprint

A stable identity for "the code as it is now". In a git repository Keelson builds a tree object from a throw-away index with `.keelson/` excluded: tracked and untracked files count, `.gitignore` is respected, and appending to a ledger does not invalidate the evidence it records. Without git, it is a content hash. See [How it works](how-it-works.md#the-worktree-fingerprint).

### Staleness

`keelson status`, `land`, and `doctor` recompute the fingerprint and compare it with the last `Verify:` entry:

| State | Meaning |
|---|---|
| `not-run` | No `Verify:` entry |
| `partial` | An entry without an exit code |
| `failed` | Non-zero exit |
| `stale` | Exit 0, but the tree has changed since |
| `passed` | Exit 0 and the tree matches |

`land` refuses anything but `passed`. Evidence written by hand without a `tree` counts as passed with staleness unknown; `validate` warns about it.

### Partial verification

If a check cannot run (environment missing, service down), the agent records it as a `Note:` in the ledger and under `NOW.md → Blocked / uncertain`. Partial verification is reported as partial; it is never rounded up to passed.

## Content validity

### Acceptance mapping

`change.md → Acceptance` maps the request to the evidence. One checkbox per criterion, each saying how it is checked:

```markdown
## Acceptance
- [x] listing returns 20 by default — test: `orders.list.default`
- [x] page 2 returns the next 20 — check: `npm test -- orders.paging`
- [ ] oversized page returns 400 with code size_too_large — manual: curl size=500
- [ ] no caller still relies on the unbounded listing — review: grep callers of listOrders
```

Four kinds: `test:` names a test, `check:` a command, `manual:` a human check, `review:` something to read. An item is ticked only when its check has run. `keelson land` refuses while any is unchecked and refuses a spec-tier change with no acceptance list at all. `validate` warns when an item does not say how it is checked.

The agent fills this list from the original request and the delta spec's scenarios, not from its own summary of the work.

### Negative checks for bug fixes

A regression test that passes with and without the fix proves nothing. For a fix, the agent keeps the negative check: with the fix reverted, the test must fail. The `debug.md` reference asks for it before `keelson check --record`.

### Tests may change, not quietly weaken

Editing a test is normal when the requirement changed. Deleting an assertion, skipping a case, widening a tolerance, or replacing a real check with a mock changes the acceptance criteria. That needs the owner's decision or an explicit authorization from `INTENT.md`, and it goes into the ledger as a `Ruling:` naming what was weakened and why.

### Fresh-reader review

For spec changes the agent dispatches a reviewer that has not seen the conversation, at the `deep` tier, with the original request, `change.md`, the delta specs, and the diff. The reviewer looks for acceptance items without real coverage, requirement gaps, rule violations, and risky assumptions. Each finding is addressed or ledgered. A second agent agreeing is a signal, not a proof; the acceptance list is what gets checked.

## The completion report

```text
Done: offset pagination on /orders, pager in the table.
Evidence: `npm run lint` exit 0; `npm test` exit 0 · tree 5bcb829dae. Acceptance 3/3.
Open: none. Change in review; `keelson land add-pagination` when integrated.
```

What was done, what the evidence is, what is left. Words such as "should", "probably", and "seems to" about a status mean the command has not been run.

## In CI

```bash
keelson validate && keelson check
```

`check` in CI runs without `--record`; it produces the exit code. The ledger entry is written by the agent on its own machine, against the fingerprint of the code it actually ran.
