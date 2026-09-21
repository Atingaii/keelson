---
tier: {{tier}}
created: {{date}}
status: clarifying
---

# {{title}}

## What
- Outcome: …
- Non-goal: …
- … (a bullet that starts with the word BREAKING in bold marks a breaking change and needs a Rollout section)

## Why
… (who encounters what problem in which situation; independent of the proposed solution)

## How
… (next bounded action, affected files and observable result; link tasks.md when a detailed plan is needed)

## Impact
- … (callers, other entry points, data, permissions, compatibility; `keelson impact <files>` gives hints, reading gives the answer)

## Acceptance
- [ ] … — test: `…`
- [ ] … — manual: …

## Open questions
- … — blocks: <slice or task it blocks>

## Decisions
- {{capability}}: … (present tense; durable rationale only when it will matter later)
- (assumed) {{capability}}: … (your working assumption; the owner confirms it before landing)
