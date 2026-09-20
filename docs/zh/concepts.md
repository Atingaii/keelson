[English](../concepts.md)

# 概念

Keelson 是一小组文件、一个薄 CLI 和一个技能。本页讲它们背后的模型：什么是变更，它经过哪些状态，什么算证据，以及 Keelson 刻意不是什么。

## 设计定律

Keelson 吸收多个成熟工程领域里的失效控制思想，但把它们落到现有文件与 CLI 不变量上，而不是再创造一套流程仪式。

| 定律 | 为什么重要 | Keelson 中的落点 |
|---|---|---|
| **目标状态优先于操作历史** | 配置系统把“现在应该是什么”写清楚，比从历次安装动作猜现状更容易恢复 | `config.yaml` + `manifest.json`；`update` 对齐并清理过期生成表面 |
| **幂等、可恢复的状态转换** | 中断后的重试应当收敛，而不是把安装弄得更坏 | 可重复的 `init/update`；新目录完整后才替换上一份可用副本 |
| **识别优先于记忆** | 当前状态在使用点直接可见时，人和 Agent 更少漏上下文 | `README.md` 地图、`NOW.md`、按路径 rules、一次只路由一个 reference |
| **显式状态机优先于模糊形容词** | 一个“完成”会掩盖彼此独立的失败维度 | work / verification / release 三维状态与明确 land gate |
| **可观测性必须带修复方向** | 只说“有问题”的健康检查会把诊断成本推给用户 | `doctor` 指出漂移/健康问题对应的表面与修复动作（`update`、压缩、重验） |
| **证据必须绑定版本** | 可复现性要求知道某个结论究竟针对哪份工件 | `Verify:` 把命令、退出码绑定到工作树指纹；代码变化后证据自动 stale |
| **连接状态不是工作状态** | 窗口/session 丢失不能破坏长期生命周期 | `.runtime/sessions/` 只保存 focus；`changes/` 拥有 work state；`handoff.md` 只用于真实交接 |
| **渐进披露优先于万能清单** | 指令越多，注意力与遵从度最终越差 | 极薄发现 shim → 紧凑 workflow → 一个任务 reference → 路径作用域 rules |
| **黄金路径 + 逃生口** | 常见场景应几乎不要求用户学习产品术语，非常见场景仍必须可配置 | 用户正常对话；五类对话意图负责路由；完成状态自动推导 |

这些原则首先约束 Harness 自身。理想结果通常是 Keelson 变得更薄：一个原则一旦被机械化执行，就删掉重复提示词。

## Session、Work Item 与项目真相

这三种生命周期绝不能混在一起。

| 状态 | 位置 | 生命周期 | 含义 |
|---|---|---|---|
| 对话/session focus | `.keelson/.runtime/sessions/<key>.json` | 分钟～小时，本机 | 当前 AI 窗口正在围绕哪个 active change |
| Change/work item | `.keelson/changes/<name>/` | 分钟～数天/数周，提交 Git | 长期需求目标、验收与证据状态 |
| 项目真相 | `INTENT.md`、specs、rules、glossary | 数月～数年，提交 Git | 未来工作应视作当前事实的内容 |
| 历史 | Git | 长期 | 时间线和已经折叠的临时工件 |

关闭 session 不会完成 change；切换 focus 不会取消之前的 change；change land 后才会清除所有指向它的本地 session pointer。

`handoff.md` 不是普通 session pointer，而是真正换人/换机器时的显式 transfer artifact。

## 目标、里程碑、变更、切片

长期项目上的工作有四个概念层次。Keelson 不会为每个层次预先造一个文档；只有该层次出现值得长期保存的信息时，对应工件才出现。

| 层次 | 在哪里 | 回答什么 |
|---|---|---|
| 项目目标 | `.keelson/INTENT.md` | 为谁做、永远不做什么、代理可以自行决定什么 |
| 当前里程碑 | `.keelson/ROADMAP.md → Now`，或 issue 跟踪器 | 这一阶段交付什么、什么先放着 |
| 变更 | `.keelson/changes/<name>/` | 改变什么行为、为什么、别人怎么知道它完成了 |
| 切片 | `tasks.md` 里的 `## Slice:` 标题 | 所有者可以单独验收的最小部分 |

近期工作是具体的。`ROADMAP.md` 是可选的：只有 tracker 没有清楚表达里程碑/方向、而仓库又需要保存它时才创建。之后的工作写方向和依赖，不写编造出来的任务步骤。项目已有跟踪器时，跟踪器仍是"要做什么、按什么顺序"的权威；`config.yaml → refs.tasks` 指向它，`change.md` 链接对应的 issue。

