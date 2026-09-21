# Building（构建）

按切片逐个执行 `tasks.md`。怎么做由你选；这里只写容易出错的部分。

## 按当前计划进入实现
<!-- keelson: id=build.start | without: Agent 在计划未确定前改产品代码，或读取了另一个变更的规范 | sunset: never -->

修改任务先创建最小有用变更，写明具体验收，再在已有用户授权内自动运行 `keelson start`。琐碎修改走最小 quick 变更，不另做计划或访谈。启动检查拒绝未决决定、未确认假设、缺失验收和未完成前置变更；记录当前计划，并在 `context.json` 中声明阶段上下文。决定被重开或计划/delta 改变时，先解决受影响分支再重新启动。不要让用户操作工作流。

编辑前读取 `keelson context --phase implement`。它包含当前规范、delta、相关规则、决定和检查命令；`context.json` 可为 `implement`/`check` 阶段额外声明项目内相对路径。新涉及的路径应纳入上下文路由。spec 变更将用户原始要求和实质补充保留在 `request.md`，让评审者看到真正的目标，不用实现总结替代。

开始每个切片前，核对其可观察结果与已确认目的、相关决定 ID 和验收条件；缺少映射时先修正文档。实现发现新事实推翻前提时，回到同一变更重开受影响决定、更新计划并重新 start，不能沿旧答案继续。

Claude Code、Codex 和 CodeBuddy 提供受支持文件工具的原生门禁与会话上下文 hook；Codex 需要宿主信任 hooks。shell/MCP 写入及其他宿主由 Agent 遵循同一协议。该机制不是沙箱，也不能证明用户已经授权。


## 裁定，而不是停顿
<!-- keelson: id=build.rulings | without: 代理把会话卡在计划早已回答的问题上；或者悄悄决定，推理过程丢失 | sunset: never -->

计划是论证；specs 和 `INTENT.md` 是权威；两者都没回答的，由你在 `INTENT.md → Authorizations` 的范围内裁定。在授权范围内遇到歧义或计划缺陷时，决定、记录、继续：

```markdown
### Ruling: ack semantics
At-least-once with idempotent consumers. Exactly-once would need a broker feature we do not run. Cost if wrong: duplicate side effects in `notify`, bounded by the idempotency key.
```

超出授权范围的，就是未决问题：写进 `change.md → Open questions` 并注明它阻塞什么，然后去建它不阻塞的切片。只有四件事让你彻底停下：不可逆或破坏性操作；涉及安全的操作；工作树之外、按惯例应先询问的副作用（合并、推到共享分支、发布、外部调用）；计划烂到每条路都是猜。

## 按 effort 层级分派子代理
<!-- keelson: id=build.dispatch | without: 一个上下文包揽一切，越装越满质量越差，而且不管任务难易成本都一样 | sunset: 宿主没有子代理工具时，本节自然失效 -->

任务大体独立、宿主提供子代理时，每个任务派一个全新的子代理，模型由它的 effort 层级解析：`keelson models --resolve <tier>` 打印当前平台的别名（或者把层级按能力从低到高映射到子代理工具暴露的别名上）。交给子代理的是任务文本、命中的 rules、相关 spec 和验证命令。绝不把你的整段对话塞给它。

更多 Agent 不是线性的 throughput multiplier。任务共享可变状态、同一契约，或者需要持续互相同步时，coordination/merge cost 可能超过并行收益；此时保持串行。只有边界清楚、输出可以独立验证、最终 merge contract 明确时才并行。不要靠“再加几个 Agent”挽救一个高度耦合的任务。

已登记变更的子任务均附带独立一行 `KEELSON_CHANGE=<change-name>` 和阶段。Codex 子代理先自动运行 `keelson focus <change-name>`，再读取 `keelson context --phase implement`（评审用 `check`），然后执行任务。每个子代理有自己的线程身份，不从根会话猜测任务；保留分配的只读限制。恢复已有 focus 的子代理时，除非新任务明确要求切换，否则保留其当前关联。未登记变更的只读调查无需创建变更或添加标记。

每个任务之后，由一个评审子代理（层级 ≥ `standard`，绝不低于实施者）对照 spec 和 rules 检查 diff。两者都记进 ledger：

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

## 并行工作
<!-- keelson: id=build.parallel | without: 两个写代码的人在同一分支上互相覆盖，或者两个变更用两种方式实现同一契约 | sunset: never -->

多个写代码的人（人或代理）同时工作时，每个变更用自己的分支或 worktree（`keelson new --worktree`）。共享接口在任何一方实现之前先对齐：在 delta spec 里约定契约，落地或引用它，然后再建。两个活动变更触及同一能力或同样声明的路径时，`keelson status` 会警告；把它当作"先谈"，不是锁。磁盘上的文件不是分布式锁，分支也消除不了语义冲突；跨机器的认领和合并控制属于任务系统、pull request 和 CI。把别人的变更集成进你的之后，重新跑验证；旧证据按定义已经过期。

对方所有者联系不上时（无人值守运行、同事不在线），既不要等待，也不要假装重叠不存在：把你对共享需求的 delta 压到这次变更允许的最小范围，在 ledger 里记一条 `### Note:`、在 `NOW.md` 里写一行说明重叠，并在写回和完成报告里说出来。`keelson land` 落地时会点名重叠的变更；它们的落地会停在漂移门禁上，直到其所有者重新读过合并后的 spec。

## 工作过程中让工件保持真实
<!-- keelson: id=build.update-artifacts | without: tasks.md 和 change.md 描述的是计划而不是实际发生的事；下一个会话信了过期的文字 | sunset: never -->

任务在验证通过时打勾，不是写完时。验收项在它的检查跑过之后打勾。构建中途设计变了，就改 `change.md`；行为变了，再改 delta spec。没有东西是锁死的；唯一的规则是每次提交时文件都反映现实。变更没做完就要停下，`keelson handoff <name>` 并填好它（见 `handoff.md`）。

<!-- guided -->
## 行为有明确规格时先写测试
delta spec 里有 scenario 的地方，先按 scenario 写失败的测试，看它失败，实现，看它通过。没有 scenario 的地方，自己判断测试是否是最便宜的证据。视觉探索和未知 API 可以先做一个小原型。

## 叙述
工具调用之间最多一行短话。记录由 ledger 和工具输出承担。
<!-- /guided -->
