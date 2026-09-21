# Publishing to npm

Keelson uses the public package `@zyaiting/keelson`; the executable is `keelson`. The npm scope belongs to `zyaiting`, while the GitHub repository remains `Atingaii/keelson`.

## User installation

Requires Node.js 20+ and npm:

```bash
npm install -g @zyaiting/keelson
cd /path/to/your/project
keelson init --codex
```

Open your coding agent in that directory and describe your task. Use `--lang zh` for Chinese guidance, or select another [supported host](platforms.md). Global installation keeps `keelson` available in later sessions; running only `npx ... init` does not provide that persistent command.

To upgrade, run `npm install -g @zyaiting/keelson@latest`, then `keelson update` inside each initialized project. `update` refreshes project integration; it does not download a new CLI version.

## Maintainer release

Publish a new version for each completed project update, including README changes, so npm users receive the current documentation as well as the CLI. Use the `latest` tag for stable releases and verify it after publishing. Git commits use the project author's identity, `Atingaii`; the npm publishing account remains `zyaiting`.

1. Use the `zyaiting` npm account or an account granted publishing access. Verify the account email and enable two-factor authentication. Log in from your own terminal:

   ```bash
   npm login --registry=https://registry.npmjs.org/
   npm whoami --registry=https://registry.npmjs.org/
   ```

2. Update the version, lockfile and `CHANGELOG.md`; installed skill metadata is stamped from the package version. Published name/version combinations cannot be reused. Review the diff and package contents:

   ```bash
   npm ci
   npm pack --dry-run
   ```

   The allowlist includes the CLI, runtime modules, skills, hooks and registry. Repository history, `.keelson/`, tests and private runtime files are excluded. Review the final manifest before publishing.

3. With the owner's release approval, publish and complete npm's authentication prompt:

   ```bash
   npm publish --access public --tag latest
   npm view @zyaiting/keelson@latest version
   ```

   `prepublishOnly` runs the existing test suite; a failure stops publication. npm [scans newly published packages](https://github.blog/changelog/2026-07-28-npm-publish-time-malware-scanning-and-dual-use-metadata/) before making them installable, so a successful publish can precede package availability by several minutes. Wait and verify the exact version and a clean installation before announcing availability; do not republish the same version to resolve this delay. Keep passwords, tokens and recovery codes out of chat and issues.

## Automated releases

The existing `.github/workflows/release.yml` runs on pushed `v*` tags and expects an `NPM_TOKEN` repository secret. It installs dependencies, runs checks, publishes to npm, and creates a GitHub release. Do not push a tag for a version already published manually: this workflow would try to publish it again.

npm [trusted publishing](https://docs.npmjs.com/trusted-publishers/) can replace the stored token with GitHub Actions OIDC. Configure the npm package for GitHub owner `Atingaii`, repository `keelson`, and workflow filename `release.yml`; the workflow must also use supported Node/npm versions and OIDC authentication. This repository has not yet made that switch.

Official instructions: [scoped public packages](https://docs.npmjs.com/creating-and-publishing-scoped-public-packages/) · [two-factor authentication](https://docs.npmjs.com/configuring-two-factor-authentication/).
