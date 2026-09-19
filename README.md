# Keelson

An engineering collaboration layer for coding agents on long-lived projects. Init once, then just talk.

[![npm version](https://img.shields.io/npm/v/keelson?style=flat-square)](https://www.npmjs.com/package/keelson)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg?style=flat-square)](LICENSE)
[![CI](https://img.shields.io/github/actions/workflow/status/Atingaii/keelson/ci.yml?branch=main&style=flat-square)](https://github.com/Atingaii/keelson/actions/workflows/ci.yml)

AI writes code fast. Every session it starts from scratch: no memory of why the project is shaped the way it is, which paths were tried and rejected, what is half-finished, or which conventions apply where. On a project that lives for years, that costs more than any single task saves.

- **Reasons vanish.** The odd-looking code was a deliberate trade-off. Three months later a fresh session "cleans it up" and re-opens a closed bug. The approach that was rejected in June is proposed again in September.
- **Specs drift.** The document that described how the system behaves was true once. Nobody updates it with each change, so it becomes fiction and the agent reads fiction.
- **"Tests pass" is not "requirement met".** A green run on Tuesday's code says nothing about Wednesday's edit, and it says nothing about the acceptance criterion nobody wrote a test for.
- **Nobody can resume.** The next session, the next person, the next model re-derives state from git and chat scrollback, retries ruled-out assumptions, and treats stale verification as current.
- **Parallel work collides.** Two changes implement the same contract two ways, and the collision shows up in the merge.

Keelson keeps the facts a project needs in the repository, in a form agents read at the right moment and write back when they finish. It is small: a kernel of files, a thin CLI that does mechanical work, and one skill the agent reads by need. Full engineering capability unfolds when the change calls for it. Project state is reviewable in the same pull request as the code. Verification is wired into the Git, tests, and CI you already have. Light means you do not manage process. It does not mean the project drops the design, plans, and state it needs.

## Philosophy

```text
→ facts over process
→ state over ceremony
→ evidence over claims
→ reuse over duplication
→ thinner as models improve
```

## See it in action

```text
You:   Let people share a photo album with a link.

Agent: Understood as: a share link per album, opened by anyone who has it,
       with revoke and expiry. Out: per-account permissions. Found: the auth
       rule in rules/api.md says every read goes through canView(). This adds
       a capability, so it is a spec change.
       Two questions before I plan. Should a revoked link keep thumbnails
       cached? I recommend no; a leaked link then leaks nothing after revoke.

You:   No thumbnails after revoke. Expiry I have not decided.

Agent: Recorded. Expiry stays an open question; it blocks only the "Revoke
       and expiry" slice. I will build "Create and access" now under the
       assumption that links expire after 7 days by default.

       ... keelson new share-links --tier spec --capability sharing
       ... drafts change.md (acceptance, open question, assumed decision),
           the delta spec, and tasks.md with two slices; builds slice 1 ...
       ... keelson check --record "share links: create and access"

       Done: slice "Create and access". POST /shares and the share page.
       Evidence: `npm run lint` exit 0; `npm test` exit 0 · tree 5bcb829dae.
       Acceptance 2/4 checked; the other two belong to the expiry slice.
       Not landed: one open question and one assumed decision need you.
       Handoff written; NOW.md updated.
```

Next day, new session:

```text
[keelson] Active changes: share-links (spec, in-progress, 3/5 tasks, ann)
  share-links handoff → next: decide expiry, then build "Revoke and expiry"

You:   continue. Expiry is 30 days, and links can be extended once.

Agent: Updating change.md: expiry decision confirmed, open question closed,
       delta spec gains the extension scenario. Building the second slice.
       ... keelson check --record "share links: revoke and expiry" ...
       All 5 tasks and 4/4 acceptance items checked. Landing.
       ... keelson land share-links --confirm-assumptions --now "Nothing in flight."
       specs/sharing updated (+3 requirements, 3 decision lines). Change
       folded; ledger stays in git history. Unreleased until the next tag.
```

## Quick start

Requires Node.js 20 or newer.

```bash
npm install -g keelson
cd your-project
keelson init                      # Claude Code by default
keelson init --tools claude,codex # or several tools at once
```

Then:

1. Edit `.keelson/INTENT.md`: why the project exists, what it will not do, and what the agent may decide alone.
2. Talk to your agent. Nothing else to type.

Existing codebase? `keelson init` already references your architecture notes, decision records, CI, and issue tracker when it finds them. Run `keelson init --onboard` to have the agent draft specs and rules from the code for you to confirm. See [Existing projects](docs/existing-projects.md).

Claude Code users can also install the skill from the plugin marketplace (`/plugin marketplace add Atingaii/keelson`, then `/plugin install keelson@keelson`). The CLI is still needed for `keelson init` and the other commands.

## What lives in the repository

| Path | Holds | Written by |
|---|---|---|
| `.keelson/INTENT.md` | Why the project exists, boundaries, hard constraints, what the agent may decide alone | You, once |
| `.keelson/ROADMAP.md` | The current milestone; later work as direction only. Links the tracker when there is one | You and the agent |
| `.keelson/NOW.md` | What is in flight, what is blocked, the next step. Present tense, rewritten in full | The agent, when it stops or lands |
| `.keelson/GLOSSARY.md` | One meaning per term, used by specs, code, and conversation alike | You and the agent, as words drift |
| specs (`paths.specs`, default `.keelson/specs/<capability>/spec.md`) | How the system behaves today: requirements, scenarios, decisions with their rejected alternatives | The agent, merged at landing |
| `.keelson/rules/` | Conventions routed by path glob from `rules/index.md` | You and the agent |
| `.keelson/changes/<name>/` | One directory per change in flight: `change.md`, `tasks.md`, `ledger.md`, `handoff.md`, delta specs | The agent |
| `.keelson/config.yaml` | Tools, profile, check commands, `paths.specs`, `refs` to existing material, document budgets, guided mode, model overrides | `keelson init` |
| `.keelson/.local/` | Check evidence and per-machine state. Gitignored | `keelson check` |

`changes/` is empty when nothing is in flight. Existing documents are referenced from `config.yaml → refs`, never copied.

## Six questions a long-lived project must answer

| Months in, can you still… | Keelson mechanism |
|---|---|
| say what the project solves, what it will not do, and what was decided? | `INTENT.md`; each spec's `Decisions` section names the rejected option; `(assumed)` decisions are folded only when the owner confirms |
| switch agent or session and continue accurately? | `NOW.md`, per-change `handoff.md` stamped with the commit, session-start hook prints the next step |
| change several modules without missing a dependent? | three context layers, `keelson impact <files>` for importers and affected specs, shared-contract warnings in `keelson status` |
| let people or agents work in parallel without overwriting each other? | owner and branch per change, `keelson new --worktree`, `touches` and `depends`, conflicts exposed; the tracker, pull requests, and CI stay authoritative |
| trust that green tests mean the requirement is met? | acceptance items mapped to a test, command, manual check, or review; evidence carries a worktree fingerprint and goes stale on the next edit; fresh-reader review |
| keep specs, architecture, and follow-ups in sync after a merge? | `keelson land` refuses stale evidence, open questions, and drifted specs; delta specs merge into the truth; release state from tags; learnings promoted to rules and checks |

## Three states, not one Done

Every change carries three dimensions, reported by `keelson status`:

| Dimension | Values | Derived from |
|---|---|---|
| work | `clarifying`, `in-progress`, `blocked`, `in-review`, `integrated`, `cancelled` | `status:` in `change.md`, else tasks and the ledger |
| verification | `not-run`, `passed`, `failed`, `partial`, `stale` | the last `Verify:` entry, compared with the current worktree fingerprint |
| release | `unreleased`, or what `release:` says | git tags; changes landed since the last tag are unreleased |

So "implemented, tests pass, awaiting your review, not merged" and "merged, migration not yet run" are both expressible, and neither is "done".

## How it works

1. **A resident block** under 20 lines in `CLAUDE.md`, `AGENTS.md`, or `GEMINI.md`. It says what `.keelson/` contains, how to size a change, and how to prove work is done.
2. **Two hooks** (Claude Code). One prints the roadmap's `Now`, `NOW.md`, active changes, and handoff next steps at session start. The other prints one line per prompt with work and verification state, and nothing when the project is idle. Hooks inject state, never instructions.
3. **One skill**, routed by need. `SKILL.md` is about 50 lines and points to one reference each for discovering what is wanted, shaping it, the domain model and glossary, context and impact, planning in vertical slices, engineering lenses, building, verifying, handing off, landing, reconciling new facts into the project, and debugging. The agent reads only the one it needs.
4. **A thin CLI** that does mechanical work: scaffolds, fingerprints, merges specs, records evidence, refuses a landing that lacks it. Understanding the request, analysing impact, and reviewing code stay with the agent.

Nothing in the skill is a gate on the agent. The gates are on artifacts.

### For people learning engineering

`keelson init --guide` marks the owner as someone learning engineering by building. The agent then asks about scenarios before technology, presents each choice with a recommendation, the reason, the alternatives, and the trade-off, names the engineering idea after the decision, and closes each spec change with a short teaching note in the conversation. The files, gates, and states are the same as for everyone else.

## Change sizes

The agent decides the size. You can override with "treat this as spec" or "just do it".

| Size | Signals | What happens |
|---|---|---|
| trivial | Style, typo, one-file explicit fix, no behaviour change | Just done. No change directory |
| quick | Several files, clear intent, no behaviour contract changes | Agent writes back its understanding, creates a change with an acceptance list, proceeds |
| spec | Behaviour contract changes, new or removed capability, migrations, abandoning the obvious approach | Agent clarifies until the next slice is deliverable, drafts `change.md` with acceptance and delta specs, waits for approval |

Set `confirm.quick: wait` in `config.yaml` to approve quick changes too. In an unattended run the agent builds under `(assumed)` decisions and stops before landing.

## Effort tiers and models

Tasks carry an effort tier: `light`, `standard`, or `deep`. When the host offers subagents, the agent dispatches each task on a model resolved from its tier, reviewers never below the implementer, two verification failures escalating one tier. Tiers resolve to floating model family aliases, never dated IDs, so a new model release changes nothing in the repository. See [docs/models.md](docs/models.md).

## Designed to get thinner

Every guideline in the skill carries a hidden annotation: the failure it prevents and the condition under which it should be deleted. `keelson retro` reads every ledger, including those of folded changes recovered from git history, and suggests which guidance to prune and which rules or checks to add. Two profiles ship from one source: `lean` (default) keeps stance and principles, `guided` adds step lists and examples.

The project's documents are kept small the same way. Each document type has a line budget in `config.yaml`, and `keelson doctor` reports knowledge health: documents over budget, requirement text that reads like history, duplicated requirements across capabilities, changes idle for two weeks, changes with more than 25 tasks, always-on rules over budget, generated docs older than the code. Every finding is a suggestion for a small fix, never an automatic rewrite. The rule is that project material may grow with the project, but what is read per task must not grow with the whole history.

## Honest limits

- Path routing and `keelson impact` are navigation, not proof. The agent still reads for callers that a grep cannot see.
- Files on disk are not a distributed lock, and a branch does not remove semantic conflicts. Claiming and merge control across machines belong to your tracker, pull requests, and CI.
- A second agent agreeing with the first is a signal, not a correctness proof. The acceptance list is what gets checked.
- Hooks exist only for Claude Code. Other tools rely on the resident block and `keelson context`.
- Keelson never performs production operations. It reminds; you run.
- Long-run evolution of large projects is the design goal. The 0.x releases have been exercised in real Claude Code sessions on small projects; the Codex CLI adapter has been verified to load the skill but not yet through a full change. Treat claims beyond that as untested.

## Supported tools

| Tool | Skill location | Instructions file | Hooks |
|---|---|---|---|
| Claude Code (`claude`) | `.claude/skills/keelson/` | `CLAUDE.md` | Yes |
| Codex CLI (`codex`) | `.agents/skills/keelson/` | `AGENTS.md` | No |
| Cursor (`cursor`) | `.agents/skills/keelson/` | `AGENTS.md` and `.cursor/rules/keelson.mdc` | No |
| OpenCode (`opencode`) | `.agents/skills/keelson/` | `AGENTS.md` | No |
| Gemini CLI (`gemini`) | `.agents/skills/keelson/` | `GEMINI.md` | No |

## CLI

| Command | Purpose |
|---|---|
| `keelson init` / `update` | Create or refresh `.keelson/`, references, skill, resident block, hooks. `--dry-run` previews |
| `keelson context --paths <files>` | INTENT, ROADMAP, NOW, active changes, references, matched rules |
| `keelson impact <files>` | Importers, affected specs and rules, overlapping active changes |
| `keelson new <name>` | Scaffold a change with owner, branch, delta base; `--worktree` for isolation |
| `keelson status` | Work, verification, and release state; slices, acceptance, open questions, conflicts |
| `keelson check --record` | Run checks, save evidence, append a `Verify:` entry with the worktree fingerprint |
| `keelson handoff <name>` | Create or re-stamp `handoff.md` |
| `keelson land <name>` | Merge delta specs, fold decisions, fold or archive the change; refuses without evidence |
| `keelson cancel <name>` | Archive a change as cancelled, nothing merged |
| `keelson validate` | Structural checks, non-zero on errors |
| `keelson retro` | Ledger metrics and pruning suggestions |
| `keelson models` | Effort tier to model alias resolution |
| `keelson doctor` | Diagnose the install and report knowledge health |
| `keelson ablate` / `restore` | Remove every surface for an A/B comparison, then bring it back |
| `keelson uninstall` | Remove generated surfaces; `--purge` removes `.keelson/` too |

Full reference: [docs/cli.md](docs/cli.md).

## Docs

- [Getting started](docs/getting-started.md)
- [Concepts](docs/concepts.md)
- [How it works](docs/how-it-works.md)
- [Existing projects](docs/existing-projects.md)
- [Collaboration: sessions, people, agents](docs/collaboration.md)
- [Verification](docs/verification.md)
- [Configuration](docs/configuration.md)
- [CLI reference](docs/cli.md)
- [Effort tiers and models](docs/models.md)
- [FAQ](docs/faq.md)
- [简体中文](README_CN.md)

## Contributing

Issues and pull requests are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md). The repository uses Keelson on itself; look in `.keelson/` for a live example.

## License

[MIT](LICENSE)
