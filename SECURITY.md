# Security

## Reporting

Please report vulnerabilities through GitHub's private vulnerability reporting on this repository. Do not open a public issue. You will get a response within a week.

## What Keelson does on your machine

- The CLI reads and writes files under the project directory and `~/.keelson/`.
- `keelson check` runs the commands listed in `.keelson/config.yaml` through your shell. Review that list as you would any script in the repository.
- The hooks are local Node scripts copied into `.keelson/hooks/`. They read files in the project and print text. They make no network calls.
- `keelson models --refresh` is the only command that uses the network, and only when you run it. It fetches the registry from this repository and, when `ANTHROPIC_API_KEY` or `OPENAI_API_KEY` is set, lists that provider's model catalogue with the key. Keys are never written to disk; only their presence is recorded in `~/.keelson/models.cache.json`.
- `keelson ablate` copies project files to `~/.keelson/ablations/`. Those copies may contain project text; `keelson restore` removes them.

## Supported versions

Security fixes go to the latest minor release.