## 七类能力

Keelson 保留长期项目需要的能力，把它们分布在文件里，而不是让用户驱动的阶段里。

| 能力 | 在哪里 |
|---|---|
| 需求、澄清、决策 | `references/shape.md`；`change.md` 的 Decisions 和 Open questions；`INTENT.md` 的 Authorizations |
| 领域模型、行为契约、架构边界 | specs（`Requirement:` 和 `Scenario:`），架构约束放 `rules/`，长期决策记录放 `refs.decisions` |
| 滚动规划与变更管理 | `ROADMAP.md`、`change.md`、带切片的 `tasks.md`、`keelson new`、`cancel` |
| 分层上下文与影响分析 | `references/context.md`、`keelson context`、`keelson impact`、rules 路由 |
| 接续与并行 | `NOW.md`、`handoff.md`、hook、每个变更的 owner 和分支、`--worktree`、共享契约警告 |
| 反馈、调试、评审、验收 | `references/verify.md` 和 `debug.md`、`keelson check --record`、验收映射、陌生读者评审 |
| 集成、发布、长期维护 | `keelson land` 门禁、spec 合并、漂移检查、来自 tag 的发布状态、经验提升、`retro` |

这些是内部能力区域，不是七个步骤。一个 trivial 变更在表面上一项都不碰。

## 发现、建模、工程、风险、收敛

这些核心 reference 承载文件布局本身无法承载的工程判断。它们都不是阶段；各自在情境需要时被阅读。

| Reference | 何时阅读 | 承载什么 |
|---|---|---|
| `discover.md` | 所有者不确定自己想要什么，或者正在学习 | 先场景后技术：在任何存储或框架问题之前，先问哪种用法是核心。哪些未知该问：代码能回答的自己读，已有约定的照做，可逆的自己决定，纯技术的给默认值，只问会改变产品的，破坏数据或触及生产的必须确认。范围守卫：点明被捆绑的多个领域并提出顺序。承诺前先探索：当一个便宜的实验胜过抽象决策时，用 spike、原型、mock 或 benchmark |
| `model.md` | 用词或边界开始漂移 | `.keelson/GLOSSARY.md` 里一个术语一个含义；一个术语在系统的两个部分表示两件事，标志着一条边界，两部分通过显式翻译对话。每个能力的不变量。接口隐藏会变的东西，而不是镜像实现。选定前先画两个设计草图，被否的那个连同它最强的理由一起记录 |
| `engineer.md` | 非显然技术选择、架构分叉或“X 会更快/更稳”的主张 | 第一性还原（事实/结果/约束/不变量/假设/机制）→ 可证伪 hypothesis → 最小实验/消融 → 必要时才升级为架构决定。架构由 quality-attribute scenario 驱动，真实 fork 才 Design It Twice；消融考虑交互效应；legacy change 走 characterize → seam → 小步 refactor → change。长期性质能度量时变成 `fitness` 检查 |
| `design-lenses.md` | 当前变更触发数据、安全、并发、兼容、运维、性能、UI 或 AI 风险 | 只指出**哪类风险值得检查**，不是第二套方法论；具体怎么调查、实验和做架构选择仍走 `engineer.md` |
| `reconcile.md` | 落地之后，以及 `keelson status` 显示无事进行时 | 每条新事实的去处：行为进 spec，理由进 `Decisions`，术语进术语表，职责变动进 rules，可检查的约束进 `check:`，缺陷进回归测试，剩余工作进跟踪器。当前真相重写，从不追加。预算与压缩动作：重写、拆分、删除、移动、自动化、归档 |

切片遵循同样的判断：`plan.md` 要求纵向切片，一个真实的用户动作贯穿它触及的每一层，薄但完整，然后才开始下一个动作。`keelson validate` 在切片以层命名时发出警告。

### 引导模式

`config.yaml → guide: true`（由 `keelson init --guide` 设置）表示所有者正在通过构建来学习工程。工件、门禁和状态完全相同。变化的是对话：选择以场景呈现，配推荐、原因、备选和取舍，用所有者的语言；工程术语在决定之后出现，作为刚刚选定之物的名字；应用一条规则时用一句话解释它；spec 变更收尾时附一段简短的教学说明（关键决策、为什么、它是哪个概念的实例、何时该重新审视），留在对话里，从不进项目文件。

## 知识健康

