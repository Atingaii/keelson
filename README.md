<p align="center"><img src="docs/assets/keelson-banner.png" alt="Keelson — a keel-shaped navy and copper project mark" width="100%"></p>

# Keelson

**Keep decisions and verifiable check records with AI-assisted code changes.**

[中文](README_CN.md) · [Get started](docs/getting-started.md) · [CLI](docs/cli.md) · [Evidence and trust](docs/verification.md) · [Benchmarks](benchmarks/README.md)

A green message in chat is easy to lose and easy to overstate. Keelson records what actually ran, the output digest, and the code and contracts it checked. A code, spec, rule, configuration, acceptance, or decision change makes the record stale. `land` requires a current, complete, locally trusted record and resolved acceptance gates.

Keelson is a local CLI and an on-demand agent skill. It works inside your existing repository, test suite, and coding agent. There is no service account, telemetry, or model API in the CLI.

## Start with an existing project

Requires **Node.js 20+**. This repository is the distribution source; version `0.4.0` is not advertised as a published npm release.

```bash
git clone https://github.com/Atingaii/keelson.git
cd keelson
npm ci
npm link
cd /path/to/your/project
keelson init --codex
```

Then ask Codex to make a normal change. It can read the guidance with `keelson guide` and load individual references when needed. For a manual tour:

```bash
keelson new fix-pagination --tier quick
# Implement the fix; complete change.md acceptance; configure real check commands.
keelson check --trust --record
keelson status
keelson land fix-pagination
```

`--trust` is the explicit local decision to execute the configured shell commands. Review them first. Changed commands require renewed trust. A plain prose `Verify:` entry cannot authorize landing. [Walkthrough and configuration](docs/getting-started.md).

## What lives in your repository

Default initialization installs a small configuration, project notes, and host discovery shims. It does **not** copy an executable hook into the project. `keelson guide` reads the installed package; `init --vendor` explicitly copies guidance for teams that want it versioned locally.

- `.keelson/` holds durable project intent, contracts, changes, decisions, signed records, and content-addressed logs.
- Per-machine keys, session bindings, trust, and locks live under Git's private directory, or a user cache for a non-Git project.
- Initialization does not edit `.gitignore`. Commit the durable records you want the team to share; inspect logs for sensitive output before publishing them.
- `update`, `doctor --session`, and `uninstall` maintain the integration. Uninstall retains project knowledge and change evidence.

## Three useful guarantees

**Checks are recorded, not inferred.** An Ed25519-signed DSSE envelope contains an in-toto Statement with the full tree digest, contract digest, command exits, and output digests. Timeouts kill the command process group. A partial suite cannot authorize landing.

**Decisions survive a conversation.** `keelson ask` separates user choices from engineering judgment and facts to investigate. Dependency-aware frontiers show at most three ready user questions. A settled decision requires an explicit reason to reopen; irreversible choices cannot be assumed.

**Durable state has explicit gates.** Acceptance, unresolved decisions, dependencies, contract drift, and evidence freshness affect readiness. `land --force --reason "…"` archives the bypass and its reason. Concurrent check records are serialized for append; landing refuses while checks run and restores interrupted writes before another landing.

These are local integrity checks. A process with the same user privileges can read the private key or change the CLI. A valid signature does not prove that a test was meaningful, that model attribution is authentic, or that a legal compliance requirement is met. A record copied from another machine requires local re-verification. [Threat model and recovery](docs/verification.md).

## Hosts and measured support

Codex is the host exercised by the local model benchmark. Claude Code, OpenCode, Gemini CLI, Kiro CLI, CodeBuddy, Pi, and portable Agent Skills have generated adapters and contract tests; that does not establish equivalent live end-to-end support on every host. Run `keelson doctor` in the host you use. See [platform support](docs/platforms.md).

## Evaluation and prior art

[The benchmark protocol, pinned revisions, and raw results](benchmarks/README.md) compare Keelson with bare Codex, **OpenSpec**, **Trellis**, and **Superpowers** on the same Flask tasks, model, and budget. Mechanical acceptance, framework activation, time, tokens, and decision behavior are reported separately. A small benchmark is evidence for those tasks, not a universal ranking.

Keelson learns from [OpenSpec](https://github.com/Fission-AI/OpenSpec)'s delta contracts, [Trellis](https://github.com/mindfold-ai/Trellis)'s persistent project context, and [Superpowers](https://github.com/obra/superpowers)' implementation and review workflows. Its evidence format uses [in-toto Statements](https://github.com/in-toto/attestation/blob/main/spec/v1/statement.md) and [DSSE](https://github.com/secure-systems-lab/dsse). This is an implementation of local signed records, not SLSA certification.

## Develop

```bash
npm ci
npm run lint
npm test
npm run validate
npm pack --dry-run
```

[Remediation assessment](docs/remediation-assessment.md) explains which parts of the original plan were adopted, corrected, or deferred. [Contributing](CONTRIBUTING.md) · [MIT license](LICENSE).
