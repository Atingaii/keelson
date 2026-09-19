# Verifying（验证）

完成是一个附带证据的断言，而证据有两个会独立失效的属性：记录可能无效（从没跑过、跑在旧代码上、只跑了一部分），内容可能无效（跑了、通过了，却仍没检查负责人要的东西）。本参考两者都管。它不会随模型变强而变薄，因为它关乎的是世界，不是判断。

## 记录有效性：`keelson check --record`
<!-- keelson: id=verify.fresh | without: "应该能过"和"看起来对"取代了运行命令；最后一次改动之前的证据被当成当前的 | sunset: never -->

在说"完成、修好、通过、做完"之前：运行 `keelson check --record "<claim>"`。它运行项目配置的检查命令，把完整输出保存到 `.keelson/.local/evidence/`，并向 ledger 追加一条 `Verify:`，写明每条命令、退出码，以及它所运行的工作树指纹：

```markdown
### Verify: pagination end-to-end
`npm run lint` exit 0; `npm run test` exit 0 · tree 5bcb829dae
```

`keelson status` 把该指纹与当前树比较，任何代码改动之后都会报 `stale`；`keelson land` 拒绝过期、失败或缺失的证据。之前的一次运行、部分运行或子代理的汇报都不是证据；diff 和一条新鲜的 `Verify:` 才是。额外的单条命令可以用 `keelson check "<cmd>" --record` 检查。

某项检查跑不了（环境缺失、服务不可用），就在 ledger 里记一条 `Note:`，并写进 `NOW.md → Blocked / uncertain`。部分验证按部分汇报；绝不向上取整。

`config.yaml → check` 里的条目可以是普通字符串，也可以是 `{name, command, kind}`；`kind` 是 `test`、`lint`、`typecheck`、`build`、`fitness`、`check` 之一。`fitness` 检查是变成了一条命令的架构或质量约束（依赖方向、接口兼容性、延迟预算）。机械证据就是这整组检查在当前树上全部通过。它是必要的，但从来不充分。

## 内容有效性：证据覆盖了请求吗？
<!-- keelson: id=verify.content | without: 测试通过而需求仍未满足；被评审的是实施者的总结，而不是负责人的请求 | sunset: never -->

回到 `change.md → Acceptance` 和原始请求，而不是你自己对它的总结。每个验收项，写明覆盖它的测试、命令、人工检查或评审，并且只在那项检查真正跑过之后打勾。delta spec 里的每条需求或 scenario，写明覆盖它的检查。没被覆盖的，要么现在检查，要么作为缺口写进 `NOW.md → Blocked / uncertain`。然后对照命中的 rules 和受影响的 specs 读 diff；违反 rule 就是缺陷，哪怕所有测试都绿。

修 bug 时保留反向检查：把修复撤掉，回归测试必须失败。两种情况都通过的测试什么也证明不了。

## 测试可以改，但不能悄悄削弱
<!-- keelson: id=verify.no-silent-weakening | without: 靠删断言、跳用例做到"全绿"，而完成报告里看不出这种削弱 | sunset: never -->

需求变了就改测试，这很正常。删掉断言、跳过用例、放宽容差，或者用 mock 替换真实检查，是对验收标准的改动：它需要负责人的决定（或明确的授权），并作为一条 `Ruling:` 写进 ledger，写明削弱了什么、为什么。隐瞒它的完成报告是错的。

## 陌生读者评审（spec 档）
<!-- keelson: id=verify.fresh-reader | without: 作者评审自己的工作；同一个盲点通过两次 | sunset: 连续 50 次陌生读者评审都没发现逐任务评审漏掉的东西时 -->

派一个没看过对话的评审者（spec 变更层级 ≥ `deep`），给它原始请求、`change.md`、delta specs 和 diff。让它找：没有真实覆盖的验收项、需求缺口、rule 违反、有风险的假设、任何维护者会反对的地方。每条发现要么处理，要么记入 ledger。第二个代理的同意是信号，不是证明；被检查的是验收清单。

## 完成报告

告诉用户做了什么、证据是什么、还剩什么。形式：

```
Done: offset pagination on /orders, pager in the table.
Evidence: `npm test -- orders` exit 0 (14 passed); `npm run lint` exit 0 · tree 5bcb829dae. Acceptance 3/3.
Open: none. Change in review; `keelson land add-pagination` when integrated.
```

<!-- guided -->
## 这些词意味着你还没验证
"应该"、"大概"、"看起来"、"我相信它能用"。要对状态写下这些词时，改成去运行命令。
<!-- /guided -->
