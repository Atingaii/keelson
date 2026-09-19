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
keelson init --onboard
```

This writes an onboarding task into `NOW.md` that names the refs it found. Open your agent and say "continue". The agent:

1. reads the codebase and the referenced documents;
2. lists the capabilities it finds;
3. writes one spec per capability under `paths.specs`, present tense, observable behaviour only, linking to existing documents rather than copying them;
4. proposes rules for the paths that have conventions, registered in `rules/index.md`;
5. asks you to confirm before landing anything.

Specs and rules are drafts until you confirm them. Ask the agent to show each spec before it lands.

## Keeping the tracker authoritative

When the project has an issue tracker, it stays the source of what is wanted and in what order. `ROADMAP.md` links it and states the current milestone in a few lines. `change.md` links the issue it implements and holds only what the tracker does not: decisions, the acceptance mapping, open questions, and the continuation state. Keelson never builds a second backlog.

## Existing instruction files

`keelson init` appends its block to `CLAUDE.md`, `AGENTS.md`, or `GEMINI.md` between `<!-- keelson:start -->` and `<!-- keelson:end -->` markers. Everything already in the file stays. `keelson update` refreshes only the block. `keelson uninstall` removes only the block. `keelson init --dry-run` shows whether the file would be created, appended to, or refreshed.

Existing hooks in `.claude/settings.json` are preserved. Keelson adds two entries whose command path contains `.keelson/hooks/` and removes only those.

## Existing decision records

Long-lived decisions stay in the project's decision record directory. Each spec's `Decisions` section holds the short present-tense line and links the record when one exists:

```markdown
## Decisions
- payments: idempotency keys on every write; see docs/adr/0007-idempotency.md
```

The skill's `plan.md` reference tells the agent to link, not restate.

## CI

```yaml
- run: npm install -g keelson
- run: keelson validate
- run: keelson check
```

`validate` fails on structural errors and prints warnings for anything that will block a landing later. `check` runs the commands in `config.yaml → check`.

## Checking the install

```bash
keelson doctor
```

It reports the Node version, config migration state, whether the skill and resident block are present for each configured tool and match the CLI version, hook registration, every `validate` finding, stale verification, moved HEAD since a handoff, shared-contract conflicts, and which tool CLIs are on the path.
