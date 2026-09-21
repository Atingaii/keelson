# Readable project memory

Use this whenever creating or updating human-facing project memory: intent, current state, changes, plans, contracts, rules and handoffs. Apply it automatically in both profiles. The reader should recover the relevant state and act without reconstructing the conversation.

## Put the useful part first
<!-- keelson: id=writing.entry | without: current state and the next action are buried under background, so every return to the project requires rereading history | sunset: never -->

Open with the document's answer: current state for NOW, the intended outcome for a change, the purpose for a contract, or the applicable constraint for a rule. In work/resume documents, put one concrete next action near the top, naming the file, command, deliverable or decision. If blocked, name the missing decision and what it blocks. If finished, state that and link evidence; do not invent another task.

The agent performs authorized work. A written next action is a continuation cue for its executor, not a request for the user to run internal workflow commands or approve an already authorized step.

## Keep the reading surface small
<!-- keelson: id=writing.structure | without: long paragraphs, vague tasks and unrelated side issues overwhelm the work item while adding no actionable information | sunset: never -->

- Use short paragraphs with one point each and descriptive headings. Put details beside the requirement or decision they support; link the owning file instead of duplicating it.
- Order multi-step work and number the steps. Each task names one bounded action and an observable completion check; preserve checkbox and effort syntax. Point to the next ready task and mark verified progress without inflating status.
- Prefer small groups, usually up to five items, organized by outcome or scope. Keep the complete plan and contracts accessible. Group a long ready decision frontier in the same round; never truncate it to meet a display limit.
- Move unrelated future work to its tracker or roadmap with a pointer. Keep current blockers, dependencies and material risks next to the work they affect.
- State failures with the observed result, known cause and recovery action; distinguish an unconfirmed cause. Omit timing unless useful and supported; label estimates and their assumptions instead of inventing minute counts.

## Apply the shape to the right document
<!-- keelson: id=writing.documents | without: every file gets a generic action checklist and stable contracts become duplicated status reports | sunset: never -->

| Document | First useful information | Detail that stays available |
|---|---|---|
| `INTENT.md`, specs, rules, glossary | Purpose, observable behavior, scoped constraint or term meaning | Boundaries, scenarios, rationale and source links |
| `NOW.md`, `handoff.md` | Current state and next executable action or blocker | Verified results, unresolved work, evidence links and rejected approaches that affect continuation |
| `change.md`, `request.md`, `decisions.json` | Outcome and scope; preserve the original request and structured decision state | Full acceptance, uncertainty, dependencies, answers and their basis |
| `tasks.md`, `ROADMAP.md` | Next ready action or milestone | Remaining slices with their own completion checks; later work remains recorded |
| `ledger.md` | Event result and its evidence reference | Known cause, ruling or verification scope; failure and uncertainty remain visible |

## Preserve meaning and evidence
<!-- keelson: id=writing.integrity | without: brevity removes requirements, alters signed evidence, invents certainty or overrides the owner's workflow | sunset: never -->

This is a writing default, not a diagnosis, special mode or limit on analysis. Honor user language, requested depth and required response formatting. Do not add a recap or fixed checklist to every document. Keep CLI-parsed headings in English in both mirrors, including `Acceptance`, `Open questions`, `Decisions` and `Next step`.

Never shorten away acceptance items, scenarios, assumptions, owner decisions or verification gaps. Keep structured JSON/JSONL schemas and raw signed evidence intact; summaries link to them. Before saving, check that a returning reader can find what is true, what remains uncertain, the next action when work remains, and the supporting detail. Then follow `reconcile.md` to route durable knowledge without duplicating it.
