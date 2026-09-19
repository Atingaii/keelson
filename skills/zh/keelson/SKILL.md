---
name: keelson
description: 面向带有 .keelson/ 目录的仓库的工程协作层。凡是用户要求在此类项目中构建、新增、修改、重构、修复、调试、规划、继续、交接、收尾、评审或发布工作时使用；用户说 "grill me"、"status"、"hand off"、"land it"、"retro"，或说"盘问我"、"进度"、"交接"、"收尾"、"复盘"时同样使用。它把 specs 当作唯一真相、按路径路由 rules、记录决策与未决问题、分别跟踪工作、验证和发布三种状态，并按 effort 层级分派子代理。
---

# Keelson

Keelson 垫在你正常工作方式之下，服务的是要活很多年的项目。仓库把长期事实保存在 `.keelson/`：`INTENT.md`（为什么存在、边界、你可以独自决定什么）、`ROADMAP.md`（当前里程碑）、`NOW.md`（当前在做什么）、`GLOSSARY.md`（一个术语一个含义）、specs（系统今天的行为，路径在 `config.yaml` 里）、`rules/`（按路径路由的约定）、`changes/`（进行中的工作，空闲时为空）。项目已有的文档通过 `config.yaml → refs` 引用，绝不复制。工作怎么做由你自己判断；Keelson 只保证你需要的事实摆在面前、你产出的事实被写下来，并且没有与代码相符的证据就不会宣布完成。

这里没有针对你的门禁。门禁作用在工件上：`keelson land` 会拒绝过期的证据、未勾选的验收、未决问题和未确认的假设。每条准则都说明它为什么存在，好让你判断它何时不适用。用户指令和项目自身的说明文件永远优先。

## 非平凡工作开始前

`keelson context --paths <你预计会改的文件>` 打印 INTENT、ROADMAP、NOW、活动中的变更、既有引用资料和命中的 rules。改共享模块之前，`keelson impact <files>` 列出导入方和可能受影响的 specs；把它当导航，然后靠阅读找出它看不见的调用方。

## 先定大小，再选参考

| 大小 | 信号 | 做法 | 阅读 |
|---|---|---|---|
| trivial | 样式、错字、单文件显式修复、行为不变 | 直接做；不建 change 目录 | 不读 |
| quick | 涉及多个文件、意图清楚、行为契约不变 | 用 3 到 6 行写回你的理解，`keelson new`，继续 | `references/shape.md` |
| spec | 行为契约变化、新增或删除能力、放弃显而易见的方案、迁移、任何负责人想在写代码前先审阅的事 | 澄清到下一个切片可交付为止，起草含验收和 delta specs 的 `change.md`，等待批准 | `references/shape.md`、`references/plan.md` |

大小由你判断；用户可以用"按 spec 处理"或"直接做"覆盖。没有人能回答时（脚本化运行），在标为 `(assumed)` 的假设下构建，落地前停下。当 `config.yaml → guide` 为 true 时，负责人正在学习：用场景和取舍来解释，在决定之后再说出对应的工程思想，并在 spec 变更收尾时附一段简短的教学说明。

## 你现在需要什么？

- **负责人还不确定想要什么，或正在学习** → `references/discover.md`（先谈场景再谈技术、哪些未知该提出来、范围守卫、先探索再承诺、引导模式）
- **弄清要做什么** → `references/shape.md`（先查事实、写回、决策状态、授权、访谈、无人值守运行）
- **词汇或边界在漂移** → `references/model.md`（术语表、bounded context、不变量、深模块、设计两次）
- **知道代码会牵动什么** → `references/context.md`（三层上下文、影响分析、预算）
- **规划变更** → `references/plan.md`（change.md、切片、验收、delta specs、effort 层级、既有任务系统）
- **设计或可靠性问题** → `references/engineer.md`（工程透镜：交付、结构、演进、运行、质量目标）
- **构建** → `references/build.md`（裁定、按层级分派子代理、并行工作、保持工件真实）
- **证明它能用** → `references/verify.md`（记录有效性、内容有效性、`keelson check --record`、评审）
- **停下或继续** → `references/handoff.md`（交接字段、安全恢复、NOW.md）
- **集成与发布** → `references/land.md`（落地门禁、spec 冲突、rollout、沉淀经验、技术债）
- **把新事实写回去，让项目保持小** → `references/reconcile.md`（每个事实去哪里、重写不追加、预算与压缩、`keelson doctor`）
- **有东西坏了** → `references/debug.md`（复现、根因、分类）
- **"retro"** → 运行 `keelson retro` 并按建议行动

## 你会用到的 CLI

`keelson context --paths <files>` · `keelson impact <files>` · `keelson new <name> --tier quick|spec [--capability cap] [--touches globs] [--depends change]` · `keelson status` · `keelson check --record "<claim>"` · `keelson validate` · `keelson handoff <name>` · `keelson land <name> [--now "<text>"] [--confirm-assumptions] [--accept-drift]` · `keelson cancel <name>` · `keelson models --resolve <tier>`。每条命令都接受 `--json`；`keelson <command> --help` 打印该命令的参数。

## 基本规则（以及它们为什么存在）

- **先查事实，再提问。** 提问之前先读代码、`.keelson/` 和被引用的文档。specs 或 INTENT 里已经记录的决策不再问第二次。
- **三件事不是一回事：代码在做什么、什么已被确认、什么在计划中。** 三者不一致时，报告差距；绝不改 spec 去迁就缺陷。
- **先有证据，再下结论。** "完成"、"通过"、"修好了"要跟在本会话的 `keelson check --record` 之后。最后一次改代码之前的证据已经过期，`land` 会指出来。
- **未决问题只阻塞依赖它的部分。** 它不牵涉的切片继续建。
- **仓库里不出现带日期的模型 ID。** effort 层级是 `light | standard | deep`；由宿主在运行时解析。
