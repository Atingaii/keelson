# Planning（规划）

`keelson new <name> --tier quick|spec [--capability a,b] [--touches globs] [--depends other]` 搭好 change 目录，并记录负责人、分支和每个 delta spec 的基线。工件由你填写。计划的存在，是为了让工作跨过会话边界、让评审者能单独否决一个切片；它不是脚本。

## 一个变更处在哪里
<!-- keelson: id=plan.hierarchy | without: 要么每个任务都从零重新规划，要么写出一份三个月的逐文件计划，到第二周就错了 | sunset: never -->

项目目标（`INTENT.md`）→ 当前里程碑（`ROADMAP.md → Now`，或任务系统）→ 边界清楚的变更（`changes/<name>`）→ 可独立验收的切片（`tasks.md`）。只有后两者是 Keelson 创建的文件。近期工作写具体；后面的工作只写方向和依赖，放在 `ROADMAP.md → Next`。不要把还没探索的问题编成带虚构步骤的任务。

如果项目有任务系统（`config.yaml → refs.tasks`），它仍是"要做什么、按什么顺序"的权威。`change.md` 链接对应 issue，只保存任务系统没有的东西：决策、验收映射和接续状态。

## change.md
<!-- keelson: id=plan.change-md | without: 变更的理由和被否决的备选只存在于聊天里，然后丢失 | sunset: never -->

各段按顺序如下。quick 变更只需要 **Why**、**What** 和 **Acceptance**。

- **Why** — 用 1 到 3 句话写问题或机会。去掉方案也应能独立成立。
- **What** — 变更的要点列表。以 **BREAKING** 开头的条目标记破坏性变更；它需要一个 **Rollout** 段（兼容窗口、迁移、回滚），`keelson land` 会检查。
- **How** — 技术方案，写评审者想知道的部分。不是任务清单。
- **Alternatives** — 至少两个真实选项。每个被否决的选项先写它最强的论据，再写它为什么输。只列弱点的否决是稻草人。
- **Impact** — 你靠阅读发现的，而不是 diff 的文件列表。见 `context.md`。
- **Acceptance** — 每条验收标准一个复选框，各自写明怎么检查：`— test: name`、`— check: \`cmd\``、`— manual: how` 或 `— review: what`。这是从请求到证据的映射；任何一项未勾选，`keelson land` 都拒绝。
- **Open questions** — `- question — blocks: <slice>`。还有未决问题时落地会被拒绝；什么都不阻塞的问题是备注，不是未决问题。
- **Rollout** — 仅用于破坏性变更、迁移或生产步骤。
- **Decisions** — `- capability: decision; rejected option and why`，现在时。工作假设写成 `- (assumed) capability: …`。落地时折叠进该能力的 spec。

## Delta specs（spec 档）
<!-- keelson: id=plan.delta | without: 没人重写整份 spec，行为契约就渐渐偏离代码 | sunset: never -->

每个受影响的能力一个文件，位于 `changes/<name>/specs/<capability>/spec.md`，能力路径与主 specs 相同。`keelson new --capability` 创建它时带 `base:` 戳；如果主 spec 在你写的过程中变了，落地时会要求你先重读再传 `--accept-drift`。只写差量：

```markdown
## ADDED Requirements
### Requirement: Page size limit
The API SHALL reject `size` above 200 with HTTP 400.
#### Scenario: Oversized page
- WHEN a client requests `size=500`
- THEN the response is 400 with code `size_too_large`

## MODIFIED Requirements
### Requirement: Order listing
(full replacement text of the requirement)

## REMOVED Requirements
### Requirement: Legacy CSV export
```

spec 是行为契约：可观察的行为、输入、输出、错误条件、外部约束。如果实现可以改而客户端看到的不变，它就不属于这里。架构约束（谁可以依赖谁、哪一层拥有某个决定）放在 `rules/`；项目有 `refs.decisions` 时，长期决策记录放在那里；链接过去，不要复述。

## tasks.md 与切片
<!-- keelson: id=plan.tasks | without: 工作凭记忆执行；进度、切片和 effort 路由在会话之间不可见 | sunset: never -->

把任务分组放在 `## Slice: <name>` 下，配一行 `Delivers:` 说明切片完成后别人能观察到什么。quick 变更通常只有一个切片，可以省略标题。每个任务带一个 effort 层级，尽可能带一条验证命令：

```markdown
## Slice: Create and access
Delivers: a link can be created and opens the shared item
- [ ] 1. Add `POST /shares` (effort: standard) — verify: `npm test -- shares.create`
- [ ] 2. Render the share page (effort: light) — verify: `npm test -- shares.page`

## Slice: Revoke and expiry
Delivers: every access path refuses a revoked or expired link
- [ ] 3. Decide expiry semantics and update `specs/sharing` (effort: deep)
```

粒度：任务是评审者可以单独否决的最小单位。评审者可能接受一半、否决另一半时就拆开。切片是负责人可以单独验收的最小单位。

### Effort 层级
<!-- keelson: id=plan.effort | without: 每个任务都跑在最贵的模型上，或者最便宜的模型在做设计决策 | sunset: 当 retro 显示 light 层级在 100 次分派中一次通过率超过 90% 时，放宽 light 的标准 -->

- **light** — 机械、边界清楚、验证就是一条命令：照既有模式做、改配置、重命名、跑测试并汇报、格式化。
- **standard** — 需要上下文但路径清楚：大多数功能代码、普通 bug 修复、逐任务评审。
- **deep** — 歧义、跨层影响、设计取舍、安全、根因不明：起草 change.md 和 delta specs、架构裁定、疑难调试、最后的陌生读者评审。

`config.yaml → effort` 的下限：评审者不低于 `standard`；规划、最终验证和任何裁定不低于 `deep`。评审者的层级永远不低于它评审的实施者。

## 需求中途变化时
<!-- keelson: id=plan.requirement-change | without: 聊天里的一句"好的"是唯一记录；计划、验收和决策仍然描述旧需求 | sunset: never -->

负责人改主意的同一轮里，更新 `change.md`（What、Acceptance、Decisions）、delta spec 和受影响的切片。如果它已经变成另一个变更，用 `keelson cancel` 带理由取消旧的，重新开始。

## ledger.md

以一行标题开头。其余内容在构建和验证过程中追加。条目是 `###` 标题：`Ruling:`、`Root cause:`、`Verify:`、`Dispatch:`、`Escalate:`、`Note:`。`keelson check --record` 会替你写 `Verify:` 条目，并附上让过期可被检测的工作树指纹。
