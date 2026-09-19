# project-layout

## Purpose
The on-disk contract between a project and every agent that works in it.

## Requirement: Standing facts
The `.keelson/` directory SHALL contain a package-owned human map `README.md`, plus `INTENT.md`, `ROADMAP.md`, `NOW.md`, `config.yaml`, `rules/`, and `changes/`; specs live at `config.yaml → paths.specs`; `.keelson/.local/` holds per-machine state and is ignored by git; nothing under specs or `rules/` is generated.

### Scenario: Fresh init
- WHEN `keelson init` runs in a directory without `.keelson/`
- THEN those files and directories exist; `.keelson/README.md` explains the structure to people; and outside `.keelson/` only instruction/skill surfaces, the portable `AGENTS.md` + `.agents/skills/` layer, and (for Claude Code) `.claude/settings.json` may be modified

### Scenario: Update human map
- WHEN `keelson update` runs after the package changes its project-map documentation
- THEN `.keelson/README.md` is refreshed while project-fact files such as `INTENT.md`, `NOW.md`, specs, and rules are not overwritten

## Requirement: Portable agent surface
Every initialized project SHALL contain `AGENTS.md` and `.agents/skills/keelson/` in addition to any tool-specific surfaces selected by the owner.

### Scenario: Claude-only init remains portable
- WHEN `keelson init --claude` runs
- THEN Claude-specific surfaces exist and the portable `AGENTS.md` + `.agents/skills/keelson/` surface also exists for compatible future agents

## Requirement: Standards-first host adapters
When a documented host already reads the portable `AGENTS.md` + `.agents/skills/` surface, Keelson SHALL reuse that surface rather than install a second copy of the same resident instructions or skill. A host-specific surface SHALL exist only when it adds capability the portable layer does not provide.

### Scenario: Standard-compatible hosts stay clean
- WHEN `keelson init` selects Cursor, GitHub Copilot, or Kilo Code
- THEN the Keelson resident instructions and skill are provided by `AGENTS.md` + `.agents/skills/keelson/`, without an additional Keelson copy under that host's native directory

### Scenario: Native skill path fills a real gap
- WHEN `keelson init --kiro` runs
- THEN the portable layer exists and `.kiro/skills/keelson/` also exists, because the documented Kiro project skill path adds host-specific discovery while a duplicate Kiro steering file is not generated

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
- project-layout: the portable `AGENTS.md` + `.agents/skills/` surface is canonical for hosts that document support for it; duplicate native copies were rejected because they add repository noise and ambiguous discovery precedence without adding capability
