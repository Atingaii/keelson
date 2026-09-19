# Landing

Fold finished work back into the project's standing facts. The change directory is scaffolding; what lasts is `specs/`, `rules/`, `NOW.md`, and git history.

## `keelson land <name>`
<!-- keelson: id=land.command | without: delta specs never merge and specs stop describing the current system | sunset: never -->

The command refuses to land while tasks are unchecked or the last `Verify:` entry is not `exit 0` (override with `--force` only when the user says so). It then:

1. merges each delta spec into `.keelson/specs/<capability>/spec.md` (ADDED appends, MODIFIED replaces by requirement name, REMOVED deletes);
2. appends the `Decisions` lines from `change.md` into the `## Decisions` section of the matching spec, present tense;
3. removes the change directory (`land: fold`, default) or moves it to `changes/archive/YYYY-MM-DD-<name>/` (`land: keep`);
4. prints what changed.

Commit the landing together with the last code change, so the specs and the code that satisfies them share a revision. The full ledger stays reachable in git history; `keelson retro` reads it from there.

## Update `NOW.md`
<!-- keelson: id=land.now | without: the next session starts blind and re-derives state from git | sunset: never -->

Rewrite the whole file, present tense, three short parts: what is active (or "nothing in flight"), what is blocked or uncertain, the next concrete step. Overwrite; never append a log. `keelson land --now "<text>"` writes it for you.

## Promote learnings to rules
<!-- keelson: id=land.promote | without: the same convention is rediscovered and re-explained in every change | sunset: never -->

Ask yourself, then the user in one line: did this change reveal a convention worth stating? A pattern every future edit to this path should follow, a check that would have caught a bug earlier, a constraint that is not obvious from the code. If yes, add it to the matched `rules/<scope>.md` (or create one and register it in `rules/index.md`). Keep rules short and testable; a rule that cannot be checked is a wish.

## Spec `Decisions` etiquette

A decision line is one to three lines, present tense, and names the rejected option: `- messaging: consumers are idempotent; exactly-once delivery rejected because the broker does not provide it`. When a decision is reversed later, rewrite the line and keep a trailing note: `(previously: at-most-once, abandoned after duplicate-notification incident)`. Never let `Decisions` become a changelog.
