# Get started

Install from the repository with Node.js 20 or later:

```bash
git clone https://github.com/Atingaii/keelson.git
cd keelson
npm ci
npm link
cd /path/to/your/project
keelson init --codex
```

`npm link` exposes the local checkout's CLI. Use a pinned Git revision for reproducible team installation. The package is named `@atingaii/keelson`; this documentation does not claim it has been published to npm.

Initialization writes small project notes and host discovery shims. It leaves `.gitignore` alone. Start Codex in the project and ask for a real change. The installed skill points it to `keelson guide`, project intent and current change state.

For a manual first change:

1. Run `keelson new fix-pagination --tier quick`.
2. Describe the outcome and measurable acceptance in `.keelson/changes/fix-pagination/change.md`.
3. Implement the change and tests. Tick acceptance only after checking it.
4. Add the project's existing test/lint commands to `.keelson/config.yaml`:

```yaml
check:
  - name: unit tests
    command: npm test
    kind: test
  - name: lint
    command: npm run lint
    kind: lint
```

5. Review these commands, then run `keelson check --trust --record`.
6. Inspect `keelson status`, then `keelson land fix-pagination` when all gates pass.

No configured checks is an error, not a green result. A `spec` change also describes how and impact, and carries delta contracts when behavior changes. The CLI does not infer requirement coverage from a test exit code; acceptance remains an explicit review.

`keelson ask` records persistent decisions; `keelson guide interview` explains when to ask. `keelson doctor --session` shows host/session identity. `keelson update` refreshes integration; `keelson uninstall` removes owned integration while preserving project knowledge and evidence. Use `init --vendor` only when you want copied package guidance.

Read [verification](verification.md), [CLI](cli.md), and [configuration](configuration.md) for details.
