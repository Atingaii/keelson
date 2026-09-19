---
name: keelson
description: 面向带有 .keelson/ 目录的仓库的工程协作层。凡是用户要求在此类项目中构建、新增、修改、重构、修复、调试、规划、继续、交接、收尾、评审或发布工作时使用；用户说 "grill me"、"status"、"hand off"、"land it"、"retro"，或说"盘问我"、"进度"、"交接"、"收尾"、"复盘"时同样使用。它把 specs 当作当前行为真相、按路径路由 rules、记录决策与未决问题、分离工作/验证/发布状态，并把反复出现的错误逐步提升为更强的可执行检查。
---

# Keelson

Keelson 是项目的工程控制层。仓库把长期事实保存在 `.keelson/`：`INTENT.md`（为什么存在、边界、你可以独自决定什么）、`ROADMAP.md`（当前里程碑）、`NOW.md`（当前在做什么）、`GLOSSARY.md`（一个术语一个含义）、specs（系统今天的行为，路径在 `config.yaml` 中）、`rules/`（按路径作用的约定）、`changes/`（进行中的工作，空闲时为空）。项目已有文档通过 `config.yaml → refs` 引用，绝不复制。

Keelson 约束的是**状态转换，而不是实现方式**。怎么解决问题由你判断；但非平凡修改前不能跳过当前上下文，不能悄悄改变行为契约，不能拿过期证据宣布完成，也不能带着未关闭的验收直接落地。一个规则如果能被机器稳定检查，就优先把它做成可执行不变量，而不是再写一段提示词。用户指令和项目自身说明文件始终优先。

## 首次接触

如果 `NOW.md` 以 "First contact" 开头，说明还没有人起草过项目事实。阅读仓库（README、清单文件、目录布局、代码，以及 `config.yaml → refs` 指向的文档），起草 `INTENT.md`（为什么存在、边界、硬约束、一份初始的 Authorizations 段），已有代码的项目再为每个能力写一份 spec、为有约定的路径写 rules。然后用一次简短的交流请所有者确认或修正，保留他们的回答，重写 `NOW.md`。如果所有者一上来就提了需求，就在整理那个变更的过程中顺带完成，一起确认。永远不要让所有者手写这些文件。

## 执行主回路

每个非平凡变更都走 **ORIENT → BOUND → BUILD → SENSE → RECONCILE**。不要因为聊天记录里“好像已经有了”就跳过某一段。

- **ORIENT（定向）** — 先看工作树，再运行 `keelson context --paths <你预计会改的文件>`；改共享模块前运行 `keelson impact <files>`。直接读命中的 spec/rules，不依赖会话记忆。
- **BOUND（定界）** — 按下表判断变更大小，写回你的理解，显式标出假设，并在实现扩大之前把验收边界说清楚。
- **BUILD（构建）** — 一次只推进一个纵向切片；不要把无关清理塞进当前切片；决策变化时同步保持 change 工件真实。
- **SENSE（感知）** — 工作中尽早运行最便宜且相关的 test/lint/type/fitness 检查；任何完成性结论前都要用 `keelson check --record` 重新取得当前工作树上的证据。
- **RECONCILE（收敛）** — 把稳定事实写回 specs/rules/glossary/NOW；未完成就留下可恢复的 handoff；同一类失败反复出现时，把它提升为窄范围 rule 或可执行 check，而不是沉淀成聊天经验。

## 先定大小，再选参考

| 大小 | 信号 | 做法 | 阅读 |
|---|---|---|---|
| trivial | 样式、错字、单文件显式修复、行为不变 | 直接做；不建 change 目录 | 不读 |
| quick | 涉及多个文件、意图清楚、行为契约不变 | 用 3 到 6 行写回你的理解，`keelson new`，继续 | `references/shape.md` |
| spec | 行为契约变化、新增或删除能力、放弃显而易见的方案、迁移、任何负责人想在写代码前先审阅的事 | 澄清到下一个切片可交付为止，起草含验收和 delta specs 的 `change.md`，等待批准 | `references/shape.md`、`references/plan.md` |

大小由你判断；用户可以用"按 spec 处理"或"直接做"覆盖。没有人能回答时（脚本化运行），在标为 `(assumed)` 的假设下构建，落地前停下。当 `config.yaml → guide` 为 true 时，负责人正在学习：用场景和取舍来解释，在决定之后再说出对应的工程思想，并在 spec 变更收尾时附一段简短的教学说明。

## 你现在需要什么？

- **负责人还不确定想要什么，或正在学习** → `references/discover.md`
- **弄清要做什么** → `references/shape.md`
- **词汇或边界在漂移** → `references/model.md`
- **知道代码会牵动什么** → `references/context.md`
- **规划变更** → `references/plan.md`
- **设计或可靠性问题** → `references/engineer.md`
- **构建** → `references/build.md`
- **证明它能用** → `references/verify.md`
- **Harness 总在漏掉同一类问题** → `references/harness.md`（前馈/反馈控制、升级阶梯、机械不变量、sunset）
- **停下或继续** → `references/handoff.md`
- **集成与发布** → `references/land.md`
- **把新事实写回去，让项目保持小** → `references/reconcile.md`
- **有东西坏了** → `references/debug.md`
- **"retro"** → 运行 `keelson retro` 并按建议行动

## 你会用到的 CLI

`keelson context --paths <files>` · `keelson impact <files>` · `keelson new <name> --tier quick|spec [--capability cap] [--touches globs] [--depends change]` · `keelson status` · `keelson check --record "<claim>"` · `keelson validate` · `keelson handoff <name>` · `keelson land <name> [--now "<text>"] [--confirm-assumptions] [--accept-drift]` · `keelson cancel <name>` · `keelson models --resolve <tier>`。每条命令都接受 `--json`；`keelson <command> --help` 打印该命令的参数。

## 基本规则（以及它们为什么存在）

- **先查事实，再提问。** 提问之前先读代码、`.keelson/` 和被引用的文档。specs 或 INTENT 里已经记录的决策不再问第二次。
- **三件事不是一回事：代码在做什么、什么已被确认、什么在计划中。** 三者不一致时，报告差距；绝不改 spec 去迁就缺陷。
- **先有证据，再下结论。** "完成"、"通过"、"修好了"要跟在本会话的 `keelson check --record` 之后。最后一次改代码之前的证据已经过期，`land` 会指出来。
- **未决问题只阻塞依赖它的部分。** 它不牵涉的切片继续建。
- **仓库里不出现带日期的模型 ID。** effort 层级是 `light | standard | deep`；由宿主在运行时解析。