项目知识可以随项目多年增长；当前任务的高频工作集不能跟全部历史一起增长。Keelson 把结构维护放在内部：大型 capability 契约自动拆成有界索引 + requirement/decision 文件，runtime 缓存自动回收，只加载相关 shard/rule。语义维护（去重、改成现在时、拆解过大的不变量）由 Agent 在 RECONCILE 中自动完成并重新验证。只有整理会改变产品语义、授权、兼容性或其他真正属于所有者的长期承诺时才询问用户。

## 决策状态

代理在对话和 `change.md` 里区分四种状态：

| 状态 | 含义 | 在哪里 |
|---|---|---|
| 建议 | 代理推荐的方案及其后果。尚未生效 | 对话 |
| 已确认 | 所有者选定的 | `## Decisions`，普通行 |
| 已授权 | `INTENT.md → Authorizations` 允许代理自行决定的 | `## Decisions`，普通行，由代理决定 |
| 未决 | 仍需要答案 | `## Open questions`，带 `— blocks: <slice>` |

第五个标记覆盖它们之间的空隙：`- (assumed) capability: …` 是无人能回答时代理据以推进的工作假设。所有者传入 `--confirm-assumptions` 之前，`keelson land` 拒绝把 assumed 行折叠进 specs。

未决问题只阻塞依赖它的切片。变更的其余部分继续推进。

## 三个状态维度

单一“完成”会把实现、证据、集成和发布混为一谈，因此 Keelson 分开报告。

### work

`clarifying`、`in-progress`、`blocked`、**`ready`**、`in-review`（兼容旧/人工状态）、`integrated`、`cancelled`。

关键状态 `ready` **由仓库状态推导，而不是用户宣布**。同时满足以下条件才 ready：

- 必需 acceptance 完成；
- 没有 blocking open questions；
- 没有仍处于 active 的依赖 change；
- 没有未对齐的 spec drift；
- 没有未确认 assumptions；
- breaking change 有 rollout；
- 当前 worktree 上最后一次 verification 通过。

`tasks.md` 只是可变执行计划；未勾选或被重写的 task 不拥有完成判定权。

结束一次 session 对 work state 没有任何影响。进入 ready 后，Agent 应在宣称完成前自动 land。显式的 `blocked`、`integrated`、`cancelled` 仍是长期覆盖状态。

### verification

`not-run`、`passed`、`failed`、`partial`、`stale`。

来自最后一条 `Verify:`。通过记录只属于它测量的 worktree fingerprint，之后修改代码就 stale。

### release

除非 frontmatter 另有说明，否则是 `unreleased`。项目发布状态从 Git tag 推导；land/integration 与生产 rollout 不是同一件事。

## 记录有效性与内容有效性

证据以两种互相独立的方式失效。

**记录有效性**问的是检查是否真的跑了、跑在这份代码上、完整跑完。`keelson check --record` 机械地回答它：运行配置的命令，把输出保存到 `.keelson/.runtime/evidence/`，写一条 `Verify:`，写明每条命令、退出码和工作树指纹。此后对代码的任何编辑都让这条记录过期。

**内容有效性**问的是跑过的东西是否覆盖了被要求的东西。没有工具能回答它；代理对照 `change.md → Acceptance` 和原始请求来回答。每个验收项写明如何检查（`test:`、`check:`、`manual:`、`review:`），只在那项检查跑过之后才勾选。spec 变更上的陌生读者评审捕捉作者的盲点。为了通过而改动的测试是对验收标准的改动，需要所有者决定。

## 提交的与本地的

| 信息 | 位置 | 进 git |
|---|---|---|
| 项目事实/specs/rules | `.keelson/` | 是 |
| 活动长期 work | `.keelson/changes/<name>/` | 是，折叠后留在 Git 历史 |
| 明确交接包 | `changes/<name>/handoff.md` | 是，只在真正交接时创建 |
| session focus + 检查输出 | `.keelson/.runtime/` | 否 |
| 用户模型缓存 / ablation 暂存 | `~/.keelson/` | 否 |

另一台机器通过 Git 获得长期 work state；普通本地聊天 focus 故意不共享。

## Keelson 不是什么

- 不是项目经理。它不排优先级、不估算、不分配；跟踪器做这些。
- 不是代理运行时。没有守护进程、没有数据库、没有自己的模型调用。语义工作由宿主代理完成。
- 不是正确性证明。它让缺失的证据可见并拒绝无证据的落地；它不能把错误的测试变对。
- 不是锁。磁盘上的文件和分支不协调多台机器；pull request 和 CI 才协调。
- 不是生产工具。它提醒发布步骤，从不执行它们。
