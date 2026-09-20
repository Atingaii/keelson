# Shaping（成形）

在工件存在之前，把一个请求或想法变成共同的理解。先查事实，再提问，然后写回。有三层需要弄清，但不必一次全清：项目层（服务谁、永远不做什么，在 `INTENT.md`）、当前目标层（这个里程碑，在 `ROADMAP.md` 或任务系统里）、本次变更层（改变什么行为，别人怎样知道它做完了）。

## 先探索
<!-- keelson: id=shape.explore-first | without: 代理向用户询问它本可以自己读到的事实，浪费对方时间，还让对方学会跳过问题 | sunset: never -->

先读能回答问题的东西：代码、测试、`INTENT.md`、`ROADMAP.md`、specs、命中的 `rules/`，以及 `config.yaml` 里 `refs` 列出的文档。spec 的 `Decisions` 段或 `INTENT.md` 里已经记录的决策就是定论，不要再问。只有关于意图、优先级和取舍的问题才属于用户。

## 提问前先做假设审计
<!-- keelson: id=shape.assumption-audit | without: the agent solves a plausible but wrong problem, attributes invented beliefs to the owner, or asks a questionnaire before reading the repository | sunset: never -->

quick 工作存在实质性歧义时，以及每一个 spec 变更里，都要在读完仓库、开始实现之前做一次紧凑审计。不要展开私有思维链，只报告会影响决策的结果：

1. **已成立（Established）** — 用户或仓库确实说过的事实。
2. **方案所需假设（Required assumptions）** — 你准备采用的路径必须依赖、但还没人确认的条件。写成“这个方案要求 X 成立”，不要写成“你假设 X”。
3. **缺失信息（Missing）** — 无法从仓库查到的信息；按它能多大程度改变结果、边界、验收或难以撤销的选择来排序。
4. **假设错了会怎样（Failure if wrong）** — 指出这类工作最可能的一种失败模式，例如解决错问题、范围膨胀、兼容性破坏、没有测量就优化、不安全迁移，或当前任务真正相关的风险。

审计默认留在内部，只把短 write-back 真正需要的事实/假设写出来。没有关键缺口就按项目授权和默认值继续；存在由用户掌握且会改变结果的缺口时，按 `interview.md` 路由，只问一个最高价值问题，更新写回后重新判断。不要把审计清单展示给用户。

## 写回你的理解
<!-- keelson: id=shape.write-back | without: 代理按自己的解读去做；不一致要到代码写出来之后才暴露 | sunset: never -->

每个非平凡变更在创建任何东西之前，用 3 到 6 行写清：结果、边界（明确不做什么）、你发现的约束、成功的检验方式。把用户说的和你假设的分开。写回后默认继续；只有对应的 `confirm.quick|spec` 设为 `wait`，或仍存在真正属于所有者的未决决定时才等待。高风险动作仍按 `INTENT.md → Authorizations` 确认。

> 我的理解是：给 `/orders` 加偏移分页（`page`、`size`，默认 20），沿用 `rules/api.md` 里的统一响应封装；表格加分页器，不做无限滚动。假设：排序仍按 `created_at desc`。`npm test -- orders` 通过且分页器能渲染即为完成。

## 你所知道的东西有四种状态
<!-- keelson: id=shape.decision-states | without: 代理提出的建议后来被当成负责人的选择，而没人分得清 | sunset: never -->

在对话里和 `change.md` 里都把它们分开：

- **建议（Suggestion）** — 你推荐的方案及其后果。负责人选定之前不生效。
- **已确认（Confirmed）** — 负责人选定的。`## Decisions` 下的一行普通条目。
- **已授权（Authorized）** — `INTENT.md → Authorizations` 允许你独自决定的。决定、按已确认记录、继续。
- **未决（Open）** — 还需要答案的。`## Open questions` 下的一行，带 `— blocks: <slice>`。

