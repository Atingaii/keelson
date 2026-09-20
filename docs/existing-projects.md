# Existing projects

Most long-lived projects already have architecture notes, decision records, a tracker, and CI. Keelson references them instead of building a second set of truths. This page covers adoption on such a repository.

## What init detects

On a fresh `keelson init`, the CLI looks for existing material and records what it finds under `refs` in `config.yaml`:

| Ref | Looked for |
|---|---|
| `architecture` | `ARCHITECTURE.md`, `docs/architecture`, `docs/architecture.md`, `docs/ARCHITECTURE.md`, `doc/architecture` |
| `decisions` | `docs/adr`, `docs/decisions`, `doc/adr`, `adr`, `decisions`, `docs/ADR` |
| `tasks` | The GitHub issues page, derived from the `origin` remote when it points at GitHub |
| `ci` | `.github/workflows`, `.gitlab-ci.yml`, `Jenkinsfile`, `.circleci`, `azure-pipelines.yml` |

It also notices `docs/specs`, `docs/contracts`, `specs`, or `spec` and prints a hint. Nothing in those directories is moved or copied. `keelson context` prints the refs under "Existing project material (read, do not duplicate)", and the skill tells the agent to read them before asking questions and to link to them from specs instead of restating.

Set any ref by hand in `config.yaml`:

```yaml
refs:
  architecture: docs/design/overview.md
  decisions: docs/adr
  tasks: https://github.com/acme/shop/issues
  ci: .github/workflows
```

`keelson validate` warns when a local ref path does not exist.

## Pointing at existing behaviour contracts

If the project already keeps behaviour contracts as Markdown, one directory per capability with a `spec.md` in each, set `paths.specs` to that directory and Keelson will read and merge there:

```yaml
paths:
  specs: docs/contracts
```

The files must use Keelson's shape (`## Requirement:` sections with `### Scenario:` blocks and a `## Decisions` list) for merging to work. Otherwise keep the default `.keelson/specs` and link from each spec to the existing document.

## Onboarding

```bash
keelson init
```

On a repository that already has code, init records the existing material it can identify and writes a first-contact task into `NOW.md`.

The agent then:

1. reads the repository and referenced material relevant to the first real request;
2. drafts `INTENT.md` from evidence already present: purpose, boundaries, hard constraints, and authorizations;
3. asks you to confirm or correct that project boundary in one short exchange;
4. continues shaping the actual request.

It does **not** inventory the whole repository into a second documentation system.

As real work later touches a capability, the agent creates a Keelson spec only when an observable behavior contract is worth preserving. It creates a scoped rule only when a stable engineering invariant must survive future sessions and is not better expressed as an executable check. Existing architecture/decision/spec documents stay authoritative through `refs` or `paths.specs`.

## Keeping the tracker authoritative

When the project has an issue tracker, it stays the source of what is wanted and in what order. `ROADMAP.md` links it and states the current milestone in a few lines. `change.md` links the issue it implements and holds only what the tracker does not: decisions, the acceptance mapping, open questions, and the continuation state. Keelson never builds a second backlog.

## Existing instruction files

`keelson init` appends its block to `CLAUDE.md`, `AGENTS.md`, or `GEMINI.md` between `<!-- keelson:start -->` and `<!-- keelson:end -->` markers. Everything already in the file stays. `keelson update` refreshes only the block. `keelson uninstall` removes only the block. `keelson init --dry-run` shows whether the file would be created, appended to, or refreshed.

Existing hooks in `.claude/settings.json` are preserved. Keelson registers its own hook commands and removes only identified owned registrations. Malformed settings fail without being overwritten.

## Existing decision records

Long-lived decisions stay in the project's decision record directory. Each spec's `Decisions` section holds the short present-tense line and links the record when one exists:

```markdown
## Decisions
- payments: idempotency keys on every write; see docs/adr/0007-idempotency.md
```

The skill's `plan.md` reference tells the agent to link, not restate.

## CI

```yaml
# Install a reviewed, pinned Keelson Git revision first; see getting-started.md.
- run: keelson validate
- run: keelson check --trust
```

`validate` fails on structural errors and prints warnings for anything that will block a landing later. `check` runs the commands in `config.yaml → check`.

## Checking the install

```bash
keelson doctor
```

It reports Node/configuration status, selected integration surfaces, guidance mode, host capabilities, validation findings, stale evidence and shared-contract conflicts. Fixture coverage and live host support are distinct; see [platforms](platforms.md).
