# CLI reference

Run inside an initialized project. Use `keelson <command> --help` for the synopsis. Exit codes: 0 success, 1 failed operation/check, 2 unknown command, 4 untrusted commands, 5 malformed persisted JSON. Command success alone does not mean a change can land.

## Design and guidance discovery

`keelson design` lists design actions; `keelson design harden "settings form"` prepares a focused agent brief. Supports `--json`; target text is never executed. The host agent performs implementation and browser verification. See [frontend design](frontend.md).

`keelson guide --list [--json]` lists installed guidance; `keelson guide <name>` reads a reference on demand. `keelson help <command>` equals `<command> --help`; `--help --all` shows every option. `-h` and `-v` show help and version.

## Installation

```bash
keelson init --codex
keelson init --claude --codex --no-hooks
keelson update --dry-run
keelson update
keelson platforms --json
keelson doctor --session --json
keelson guide workflow
keelson guide verify
```

Init/update accept `--tools a,b`, host flags, `--lang en|zh`, `--profile lean|guided`, `--guide`, `--hooks|--no-hooks`, `--dir path`, `--vendor` and `--dry-run`. Updates reuse saved configuration.

Defaults retain project facts and small discovery shims; guidance loads from the installed package. `--vendor` explicitly copies it. Claude-only installs do not add the portable agents layer. Keelson does not add ignore rules. See [platform support](platforms.md).

## Context and work

```bash
keelson context --paths src/api/** --json
keelson impact src/api/orders.js
keelson new add-pagination --tier spec --capability orders --touches src/api/**
keelson focus add-pagination
keelson start add-pagination
keelson context --phase implement --change add-pagination
keelson context --phase check --change add-pagination --json
keelson focus --auto --json
keelson status --json
keelson handoff add-pagination --by maintainer
```

`start` is the agent-operated transition from planning to implementation. It rejects unresolved decisions, missing acceptance checks and unfinished prerequisites, then records the current plan and sets `in-progress`. Changed plans require another start. Phase context includes the request, change, decisions, contracts and relevant rules; `context.json` adds project-relative files in `implement` and `check` arrays (schema 1). See [automation](automation.md).

New also accepts `--depends a,b`, `--owner name` and `--worktree`. Quick starts with change.md; spec adds tasks and requested deltas. Other artifacts appear when needed.

`focus --clear` clears only the session pointer. Codex uses CODEX_THREAD_ID; `KEELSON_SESSION_ID` supplies an explicit identity. Without reliable identity, selection degrades to an unpersisted candidate. Runtime state lives in Git's private keelson-runtime directory, or an external per-project user cache outside Git.

## Decisions

```bash
keelson ask add D17 --change add-pagination --owner user --question "Which ordering should clients observe?" --recommend "creation time"
keelson ask settle D17 --change add-pagination --answer "creation time" --basis "User selected this ordering"
keelson ask frontier --change add-pagination --json
keelson ask list --change add-pagination
```

Owners: user, agent, reality. Add accepts `--depends D1,D2` and `--irreversible`. The default frontier exposes three ready user questions, `remaining`, and investigations. Use `--limit 1` for a simple gap or `--all` for the whole ready frontier in a complex round. `complete: true` means the registered tree has no open or assumed decisions; an empty question list alone does not establish completion. Settled questions stay settled.

Assume takes answer and basis; irreversible decisions cannot be assumed. Reject takes a basis. `reopen D17 --reason "..."` preserves the previous answer in history. Open and assumed structured decisions block normal landing.

## Verification

```bash
keelson check --trust --record --change add-pagination
keelson check --record --change add-pagination --timeout 600000 --json
keelson check "npm test -- orders" --record --change add-pagination --trust
keelson attest add-pagination --json
keelson validate --json
```

Review commands before first trust. Trust authorizes local shell execution; it is not a sandbox. Changed suites require renewed trust. Empty suites fail. Timeout is milliseconds per command; output is capped at 2 MiB per command.

Record writes signed ledger.jsonl evidence and logs inside the change. Readable ledger.md prose is not verification authority. Complete configured checks must pass against unchanged code and acceptance inputs. An explicit subset can pass as a command while remaining partial evidence. Quiet suppresses live output; JSON emits machine-readable results.

Attest exports active or archived evidence and its current local verification status; it exits nonzero when not fresh and trusted. An archived change may use its original name only when that name resolves uniquely; for a legacy archive without its recorded original name, only the plain `YYYY-MM-DD-<name>` form can resolve this way. Cancellation and collision suffixes require the exact archive directory printed by the error. Another machine requires a new local run. See [trust limits](verification.md). Validate checks structure, deltas, decisions and budgets; it does not execute tests.

## Landing

```bash
keelson land add-pagination --dry-run
keelson land add-pagination --keep --now "Pagination integrated."
keelson cancel add-pagination --reason "Superseded"
```

Landing requires completed acceptance, fresh complete evidence, resolved questions/dependencies, reconciled contracts and a rollout for breaking changes. Task checkboxes are advisory. Accept-drift acknowledges a reviewed spec-base conflict; changed inputs still require rechecking. Confirm-assumptions applies to legacy prose assumptions; structured ones must be settled.

`--force --reason "..."` records a signed override and failed gates; it does not turn failed checks into success. Use only for an authorized override. Changes requiring independent review cannot force past review or fresh complete checks. Active checks block landing and cancellation. Landing snapshots affected files and rolls back ordinary failures. After a process crash, confirm no writer remains and resolve any abandoned lock before retrying; the next landing then recovers the interrupted transaction. See [recovery instructions](verification.md).

Delta specs and durable decisions merge into main specs; large specs shard automatically. Signed changes archive even with land: fold. Cancellation archives without merging.

## Maintenance

```bash
keelson retro --json
keelson models --resolve standard --platform codex
keelson models rank gpt-5.6-terra standard --platform codex
keelson ablate --dry-run
keelson ablate
keelson restore
keelson uninstall
```

Retro summarizes ledger events. Model tiers guide agents rather than launching a model. Ablate/restore stash and restore integration; stop other writers during maintenance. Uninstall retains project facts; purge explicitly removes .keelson data. Review output logs before committing.

## `review`

Agent-operated: `keelson review --prepare [change]` produces the current acceptance/merged-contract packet and report template. A fresh reviewer fills it, then `keelson review --record <project-relative-report.json> [--change name]` records the outcome. Every acceptance needs observed evidence; counterexamples and merged-capability checks are required. Findings, missing coverage or stale inputs prevent normal landing. Record the review before final signed checks. Spec changes and any delta require review; other behavioral quick work uses `new --review independent`.
