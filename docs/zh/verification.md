[English](../verification.md)

# 验证

完成是一个附带证据的声明。证据以两种互相独立的方式失效：记录可能无效（检查根本没跑、跑在旧代码上、或只跑了一部分），内容可能无效（跑了、通过了，却仍然没有检查被要求的东西）。Keelson 用机械手段处理第一种，为第二种给代理一个结构。

这两半各有名字。**机械证据**是全部配置的检查在当前树上通过：测试、lint、类型检查、构建，以及任何 `fitness` 检查（变成命令的架构或质量约束）。**行为证据**是 `change.md` 的验收清单，每一项映射到覆盖它的测试、命令、人工检查或评审，并且只在那项检查跑过之后才勾选。机械证据是必要的，永远不充分；落地两者都需要。

## 记录有效性

### keelson check --record

```bash
keelson check --record "pagination end to end"
```

该命令：

1. 按顺序通过 shell 运行 `config.yaml → check` 下的每个条目，关闭颜色；条目是命令字符串或 `{name, command, kind}`，`kind` 取 `test`、`lint`、`typecheck`、`build`、`fitness`、`check` 之一；
2. 打印每条命令的输出（除非 `--quiet`）和退出码；
3. 把每条命令的完整输出保存到 `.keelson/.local/evidence/<timestamp>-<n>.log`；
4. 计算工作树指纹；
5. 往活动变更的 `ledger.md`（或 `--change` 指定的那个）追加一条 `Verify:`：

```markdown
### Verify: pagination end to end
`npm run lint` exit 0; `npm run test` exit 0 · tree 5bcb829dae
```

没有 `--record` 时它打印这条记录而不追加。单条额外命令可以用 `keelson check "npm test -- orders" --record` 运行并记录。任何检查失败时命令以 1 退出；记录仍然写入，带失败的退出码，让失败有案可查。

### 工作树指纹

"代码此刻的样子"的稳定标识。在 git 仓库里，Keelson 用一个排除了 `.keelson/` 的一次性索引构建 tree 对象：已跟踪和未跟踪的文件都计入，`.gitignore` 被遵守，往 ledger 追加不会让它记录的证据失效。没有 git 时，它是内容哈希。见[它如何工作](how-it-works.md#工作树指纹)。

### 过期

`keelson status`、`land` 和 `doctor` 重新计算指纹，并与最后一条 `Verify:` 比较：

| 状态 | 含义 |
|---|---|
| `not-run` | 没有 `Verify:` 条目 |
| `partial` | 条目没有退出码 |
| `failed` | 非零退出 |
| `stale` | 退出码 0，但树此后变了 |
| `passed` | 退出码 0 且树一致 |

`land` 拒绝除 `passed` 之外的一切。手写的、没有 `tree` 的证据算作通过但过期状态未知；`validate` 对此发出警告。

### 部分验证

如果某项检查无法运行（环境缺失、服务不可用），代理在 ledger 里记一条 `Note:`，并写进 `NOW.md → Blocked / uncertain`。部分验证按部分报告；从不四舍五入成通过。

## 内容有效性

### 验收映射

这是行为那一半。`change.md → Acceptance` 把请求映射到证据。每个标准一个复选框，每个都写明如何检查：

```markdown
## Acceptance
- [x] listing returns 20 by default — test: `orders.list.default`
- [x] page 2 returns the next 20 — check: `npm test -- orders.paging`
- [ ] oversized page returns 400 with code size_too_large — manual: curl size=500
- [ ] no caller still relies on the unbounded listing — review: grep callers of listOrders
```

四种类型：`test:` 指一个测试，`check:` 指一条命令，`manual:` 指人工检查，`review:` 指要阅读的东西。一项只在它的检查跑过后才勾选。任何一项未勾选时 `keelson land` 拒绝，spec 变更完全没有验收清单时也拒绝。某项没有说明如何检查时 `validate` 发出警告。

代理从原始请求和 delta spec 的场景填这份清单，而不是从它自己对工作的总结。

### bug 修复的反向检查

一个有没有修复都能通过的回归测试什么也证明不了。对修复，代理保留反向检查：回退修复后，测试必须失败。`debug.md` reference 要求在 `keelson check --record` 之前做到这一点。

### 测试可以改，不可以悄悄弱化

需求变了时修改测试是正常的。删除断言、跳过用例、放宽容差、用 mock 替换真实检查，都是对验收标准的改动。这需要所有者的决定或 `INTENT.md` 里的明确授权，并以一条 `Ruling:` 进入 ledger，写明弱化了什么、为什么。

### 陌生读者评审

对 spec 变更，代理派出一个没有看过对话的评审者，`deep` 层级，给它原始请求、`change.md`、delta specs 和 diff。评审者寻找没有真实覆盖的验收项、需求缺口、rule 违反和有风险的假设。每条发现要么处理要么记入 ledger。第二个代理的同意是信号，不是证明；真正被检查的是验收清单。

## 完成报告

```text
Done: offset pagination on /orders, pager in the table.
Evidence: `npm run lint` exit 0; `npm test` exit 0 · tree 5bcb829dae. Acceptance 3/3.
Open: none. Change in review; `keelson land add-pagination` when integrated.
```

做了什么、证据是什么、还剩什么。关于状态的"应该"、"大概"、"看起来"这类词，意味着命令没有跑过。

## 在 CI 里

```bash
keelson validate && keelson check
```

CI 里的 `check` 不带 `--record` 运行；它产出退出码。ledger 条目由代理在自己的机器上写，针对它实际运行的那份代码的指纹。
