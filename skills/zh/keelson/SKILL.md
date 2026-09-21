---
name: keelson
description: 面向含 .keelson/ 目录项目的工程工作流。普通的想法讨论、功能开发或修改、问题修复、界面创建或优化、继续工作、改进反复出现的工程失败请求均自动适用。按需衔接需求探索、设计、实现、验证与项目记忆，无需用户指定 Skill 名称或工作流命令。
---

# Keelson

项目本地执行内核是 `keelson guide workflow`。Keelson 约束的是**状态转换与证据**，不是实现口味。用户指令和项目指令优先。

## 判断对话意图，不把生命周期当成用户意图

| 意图 | 常见请求 | 首先读取 |
|---|---|---|
| **Explore** | 比较、解释、“应该怎么做”、“深挖一下” | `discover.md` + `interview.md`；明确要求修改之前保持只读 |
| **Change** | 构建、新增、重构、迁移、“再顺便改……” | `shape.md` → `context.md`；边界/术语问题读 `model.md`，非显然技术选择读 `engineer.md`，只有风险触发时才读 `design-lenses.md`；spec 级再加 `plan.md` |
| **Fix** | bug、测试失败、异常行为 | `debug.md`，随后 `verify.md` |
| **Resume** | 继续、接着做 | `keelson focus --auto` + 当前上下文；只有真正跨人/跨机器交接时才读 `handoff.md` |
| **Improve** | 重复错误、Harness/rule/流程问题、retro | `harness.md` + `reconcile.md` |

“完成”**不是一种用户意图**，也绝不依赖用户说“做完了”。它是状态转换：当前 focus change 的 acceptance、阻塞问题/假设、rollout 和当前工作树上的新鲜 verification 全部满足后，状态自动成为 `ready`。这时自动执行 Finish 路径（`verify.md` → `land.md` → `reconcile.md`），然后才能宣称完成。

- 涉及界面设计、评审、交互或响应式时，加载 `frontend.md`；用 `keelson design` 读取具体动作指导。区分浏览器观察与代码检查。

根据请求结果与仓库证据路由，不依赖特殊用词。用户描述工作，Agent 自行读取指导并执行工作流命令。术语冲突或共享边界自动加载 `model.md`，非显然设计选择加载 `engineer.md`，受影响路径包含用户界面时加载 `frontend.md`，即使用户没有明确要求设计。实现时使用 `build.md`；在已有授权内按 `verify.md` → `land.md` → `reconcile.md` 完成收尾。`guide: true` 只增加教学，不负责启用能力；两种 profile 默认均使用此流程。

## 执行规则

- conversation/session 只是焦点指针。关闭窗口、长时间不说话、继续追问，都**不能**把 change 判成完成。
- 有 session identity 时，`keelson new` 自动把新 change 绑定到当前会话。同一目标的追问继续使用它；独立的新修改目标创建新 change 并移动 focus。
- Resume 时先用 `keelson focus --auto`；可以根据 branch 或唯一活动 change 给出候选，但存在歧义时绝不静默绑定。
- `NOW.md` 为 First contact 时，只推断并确认 `INTENT.md`；不要盘点整个仓库生成 specs/rules。
- 非平凡修改先读取当前上下文；改共享模块前运行 `keelson impact <files>`。
- 新目标、实质性补充或前提变化时，按 `interview.md` 自动判断探索深度；目标不清、产品选择相互依赖或高影响承诺未定时主动深入，无需特殊提示词。明确任务直接推进。简单缺口每轮问一个就绪用户决定，复杂不确定性一轮问完当前就绪 frontier，给具体选项、推荐和理由；复用已定答案，自行调查事实。
- 实现前必须用一句可观察结果核对目的，并回放用户会看到/做什么：原困扰还在吗？未明确的用户可见选择不属于默认工程授权；保留数据也不等于保留展示方式。若两种合理体验会改变目标是否达成，先登记这个决定，给一个具体对比、推荐和理由，收到答案后再改依赖代码。任务小、方案可逆或写回后默认继续，都不能替代用户对这种选择的回答。已有明确答案或明确委托则直接推进。
- 非显然机制/架构选择走 `engineer.md`：先还原事实、结果、约束和不变量，再写可证伪 hypothesis，用最便宜的实验/消融区分方案；复杂度必须用证据证明自己值得存在。
- 只给工作本身定大小：trivial 走最小 quick 变更；quick 轻量 change；spec 先写验收、行为 delta 和计划，在用户已有授权内推进；只澄清尚未解决的所有者决策。
- 修改产品文件前，自动对当前变更运行 `keelson start`，再加载 `keelson context --phase implement`；出现新关键决定后，确定答案再重新启动。用户无需运行这些命令。
- 工件是信息容器，不是仪式。不要创建空 roadmap/glossary/rule/task/ledger/handoff/spec。
- 创建或更新项目记忆时，自动加载 `writing.md`：先呈现有用的状态或结果，写清具体下一步，完整契约与证据保持可查。
- `tasks.md` 只是执行计划，不拥有“完成”判定权。只要 acceptance 与新鲜证据已经满足，未勾选的旧计划不能覆盖这个事实；实现路径变化时应重写或删除过时任务。
- 知识维护属于 Keelson 内部职责。RECONCILE 时自动重写、拆分、去重超压的长期文档，大 spec 由 `land` 自动分片；除非涉及产品语义决策，否则绝不要求用户维护 Keelson。
- 始终区分**代码现实、已确认真相、计划变更**；未决问题只阻塞依赖它的切片。
- 宣称完成必须有当前工作树上的新鲜 `keelson check --record` 证据；不得为了通过检查而削弱验收。
- change 一旦成为 `ready`，就应自动 land，不等待用户说特殊结束语；若仍缺所有者决策，只停在那个决策上。
- `handoff.md` 只用于真正跨人/跨机器或明确所有权转移；普通跨会话接续由长期 change 工件 + Git 私有目录中的会话状态 完成。
- 重复失败提升为最窄的长期控制：spec → 作用域 rule → 可执行 fitness check；随后删除冗余 prose。
- 只使用 `light | standard | deep`，绝不持久化带日期模型 ID。

- 行为变更声称完成前，按 `verify.md` 真正调用新代理或新 CLI 会话进行评审（不得自行填写独立报告），并用 `keelson review` 记录逐项验收和合并后规范的证据；quick 档也适用。纯文字、格式类 quick 工作仍保持轻量。

用户通常只需要 `init`、`status`、`doctor`、`update`、`uninstall`；其余由 Agent 使用。

用 `keelson guide <name>` 按需读取下表引用（省略 `.md`）。首次执行配置检查先审阅命令，再用 `--trust` 明确信任；已有用户授权不重复确认。
