---
tier: {{tier}}
created: {{date}}
status: clarifying
---

# {{title}}

## Why
…

## What
- … (a bullet that starts with the word BREAKING in bold marks a breaking change and needs a Rollout section)

## How
…

## Alternatives
- **Option A (chosen)** — …
- **Option B** — strongest argument for it: … Rejected because: …

## Impact
- … (callers, other entry points, data, permissions, compatibility; `keelson impact <files>` gives hints, reading gives the answer)

## Acceptance
- [ ] … — test: `…`
- [ ] … — manual: …

## Open questions
- … — blocks: <slice or task it blocks>

## Decisions
- {{capability}}: … (present tense; name the rejected option)
- (assumed) {{capability}}: … (your working assumption; the owner confirms it before landing)
