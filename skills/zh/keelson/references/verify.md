# Verifying（验证）

Ready/完成是由长期 gate 与证据支撑的状态，而证据有两个会独立失效的属性：记录可能无效（从没跑过、跑在旧代码上、只跑了一部分），内容可能无效（跑了、通过了，却仍没检查负责人要的东西）。本参考两者都管。它不会随模型变强而变薄，因为它关乎的是世界，不是判断。


界面工作按需加载 `frontend.md`；视觉与交互验收遵循 `frontend-review.md` 和 `frontend-delivery.md`。

## 记录有效性：`keelson check --record`
<!-- keelson: id=verify.fresh | without: "应该能过"和"看起来对"取代了运行命令；最后一次改动之前的证据被当成当前的 | sunset: never -->

声称完成前先审阅配置的命令，首次运行使用 `keelson check --trust --record "<claim>"`；相同命令后续无需再次传 trust。CLI 将签名 `ledger.jsonl` 和 `evidence/<digest>.log` 保存在变更中。ledger.md 是可读摘要，手写 Verify 不授权落地。

记录同时绑定完整代码与契约指纹，包括验收和决策。status/land 拒绝过期、失败、不完整或本机不信任的证据。显式单条命令只形成部分证据，除非它恰好覆盖完整配置检查。最终检查前完成验收记录；之后编辑会使证据失效。门禁全部通过时，在已有授权内落地。本机签名不隔离同权限进程，也不证明模型身份。

某项检查跑不了（环境缺失、服务不可用），就在 ledger 里记一条 `Note:`，并写进 `NOW.md → Blocked / uncertain`。部分验证按部分汇报；绝不向上取整。

`config.yaml → check` 里的条目可以是普通字符串，也可以是 `{name, command, kind}`；`kind` 是 `test`、`lint`、`typecheck`、`build`、`fitness`、`check` 之一。`fitness` 检查是变成了一条命令的架构或质量约束（依赖方向、接口兼容性、延迟预算）。机械证据就是这整组检查在当前树上全部通过。它是必要的，但从来不充分。

## 内容有效性：证据覆盖了请求吗？
<!-- keelson: id=verify.content | without: 测试通过而需求仍未满足；被评审的是实施者的总结，而不是负责人的请求 | sunset: never -->

回到 `change.md → Acceptance` 和原始请求，而不是你自己对它的总结。每个验收项，写明覆盖它的测试、命令、人工检查或评审，并且只在那项检查真正跑过之后打勾。delta spec 里的每条需求或 scenario，写明覆盖它的检查。没被覆盖的，要么现在检查，要么作为缺口写进 `NOW.md → Blocked / uncertain`。然后对照命中的 rules 和受影响的 specs 读 diff；违反 rule 就是缺陷，哪怕所有测试都绿。

沿“原始目的 → 已确认决定 → 验收行为 → 实际证据”逐项核对，也检查非目标是否被遵守。界面存在或测试通过不代表目的已达到：例如用户要发现异常，证据应展示异常能被发现，而不只是页面能打开。上游答案改变后，审查相关验收与切片是否同步更新。

修 bug 时保留反向检查：把修复撤掉，回归测试必须失败。两种情况都通过的测试什么也证明不了。

成形阶段真正触发了哪个风险镜头，就验证对应义务，而不是再跑一张通用清单：安全看相关负向/滥用场景，并发看重复/顺序/故障行为，兼容性看旧消费者或迁移覆盖，可访问性看受影响交互，性能看有测量依据的目标/基线。仓库已经能证明的就复用证据，不重复制造检查。

涉及错误处理、清理或资源生命周期时，沿入口到返回的完整路径检查，包括清理之后的终结操作和通知。同时在多个阶段注入错误：早期错误不能阻止后续必需动作，晚期错误不能悄悄替换先前错误。检查执行过哪些动作、最终传播哪些错误，以及最终观察者和调用者各自看到的状态，包括原先已存在的外层状态。断言错误身份、数量及契约要求的顺序；只数回调次数不能证明错误传播和状态恢复正确。额外的鲁棒性探测应与负责人原本规定的验收标准分开记录。

## 对“这个机制有收益”的主张做反事实验证
<!-- keelson: id=verify.counterfactual | without: 方案本身测试全绿，但没人验证新增 cache、queue、retry 层、抽象、模型阶段或 reviewer 是否真的产生了用来证明其复杂度合理的收益 | sunset: never -->

普通产品行为不需要做消融。只有当某个机制的理由本身是经验性主张时才使用：性能、可靠性、成本、质量、安全余量或其他可测响应。

