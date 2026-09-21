# cli

## Purpose

Maintains `.keelson/` and the generated surfaces; every command is safe to run repeatedly.

## Requirement: Idempotent init and update

Running init/update repeatedly SHALL preserve project facts and user-authored integration content, maintain one owned discovery block per selected surface, and use package guidance unless vendor mode is explicitly configured.

### Scenario: Repeated update
- WHEN update runs twice
- THEN generated desired state is stable and no unrelated content or .gitignore line changes

## Requirement: Landing requires evidence that matches the code

Normal landing SHALL require completed acceptance, resolved decisions/questions/dependencies, reconciled contracts, required rollout and fresh complete signed evidence. Task checkboxes are advisory. An authorized --force requires a reason and archives a signed override without converting failed evidence to success.

### Scenario: Prose forgery
- WHEN a user writes a passing Verify paragraph without valid structured evidence
- THEN normal landing fails

### Scenario: Changed acceptance
- WHEN acceptance or decision records change after a check
- THEN verification is stale until the full suite is rerun

## Requirement: Session focus routing

Session focus SHALL live in Git-private keelson-runtime/sessions or an external per-project cache. KEELSON_SESSION_ID, CODEX_THREAD_ID or PI_SESSION_ID selects a caller-local pointer. Missing identity SHALL degrade without storing a shared focus.

### Scenario: Independent Codex threads
- WHEN two CODEX_THREAD_ID values focus different changes
- THEN each command resolves only its caller

### Scenario: Clear focus
- WHEN focus --clear runs
- THEN durable work remains active

## Requirement: Ready is derived from durable gates

Ready SHALL be derived from completed acceptance and passing lifecycle gates with fresh complete evidence. Historical task checkboxes and conversation phrases SHALL NOT determine completion.

### Scenario: Final gate
- WHEN complete recorded checks pass after all other gates
- THEN check reports ready and recommends land

## Requirement: Evidence is recorded with a fingerprint

Check --record SHALL bind full code and acceptance-input fingerprints, exact commands, exit codes, timestamps and log digests in an Ed25519 DSSE envelope. Signed JSONL and logs SHALL remain with the change when archived. Private keys and command trust SHALL stay machine-local.

### Scenario: Input-changing command
- WHEN a command edits bound inputs during execution
- THEN the record cannot satisfy normal landing

### Scenario: Command trust
- WHEN a new or changed command suite lacks local trust
- THEN no command executes until --trust explicitly authorizes it

## Requirement: Three status dimensions

`keelson status` SHALL report work status (from `status:` in change.md or derived from the artifacts), verification status (not-run, passed, failed, partial, stale), and release status (unreleased, or landed since the last tag) separately.

### Scenario: Code edited after verification
- WHEN a file outside `.keelson/` changes after a passing `Verify:` entry
- THEN `keelson status` shows verification `stale` while work status is unchanged

## Requirement: Shared contracts are exposed

`keelson status` SHALL warn when two active changes carry delta specs for the same capability or declare overlapping `touches` paths.

### Scenario: Two deltas on one capability
- WHEN two active changes both have `specs/orders/spec.md`
- THEN `keelson status` prints a shared-contract warning naming both

## Requirement: No dated model IDs

`keelson validate` SHALL fail when any file under `.keelson/` contains a dated model identifier.

### Scenario: Dated ID in a ledger
- WHEN a ledger contains a model identifier ending in an eight-digit date
- THEN `keelson validate` exits 1 and names the file

## Requirement: Tier resolution order

`keelson models --resolve <tier>` SHALL resolve in the order explicit, project config, user overrides, registry, platform rank fallback.

### Scenario: User override
- WHEN `~/.keelson/models.yaml` maps `claude.deep` to an alias and the project config does not
- THEN `--resolve deep` prints that alias

## Decisions

