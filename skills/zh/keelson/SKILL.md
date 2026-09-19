---
name: keelson
description: 面向带有 .keelson/ 目录的仓库的项目工作流层。凡是用户要求在此类项目中构建、新增、修改、重构、修复、调试、规划、继续、收尾或评审工作时使用；用户说 "grill me"、"status"、"land it"、"retro"，或说"盘问我"、"进度"、"收尾"、"复盘"时同样使用。它把 specs 当作唯一真相、按路径路由 rules、用 NOW.md 保存会话记忆，并按 effort 层级分派子代理。
---

# Keelson

Keelson 是垫在你正常工作方式之下的一层薄结构。项目在 `.keelson/` 里保存五样东西：`INTENT.md`（项目为什么存在、明确不做什么）、`NOW.md`（当前在做什么）、`specs/`（系统今天的行为）、`rules/`（按路径路由的编码约定）、`changes/`（进行中的工作，空闲时为空）。工作怎么做由你自己判断；Keelson 只保证你需要的事实摆在面前，你产出的事实被写下来。

这里没有任何门禁。每条准则都说明了它为什么存在，好让你判断它何时不适用。用户指令和项目自身的说明文件永远优先。

## 非平凡工作开始前

运行 `keelson context --paths <你预计会改的文件>`（或直接读 `.keelson/INTENT.md`、`NOW.md` 和命中的 `rules/` 文件）。这比重新摸索约定便宜，比猜约定安全。

## 先定大小，再选参考

| 大小 | 信号 | 做法 | 阅读 |
|---|---|---|---|
| trivial | 样式、错字、单文件显式修复、行为不变 | 直接做；不建 change 目录 | 不读 |
| quick | 涉及多个文件、意图清楚、行为契约不变 | 用 3 到 6 行写回你的理解，创建 change，继续 | `references/shape.md` |
| spec | 行为契约变化、新增或删除能力、放弃显而易见的方案、任何用户想在写代码前先审阅的事 | 访谈以消除歧义，起草 `change.md` 和 delta specs，等待批准 | `references/shape.md`、`references/plan.md` |

大小由你判断。用户可以用"按 spec 处理"或"直接做"覆盖。若用户希望 quick 变更也先批准，`config.yaml` 可设 `confirm.quick: wait`。

## 按阶段

只读你所处阶段的那一份参考。

- **Shaping** 梳理想法或需求 → `references/shape.md`（写回理解、访谈、探索）
- **Planning** 为 change 产出工件 → `references/plan.md`（change.md、delta specs、带 effort 层级的 tasks）
- **Building** 按 tasks 实施 → `references/build.md`（按 effort 分派子代理、裁定、何时停下）
- **Verifying** 宣称完成前验证 → `references/verify.md`（新鲜证据、对照 spec 与 rule 评审）
- **Landing** 收尾已完成的工作 → `references/land.md`（`keelson land`、NOW.md、把经验提升为 rules）
- **Debugging** 处理任何失败 → `references/debug.md`（复现、根因、分类）
- **Retro** 用户要求时 → 运行 `keelson retro` 并落实其建议

## 有特定含义的说法

- "grill me" / "盘问我" → 按 `references/shape.md` 的访谈一次一问，问到穷尽。
- "status" / "进度" / "到哪了" → 运行 `keelson status`，然后用两行总结。
- 新会话里说 "continue" / "继续" → `NOW.md` 和 `keelson status` 告诉你从哪接上。
- "land it" / "收尾" / "wrap up" → `references/land.md`。
- "retro" / "复盘" → `keelson retro`。

## 基本规则（以及它们为什么存在）

- **先查事实，再问问题。** 在问用户任何事之前，先探索代码和 `.keelson/`。用户的时间是最稀缺的资源。
- **specs 描述今天。** 落地之后，`specs/` 必须与 HEAD 一致。现在时，不写变更叙事。
- **先有证据，再下结论。** 只有在本会话里运行过命令并读过退出码之后，才能说"完成"、"通过"、"已修复"。
- **仓库里不出现带日期的模型 ID。** effort 层级只有 `light | standard | deep`；由宿主在运行时解析。
