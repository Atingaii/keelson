---
name: keelson
description: 面向带有 .keelson/ 目录的仓库的工程协作层。凡是用户要求在此类项目中构建、新增、修改、重构、修复、调试、规划、继续、交接、收尾、评审或发布工作时使用；用户说 "grill me"、"status"、"hand off"、"land it"、"retro"，或说"盘问我"、"进度"、"交接"、"收尾"、"复盘"时同样使用。它把 specs 当作当前行为真相、按路径路由 rules、记录决策与未决问题、分离工作/验证/发布状态，并把反复出现的错误逐步提升为更强的可执行检查。
---

# Keelson

`.keelson/workflow.md` 是项目本地的执行内核：**ORIENT → BOUND → BUILD → SENSE → RECONCILE**。初始化后，这份 canonical Skill 位于 `.keelson/skill/SKILL.md`，只负责把任务路由到更深的指导；不要一次加载或复述所有 reference。先看 `.keelson/README.md` 获取人和 Agent 都能读懂的项目地图。长期项目事实放在 `.keelson/`；已有项目文档通过 `config.yaml → refs` 保持权威，不复制。

Keelson 约束的是**状态转换，而不是实现方式**。用户指令和项目自身说明文件优先。一个规则若能稳定机械检查，就优先做成可执行不变量，而不是继续增加提示词。

## 从当前状态开始

如果 `NOW.md` 以 "First contact" 开头，先检查仓库，起草 `INTENT.md`，已有代码时再起草能力 specs 与按路径作用的 rules，然后用一次简短交流请所有者确认或修正。永远不要让所有者手写脚手架。

非平凡任务遵循常驻主回路。如果本轮还没有基于当前工作树完成定向，运行 `keelson context --paths <files>`；修改共享模块前运行 `keelson impact <files>`。代码、specs、INTENT 或当前对话已经给出的事实，不再重复询问。

## 只使用与变更规模相称的流程

| 大小 | 边界 | 动作 |
|---|---|---|
| trivial | 明确的单文件修复；行为不变 | 直接做；不建 change 目录 |
| quick | 意图清楚；行为契约不变 | 写回理解，`keelson new`，继续 |
| spec | 行为/契约/能力/迁移变化，或所有者要求写代码前评审 | 起草验收 + delta specs；等待批准 |

所有者可以覆盖大小。无人值守时，把尚未确认的所有者决策标成 `(assumed)`，并在落地前停下。

## 只加载当前任务需要的 reference

- 产品意图不清 / 引导式发现 → `references/discover.md`
- 需求、假设、授权 → `references/shape.md`
- 术语、边界、不变量 → `references/model.md`
- 上下文与影响 → `references/context.md`
- 纵向切片计划 / delta specs → `references/plan.md`
- 设计、可靠性、质量取舍 → `references/engineer.md`
- 实现纪律 → `references/build.md`
- 证据与验收 → `references/verify.md`
- Harness 反复漏掉同一类问题 → `references/harness.md`
- 停下 / 恢复 / 并行接续 → `references/handoff.md`
- 集成 / 发布 → `references/land.md`
- 回写稳定事实并压缩 → `references/reconcile.md`
- 调试 → `references/debug.md`

## 不变量

- 始终区分**代码现实**、**已确认事实**和**计划变更**；发现漂移就报告，不改 spec 去迁就缺陷。
- 完成性结论必须有当前工作树上的新鲜 `keelson check --record` 证据。
- 未决问题只阻塞依赖它的切片。
- 重复失败应升级为窄范围 rule 或可执行 check，而不是增长聊天经验。
- effort 只使用浮动层级 `light | standard | deep`；仓库里不持久化带日期的模型 ID。

机械操作查 `keelson <command> --help`。主要状态命令：`context`、`impact`、`new`、`status`、`check --record`、`handoff`、`land`、`cancel`、`retro`。
