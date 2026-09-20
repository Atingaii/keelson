# Publishing to npm

The repository currently declares `@atingaii/keelson` version `0.4.0`. A Git commit is not an npm release; these commands become available to users only after publication succeeds.

## First release

1. [Create an npm account](https://www.npmjs.com/signup), verify its email, and enable two-factor authentication. Public scoped packages are free. The npm username is independent of the GitHub username.
2. Confirm the package scope. Publishing `@atingaii/keelson` requires owning the `atingaii` account or having publishing permission in that npm organization. If your username differs, update the package name in `package.json`, the lockfile and installation examples together before continuing. An unused package name alone does not grant scope access.
3. Log in from your own terminal in the repository:

   ```bash
   npm login --registry=https://registry.npmjs.org/
   npm whoami --registry=https://registry.npmjs.org/
   ```

4. Review the release and its contents:

   ```bash
   npm ci
   npm pack --dry-run
   ```

   The package includes the CLI, runtime modules, skills, hooks and registry. Repository history, `.keelson/`, tests and private runtime files are excluded by the package allowlist. Record the release date in `CHANGELOG.md`, and prepare the README installation instructions for the confirmed package name.

5. Once the owner has approved the public release, publish and complete any npm authentication prompt:

   ```bash
   npm publish --access public
   npm view @atingaii/keelson@0.4.0 version
   ```

   Use the confirmed package name if it changed. `prepublishOnly` runs the existing test suite; a failed check stops publication. Verify the package on npm before announcing its availability or making npm installation the default in the README.

Do not paste passwords, tokens or recovery codes into issues or chat. A published name/version cannot be reused; subsequent releases need a new version.

## User installation after publication

Requires Node.js 20+ and npm:

```bash
npm install -g @atingaii/keelson
cd /path/to/your/project
keelson init --codex
```

Open your coding agent in that directory and describe your task. Use `--lang zh` for Chinese guidance, or select another [supported host](platforms.md). Global installation keeps `keelson` available to the agent for later commands. Running only `npx ... init` does not provide that persistent command.

To upgrade, run `npm install -g @atingaii/keelson@latest`, then `keelson update` inside each initialized project. `update` refreshes project integration; it does not download a new CLI version.

## Later automated releases

The existing `.github/workflows/release.yml` runs on pushed `v*` tags and currently expects an `NPM_TOKEN` repository secret. It installs dependencies, runs checks, publishes to npm, and creates a GitHub release. Tag pushes are release actions and need owner approval; do not use one just to test setup.

After the first release, npm [trusted publishing](https://docs.npmjs.com/trusted-publishers/) can replace the stored token with GitHub Actions OIDC. Configure the npm package for GitHub owner `Atingaii`, repository `keelson`, and workflow filename `release.yml`; the workflow must then be migrated to a supported Node/npm version and OIDC authentication. This repository has not yet made that switch.

Official instructions: [scoped public packages](https://docs.npmjs.com/creating-and-publishing-scoped-public-packages/) · [two-factor authentication](https://docs.npmjs.com/configuring-two-factor-authentication/).
