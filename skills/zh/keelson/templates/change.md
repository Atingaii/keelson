---
tier: {{tier}}
created: {{date}}
status: clarifying
---

# {{title}}

## What
- 结果：…
- 非目标：…
- …（以加粗的 BREAKING 开头的条目标记破坏性变更，需要一个 Rollout 段）

## Why
…（谁在什么情境下遇到什么问题；去掉方案也应成立）

## How
…（下一个有界动作、涉及的文件及可观察结果；详细步骤需要时放入 tasks.md）

## Impact
- …（调用方、其他入口、数据、权限、兼容性；`keelson impact <files>` 给提示，阅读给答案）

## Acceptance
- [ ] … — test: `…`
- [ ] … — manual: …

## Open questions
- … — blocks: <它阻塞的切片或任务>

## Decisions
- {{capability}}: …（现在时；只记录未来仍有价值的长期理由）
- (assumed) {{capability}}: …（你的工作假设；落地前由负责人确认）