- cli: full code and acceptance-input fingerprints are independent so evidence appends do not invalidate their own checks.
- cli: Ed25519 DSSE records provide local tamper detection, not a security boundary against a process with the same user permissions.
- cli: release state is derived from Git tags; model names use floating aliases.
- cli: package guidance and hook dispatch keep default installation small; copied guidance is explicit vendor mode.

- cli: Design actions prepare an agent workflow; the host agent implements and uses available browser tools. Printed guidance is never reported as an executed audit.
- cli: Existing user authorization covers the CLI and skill improvements. Preserve settled product decisions and existing design systems.

- cli: Ordinary requests automatically activate applicable discovery, design and delivery guidance. User wording need not name a skill or workflow mode; task consequences determine interview depth.
- cli: Automatic routing preserves existing authorization and settled decisions. It guides the host agent; instruction delivery is not proof of equivalent agent effectiveness.
- cli: Execution enforcement is host-specific: Claude Code and CodeBuddy file tools and Codex apply_patch have native gates when their hooks are enabled and trusted; other hosts follow shared CLI guidance. Neither context injection nor a completed registered graph proves exhaustive discovery or independent-review effectiveness.
## Requirement: Durable decision frontier

Decision records SHALL preserve ownership, dependencies, settlement basis and reopening history. The frontier SHALL expose at most three independent ready user-owned questions and separate agent/reality investigations.

### Scenario: Settled question
- WHEN an agent resumes after D17 was settled
- THEN D17 remains answered until explicitly reopened with a reason

## Requirement: Bounded execution and serialized reconciliation

Checks SHALL use closed stdin, finite deadlines and output caps, and record every completed result. Landing and cancellation SHALL not race active checks.

### Scenario: Active check
- WHEN land or cancel is requested while checks execute
- THEN the operation refuses even when force is requested

## Requirement: Discoverable frontend workflows

The CLI SHALL expose a bilingual design action catalog and focused agent briefs, loading installed guidance without modifying the working directory. It SHALL distinguish prepared guidance from executed checks.

### Scenario: Design action outside an initialized project
- WHEN a user requests a known design action with a target and language
- THEN the CLI prints the matching localized workflow, target, references and verification expectations without creating files or fetching the target

### Scenario: Unknown design action
- WHEN a user requests an unrecognized action
- THEN the CLI fails with a useful catalog recovery command and does not execute the target

## Requirement: Discoverable installed guidance

The CLI SHALL list available installed guidance with localized titles and a machine-readable representation while preserving existing named-reference output.

### Scenario: Reference discovery
- WHEN `keelson guide --list --json` runs
- THEN its unique reference names include workflow and every available reference, each of which can be read by name

## Requirement: Focused command help

The CLI SHALL offer compact grouped help, full option discovery and equivalent `help <command>` and `<command> --help` output without running that command.

### Scenario: Invalid command
- WHEN a command name is unknown, including in a help request
- THEN the CLI returns exit code 2 and a focused error with a recovery command

## Requirement: Automatic integrated agent guidance

Packaged guidance SHALL route ordinary project requests through relevant discovery, domain/architecture, frontend, implementation, verification and reconciliation references without requiring the user to name a skill, design action or workflow phase. Both languages and profiles SHALL enable this behavior by default. These are host-agent instructions, not a deterministic model execution guarantee.

### Scenario: Ordinary feature with unresolved decisions
- WHEN the owner requests team sharing and repository evidence does not settle audience, permission semantics or success criteria
- THEN guidance directs the agent to investigate first, automatically work a dependency-aware decision tree, ask ready owner decisions with recommendations and reasons, recompute after answers, and settle material branches before committing to dependent design

### Scenario: Clear or already settled work
- WHEN the requested behavior and relevant constraints are established
- THEN guidance directs the agent to reuse those decisions and proceed without an unnecessary interview; new evidence is required to reopen a settled answer

### Scenario: New evidence changes a premise
- WHEN a follow-up or repository finding contradicts a consequential settled premise
- THEN guidance directs automatic reassessment of the affected branches, explaining any reopening and retaining unrelated settled decisions

