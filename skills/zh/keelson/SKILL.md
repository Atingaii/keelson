---
name: keelson
description: 面向含 .keelson/ 目录项目的工程控制层。用于探索想法、修改代码、修复/调试、继续之前的工作，或改进反复出现的工程失败。把“对话会话”和“长期 work item”分开，因此用户可以一直追问，而不需要主动宣布任务何时开始或结束。
---

# Keelson

项目本地执行内核是 `.keelson/workflow.md`。Keelson 约束的是**状态转换与证据**，不是实现口味。用户指令和项目指令优先。

## 判断对话意图，不把生命周期当成用户意图

| 意图 | 常见请求 | 首先读取 |
|---|---|---|
| **Explore** | 比较、解释、“应该怎么做”、“深挖一下” | `discover.md` + `interview.md`；明确要求修改之前保持只读 |
| **Change** | 构建、新增、重构、迁移、“再顺便改……” | `shape.md` → `context.md`；边界/术语问题读 `model.md`，非显然技术选择读 `engineer.md`，只有风险触发时才读 `design-lenses.md`；spec 级再加 `plan.md` |
| **Fix** | bug、测试失败、异常行为 | `debug.md`，随后 `verify.md` |
| **Resume** | 继续、接着做 | `keelson focus --auto` + 当前上下文；只有真正跨人/跨机器交接时才读 `handoff.md` |
| **Improve** | 重复错误、Harness/rule/流程问题、retro | `harness.md` + `reconcile.md` |

“完成”**不是一种用户意图**，也绝不依赖用户说“做完了”。它是状态转换：当前 focus change 的 acceptance、阻塞问题/假设、rollout 和当前工作树上的新鲜 verification 全部满足后，状态自动成为 `ready`。这时自动执行 Finish 路径（`verify.md` → `land.md` → `reconcile.md`），然后才能宣称完成。

## 执行规则

- conversation/session 只是焦点指针。关闭窗口、长时间不说话、继续追问，都**不能**把 change 判成完成。
- 有 session identity 时，`keelson new` 自动把新 change 绑定到当前会话。同一目标的追问继续使用它；独立的新修改目标创建新 change 并移动 focus。
- Resume 时先用 `keelson focus --auto`；可以根据 branch 或唯一活动 change 给出候选，但存在歧义时绝不静默绑定。
- `NOW.md` 为 First contact 时，只推断并确认 `INTENT.md`；不要盘点整个仓库生成 specs/rules。
- 非平凡修改先读取当前上下文；改共享模块前运行 `keelson impact <files>`。
- 只在 decision frontier 提问。先做风险触发式盲点扫描，再按 `interview.md` 一次解决一个真正属于所有者的决定：具体场景/选项、推荐默认值，“不确定”是合法路由。仓库证据、小实验或 Agent 工程判断能解决的事绝不问用户。
- 非显然机制/架构选择走 `engineer.md`：先还原事实、结果、约束和不变量，再写可证伪 hypothesis，用最便宜的实验/消融区分方案；复杂度必须用证据证明自己值得存在。
- 只给工作本身定大小：trivial 直接改；quick 轻量 change；spec 先写验收、行为 delta 和计划，再等批准。
- 工件是信息容器，不是仪式。不要创建空 roadmap/glossary/rule/task/ledger/handoff/spec。
- `tasks.md` 只是执行计划，不拥有“完成”判定权。只要 acceptance 与新鲜证据已经满足，未勾选的旧计划不能覆盖这个事实；实现路径变化时应重写或删除过时任务。
- 知识维护属于 Keelson 内部职责。RECONCILE 时自动重写、拆分、去重超压的长期文档，大 spec 由 `land` 自动分片；除非涉及产品语义决策，否则绝不要求用户维护 Keelson。
- 始终区分**代码现实、已确认真相、计划变更**；未决问题只阻塞依赖它的切片。
- 宣称完成必须有当前工作树上的新鲜 `keelson check --record` 证据；不得为了通过检查而削弱验收。
- change 一旦成为 `ready`，就应自动 land，不等待用户说特殊结束语；若仍缺所有者决策，只停在那个决策上。
- `handoff.md` 只用于真正跨人/跨机器或明确所有权转移；普通跨会话接续由长期 change 工件 + `.keelson/.runtime/sessions/` 完成。
- 重复失败提升为最窄的长期控制：spec → 作用域 rule → 可执行 fitness check；随后删除冗余 prose。
- 只使用 `light | standard | deep`，绝不持久化带日期模型 ID。

用户通常只需要 `init`、`status`、`doctor`、`update`、`uninstall`；其余由 Agent 使用。