必须在没有答案的情况下继续时，把工作假设写成 `## Decisions` 下的 `- (assumed) capability: …`。负责人没有传 `--confirm-assumptions` 之前，`keelson land` 拒绝折叠 assumed 行。

## 下一个切片可交付时就停止提问
<!-- keelson: id=shape.stop-rule | without: 代理要么用后面切片的问题把负责人问到筋疲力尽，要么在验收还没定义的切片上开工 | sunset: never -->

标准不是"项目里没有任何未知"，而是：下一个切片有清楚的结果、边界和验收检查。关于后面切片的未决问题写进 `## Open questions` 并注明它阻塞什么，它不阻塞的工作继续。例如：下载权限未定，链接管理列表可以先建，但公开下载不能被默认打开。

## 访谈（只有 decision frontier 真正需要时）
<!-- keelson: id=shape.interview | without: 架构歧义被 Agent 默默猜测，或者每个 spec change 都变成强制问卷 | sunset: never -->

交互方式统一按 `interview.md`。spec 级变更**不等于**必须向用户提问：先自行解决仓库拥有的事实和可逆工程选择。工作涉及数据、安全、并发、兼容、运维、性能、UI/可访问性或 AI 行为时，只检查 `design-lenses.md` 里真正触发的行，把结果转成决定或证据义务。

假设检查默认在内部完成。除非不确定性确实属于所有者，否则不要用抽象的“我们在假设什么？”开场；把它翻译成具体的用户行为或风险后果再问。明确要求“深挖这个方案”才沿相关决策树继续问到底；普通工作只要下一个安全切片准备好就停止。

## 授权
<!-- keelson: id=shape.authorization | without: 要么每一步都等批准，要么代理自己决定产品问题和生产操作 | sunset: never -->

| 情形 | 默认处理 |
|---|---|
| 已确认范围内、遵循项目约定的局部实现选择 | 决定、验证、继续 |
| 意图仍模糊；选择会改变体验、范围或长期承诺 | 给推荐和后果；由负责人选择 |
| 不可逆数据操作、生产修改、权限扩大、破坏兼容性 | 按 `INTENT.md → Authorizations` 明确确认 |
| 无关的优化、额外功能、大范围重构 | 提建议；不扩大变更 |
| 环境缺失、关键验收无法执行 | 标为受阻或部分验证；绝不伪造通过 |

模型越强，第一行越宽；第三行永远不变。

## 没有人能回答时
<!-- keelson: id=shape.unattended | without: 无人值守的会话要么永远卡在一个问题上，要么悄悄落地一个没人批准过的变更 | sunset: never -->

脚本化或无人值守的会话里，没有人能确认写回、批准计划。不要停滞，也不要跳过工件：写下理解和计划，把假设标为 `(assumed)`，在这些假设下构建和验证，落地前停下。在 `NOW.md` 里说明该变更等待审阅。审阅者随后可以同时看到计划和 diff，用 `--confirm-assumptions` 落地或拒绝。

## 探索（用户在思考，而非在提需求）
<!-- keelson: id=shape.explore-stance | without: 代理把方案强加给一个只想找人一起想的用户 | sunset: never -->

如果用户是在权衡选项而不是在下达任务，就采取思考伙伴的姿态：只读不写，铺开多个方向，勾勒取舍，给出有依据的推荐，让用户选。决策留在对话里；用户开口之前不建 change。

## 定大小的经验法则
<!-- keelson: id=shape.sizing | without: 代理在琐事上走仪式，或在契约变更上跳过规划 | sunset: 连续 50 个变更都不需要用户覆盖层级时 -->

- 负责人会想在代码存在之前先读一份计划吗？→ spec。
- specs 里有任何 `Requirement:` 变化、新增或消失吗？→ spec。
- 涉及迁移、外部依赖，或会跨会话的工作？→ spec。
- 你在为某个隐藏约束放弃显而易见的方案吗？→ spec，并记录备选。
- 否则，多个文件、意图清楚 → quick。单文件、行为不变 → trivial。
