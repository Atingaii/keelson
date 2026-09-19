# 回写与压缩

落地一个变更并不是它的终点。两道工序让项目的知识保持真实且精简：回写把新的稳定事实写回当前真相，压缩把不再属于那里的东西移走。两者都是给人的建议，从不自动改写；`keelson doctor` 列出它发现的问题。

## 回写：每个新事实去哪里？
<!-- keelson: id=reconcile.route | without: 变更产生的事实留在 change.md 和聊天里；specs、rules 和术语表描述的还是上个季度的系统 | sunset: never -->

在 `keelson land` 之前，以及审阅它的输出时，对你学到的每件事问一遍：

| 变更产生了 | 它去到 |
|---|---|
| 新的或改变了的稳定行为 | 能力的 spec，经由 delta（`land` 合并它） |
| 未来维护者会在意的理由 | spec 的 `Decisions`（`land` 折叠它们） |
| 新术语，或从此有了特定含义的术语 | `GLOSSARY.md` |
| 在模块间移动的职责，或新边界 | 限定在那些路径上的 rules；项目若维护架构文档则还有 `refs.architecture` |
| 带数字的质量目标 | spec，作为带 scenario 的需求 |
| 命令能检查的约束 | `config.yaml → check`（fitness 检查）；随后散文规则可以收缩 |
| 走到验证阶段才发现的缺陷 | 一个回归测试，加上 ledger 里的 `Root cause:` |
| 已知但未做的工作 | 任务系统，或 `ROADMAP.md → Next`，带负责人 |
| 只在变更期间有意义的东西 | 哪儿也不去；随 change 目录留在 git 历史里 |

以上每一行在其目的地都是现在时。change 目录是脚手架，会被移除；留下来的是真相文件。

## 当前真相只重写，不追加
<!-- keelson: id=reconcile.rewrite | without: specs 变成按时间排列的日记；读者分不清哪一段描述的是今天的系统 | sunset: never -->

一条 spec、一条 rule、一行术语表说的是系统现在怎么工作。行为变化时，描述旧行为的那句话被替换，而不是在后面跟一句"从九月起现在是……"。变更的先后顺序在 git 里、在归档或折叠掉的 change 里、在点名了被否方案的决策行里。`keelson doctor` 会标出读起来像历史叙述的需求文本。

## 压缩：让被读到的东西保持小
<!-- keelson: id=reconcile.compact | without: 文档无限增长；常驻集合让每个会话都变贵，过时文本被当作现状读取 | sunset: never -->

`config.yaml → budgets` 给每种文档一个行数预算（INTENT、ROADMAP、NOW、GLOSSARY、spec、rule、change、handoff，以及作为整体的常驻 rules）。超出预算不是错误；它是对该文档做一遍压缩的信号，逐段选择：

- **重写**得更短，现在时。
- **拆分**：按能力、范围或 bounded context 拆，当需求之间不再共享同一个目的时。
- **删除** git 已经保存的历史，以及没有任何东西依赖的事实。
- **移动**：把约束移到限定在其路径上的 rule，把计划项移到任务系统。
- **自动化**：把可检查的规则做进 `config.yaml → check`，散文缩成一个指针。
- **归档**已经停滞的变更（`keelson cancel` 并写明原因），而不是让它半开着。

`keelson doctor` 还会报告跨能力重复的需求、闲置两周的变更、超过 25 个任务的变更、超预算的常驻 rules，以及比源码树更旧的生成文档。用一个小变更修掉它点名的问题，像其他变更一样落地。

## 园艺节奏
<!-- keelson: id=reconcile.cadence | without: 只有疼了才看知识健康，到那时清理本身已经是一个项目 | sunset: never -->

里程碑结束时运行 `keelson doctor`，`keelson status` 显示没有任何东西在进行时也运行一次。那时的十分钟省下的是以后的一次重写。把它的输出当作一列可以分别落地的小修复，绝不当作重构整个项目的指令。
