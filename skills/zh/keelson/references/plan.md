# Planning（规划）

创建 change 目录及其工件。`keelson new <name> --tier quick|spec` 会从 `templates/` 生成骨架，由你填写。

## change.md
<!-- keelson: id=plan.change-md | without: 变更的理由和被否决的备选只存在于聊天里，随即丢失 | sunset: never -->

各节按顺序如下。quick 变更只需要 **Why** 和 **What**。

- **Why**：用 1 到 3 句话说明问题或机会。脱离方案也应能独立成立。
- **What**：变更的要点列表。破坏性变更标注 **BREAKING**。
- **How**：技术方案，写评审者想知道的部分。不是任务清单。
- **Alternatives**：至少两个真实选项。每个被否决的选项，先写它最强的论据，再写它为何落选。只列缺点的否决是稻草人。
- **Impact**：受影响的代码、接口、数据、其他团队。
- **Decisions**：每条持久决策一行，现在时，以能力名作前缀：`- orders: 偏移分页而非游标；游标被否决，因为表格需要跳页`。change 落地时这些行会折叠进 `specs/<capability>/spec.md`。只写一年后仍应被看到的内容。

## Delta specs（spec 层级）
<!-- keelson: id=plan.delta | without: 没人愿意重写整份 spec，行为契约于是与代码渐行渐远 | sunset: never -->

每个受影响的能力一个文件，放在 `changes/<name>/specs/<capability>/spec.md`，能力路径与 `.keelson/specs/` 保持一致。只写差异：

```markdown
## ADDED Requirements
### Requirement: Page size limit
The API SHALL reject `size` above 200 with HTTP 400.
#### Scenario: Oversized page
- WHEN a client requests `size=500`
- THEN the response is 400 with code `size_too_large`

## MODIFIED Requirements
### Requirement: Order listing
（该需求的完整替换文本）

## REMOVED Requirements
### Requirement: Legacy CSV export
```

spec 是行为契约：可观察的行为、输入、输出、错误条件、外部约束。如果实现可以改变而客户端看到的不变，那它就不属于 spec。发明近似重复的能力名之前，先看 `keelson context` 输出里已有的能力名。

## tasks.md
<!-- keelson: id=plan.tasks | without: 工作凭记忆执行；进度和 effort 路由在跨会话时不可见 | sunset: never -->

每个任务一个复选框。每个任务带 effort 层级，并尽可能带验证命令：

```markdown
- [ ] 1. Add `page`/`size` parsing to `GET /orders` (effort: light) — verify: `npm test -- orders.params`
- [ ] 2. Implement paged query in `OrderRepo` (effort: standard) — verify: `npm test -- orders.repo`
- [ ] 3. Decide ack semantics for retries and update `specs/messaging` (effort: deep)
```

合理切分：一个任务是评审者可以单独否决的最小单元。把准备和脚手架并入需要它们的任务。在评审者可能接受一半、否决另一半的地方切开。

### Effort 层级
<!-- keelson: id=plan.effort | without: 要么每个任务都跑在最贵的模型上，要么最便宜的模型在做设计决策 | sunset: 当 retro 显示 light 层在 100 次分派中一次通过率超过 90% 时，放宽 light 的判定标准 -->

- **light**：机械、边界清楚、验证就是一条命令：照既有模式写、配置、重命名、跑测试并汇报、格式化。
- **standard**：需要上下文但路径清楚：大多数功能代码、普通 bug 修复、逐任务评审。
- **deep**：歧义、跨层影响、设计取舍、安全、根因未知：起草 change.md 和 delta specs、架构裁定、疑难调试、最终的陌生读者评审。

`config.yaml` 的 `effort.*` 给出底线：评审者永远不低于 `standard`；规划、最终验证和任何裁定永远不低于 `deep`。评审者的层级永远不低于它所评审的实施者。

## ledger.md

以一行标题开头。其余内容在 build 和 verify 阶段追加（见对应参考）。条目是 `###` 标题：`Ruling:`、`Root cause:`、`Verify:`、`Dispatch:`、`Escalate:`、`Note:`。
