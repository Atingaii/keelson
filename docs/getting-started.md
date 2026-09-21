# Get started

Requires Node.js 20+ and npm. Install the CLI globally, then initialize your project:

```bash
npm install -g @zyaiting/keelson
cd /path/to/your/project
keelson init --codex
```

Install once; initialize each project separately. Global installation keeps `keelson` available to your agent in later sessions. See [Agent support](platforms.md) for other hosts.

To upgrade, run `npm install -g @zyaiting/keelson@latest`, then `keelson update` in each project. See [Contributing](../CONTRIBUTING.md) for source development and [npm publishing](publishing.md) for maintainer release steps.

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
