# Decision interviews

Keelson users do not need architecture vocabulary. The interview is hidden control logic: discover only decisions the owner actually owns, make them easy to answer, then get out of the way.

## Question protocol
<!-- keelson: id=interview.protocol | without: the agent asks unnecessary questions or hands implementation choices to a user who cannot evaluate them | sunset: never -->

Before asking, answer internally:
- What action, acceptance boundary, or durable commitment changes with the answer?
- Who owns it: repository/reality, agent engineering judgment, or owner intent/risk tolerance?
- Can code, docs, tests, or a small experiment answer it?
- How reversible is the choice, and what fails if guessed wrong?
- What grounded default would you choose?

If you cannot name what the answer changes, do not ask.

## One decision per turn
<!-- keelson: id=interview.one-at-a-time | without: a wall of questions shifts design work onto the owner and hides dependencies between answers | sunset: never -->

Ask one blocking decision at a time. Use a concrete scenario. When choices help, give 2–4 materially different options, your recommended default, the assumption behind it, one important trade-off, and a free-text path. Include **not sure** when uncertainty is legitimate.

Never batch dependent questions. Batch only when the owner explicitly asks and the questions are truly independent.

## Adapt language, never label the person
<!-- keelson: id=interview.adaptive | without: beginners guess jargon while experienced owners get patronizing explanations and setup questions | sunset: never -->

Plain-language scenarios are the default. Name the engineering concept after the behavior is understood. If the owner already uses a term precisely, mirror it and become more concise. Never persist beginner/intermediate/expert labels. `guide: true` adds teaching; it is not required for usable questioning.

## Uncertainty is a routing signal
<!-- keelson: id=interview.uncertain | without: the owner invents a technical preference or work blocks on something a default or experiment could resolve | sunset: never -->

- Reality-owned unknown → investigate.
- Reversible engineering choice → follow project convention or choose the recommended default.
- User-owned but hard to imagine → show the smallest scenario, sketch, example payload, or throwaway prototype.
- High-impact and still unknown → block only the slice that truly depends on it.

Do not turn “I do not know which database” into a database poll. Translate it into the product property that would make the database choice matter.

## Read back and stop
<!-- keelson: id=interview.stop | without: answers stay trapped in chat or ordinary work becomes an endless interview | sunset: never -->

After an answer, acknowledge **decision + consequence** in one sentence and update the current artifact. If it conflicts with an established contract, name the exact conflict next.

For normal work, stop asking once the next vertical slice has a clear outcome, boundary, and acceptance check. If the owner explicitly asks to be grilled or stress-tested, continue through every material branch inside the requested boundary, but do not expand into hypothetical future features.