按照 `engineer.md` 里的 baseline 验证：使用同一代表性 workload/环境，分别让 candidate enabled，以及 disabled/简化，再对照实验前声明的 response/threshold。可靠性机制要注入它声称能处理的故障；AI/Agent stage 要用同一批 eval case 对比有无该 stage。

如果移除机制并没有让目标明显变差，它的必要性就没有证据支持：删除它，或者把结论记为 inconclusive，而不是因为“全绿”就永久保留复杂度。两个机制可能交互时，测试最小有用组合，不要迷信 one-at-a-time removal。

稳定的 response threshold 能自动化时升级成 fitness check；带噪声的探索实验留在 evidence/ledger note，不变成永久 gate。

## 测试可以改，但不能悄悄削弱
<!-- keelson: id=verify.no-silent-weakening | without: 靠删断言、跳用例做到"全绿"，而完成报告里看不出这种削弱 | sunset: never -->

需求变了就改测试，这很正常。删掉断言、跳过用例、放宽容差，或者用 mock 替换真实检查，是对验收标准的改动：它需要负责人的决定（或明确的授权），并作为一条 `Ruling:` 写进 ledger，写明削弱了什么、为什么。隐瞒它的完成报告是错的。

## 行为变更的陌生读者评审
<!-- keelson: id=verify.fresh-reader | without: 作者评审自己的工作；同一个盲点通过两次 | sunset: 连续 50 次陌生读者评审都没发现逐任务评审漏掉的东西时 -->

行为变更即使采用 quick 档，也需要全新上下文的评审。CLI 对 spec 变更、携带 delta spec 或显式声明 `review: independent` 的变更要求当前复核记录。没有 delta 的行为类 quick 变更应写入 `review: independent`，或用 `new --review independent` 创建。纯文字、格式类 quick 修改无需额外评审。

在已有授权内使用宿主的全新子代理或独立原生 CLI 会话。任务用独立行标记 `KEELSON_CHANGE=<change-name>` 和 `KEELSON_PHASE=check`，提供原始请求、仓库位置和 diff，不继承原对话或实现者的结论。评审者读取 `context --phase check` 与 `review --prepare`。产品文件只读，仅允许在当前变更下写评审报告。宿主无法提供独立上下文时，报告缺口并保留未落地状态；不得虚构第二个身份或强制完成。

必须真正调用一次新代理工具或新 CLI 进程，并保留实际会话/工具调用标识；自己重读 diff、重新跑测试、换一个评审者名称，都不构成独立上下文。实现者不得自行填写独立报告。Codex 没有子代理工具时，可运行全新的 `codex exec`（不得 resume/fork），通过 stdin 传入只读评审任务并明确报告路径；沿用用户选择的模型和权限，不修改全局设置。Claude Code、CodeBuddy 使用各自宿主的全新代理能力；不可用时如实保留缺口。独立评审任务必须说明“只做本次 review，不再派评审、不运行完成流程、不 land”；报告中的 reviewer 写真实会话/工具标识。

准备包包含精确验收文字和预计合并后的完整规范。评审者填写 `reportTemplate`：标明独立评审者，逐项记录实际观察到的验收证据，给出可区分错误实现的反例，并检查每个合并后的能力是否仍含过时或冲突要求。用负责人规则推导用例，不照抄实现：改变新决定要求忽略的字段，分别检查每个优先组与同优先级情况。未解决缺陷写进 `findings`，不能藏在成功总结里。记录说明发生了评审，不等于机器证明判断正确。

执行 `keelson review --record .keelson/changes/<name>/<report>.json`。实现者修复发现后，由独立评审者针对新准备包重新核对受影响结果。最终评审前完成验收记录，之后运行完整 `check --record`，再 land。代码、请求、验收、上下文或契约变化使报告过期；修改报告使检查证据过期。修复证据缺口时保留原始请求和已确认选择。

## 完成报告

告诉用户做了什么、证据是什么、还剩什么。形式：

```
Done: offset pagination on /orders, pager in the table.
Evidence: `npm test -- orders` exit 0 (14 passed); `npm run lint` exit 0 · tree 5bcb829dae. Acceptance 3/3.
Open: none. `keelson land add-pagination` succeeded; durable behavior/decisions were folded.
```

<!-- guided -->
## 这些词意味着你还没验证
"应该"、"大概"、"看起来"、"我相信它能用"。要对状态写下这些词时，改成去运行命令。
<!-- /guided -->
