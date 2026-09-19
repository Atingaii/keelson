# Verifying（验证）

完成是一个附带证据的断言。本参考是证据层；它不会随模型变强而变薄，因为它关乎外部世界，而不是判断力。

## 新鲜证据
<!-- keelson: id=verify.fresh | without: "应该能过"和"看起来没问题"取代了运行命令；回归被发布出去 | sunset: never -->

在说完成、已修复、通过、已完工之前：找出能证明它的命令，现在完整地运行它，读退出码和失败数。然后，也只有然后，才做出断言，并把证据放在旁边。之前的运行、部分运行、子代理的汇报都不是证据；diff 和新鲜的命令输出才是。

`keelson check` 运行项目配置的命令（`config.yaml → check:`），每条命令打印一个退出码。把结果追加到 ledger：

```markdown
### Verify: pagination end-to-end
`keelson check` exit 0 — test 14 passed, lint 0 errors, typecheck clean.
```

每条 ledger 的 `Verify:` 条目都要写出反引号里的命令和 `exit N`。

## 对照 specs 和 rules 评审
<!-- keelson: id=verify.spec-review | without: 代码通过了测试，却违反了某条 rule 或某个没人测过的需求 | sunset: never -->

对照命中的 `rules/` 文件和受影响的 `specs/`（主 spec 加 delta）读 diff。对每条涉及的需求，指出覆盖它的测试或人工检查。未覆盖的，要么现在补测试，要么在 ledger 里明确列为缺口。

## 陌生读者评审（spec 层级）
<!-- keelson: id=verify.fresh-reader | without: 作者评审自己的作品；同一个盲点通过两次 | sunset: 当连续 50 次陌生读者评审都没发现逐任务评审漏掉的问题时 -->

分派一个没见过对话的评审者（spec 变更层级 ≥ `deep`），给它 change.md、delta specs 和 diff。要它找：需求缺口、rule 违反、有风险的假设、任何维护者会反对的地方。每个发现要么处理，要么记入 ledger。

## 完成报告

告诉用户做了什么、证据是什么、还剩什么。形式：

```
Done: offset pagination on /orders, pager in the table.
Evidence: `npm test -- orders` exit 0 (14 passed); `npm run lint` exit 0.
Open: none. Change ready to land.
```

<!-- guided -->
## 这些词意味着你还没验证
"应该"、"大概"、"似乎"、"我相信它能用"。如果你正要用其中一个来描述状态，改成去运行命令。
<!-- /guided -->
