# 回写与压缩

落地一个变更并不是它的终点。两道工序让项目知识保持真实且精简：回写把新的稳定事实写回当前真相，压缩把不再属于那里的东西移走。它们都是 RECONCILE 中 Agent 的内部职责，不是所有者需要主动请求的 housekeeping；`keelson doctor` 只保留为诊断视图。

更新供人阅读的文档时应用 `writing.md`：先表达当前含义，未完成工作给出具体下一步，完整细节放在其所属文件。原始签名记录与证据保持原样。

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

写 delta 前，把每项变化映射到现有 Requirement 名称。修改用相同名称的 MODIFIED 和完整替换正文；废弃要求用 REMOVED；ADDED 只用于真正独立的新行为。换个标题并不会覆盖旧契约。通过 `keelson review --prepare` 的 contracts[].after 把合并结果当作一份当前规范检查，而不是按历史先后阅读；也检查 Decisions 中已推翻的选择，最终评审和检查前改写过时决定。CLI 拒绝找不到名称的 MODIFIED/REMOVED 和覆盖既有名称的 ADDED；不同标题下的语义冲突仍需评审者识别。

## 压缩：让被读到的东西保持小
<!-- keelson: id=reconcile.compact | without: 文档无限增长；常驻集合让每个会话都变贵，过时文本被当作现状读取 | sunset: never -->

`config.yaml → budgets` 给每种文档一个行数预算（INTENT、ROADMAP、NOW、GLOSSARY、spec、rule、change、handoff，以及作为整体的常驻 rules）。预算是**软压缩阈值**。Keelson 会在高频文档失控前自动重组存储：大型 spec 自动变成小型索引 + requirement/decision 分片，runtime 缓存自动回收。如果某个单独语义单元本身仍然过大，Agent 会在 RECONCILE 中自动改写或拆解，并重新验证结果。活跃 change/handoff 只是临时脚手架，不会演变成长期知识仓库。只有整理会改变产品语义、授权、兼容性或其他真正属于所有者的决策时才询问用户。

超过软预算后，对该文档做一遍压缩，逐段选择：

- **重写**得更短，现在时。
- **拆分**：按能力、范围或 bounded context 拆，当需求之间不再共享同一个目的时。
- **删除** git 已经保存的历史，以及没有任何东西依赖的事实。
- **移动**：把约束移到限定在其路径上的 rule，把计划项移到任务系统。
- **自动化**：把可检查的规则做进 `config.yaml → check`，散文缩成一个指针。
- **归档**已经停滞的变更（`keelson cancel` 并写明原因），而不是让它半开着。

`keelson doctor` 还会检测跨能力重复需求、闲置/过大的变更、膨胀的常驻 rules 和过期生成文档。Agent 在正常工程轮次里顺手消费这些信号并完成安全整理；只有整理会改变语义时才形成所有者可见的决策。

## 自动维护对用户不可见
<!-- keelson: id=reconcile.automatic | without: 所有者被要求执行清理命令、spec 变成巨型单文件，或者整理一直拖到本身成为一个项目 | sunset: never -->

把知识形态当成基础设施，而不是用户工作。当 `keelson context` 暴露内部 maintenance finding 时，在同一轮工程工作里自行解决，不要求所有者介入：

- **大型 specs** —— 不要通过摘要丢掉 requirement。`keelson land` 会自动把大型 capability 从单个 `spec.md` 变成有界索引 + `requirements/*.md` + `decisions/*.md`。总知识量可以持续增长，但每个高频读取文件保持小。
- **Rules** —— 按真实路径/作用域拆分并更新 `rules/index.md`；合并重复规则，能确定性检查的散文规则改为 fitness check。单条 rule 仍过宽时，自动重写成保留语义的最小不变量。
- **NOW / INTENT** —— 永远不拆分，自动重写成短小的当前状态；历史留给 git。
- **ADR / decisions** —— 项目使用 `refs.decisions` 时，一个长期决策一个 ADR；目录可以持续增加，但不要在每个会话全量注入 ADR。capability 局部决策自动拆成 `decisions/*.md`。
- **Runtime** —— 清理符合回收条件的本机会话与临时运行缓存；变更目录和归档中的签名记录、公开密钥及 evidence log 是持久证据，不做摘要替换或缓存清理。

只有压缩会改变产品语义、授权、兼容性或其他真正属于所有者的决策时才询问用户。移动文件、更新索引、去重、删除历史叙述和缓存清理都属于内部维护，静默完成。

## 园艺节奏
<!-- keelson: id=reconcile.cadence | without: 只有疼了才看知识健康，到那时清理本身已经是一个项目 | sunset: never -->

Agent 在正常 context/reconcile 周期以及重要 landing 后重新评估知识健康。维护是持续、增量且静默的：始终让高频文档保持可读，而不是安排专门的清理日或要求所有者管理控制面。
