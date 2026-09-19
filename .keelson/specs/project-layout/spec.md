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

## Requirement: First-class host contract
Keelson SHALL expose first-class adapters only for Claude Code, Codex CLI, OpenCode, Pi, Gemini CLI, Kiro CLI, and CodeBuddy CLI. Every first-class discovery path SHALL be verified in a real session or backed by primary host documentation; guessed convention-only paths SHALL NOT be advertised as supported. Every project SHALL also receive the portable `AGENTS.md` + `.agents/skills/` fallback.

### Scenario: Standard-compatible hosts reuse the portable surface
- WHEN `keelson init` selects Codex, OpenCode, or Pi
- THEN their project instructions use `AGENTS.md`, their skill discovery uses `.agents/skills/keelson/SKILL.md`, and no duplicate host-native Skill tree is created

### Scenario: Host-native discovery adds capability only where documented
- WHEN `keelson init` selects Claude Code, Gemini CLI, Kiro CLI, or CodeBuddy CLI
- THEN only the host-documented instruction and/or skill discovery path is added, each shim points to the same `.keelson/` runtime, and references are not copied outside `.keelson/`

### Scenario: Retired guessed adapters migrate away
- GIVEN an older project contains a known legacy Keelson adapter whose content can be identified as Keelson-owned
- WHEN `keelson update` runs
- THEN that legacy adapter is removed without deleting neighboring user files, and the portable layer remains available

## Requirement: Reconciled generated surfaces
Keelson SHALL track the generated discovery surfaces it owns and reconcile actual disk state toward the configured desired state. Package-owned runtime/skill directory replacement SHALL preserve the last complete copy until the new copy is ready.

### Scenario: Host selection changes
- GIVEN a project was initialized for Claude Code and Kiro CLI
- WHEN the owner updates the configured hosts to Codex CLI
- THEN stale Claude/Kiro discovery surfaces and Claude hook registrations are removed, user-authored content outside Keelson markers remains, and `.keelson/.managed.json` records only the new desired surfaces

### Scenario: Interrupted directory replacement
- GIVEN the previous canonical skill directory is complete
- WHEN generating its replacement fails before completion
- THEN the previous complete directory remains usable and temporary/backup residue is recoverable on the next update

### Scenario: Doctor detects drift
- WHEN a package-owned canonical reference, discovery shim, or registered hook script differs from the version Keelson would generate
- THEN `keelson doctor` reports actionable drift and `keelson update` can restore the package-owned surface
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