### Scenario: Exploration without implementation authorization
- WHEN the owner discusses an unclear idea without asking for changes
- THEN automatic discovery stays read-only and uses the conversation for new answers until implementation is requested

### Scenario: Implied interface work
- WHEN an ordinary feature or fix changes a user-visible interface path
- THEN guidance routes to frontend design and affected interaction verification even when the owner did not request a design action

### Scenario: Default installation and profiles
- WHEN an owner initializes or updates a supported project with either language/profile and with or without vendoring
- THEN the discovery entry and canonical guidance deliver the automatic workflow without an extra activation flag; guide mode adds teaching only

## Requirement: Agent-operated execution start

Product-edit guidance SHALL create the smallest useful tracked change and call start before implementation. The CLI SHALL reject open or assumed decisions, unresolved prose questions, missing concrete acceptance, blocked states and unfinished prerequisites. Successful start SHALL record the current plan and bind the session. Supported Claude Code and CodeBuddy file-edit hooks and Codex apply_patch hooks SHALL deny modification when the session has no focus or the start record is absent or stale; planning artifacts remain editable. This guard SHALL preserve host permissions and SHALL NOT claim to cover arbitrary shell or MCP writes.

### Scenario: Decision or plan changes after starting
- WHEN a registered decision reopens or the change scope or delta changes
- THEN the file-tool guard rejects product modification until the current plan passes start again

## Requirement: Phase-specific contract injection

Implementation and checking SHALL receive original request, change, decisions, relevant current/delta specs and rules, plus declared per-phase context files. Missing declared files SHALL fail visibly. Touches globs SHALL conservatively include narrower applicable rules. Claude and CodeBuddy Agent/Task hooks SHALL preserve original input while appending the phase pack using the host protocol. Codex SHALL supply child phase context without granting tool permission to rewrite arguments: tracked dispatch includes an explicit change marker and the child automatically binds it and loads its phase pack. Child hooks SHALL use the child thread identity, never infer the direct parent from the shared root session ID. Generic subagent startup SHALL preserve the assigned task scope and SHALL NOT overwrite an unknown phase. Injection caches SHALL distinguish agents, and session compaction SHALL restore context.

### Scenario: Independent review preparation
- WHEN a fresh reviewer is assigned the check phase
- THEN it receives the request and contracts without treating the implementer's summary as proof, and guidance assigns repairs to the implementer before affected-scope re-review

## Requirement: Complete ready decision frontier

Frontier output SHALL preserve all ready owner questions, expose omitted ones as remaining by default, support --limit 1 and --all, and separate agent/reality investigations and blocked dependencies. Invalid limits SHALL fail before mutation. A complete registered graph SHALL NOT be represented as proof that all relevant decisions were discovered.

### Scenario: Complex round has five ready questions
- WHEN the agent requests --all
- THEN all five questions are returned in the same frontier, with none silently lost to the default presentation limit

## Requirement: Preserve generated runtime ownership across upgrades

Published unmodified 0.4.0/0.4.1 discovery and vendor surfaces SHALL upgrade without force. New installations SHALL record runtime content digests for later upgrades. Edited generated files and unknown neighboring files SHALL be preserved, and conflicts SHALL fail before configuration mutation.

### Scenario: Customized workflow during upgrade
- WHEN an installed workflow differs from its recorded generated content
- THEN update reports the conflict and preserves the workflow and existing configuration

## Requirement: Three primary CLI hosts

Initialization and update SHALL support Claude Code, Codex and CodeBuddy through native project discovery and workflow hook registration. Protocol differences SHALL be handled explicitly. Updates and hook removal SHALL preserve neighboring user settings and matcher groups. Codex hook trust SHALL remain host-controlled. Registration checks SHALL NOT imply live host trust or successful model execution.

### Scenario: Multiple hosts in one repository
- WHEN an owner initializes all three hosts and later disables hooks
- THEN each host has its own discovery entry and protocol adapter, and disabling removes only Keelson registrations while preserving project knowledge and user hooks
