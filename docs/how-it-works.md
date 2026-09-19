# How it works

Keelson is three small surfaces in the agent's environment and one directory of facts in the repository. This page describes each mechanism precisely.

## The resident block

`keelson init` appends a block to the tool's instructions file (`CLAUDE.md`, `AGENTS.md`, or `GEMINI.md`) between `<!-- keelson:start -->` and `<!-- keelson:end -->` markers. `keelson update` replaces the block in place; `keelson ablate` removes it. The block is under 20 lines and says:

- what `.keelson/` contains;
- to run `keelson context --paths <files>` or read the files before non-trivial work;
- how to size a change (trivial, quick, spec);
- to claim "done" only with a fresh command and its exit code;
- to land finished work with `keelson land` and rewrite `NOW.md`;
- that the `keelson` skill holds the per-phase details.

For Cursor the same text is also written to `.cursor/rules/keelson.mdc` with `alwaysApply: true`.

## Hooks (Claude Code)

`init` copies two self-contained Node scripts into `.keelson/hooks/` and registers them in `.claude/settings.json`. They do not depend on the CLI being installed.

| Hook | Event | Prints |
|---|---|---|
| `session-start.mjs` | `SessionStart` on `startup`, `resume`, `clear`, `compact` | One header line, `NOW.md` (capped at 1200 characters), the list of active changes with tier and task progress, and the capabilities that have specs |
| `prompt-state.mjs` | `UserPromptSubmit` | One line: `[keelson] active: <name> · <phase> · <done>/<total> tasks`. Nothing when no change is active |

The session snapshot costs a few hundred tokens once per session. The prompt line costs a few dozen tokens per turn, and zero when idle. Neither hook prints instructions; they print state.

Pass `--no-hooks` to `init` to skip them. Existing hooks in `settings.json` are preserved; Keelson only adds entries whose command path contains `.keelson/hooks/`.

## The skill

`init` copies the skill to the tool's skill directory (`.claude/skills/keelson/` or `.agents/skills/keelson/`). It contains `SKILL.md` and six references:

| Reference | Read when |
|---|---|
| `shape.md` | Turning a request into a shared understanding: explore first, write back, unattended sessions, interview, sizing |
| `plan.md` | Creating `change.md`, delta specs, `tasks.md` with effort tiers, `ledger.md` |
| `build.md` | Executing tasks: rulings, subagent dispatch by tier, escalation, keeping artifacts true |
| `verify.md` | Fresh evidence, review against specs and rules, fresh-reader review, completion report |
| `land.md` | `keelson land`, `NOW.md`, promoting learnings to rules, decision etiquette |
| `debug.md` | Reproduce, locate, fix, name the root-cause category |

`SKILL.md` routes by phase. The agent reads one reference at a time. Every guideline carries a hidden HTML comment with an `id`, the failure it prevents (`without`), and its deletion condition (`sunset`). `keelson retro` reads those comments.

The `profile` setting selects how much text ships. `lean` strips blocks marked `<!-- guided -->`. `guided` keeps them.

## The change directory

`keelson new <name> --tier quick|spec` creates `.keelson/changes/<name>/`:

```text
change.md      frontmatter (tier, created) + Why, What [, How, Alternatives, Impact, Decisions]
tasks.md       checkbox list with (effort: light|standard|deep) and verify: `cmd`
ledger.md      append-only ### entries
specs/<cap>/spec.md   delta spec, spec tier only
```

Phase is computed from the files, not stored:

| Condition | Phase |
|---|---|
| No tasks | `planning` |
| Tasks, none checked | `ready` |
| Some checked | `building` |
| All checked, last `Verify:` not exit 0 or absent | `verifying` |
| All checked, last `Verify:` exit 0 | `landing` |

`keelson land` refuses unless all tasks are checked and the last `Verify:` entry has exit 0. `--force` overrides when the user asked for it.

### Fold or keep

`config.yaml` `land: fold` (default) removes the change directory after merging. Its ledger remains in git history and `keelson retro` reads it from there. `land: keep`, or `keelson land --keep`, moves the directory to `.keelson/changes/archive/YYYY-MM-DD-<name>/` instead.

## Spec merge semantics

Main specs live at `.keelson/specs/<capability>/spec.md`:

```markdown
# orders

## Purpose
...

## Requirement: Order listing
The system SHALL ...

### Scenario: Default page
- WHEN ...
- THEN ...

## Decisions
- orders: offset pagination over cursor; cursor rejected because the table needs page jumps
```

A delta spec in a change uses three sections:

```markdown
## ADDED Requirements
### Requirement: Page size limit
...

## MODIFIED Requirements
### Requirement: Order listing
(full replacement text)

## REMOVED Requirements
### Requirement: Legacy CSV export
```

At landing, per capability:

- `REMOVED` deletes the requirement by name; a missing name is reported.
- `MODIFIED` replaces the requirement by name; a missing name is added instead and reported.
- `ADDED` appends; an existing name is replaced and reported as modified.
- Names compare case-insensitively.

Then every line under `## Decisions` in `change.md` that starts with a capability prefix (`- orders: ...`) is appended to that capability's `## Decisions` section. Lines already present are skipped. Lines without a prefix are skipped with a warning. A capability that has no spec yet gets one created with just the decisions.

## NOW.md

`NOW.md` is a snapshot, not a log. It is rewritten in full at every landing and whenever work stops mid-way. Present tense, three short parts: what is active, what is blocked or uncertain, the next concrete step. `keelson land --now "<text>"` writes it. The session-start hook prints it.

## Rules routing

`.keelson/rules/index.md` maps globs to files in the same directory, one per line:

```markdown
- `**` → general.md — applies to every change
- `src/api/**` → api.md — HTTP layer
- `src/services/**` → services.md
```

The arrow may be `→`, `->`, or `:`. The trailing note after a dash is optional. `keelson context --paths a,b` prints every rule file whose glob matches any of the paths; `**` and `*` alone always match.

Glob semantics: `**/` matches zero or more directories; `**` alone matches anything; `*` matches within one segment; `?` matches one character; `{a,b}` matches alternatives. A glob with no wildcard characters, such as `src/api` or `src/api/`, matches that path and everything beneath it.

`keelson validate` reports index entries whose file is missing as errors, and rule files not listed in the index as warnings, since unlisted files are never routed.

## Ledger entries and retro

`ledger.md` is append-only. Each entry is an `###` heading followed by a body:

| Entry | Meaning | Parsed fields |
|---|---|---|
| `### Ruling: <topic>` | A decision the agent made instead of stopping | count |
| `### Root cause: <category>` | Category of a fixed bug | `missing-rule`, `cross-layer`, `propagation`, `test-gap`, `implicit-assumption`, `guessed-fix` |
| `### Verify: <claim>` | Evidence for a status claim | a command in backticks and `exit N` in the body |
| `### Dispatch: task N → <tier> (<alias>)` | A subagent dispatch | tier, task, and a `Result: pass\|fail` line in the body |
| `### Escalate: task N <tier> → <tier>` | A re-dispatch one tier up | from, to |
| `### Note: <text>` | Anything else | none |

`keelson validate` requires every `Verify:` entry to have both a command and an exit code, and every `Root cause:` to use a known category.

`keelson retro` gathers ledgers from active changes, the archive, and git history (files under `.keelson/changes/` deleted in past commits). It computes:

- root-cause counts per category;
- per tier: dispatches, failures, escalations away from the tier, first-pass rate;
- verify entries and how many failed;
- rulings.

It then lists every guidance block with a sunset condition and prints suggestions when thresholds are met: prune a block, add a rule for a recurring category, or adjust effort tagging.
