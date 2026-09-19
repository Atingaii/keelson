# project-layout

## Purpose
The on-disk contract between a project and every agent that works in it.

## Requirement: Standing facts
The `.keelson/` directory SHALL contain a package-owned human map `README.md`, canonical runtime `workflow.md` and `skill/`, plus `INTENT.md`, `ROADMAP.md`, `NOW.md`, `config.yaml`, `rules/`, and `changes/`; specs live at `config.yaml → paths.specs`; `.keelson/.local/` holds per-machine state and is ignored by git; nothing under specs or `rules/` is generated.

### Scenario: Fresh init
- WHEN `keelson init` runs in a directory without `.keelson/`
- THEN those files and directories exist; `.keelson/README.md` explains the structure to people; full Keelson workflow/skill guidance exists only under `.keelson/`; and outside `.keelson/` only discovery shims plus (for Claude Code) `.claude/settings.json` may be modified

### Scenario: Update human map
- WHEN `keelson update` runs after the package changes its project-map documentation
- THEN `.keelson/README.md` is refreshed while project-fact files such as `INTENT.md`, `NOW.md`, specs, and rules are not overwritten

## Requirement: Single runtime authority
Every initialized project SHALL keep its canonical workflow in `.keelson/workflow.md` and its canonical skill plus references in `.keelson/skill/`. `AGENTS.md`, `.agents/skills/keelson/SKILL.md`, and any tool-specific instruction/skill locations SHALL be discovery shims that point into `.keelson/` rather than duplicate the guidance.

### Scenario: Claude-only init remains portable
- WHEN `keelson init --claude` runs
- THEN `.keelson/workflow.md` and `.keelson/skill/` exist; Claude and portable discovery shims both point to them; neither shim directory contains copied references

## Requirement: Standards-first host adapters
When a documented host already reads the portable `AGENTS.md` + `.agents/skills/` surface, Keelson SHALL reuse that discovery surface. A host-specific surface SHALL exist only when it adds discovery capability the portable layer does not provide, and every such surface SHALL still route to the same `.keelson/` runtime.

### Scenario: Standard-compatible hosts stay clean
- WHEN `keelson init` selects Cursor, GitHub Copilot, or Kilo Code
- THEN `AGENTS.md` + `.agents/skills/keelson/SKILL.md` discover the canonical `.keelson/` runtime, without another host-native shim

### Scenario: Native skill path fills a real gap
- WHEN `keelson init --kiro` runs
- THEN the portable shim exists and `.kiro/skills/keelson/SKILL.md` also exists as a Kiro-native discovery shim; both point to `.keelson/skill/SKILL.md`, and neither contains copied references

## Requirement: Change directory lifecycle
A change SHALL live in `changes/<name>/` with `change.md` (why, what, acceptance, open questions, decisions with states), `tasks.md` (slices and tasks), `ledger.md`, optional `handoff.md`, and optional delta specs, and SHALL leave `changes/` when it lands or is cancelled.

### Scenario: Handoff
- WHEN `keelson handoff <name>` runs
- THEN `handoff.md` exists with `at`, `updated`, and `by` in its frontmatter, and the session-start hook prints its next step

## Requirement: Existing material is referenced, not copied
`keelson init` SHALL detect existing architecture documents, decision records, CI configuration, and a GitHub issue tracker, record them under `config.yaml → refs`, and print them in `keelson context`.

### Scenario: Brownfield init
- WHEN `keelson init` runs in a repository with `docs/adr/` and `.github/workflows/`
- THEN `config.yaml` references both and `keelson context` lists them under existing project material

### Scenario: Fold on land
- WHEN `keelson land <name>` succeeds with `land: fold`
- THEN `changes/<name>/` no longer exists, delta specs are merged into `specs/`, and `Decisions` lines are appended to the matching spec

## Requirement: Rules routing
The agent SHALL be able to find every rule that applies to a path from `rules/index.md` alone.

### Scenario: Path match
- WHEN `keelson context --paths src/api/orders.js` runs and `index.md` lists `` `src/api/**` → api.md ``
- THEN the output includes the content of `rules/api.md`

## Decisions
- project-layout: continuation state that another machine needs (handoff.md, NOW.md) is committed; check output and session scratch stay in `.keelson/.local/`; gitignoring everything was rejected because a team cannot resume from files that never leave one laptop
- project-layout: decisions carry a state (confirmed or assumed) inside change.md rather than in a separate approvals file; a separate file was rejected because approval and decision would drift apart
- project-layout: changes fold into specs and git history by default; a permanent archive directory was rejected because it duplicates what git already keeps and grows without bound
- project-layout: decisions live inside the affected spec rather than in a separate decision log, so the reason for a behaviour sits next to the behaviour
- project-layout: `.keelson/workflow.md` + `.keelson/skill/` are the sole runtime authority; root/platform files are discovery shims only. Full copies in host directories and symlink-based sharing were rejected because copies drift and symlinks are brittle across Windows/tooling.
