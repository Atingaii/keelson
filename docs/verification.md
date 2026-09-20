# Verification, evidence, and trust

Run the configured suite after the final code and acceptance edits:

```bash
keelson check --trust --record "pagination acceptance passes"
keelson status --json
keelson attest change-name --json > attestation.json
keelson land change-name
```

Review `.keelson/config.yaml → check` before the first use of `--trust`. Trust is local and bound to the exact command list. Commands run as your user, with the environment available to the CLI. Trusting a command such as `npm test` also trusts the project code that command executes; this is not a sandbox. Later code edits require fresh evidence but do not automatically revoke command trust.

## What is recorded

`changes/<name>/ledger.jsonl` is an append-only sequence of DSSE envelopes. A verification envelope has payload type `application/vnd.in-toto+json` and an in-toto Statement v1 containing:

- a full Git tree object ID (or SHA-256 worktree digest outside Git);
- a SHA-256 contract digest covering configuration, intent, main specs, rules, change acceptance, delta specs, and structured decisions;
- exact commands, exit codes, duration, timeout/output-limit status, and SHA-256 output digests;
- timestamps, CLI version, suite completeness, and whether inputs stayed unchanged during checking;
- optional host/model labels, explicitly marked as caller-supplied attribution.

`evidence/<sha256>.log` stores command output. `evidence/keys/<keyid>.pem` exports public keys so a reader can check the cryptographic envelope. `ledger.md` is a readable summary and is never an authorization source.

`attest` exports the envelopes and current local status as JSON. To let another reader check the logs and every historical signer, share the complete change or archive directory, including `evidence/`; those files are not embedded in the JSON export.

Checks default to a ten-minute deadline per command. Override with `--timeout <milliseconds>` or `check_timeout_ms` in configuration. Output exceeding 2 MiB stops the command with exit 125; timeout yields exit 124. These records fail verification. Commands run with closed stdin, so interactive checks must be made noninteractive first.

## Freshness and completeness

The current tree must equal the recorded tree. The current contract must equal the recorded contract. The latest verification must contain every configured command, in order, with exit zero; an older successful run cannot hide a later failed run. Partial commands can be recorded for diagnosis but cannot authorize landing.

For Git projects, the worktree fingerprint includes tracked and non-ignored untracked project files, excluding `.keelson/`. Contract files under `.keelson/` are hashed separately. Ignored build products and dependencies are not hashed. This is not a hermetic environment digest: a changed interpreter, dependency installation, network service, clock, or external file requires the operator to rerun checks even if the tree is unchanged.

Concurrent record writers use a lock and durable append. Logs are content-addressed. A check detects inputs changed between its start and finish. No completion claim is made while another check is active. There is no protection against an adversarial process changing a file and restoring it between the two snapshots.

On timeout or excessive output, Keelson terminates the command's process group (the process tree on Windows) and bounds its own wait for output pipes. A child that deliberately detaches can escape that termination; `terminationUnconfirmed: true` reports when pipe closure was forced. Such a run fails and cannot authorize landing. Use an operating-system sandbox for untrusted commands.

## Trust boundary

The private Ed25519 key, command trust and session state live in Git's private `keelson-runtime` directory (worktree-specific). Non-Git projects use `~/.cache/keelson/<project-path-hash>`. They do not require a `.gitignore` entry.

A local signature detects edited or fabricated records whose writer lacks the private key. It **does not** isolate an agent running as the same OS user. That agent can access the key, execute commands, or replace the CLI. A stronger hostile-agent boundary needs a separately controlled runner and independently trusted key.

Copied records are not automatically trusted for local completion. Run the checks on the receiving machine to add a locally signed record; historical exported keys remain available to verify the older records. Exported keys alone do not establish who controlled them. Authentic model attribution and legal compliance are outside this mechanism.

Logs can contain secrets printed by project commands. Review them before sharing. Do not silently redact a signed log: that changes its digest. Preserve restricted originals or create a fresh, deliberately sanitized check and record.

`ablate` temporarily copies project knowledge and host configuration into the user's recovery stash. On POSIX, its project-specific directory is restricted to mode `0700` before copying; this does not establish a Windows ACL boundary. `restore` checks that the saved contents and affected project paths have not changed before restoring them.

## Landing, overrides, and recovery

Landing checks acceptance, decisions, active dependencies, contract drift and evidence. It refuses while checks are running. It snapshots the files it will change under the private runtime, then folds contracts and archives the complete evidence bundle. On an ordinary write failure it restores those files. After an interrupted process, first resolve any abandoned lock as described below; the next landing restores the transaction before refusing and asking for review and re-verification. This is recoverability, not a distributed transaction or a guarantee against storage-device failure.

New journals store relative project and session paths. Recovery validates every target and required backup before removing any target. A moved Git project can recover from its moved private runtime; a legacy journal with obsolete absolute paths, an invalid journal, or a missing backup stops without changing the targets. Preserve that journal and its backups for manual recovery rather than deleting them to bypass the error.

An explicit owner-authorized emergency may use:

```bash
keelson land change-name --force --reason "owner-authorized emergency and follow-up"
```

The archive contains `forced.md` and a signed override record with the reason and bypassed gates. The CLI records the supplied authorization; it cannot authenticate a natural-language owner's identity. A force record does not turn failed checks into passed checks.

An invalid signature or missing/edited log fails closed. Restore the intact evidence bundle from a known copy before rerunning checks. An abandoned lock reports its location: confirm that no writer remains before removing that specific lock. Do not delete all runtime state to suppress a validation error.

An archived record describes the pre-landing snapshot. Landing itself changes contracts; historical evidence must not be advertised as fresh proof for a later tree.

## Migrating 0.3 projects

Run `keelson update`, review the generated diff, and rerun checks with `--trust --record`. Old Markdown verification entries remain readable history but do not satisfy the completion gate. Existing `.keelson/.runtime` and `.local` directories are legacy data; inspect them before removing them. Keelson does not edit your existing ignore rules. Use `update --vendor` if you deliberately want package guidance copied into the project.
