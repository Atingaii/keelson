---
name: keelson
description: 面向含 .keelson/ 目录项目的工程控制层。用于探索想法、构建或修改代码、修复/调试、继续之前的工作、评审/收尾/落地，以及改进反复出现的工程失败。把任务路由到最小必要的 Keelson 工作流，同时保持项目事实、证据和接续状态真实。
---

# Keelson

项目本地执行内核是 `.keelson/workflow.md`。Keelson 约束的是**状态转换与证据**，不是实现口味。用户指令和项目自身指令优先。需要项目地图时读取 `.keelson/README.md`。

## 先判断用户意图，再只加载需要的能力

| 意图 | 常见请求 | 首先读取 |
|---|---|---|
| **Explore** | “应该做什么”、比较方案、“grill me” | `discover.md` + `shape.md`；所有者明确要求改项目之前保持只读 |
| **Change** | 构建、新增、重构、迁移 | `shape.md` → `context.md`；spec 级再加 `plan.md`，随后 `build.md` |
| **Fix** | bug、测试失败、异常行为 | `debug.md`，随后 `verify.md` |
| **Resume** | 继续、接着做、交接 | `handoff.md` + 当前上下文；从已确认的下一步继续，不重新规划 |
| **Finish** | 评审、是否完成、收尾、落地、发布 | `verify.md` → `land.md` → `reconcile.md` |
| **Improve** | 重复错误、Harness/rule/流程问题、retro | `harness.md` + `reconcile.md` |

术语或边界漂移时读取 `model.md`；只有存在真实设计/可靠性取舍时才读取 `engineer.md`。

## 执行规则

- 如果 `NOW.md` 写着“First contact”，先读仓库、起草 `INTENT.md`，只为仓库里真实存在的事实创建 specs/rules，然后让所有者确认或纠正；不要让所有者手写脚手架。
- 非平凡工作从当前工作树开始：`keelson context --paths <files>`；修改共享模块前运行 `keelson impact <files>`。
- 给变更定大小：**trivial** 直接做；**quick** 写回理解后建立轻量 change；**spec** 先写验收、delta specs 和计划，再等批准。
- 工件是信息容器，不是仪式。不要因为存在模板就创建空 ROADMAP、GLOSSARY、rule、tasks、ledger、handoff 或 spec。
- 始终区分**代码现实、已确认真相、计划变更**。未决问题只阻塞依赖它的切片。
- 宣称完成前必须有当前工作树上的新鲜 `keelson check --record` 证据；不得静默削弱验收检查。
- 重复失败提升为最窄的长期控制：spec → 作用域 rule → 可执行 fitness check；自动化接管不变量后删掉重复提示词。
- 只使用浮动 effort 层级 `light | standard | deep`；绝不持久化带日期的模型 ID。

机械细节用 `keelson <command> --help`；用户通常只需要 `init`、`status`、`doctor`、`update`、`uninstall`。
