# Domain model and shared language

A project that lasts collects words, and the same word starts meaning two things while two words mean one. The model layer keeps the vocabulary, the boundaries between parts of the system, and the invariants that hold inside each part.

## One word, one meaning
<!-- keelson: id=model.language | without: "account", "user", "member", and "profile" drift apart across code, specs, and conversation, and every change starts with a translation argument | sunset: never -->

Terms that appear in specs, code identifiers, and conversation live in `.keelson/GLOSSARY.md`, one line each: `- Member — a User's identity inside one Workspace; carries the role`. When a request uses a term that is not there, or uses a glossary term differently, settle it before designing. When a term genuinely means different things in different parts of the system, name the part and keep both lines; that boundary is a bounded context, and the two parts talk through an explicit translation rather than a shared table.

Specs, rules, and change.md use the glossary term. Code follows it in names; when the code already uses a different word, the change either renames or records the mapping in the glossary line.

## Boundaries and invariants
<!-- keelson: id=model.boundaries | without: modules know too much about each other; a change in one leaks into three, and the spec cannot say who is responsible for what | sunset: never -->

Each capability spec answers "what does this part promise the rest of the system" (requirements) and "what may never be false inside it" (invariants: an order total equals the sum of its lines; a revoked link answers 404 on every path). When a change crosses a boundary, the delta names the contract that changes, and the other side's owner sees it in `keelson status` as a shared contract.

For architecture constraints, which are not behaviour ("the media pipeline never writes to the permissions table", "every read passes through `canView()`"), use a rule scoped to the paths it governs, and, where possible, a check in `config.yaml → check` that fails when it is broken. A constraint that only lives in prose will be broken by someone who never read it.

## Hide what changes
<!-- keelson: id=model.deep-modules | without: interfaces mirror the current implementation; every internal change becomes an interface change and ripples to callers | sunset: never -->

When you design a module or an interface, ask: what does the caller need to know, what complexity can stay behind the interface, what is most likely to change, and does that knowledge already leak into other modules? Prefer a small interface over a deep implementation to many thin modules that expose their internals. File length is not the measure; the number of things a caller must understand is.

When a capability's spec keeps growing and its requirements no longer share a purpose, that is the signal for a new capability with its own spec, not for a longer file.

## Design it twice, cheaply
<!-- keelson: id=model.design-twice | without: the first design that comes to mind is built, and its costs are discovered in the code review | sunset: never -->

For a spec change, sketch two designs before choosing, in a few lines each under `## Alternatives`: the interface each exposes, what each hides, what each makes hard later. The second sketch is often worse; writing it is how you learn what the first one is paying for. Record the rejected one with its strongest argument.
