[English](../concepts.md)

# 概念

Keelson 是一小组文件、一个薄 CLI 和一个技能。本页讲它们背后的模型：什么是变更，它经过哪些状态，什么算证据，以及 Keelson 刻意不是什么。

## 设计定律

Keelson 吸收多个成熟工程领域里的失效控制思想，但把它们落到现有文件与 CLI 不变量上，而不是再创造一套流程仪式。

| 定律 | 为什么重要 | Keelson 中的落点 |
|---|---|---|
| **目标状态优先于操作历史** | 配置系统把“现在应该是什么”写清楚，比从历次安装动作猜现状更容易恢复 | `config.yaml` + `.managed.json`；`update` 对齐并清理过期生成表面 |
| **幂等、可恢复的状态转换** | 中断后的重试应当收敛，而不是把安装弄得更坏 | 可重复的 `init/update`；新目录完整后才替换上一份可用副本 |
| **识别优先于记忆** | 当前状态在使用点直接可见时，人和 Agent 更少漏上下文 | `README.md` 地图、`NOW.md`、按路径 rules、一次只路由一个 reference |
| **显式状态机优先于模糊形容词** | 一个“完成”会掩盖彼此独立的失败维度 | work / verification / release 三维状态与明确 land gate |
| **可观测性必须带修复方向** | 只说“有问题”的健康检查会把诊断成本推给用户 | `doctor` 指出漂移/健康问题对应的表面与修复动作（`update`、压缩、重验） |
| **证据必须绑定版本** | 可复现性要求知道某个结论究竟针对哪份工件 | `Verify:` 把命令、退出码绑定到工作树指纹；代码变化后证据自动 stale |
| **交接是易丢信息的接口** | 人因失效经常发生在换人、换班、换会话处 | `handoff.md`、`NOW.md`、owner/branch、唯一具体下一步；易失细节留在本机 |
| **渐进披露优先于万能清单** | 指令越多，注意力与遵从度最终越差 | 极薄发现 shim → 紧凑 workflow → 一个任务 reference → 路径作用域 rules |

这些原则首先约束 Harness 自身。理想结果通常是 Keelson 变得更薄：一个原则一旦被机械化执行，就删掉重复提示词。

## 目标、里程碑、变更、切片

长期项目上的工作有四个层次。只有后两个是 Keelson 创建的文件。

| 层次 | 在哪里 | 回答什么 |
|---|---|---|
| 项目目标 | `.keelson/INTENT.md` | 为谁做、永远不做什么、代理可以自行决定什么 |
| 当前里程碑 | `.keelson/ROADMAP.md → Now`，或 issue 跟踪器 | 这一阶段交付什么、什么先放着 |
| 变更 | `.keelson/changes/<name>/` | 改变什么行为、为什么、别人怎么知道它完成了 |
| 切片 | `tasks.md` 里的 `## Slice:` 标题 | 所有者可以单独验收的最小部分 |

近期工作是具体的。之后的工作是 `ROADMAP.md → Next` 下的方向和依赖，不是编造出步骤的任务。项目已有跟踪器时，跟踪器仍是"要做什么、按什么顺序"的权威；`config.yaml → refs.tasks` 指向它，`change.md` 链接对应的 issue。

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

## 发现、建模、工程、收敛

技能里的四个 reference 承载了文件布局本身无法承载的工程判断。它们都不是阶段；各自在情境需要时被阅读。

| Reference | 何时阅读 | 承载什么 |
|---|---|---|
| `discover.md` | 所有者不确定自己想要什么，或者正在学习 | 先场景后技术：在任何存储或框架问题之前，先问哪种用法是核心。哪些未知该问：代码能回答的自己读，已有约定的照做，可逆的自己决定，纯技术的给默认值，只问会改变产品的，破坏数据或触及生产的必须确认。范围守卫：点明被捆绑的多个领域并提出顺序。承诺前先探索：当一个便宜的实验胜过抽象决策时，用 spike、原型、mock 或 benchmark |
| `model.md` | 用词或边界开始漂移 | `.keelson/GLOSSARY.md` 里一个术语一个含义；一个术语在系统的两个部分表示两件事，标志着一条边界，两部分通过显式翻译对话。每个能力的不变量。接口隐藏会变的东西，而不是镜像实现。选定前先画两个设计草图，被否的那个连同它最强的理由一起记录 |
| `engineer.md` | 一个设计或可靠性问题 | 按交付、结构、演进、运行分组的工程视角；代理挑出会改变当前设计的一到四个，从不跑完整清单。命名的设计模式是对已经吻合的形状的共享词汇，从不是要求。质量目标是带范围的数字，写成带场景的需求，并在有命令能测量时变成 `fitness` 检查 |
| `reconcile.md` | 落地之后，以及 `keelson status` 显示无事进行时 | 每条新事实的去处：行为进 spec，理由进 `Decisions`，术语进术语表，职责变动进 rules，可检查的约束进 `check:`，缺陷进回归测试，剩余工作进跟踪器。当前真相重写，从不追加。预算与压缩动作：重写、拆分、删除、移动、自动化、归档 |

