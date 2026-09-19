# Building（实施）

执行 `tasks.md`。怎么做由你选；这里只写容易出错的部分。

## 裁定，而不是停顿
<!-- keelson: id=build.rulings | without: 代理把会话停在计划早已回答的问题上；或者默默决定，推理过程丢失 | sunset: never -->

计划是论证；`specs/` 和 `INTENT.md` 是权威；两者都没回答的，由你的判断来定。遇到歧义或计划缺陷时，做决定、记录、继续：

```markdown
### Ruling: ack semantics
At-least-once with idempotent consumers. Exactly-once would need a broker feature we do not run. Cost if wrong: duplicate side effects in `notify`, bounded by the idempotency key.
```

只有四件事让你停下：不可逆或破坏性操作；涉及安全的动作；工作树之外、按惯例应先询问的副作用（合并、推送到共享分支、发布、外部调用）；计划坏到每条路都是猜。

## 按 effort 层级分派子代理
<!-- keelson: id=build.dispatch | without: 一个上下文包揽一切，越填越满质量越降，而成本与任务难度无关地保持平坦 | sunset: 宿主没有子代理工具时，本节自然失效 -->

当任务基本独立且宿主提供子代理时，每个任务分派一个新的子代理，模型按其 effort 层级解析：`keelson models --resolve <tier>` 打印本平台的别名（或者把层级按能力升序映射到子代理工具暴露的别名上）。交给子代理的是任务文本、命中的 rules、相关 spec 和验证命令。绝不把你的整段对话交给它。

每个任务完成后，由一个评审子代理（层级 ≥ `standard`，且不低于实施者）对照 diff 检查 spec 符合度和代码质量。两者都记入 ledger：

```markdown
### Dispatch: task 2 → standard (sonnet)
Result: pass
Implemented paged query; reviewer accepted. Verify `npm test -- orders.repo` exit 0.
```

`Dispatch:` 正文的第一行是 `Result: pass` 或 `Result: fail`；`keelson retro` 只数这一行，不看散文里的用词。

任务的验证在同一层级失败两次，就升一级重新分派，并记录：

```markdown
### Escalate: task 2 light → standard
Two failures on boundary handling; light-tier output ignored the empty-page case.
```

升级只针对"做出来但做错了"的工作，不针对根本没跑起来的分派：限流、超时、工具报错，在同一层级稍等后重试一次，再不行就由你自己内联完成并记一条（`### Note: task 3 inline after two dispatch errors`）。`deep` 是最高层级，没有更高可升；`deep` 的验证失败则停下来问。任务紧耦合，或没有子代理工具：自己内联执行，仍然一次一个任务，仍然记 ledger。

## 工作过程中让工件保持真实
<!-- keelson: id=build.update-artifacts | without: tasks.md 和 change.md 描述的是计划而非实际发生的事；下一个会话信了过时的文字 | sunset: never -->

任务在验证通过时勾选，而不是写完时。实施中途设计变了，就改 `change.md`；行为变了，就改 delta spec。没有什么是锁死的；唯一的规则是每次提交时文件都反映现实。

<!-- guided -->
## 行为有规格时先写测试
delta spec 里有场景的地方，先按场景写出失败的测试，看它失败，实现，看它通过。没有场景的地方，判断测试是不是最便宜的证据。

## 叙述
工具调用之间最多一行简短说明。记录由 ledger 和工具输出承担。
<!-- /guided -->
