# Frontend design

[中文](zh/frontend.md)

Use your coding agent normally: “Improve the settings page; keep our visual system, preserve input after failed saves, and make it work on mobile.” Keelson routes interface work to focused design guidance and keeps it in the same change, decision and verification workflow as the rest of the project.

## Choose an outcome

```bash
keelson design
keelson design plan "account settings"
keelson design audit "checkout"
keelson design harden "invite form"
keelson design polish "dashboard"
keelson design adapt "order table" --lang zh
keelson design --json
```

The CLI prints an **agent brief**. It does not call a model, browse a URL, modify a page or produce an automatic quality score. Give the request to the coding agent using the installed skill; the agent reads the relevant brief and performs the work with your project and its available tools. Targets are descriptive text, never shell commands. The saved project language applies unless `--lang en|zh` overrides it; commands also work outside an initialized project.

| Outcome | Actions |
|---|---|
| Plan and implement a coherent experience | `plan`, `build` |
| Find and fix design quality issues | `audit`, `critique`, `polish` |
| Shape visual expression | `simplify`, `bolder`, `quieter`, `typeset`, `color`, `layout`, `animate`, `delight` |
| Improve real user journeys | `clarify`, `onboard`, `harden` |
| Adapt and deliver | `adapt`, `optimize`, `extract`, `document`, `explore`, `iterate` |

`audit` and `critique` start with evidence and findings; they do not authorize unrelated changes. Existing modification authorization remains valid. A small form bug stays a small fix; a new interface receives a coherent design direction and a complete working journey.

## What the agent does

1. Reads existing components, tokens, content, product intent and the affected screen. Preserves settled brand and product decisions.
2. Defines the primary task and observable acceptance. Selects only the relevant references instead of loading all guidance.
3. Builds or improves one complete path, including applicable loading, empty, success, error, permission and recovery states.
4. Opens the running page, inspects the rendered result, executes the relevant interactions, checks required viewport and keyboard paths, and repeats after fixes.
5. Runs project checks and records what was observed, what was executed and what remains unverified through the normal verification workflow.

For a settings form, this means checking save failure, retained values, retry and duplicate submission alongside visual hierarchy. For a marketing page, it means a clear audience and primary action, truthful content, deliberate composition, usable mobile reading order and measured loading behavior. For a local bug, it means reproducing and repairing the specific failure without a broad redesign.

## Evidence that supports the result

A screenshot documents one visible state. A browser interaction run demonstrates an exercised behavior. An automated test protects its assertions. A successful build alone proves none of those visual or interaction outcomes.

Keep enough context to reproduce a finding: route, viewport, content/state, steps and result. Inspect captured images, not just the capture command's exit status. After the final edit, repeat the affected checks. If browser tooling or a required service is unavailable, the agent should continue independent work and explicitly list the unverified browser scenarios; it must not call them passed.

The host provides browser and image capabilities. Keelson supplies the workflow and records; it does not bundle a browser, visual editor or image service. Results depend on the implementation, content, model and actual verification. Read [verification and trust](verification.md) for what signed records establish.

## Read guidance directly

```bash
keelson guide --list
keelson guide --list --json
keelson guide frontend
keelson guide frontend-review
keelson guide frontend-visual
keelson guide frontend-interaction
keelson guide frontend-delivery
keelson help design
```

The entry reference routes by problem. Review covers evidence and finishing; visual covers composition, type, color, imagery and motion; interaction covers state, controls, copy and language; delivery covers adaptation, performance, component extraction, documentation and browser iteration. All are available in English and Chinese and load from the installed package without copying files into the project.