切片遵循同样的判断：`plan.md` 要求纵向切片，一个真实的用户动作贯穿它触及的每一层，薄但完整，然后才开始下一个动作。`keelson validate` 在切片以层命名时发出警告。

### 引导模式

`config.yaml → guide: true`（由 `keelson init --guide` 设置）表示所有者正在通过构建来学习工程。工件、门禁和状态完全相同。变化的是对话：选择以场景呈现，配推荐、原因、备选和取舍，用所有者的语言；工程术语在决定之后出现，作为刚刚选定之物的名字；应用一条规则时用一句话解释它；spec 变更收尾时附一段简短的教学说明（关键决策、为什么、它是哪个概念的实例、何时该重新审视），留在对话里，从不进项目文件。

## 知识健康

项目资料随项目增长；每次任务读取的内容不能随全部历史一起增长。`config.yaml → budgets` 给每种文档一个行数预算，`keelson doctor` 报告超预算的文档、读起来像历史的需求文字、跨能力重复的需求名、闲置两周及以上的变更、超过 25 个任务的变更、超预算的常驻 rules，以及比源码树旧的生成文档。每条发现都是一个可以单独落地的小修复建议。没有任何东西被自动重写。

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

单一的"完成"无法表达"已实现、测试全绿、等待评审、未合并"或"已合并、迁移未执行"。Keelson 为每个变更报告三个维度。

### work

`clarifying`、`in-progress`、`blocked`、`in-review`、`integrated`、`cancelled`。

`change.md` frontmatter 里显式的 `status:` 优先。否则：没有任务是 `clarifying`；有未勾选的任务是 `in-progress`；所有任务勾选且 `Verify:` 通过是 `in-review`。`keelson new` 给 spec 变更写 `clarifying`，给 quick 变更写 `in-progress`。`keelson land --keep` 写 `integrated`；`keelson cancel` 写 `cancelled`。代理因未决问题停下时手动设为 `blocked`。

### verification

`not-run`、`passed`、`failed`、`partial`、`stale`。

由 `ledger.md` 里最后一条 `Verify:` 推导。没有条目是 `not-run`。没有退出码的条目是 `partial`。非零退出是 `failed`。退出码为 0 且记录的 `tree` 与当前工作树指纹一致是 `passed`；不一致是 `stale`。见[验证](verification.md)。

### release

除非 frontmatter 里的 `release:` 另有说明，否则为 `unreleased`。项目层面，`keelson status` 读取最后一个 git tag，列出其后折叠的变更。带 `## Rollout` 段的变更在其步骤执行完之前不算完成。

## 记录有效性与内容有效性

证据以两种互相独立的方式失效。

**记录有效性**问的是检查是否真的跑了、跑在这份代码上、完整跑完。`keelson check --record` 机械地回答它：运行配置的命令，把输出保存到 `.keelson/.local/evidence/`，写一条 `Verify:`，写明每条命令、退出码和工作树指纹。此后对代码的任何编辑都让这条记录过期。

**内容有效性**问的是跑过的东西是否覆盖了被要求的东西。没有工具能回答它；代理对照 `change.md → Acceptance` 和原始请求来回答。每个验收项写明如何检查（`test:`、`check:`、`manual:`、`review:`），只在那项检查跑过之后才勾选。spec 变更上的陌生读者评审捕捉作者的盲点。为了通过而改动的测试是对验收标准的改动，需要所有者决定。

## 提交的与本地的

| 信息 | 位置 | 进 git |
|---|---|---|
| 项目事实、specs、rules、路线图、术语表、当前状态 | `.keelson/` | 是 |
| 变更工件，包括 `handoff.md` 和 `ledger.md` | `.keelson/changes/<name>/` | 是，直到变更折叠；之后在历史里 |
| 检查输出、本机状态 | `.keelson/.local/` | 否 |
| 模型探测缓存、用户级层级覆盖、ablation 暂存 | `~/.keelson/` | 否 |

另一台机器上的同事接续工作所需的一切都提交。

## Keelson 不是什么

- 不是项目经理。它不排优先级、不估算、不分配；跟踪器做这些。
- 不是代理运行时。没有守护进程、没有数据库、没有自己的模型调用。语义工作由宿主代理完成。
- 不是正确性证明。它让缺失的证据可见并拒绝无证据的落地；它不能把错误的测试变对。
- 不是锁。磁盘上的文件和分支不协调多台机器；pull request 和 CI 才协调。
- 不是生产工具。它提醒发布步骤，从不执行它们。
