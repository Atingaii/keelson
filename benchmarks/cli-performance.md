# Local CLI performance benchmark

Run this benchmark from a checkout with dependencies installed:

```bash
npm ci
node benchmarks/cli-performance.mjs
```

It writes the measured machine's data to [cli-performance.json](cli-performance.json). This is a reproducible local protocol, not a CI timing test. Do not compare results from different machines, filesystems, Node versions, or Git versions as though they were a single baseline.

The protocol builds a fresh local Git fixture with exactly 5,000 tracked ordinary one-line JavaScript files. It takes three warm-up samples, then records 30 raw wall-time samples for each command. The JSON records the raw samples, nearest-rank p95, host details, command lines, and target result. The fixture project, cloned init projects, temporary HOME/USERPROFILE/XDG cache, isolated Git configuration, and Git runtime all live under one temporary directory and are removed in `finally`, including on a command failure.

The measured commands and p95 targets are:

| Command | Target |
| --- | ---: |
| `status` | < 200 ms |
| `context` | < 300 ms |
| `ask frontier` | < 300 ms |
| `impact` | < 500 ms |
| `validate` | < 1,000 ms |
| `check` estimated Keelson overhead | < 200 ms |
| `land --keep` | < 2,000 ms |
| `init --no-hooks` | < 3,000 ms |

The initial `status`, `context`, `ask`, `impact`, and `validate` group has one active quick change but no signed ledger. It is retained as a distinct raw observation. `status` still computes the full worktree fingerprint over the 5,000 tracked files; the difference is the absence of a ledger for lifecycle verification. After it, the benchmark creates one complete local signed check record outside timing and samples a separate fresh-signed-record `status`/`context` group. The published status and context target verdicts use that signed-record group, never the no-record group.

`check` uses the fixed no-op command `node -e "process.exit(0)"`. Its result retains no-record end-to-end samples, fresh `--record` samples, and a same-command shell baseline. The reported target overhead is a paired, nonnegative subtraction of the no-record end-to-end and direct command wall times. It cannot strictly remove scheduler, shell, child-process, process-startup, signature, or filesystem-cache effects, so both end-to-end paths remain the authoritative measurements.

Every land sample is prepared outside the timer with an accepted quick change and a locally signed, complete no-op check. The timed operation is therefore the actual normal `land --keep` gate and archive path, rather than a forced or unsigned shortcut. The script does not use a Git-status filename cache; it deliberately measures every CLI invocation against the full tracked fixture.

The result is an observed wall-time record. Other processes on the host may add load, so it does not claim an idle-machine lower bound.

The JSON keeps an `attempts` history. After every completed command group the current attempt is written with its raw samples; a failed invocation is retained as `status: "failed"` with every group that did complete. A later run appends rather than overwrites that record.
