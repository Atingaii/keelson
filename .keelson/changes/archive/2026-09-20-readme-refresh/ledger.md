# readme-refresh ledger

### Note: reader journey
Reorganized both READMEs around positioning, repository installation, normal conversational use, frontend actions, progressive initialization, everyday commands, and focused documentation links. Kept advanced manual operation in a disclosure. Updated Chinese onboarding language and same-language links. No executable behavior or dependency changed.

### Dispatch: documentation review → deep (cli_review)
Result: pass
Independent reviewer checked the initial file tree, CLI actions and archiving, 22 design actions, bilingual scope, and local links against implementation. Corrected the inherited claim that all locks live outside the worktree by removing locks from the machine-local storage sentence; temporary append and decision locks can exist beside their records. No blocking findings remained.

### Note: focused documentation checks
`node --test --test-name-pattern='READMEs document|project documentation links' tests/repo.test.js tests/design.test.js` exited 0: 2 selected tests passed. Manual checks confirmed balanced fences and disclosures, existing banner paths, and no comparison or external-project attribution text in either README.

### Verify: checks pass
`npm run lint` exit 0; `npm run test` exit 0 · tree 86bf3a05b6784a600d92be5c5dbe612c43c9737a12358c28bc492ccec36dc28b
