# npm-release-preparation ledger

### Note: scope and publication state
Prepared public npm metadata and bilingual release/installation instructions. The owner has no npm account yet. `npm whoami` returned ENEEDAUTH, and the configured scoped package returned registry 404 on 2026-09-20. Scope ownership remains unconfirmed. No account was created, no authentication secret was requested, and no package or tag was published. README installation remains source-based until the first public release is verified.

### Note: actual package and installation smoke
`npm pack --json` produced @atingaii/keelson@0.4.0 with 132 files, 201,350 compressed bytes and 560,969 unpacked bytes. Inspected the allowlist and public registry/access metadata. Installed the tarball with scripts disabled in a disposable global prefix, then verified version, Codex Chinese initialization in a separate fixture, installed workflow/frontend guidance and design help. All commands succeeded. Manifest, SHA-256 and raw command results are retained under `.git/keelson-task-evidence/npm-release-preparation/`. This is scoped packaging evidence, not a full repository verification or release attestation.

### Dispatch: publishing documentation and package review → cli_review
Result: pass
Independent read-only review confirmed runtime inclusion, bilingual instructions, scope ownership, unpublished status, existing prepublish/release behavior, and the persistent CLI requirement after initialization. No mandatory corrections. Official npm documentation supports the publishing and lifecycle guidance.

### Note: verification boundary
The owner's no-CI preference remains in force. No full repository test suite or CI ran. The existing `prepublishOnly` test suite and release workflow are unchanged. The change remains active while the account/scope and first-release decisions are unresolved; no force landing or completion attestation is claimed.

### Note: content checks and cleanup
Checked five Markdown files, twelve local links, balanced code fences, package/lock identity and public registry metadata; `git diff --check` passed. After verifying the retained tarball hash, removed the resolved task-owned `/tmp/keelson-npm-ready-dq___1br` directory containing the tarball, isolated install prefix, npm cache and initialization fixture, plus its obsolete run-path marker. Retained the package manifest, raw smoke transcript, hash/size summary, content-check report and cleanup record. Existing dependencies, caches, credentials and user files were untouched. Repack after the final scope and release content are confirmed.

### Note: owner authorization and final package identity
The owner registered and logged in as zyaiting, then explicitly instructed direct publication and README installation updates. `npm whoami` confirmed zyaiting. The final scope is @zyaiting/keelson; GitHub URLs remain Atingaii/keelson. Both READMEs and onboarding guides now use global npm installation, per-project initialization and explicit CLI/integration upgrade steps. No release tag is pushed because the existing workflow would attempt a duplicate npm publication.

### Dispatch: first-release metadata and documentation review → cli_review
Result: pass
Independent read-only review confirmed matching manifest/lock identity, bilingual installation and upgrade guidance, absence of obsolete scope references in public docs/runtime, absolute README image URLs and unchanged runtime inclusion. No mandatory corrections.

### Note: first-release validation and npm client retry
Lint, repository validation and 39 local documentation links passed. The final tarball has 132 files and 201,344 compressed bytes; SHA-256 is a1a3c6fed7a8e0d240e4dba209786376a0ab0061a1e491c3e2263eabfaea6111. Isolated tarball installation, version, Chinese Codex initialization and packaged guidance passed. Normal npm publish ran prepublishOnly: 158 tests passed, zero failed/skipped. npm 10.8.2 then emitted "Exit handler never called!" during browser authentication despite returning zero; anonymous registry lookup still returned 404, so this was not treated as publication. Retried the exact verified tarball using task-local npm 11.15.0, compatible with the existing Node version, without changing global npm or rerunning already-passed prepublish tests. Raw records are in `.git/keelson-task-evidence/npm-first-release/`.

### Note: npm accepted the release; installation availability is separate
The owner completed npm's browser identity challenge. The retry returned `+ @zyaiting/keelson@0.4.0`. Access status is public and latest points to 0.4.0. Anonymous version metadata and the public tarball are available, with the tarball SHA-256 matching the inspected artifact. The package index initially returned 404, so installation availability is checked separately. npm's official July 2026 release notes describe publish-time scanning before install availability, commonly several minutes; maintainer instructions now mention that delay.

### Note: public installation verified
The public package index became available with latest=0.4.0 and publication time 2026-09-20T16:54:09.730Z. Using empty npm configuration files, no authentication environment and an isolated prefix, installed @zyaiting/keelson from the official registry and verified version 0.4.0, Chinese Codex initialization, packaged skill/frontend guidance and integration update. All commands passed. Anonymous metadata, raw install/CLI results and the release summary are retained locally. All 132 shipped files also match the working tree byte-for-byte. No release tag or remote CI was triggered.

### Note: release cleanup
After checking the retained public-install result and tarball hash, removed the resolved task-owned `/tmp/keelson-npm-publish-eo4cgafw` directory: temporary npm client, caches, isolated installation prefixes, fixtures, empty anonymous config files and tarball. Removed the obsolete run-path marker. The global npm installation, account credentials, project dependencies and pre-existing caches were not changed. Publication logs, registry metadata, package/hash records and raw installation evidence remain available.

### Verify: Public npm release @zyaiting/keelson@0.4.0: final scope, bilingual installation docs and anonymous registry installation verified
`npm run lint` exit 0; `npm run test` exit 0 · tree d349d1dbac110f54b1cf2fe92e39b1629ce4924e82c21191ceeb33903372ca30
