# CLI and library code

- ESM, Node ≥ 20 built-ins first; `yaml` is the only runtime dependency. Do not add another without a change at spec tier.
- Commands live in `src/commands/<name>.js` and export one async function `(args, cwd) → exit code`. Pure logic goes in `src/lib/` so tests can import it without running the CLI.
- Anything that parses Markdown lives in `src/lib/markdown.js`; keep the heading shapes it recognises in sync with the templates. LF and CRLF are semantically equivalent: normalize at the parser boundary instead of rewriting user files.
- User-facing errors are thrown as `Error` with a sentence that says what to do next; `bin/keelson.js` prints them.
- Package-owned Markdown that Keelson renders or installs emits LF so generated surfaces are byte-stable across operating systems.
- `--json` output is stable data for agents; changing a field is a behaviour change.
