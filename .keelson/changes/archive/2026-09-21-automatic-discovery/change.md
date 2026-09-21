---
tier: spec
created: 2026-09-21
status: in-progress
owner: Atingaii
branch: main
touches: [skills/**, src/**, hooks/**, tests/**, registry/**, README*, docs/**, package*.json, CHANGELOG.md]
---

# Automatic decisions, execution gates and durable learning

## Why
Users should describe what they want after installation and initialization. Existing guidance required explicit stress-test wording for deeper interviews and did not make automatic routing across engineering and interface work clear enough.

## What
- Automatically choose discovery depth from unresolved goals, connected choices and consequential commitments; work decision branches in rounds with recommendations and reasons.
- Route ordinary requests through existing domain, engineering, UI/UX, build, verification and reconciliation guidance in both languages and profiles.
- Preserve settled decisions, read-only exploration, authorized continuation and lightweight handling of clear requests.
- Remove demo GIF embeds and captions from both READMEs, simplify the usage example, and prepare npm 0.5.0.
- Add an agent-operated start gate, phase context manifests and Claude Code, Codex and CodeBuddy file-tool/subagent hooks with compaction recovery.
- Expose the complete ready decision frontier and retain safe upgrades from published 0.4.x surfaces without overwriting customizations.
- Non-goal: a model runtime, user-operated workflow steps, a shell/MCP sandbox, copied third-party skills, or unmeasured claims of superior model performance.

## How
Use the existing package router and focused references. Activation criteria live in interview.md; shape/discover/workflow lead there. Discovery shims inherit the package skill description, while normal and vendored installations receive the same canonical guidance.

## Alternatives
- Keyword or explicit-mode activation: misses ordinary requests and makes users learn the workflow; rejected by the owner.
- Always ask an exhaustive questionnaire: repeats established decisions and delays clear work; use consequence-driven depth and a bounded current scope instead.

## Impact
The installed Skill description, bilingual guidance, optional vendored workflow and usage documentation change. Existing commands remain compatible; new changes start in clarifying, and agents use the new start transition. Decision records and authorization boundaries stay compatible. The three required CLI hosts gain native workflow adapters; other hosts use shared CLI guidance. Historical migration fixtures remain exact inputs. npm delivery uses the existing manual release path with latest verification and Atingaii commits; remote CI remains skipped.

## Acceptance
- [x] Claude Code, Codex and CodeBuddy initialize and upgrade without losing user hooks; native event adapters gate edits, restore context and preserve host permissions. — test: workflow.test.js and real published upgrade matrix.
- [x] Simple and complete complex frontiers preserve every ready question and reject invalid input without mutation. — test: decisions.test.js
- [x] Start rejects unresolved plans, binds the current plan, and re-closes after scope or decisions change. — test: workflow.test.js
- [x] Implement/check context includes original requirements, declarations, current/delta specs and nested path rules; hooks preserve host permissions, isolate injection cache by agent and restore after compaction. — test: workflow.test.js
- [x] Published 0.4.0/0.4.1 installations upgrade across language/profile/vendor combinations; customized surfaces remain untouched. — manual: real published-package upgrade matrix plus runtime-upgrade.test.js
- [x] Automatic discovery and integrated routing are consistent across English/Chinese and lean/guided output, including normal and vendored installation. — manual: inspect rendered guidance, init and update in disposable projects.
- [x] Plain requests cover connected uncertainty, clear edits, settled decisions, new contradictory evidence, read-only exploration and implied UI work without special invocation phrases. — review: independent review of canonical guidance and scenario contract; distinguish instruction coverage from live-agent effectiveness.
- [x] Both READMEs omit GIFs and describe installation plus normal conversation; package and lockfile versions agree at 0.5.0. — manual: inspect README embeds, package manifest and packed contents.
- [x] Existing repository tests, syntax checks and project validation pass. — check: `npm test`, `npm run lint`, `node bin/keelson.js validate`.

## Decisions
- cli: Ordinary requests automatically activate applicable discovery, design and delivery guidance. User wording need not name a skill or workflow mode; task consequences determine interview depth.
- cli: Automatic routing preserves existing authorization and settled decisions. It guides the host agent; instruction delivery is not proof of equivalent agent effectiveness.

- cli: Execution enforcement is host-specific: Claude Code and CodeBuddy file tools and Codex apply_patch have native gates when their hooks are enabled and trusted; other hosts follow shared CLI guidance. Neither context injection nor a completed registered graph proves exhaustive discovery or independent-review effectiveness.
