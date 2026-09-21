# How it works

Keelson separates three stores. Project knowledge under `.keelson/` is durable and shareable. An active change holds acceptance, decisions, deltas and recorded checks. Machine-local keys, command trust and session bindings live in Git's private runtime directory, outside the tracked project. Non-Git projects use a user cache keyed by the absolute project path.


## Readable project memory

When writing or updating project notes, the agent automatically loads `keelson guide writing`. State and the next actionable step appear early in work/resume documents; contracts lead with their purpose and behavior. Number bounded tasks, group details by outcome and link their owning files. A compact reading surface retains full acceptance, the complete ready decision frontier and original signed evidence. English and Chinese templates share the same parsed headings. This is agent writing guidance, not an automatic prose rewriter: `update` refreshes guidance and the project map while preserving existing project facts.

## Discovery and installation

`init` selects a host adapter, creates small project notes/configuration and installs a discovery shim. The shim tells the agent to use `keelson guide`; named references are read with `keelson guide <reference>`. Guidance stays in the installed package unless the user requests `--vendor`.

Supported hook entries invoke `keelson hook <event>` from the installed executable. They do not invoke JavaScript copied from the project. This reduces one source of unexpected repository code execution; it does not make the host or project safe to run without review.

The manifest records the package version, selected host surfaces, vendor mode and generated runtime content digests. Replacement and removal compare installed bytes with those digests; known published output provides a migration path for manifests created before 0.5.0. `doctor` reports drift. Invalid host JSON is an error and is not silently replaced with empty configuration. Initialization leaves `.gitignore` unchanged.

## Changes and decisions

`new` creates a durable change and binds it to the current session when identity exists. A session pointer is not a work status. `CODEX_THREAD_ID` supplies native Codex identity; other hosts can use their native bridge or explicit `KEELSON_SESSION_ID`. Ambiguous degraded sessions require an explicit change selection.

`ask` stores schema-versioned structured decisions with owners, dependencies, state, basis and history. Ready user decisions form a frontier: the default shows three and preserves the rest in `remaining`; `--all` returns the whole ready set. Agent/reality decisions form an investigation list. Reopening a settled answer requires a reason.

Discovery first separates the desired outcome from a requested mechanism. Only consequential owner choices become questions; clear work needs none. Stable decision IDs connect answers to acceptance, delta scenarios and implementation slices on the same change. Both phase context packs retain the original request and decisions. When an upstream premise changes, the agent must inspect and reopen affected dependents, update those artifacts and obtain a fresh start receipt; the CLI does not cascade semantic revisions automatically. Independent review checks whether the evidence demonstrates the purpose, not merely whether implementation checks pass.

`start` checks the plan before transitioning to implementation. Phase context manifests supply versioned dependencies; Claude Code, Codex and CodeBuddy hooks gate supported file edits and inject the relevant context. See [automation and host boundaries](automation.md).

## Contracts

Specs accept legacy h2 requirements and nested h3 requirements under `## Requirements`. Fenced examples are not headings. Delta specs add, modify and remove named requirements. Existing custom sections must survive merging. Large contracts may use an index and requirement shards; validation checks the logical contract.

## Verification and landing

`check` runs explicitly trusted configured commands, hashes code and contracts before and after execution, writes content-addressed logs, and signs structured statements. No configured suite, partial checks, changed inputs, nonzero exit, or invalid evidence can satisfy completion.

`land` evaluates the lifecycle gates and previews contract merging. The write phase has a project lock, recovery journal and backups. It refuses active checks and archives evidence. A forced landing requires a reason and keeps a signed override record. [Exact evidence semantics and limitations](verification.md).
