# 集成与发布

切片都验证通过，变更就是已实现；进入目标分支且 specs 已折叠，就是已集成；某个打了 tag 的版本把它发出去，才是已发布。这是三种状态，Keelson 分别报告。

## `keelson land <name>`
<!-- keelson: id=land.command | without: delta specs 永远不合并，specs 不再描述当前系统，未验证或未批准的工作被宣布为已集成 | sunset: never -->

变更已集成时运行（已合并，或在单人仓库里已提交到主线）。以下任一条成立它都拒绝，并说明是哪一条：

- 验收项未勾选（任务复选框只是计划状态，不是 landing gate）；
- 还有未决问题；
- 验证是 not-run、failed、partial 或 stale（指纹与工作树不一致）；
- 存在 `(assumed)` 决策而没有传 `--confirm-assumptions` — 确认它们的是负责人，不是你；
- delta 写好之后主 spec 变了而没有传 `--accept-drift` — 重读、对齐，再传该参数；
- 有 **BREAKING** 却没有 **Rollout** 段。

然后它把每个 delta 合并进对应能力的 spec（ADDED 追加，MODIFIED 按名替换，REMOVED 删除），追加 `Decisions` 行，删除 change 目录（`land: fold`，默认）或归档它（`land: keep`）。`--dry-run` 预览全部动作。`--force` 只用于负责人的明确决定，不是为了省事。

把落地和最后一次代码改动一起提交，让 specs 和满足它们的代码处在同一个版本。ledger 和 handoff 留在 git 历史里；`keelson retro` 从那里读取。

## 代码和 specs 一起评审
<!-- keelson: id=land.same-pr | without: 文档在里程碑结束时才"补齐"，那时已经没人记得为什么 | sunset: never -->

改变行为的 pull request 带着 delta spec 和决策行。只看 diff 不看 spec 的评审者，分不清一处行为变化是不是有意的。

## 相撞
<!-- keelson: id=land.collisions | without: 另一个变更已经把契约从底下挪走了，旧的决策或验证还被当成有效 | sunset: never -->

另一个变更修改了共享契约、目标分支或验证环境时，旧变更的决策和证据可能不再成立。信号：`keelson status` 的共享契约警告、`land` 的漂移拒绝、合并之后的过期验证。应对：重读被挪动的 spec，对齐 delta，重跑 `keelson check --record`，然后才落地。spec 合并先预览，绝不静默覆盖。

## 发布状态
<!-- keelson: id=land.release | without: "已合并"被报成"已上线"，迁移或人工步骤被忘掉 | sunset: never -->

发布状态由 git tag 推导：`keelson status` 把最近一个 tag 之后落地的变更列为未发布。带 **Rollout** 段的变更，在它的步骤跑完之前不算完成；在那之前把它们留在 `NOW.md → Next`。Keelson 可以提醒；它自己绝不执行生产操作。

## 归档之前先回写

落地合并的是 delta 和决策。变更教给你的其余东西（一个新术语、一项移动了的职责、一个质量数字、一条可以变成检查的约束、一个值得回归测试的缺陷）由 `references/reconcile.md` 负责分派去向。在 `keelson land` 之前做完这一遍，让真相文件和代码共享同一个落地提交。

## 沉淀经验，登记技术债
<!-- keelson: id=land.promote | without: 同一条约定在每个变更里被重新发现；晚发现的缺陷变成传说而不是检查 | sunset: never -->

收尾前用一行话问自己：这次变更有没有暴露出值得写成 rule 的约定、值得加进 `config.yaml → check` 的检查、值得写成需求的契约、值得写成回归测试的缺陷？优先顺序：自动化检查、spec 需求、带范围的 rule，然后才是决策行。停留在一段散文里的问题会被重新学一遍。已知的遗留问题变成有负责人的跟踪项（在任务系统里，或 `ROADMAP.md → Next`），而不是总结里的一句话。

## Spec `Decisions` 的写法

一条决策行一到三行，现在时，写明被否决的选项：`- messaging: consumers are idempotent; exactly-once delivery rejected because the broker does not provide it`。决策后来反转时，重写这一行并在末尾留一句：`(previously: at-most-once, abandoned after duplicate-notification incident)`。绝不让 `Decisions` 变成 changelog。代码与已确认的需求不一致时，报告差距；改 spec 去迁就缺陷需要负责人的决定。
