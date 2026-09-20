[English](../faq.md)

# 常见问题

**没有 hook/plugin 也能用吗？**
能。Discovery 和长期 change state 从不依赖 session adapter。当前 native focus 分别使用 Claude hooks、一个 OpenCode 项目 plugin、Pi 内置 `PI_SESSION_ID`、CodeBuddy hooks。`--no-hooks` 会关闭 Keelson 管理的 hook/plugin bridge，因此 Claude/OpenCode/CodeBuddy 安全降级为 candidate/显式选择；Pi 因宿主内置 session env 仍然 native。普通续接依赖长期 change + 本地 focus/candidate，`handoff.md` 只用于明确换人/换机器。

**支持哪些工具？**
官方一等公民只有 7 个 CLI：Claude Code、Codex CLI、OpenCode、Pi、Gemini CLI、Kiro CLI、CodeBuddy CLI。每个适配器都使用真实验证或宿主官方文档明确的发现路径，并指向同一份 `.keelson/` 真源。每个项目仍安装通用 `AGENTS.md` + `.agents/skills/` 层，供其他兼容标准的 Agent 使用。`keelson init` 只自动探测这 7 个一等公民；也可以用 `keelson init --claude --codex` 等显式选择。

**我必须在聊天里敲命令，或者告诉它“任务完成”吗？**
不必。正常对话即可。Agent 自己运行 CLI、在可能时绑定/恢复 session focus，并根据 acceptance/gate + 当前树新鲜 verification 自动推导 `ready`。你不需要说“开始任务”“结束任务”“今天做完了”。

**很小的改动会怎样？**
什么都不发生。trivial 变更（样式、错字、行为不变的单文件修复）不建变更目录、不写回。代理直接做。

**能要求 Agent 开工前先等批准吗？**
可以。在 `.keelson/config.yaml` 里把 `confirm.quick` 和/或 `confirm.spec` 设为 `wait`。默认两者在短 write-back 后、没有未解决的所有者决定时直接推进；不可逆操作、生产修改、权限扩大、breaking compatibility 仍按原有规则显式确认。

**脚本化运行、没人能批准时会怎样？**
代理不会停滞。它写下理解和计划，把工作假设标记为 `Decisions` 下的 `(assumed)`，在这些假设下构建和验证，记录证据，落地前停下。`NOW.md` 会说明该变更等待审阅。你把计划和 diff 一起看完，运行 `keelson land <name> --confirm-assumptions`，或 `keelson cancel <name>`。

**`keelson land` 为什么拒绝？**
它列出每一个真实生命周期原因：验收项未完成、活动依赖、spec 变更没有验收清单、有未决问题、verification 是 not-run、failed、partial 或 stale、`(assumed)` 决策没有 `--confirm-assumptions`、`**BREAKING**` 项没有 `Rollout` 段，或者 delta 所依据的 spec 此后变了（重读后传 `--accept-drift`）。修掉原因，而不是伸手去拿 `--force`；`--force` 留给你的明确决定，并且会打印它越过了什么。

**怎么确认代理的假设？**
读 `change.md` 里 `Decisions` 下的 `(assumed)` 行。如果它们是对的，带 `--confirm-assumptions` 落地；它们会作为已确认折叠进 spec。如果某条错了，改那一行（或告诉代理），让依赖它的工作在落地前重做。

**为什么 verification 是"stale"？测试明明通过了。**
它们通过时针对的是另一棵树。`keelson check --record` 写的每条 `Verify:` 都带当时工作树的指纹；此后任何代码编辑都让它过期。再运行一次 `keelson check --record`。往 ledger 追加不算，因为 `.keelson/` 被排除在指纹之外。

**我已经有 specs、ADR 或架构文档了。要复制进来吗？**
不要。`keelson init` 探测常见位置，记录在 `config.yaml` 的 `refs` 下；代理读它们并从 specs 链接过去，而不是重述。如果你的行为契约已经是 Keelson 的形状，把 `paths.specs` 指向那个目录。见[已有项目](existing-projects.md)。

**我们用 issue 跟踪器。Keelson 会再建一份待办吗？**
不会。`refs.tasks` 指向跟踪器，它对"要做什么、按什么顺序"保持权威。`ROADMAP.md` 用几行写明当前里程碑并链接过去。`change.md` 链接对应的 issue，只保存决策、验收、未决问题和接续状态。

**团队怎么用？**
提交 `.keelson/`。给每个写代码的人自己的变更、分支，最好还有 worktree（`keelson new --worktree`）。要求非平凡的 pull request 附带变更目录，并把 delta spec 和代码一起评审。在 CI 里运行 `keelson validate && keelson check`。两个活动变更触及同一个能力或路径时 `keelson status` 会警告；先把契约谈定。见[协作](collaboration.md)。

**发布状态怎么算？**
来自 git tag。`keelson land` 标记集成；`keelson status` 打印最后一个 tag 以及其后折叠的、尚未发布的变更。带 `Rollout` 段的变更把它的迁移或生产步骤留在 `NOW.md → Next` 里直到执行完毕。Keelson 从不执行它们。

**在 monorepo 里能用吗？**
能。Rules 按路径 glob 路由，所以 `packages/api/**` 和 `packages/web/**` 可以各有自己的 rule 文件。Specs 按能力名组织，能力名可以带路径段，比如 `api/orders`。变更上的 `touches` 用同样的 glob。

**我是工程新手。它能帮我学吗？**
运行 `keelson init --guide`（或在 `config.yaml` 里设 `guide: true`）。代理随后先问场景再问技术，给每个选择配上推荐、原因、备选和取舍，应用一条规则时用一句话解释它，在你决定之后说出对应的工程概念，并在每个 spec 变更收尾时留一段简短的教学说明。文件、门禁和状态与其他任何人相同，所以你做出来的不是一个"新手版"的项目。

**文档一直在长。什么能止住它？**
Keelson 限制的是**高频读取文件的大小，而不是项目知识总量**。Agent 会在正常 RECONCILE 中自动处理 knowledge-health signal，不把 housekeeping 丢给用户。大型 capability spec 自动变成小型 `spec.md` 索引 + `requirements/*.md` + 按需 `decisions/*.md`；rules 按 scope 拆分；NOW/INTENT 重写为简洁当前状态；旧 runtime evidence/session 自动回收。ADR/spec/rule 的文件数量可以随着项目演进持续增加，但每次只按需读取相关文件。`keelson doctor` 保留为诊断工具，不是日常维护步骤。

**它对测试驱动开发有立场吗？**
没有。`verify` reference 要求与代码匹配且覆盖验收清单的证据。`guided` profile 加了一条说明：delta spec 里有场景时建议先写测试，问题是视觉性的或涉及未知 API 时建议先做原型。`lean` profile 把方法留给代理。

**它消耗多少 token？**
发现块不到 10 行，canonical Skill 按需读取 references。Native session adapter 只注入极小的 focus/candidate 提示：Claude/CodeBuddy 在生命周期事件里注入，OpenCode/Pi 主要通过 shell identity 工作，不额外重复大段 prose。Rules 只在 glob 匹配时读；Keelson 不会每轮重放整个工作历史。

**集成状态不健康怎么办？**
`keelson doctor` 可用于诊断 canonical runtime、discovery shim、manifest、session adapter、lifecycle state 与项目 validation；`keelson update` 修复 Keelson 自己拥有的 drift。正常开发除升级或排障外不需要主动运行这些命令。

**怎么把它去掉？**
`keelson uninstall` 移除生成的运行时/集成表面（`.keelson/workflow.md`、`.keelson/skill/`、宿主发现 shim、hook、本地状态），但保留 `.keelson/` 中的项目事实；加 `--purge` 连整个 `.keelson/` 一起移除。临时对照的话，`keelson ablate` 暂存每个表面，`keelson restore` 逐字节恢复。

**能在 Windows 上运行吗？**
CLI 和 hook 都是普通的 Node 脚本。`keelson check` 通过默认 shell 运行你配置的命令。rules、specs 和 `touches` 里的路径使用正斜杠。

**落地之后 ledger 去哪了？**
用 `land: fold` 时，变更目录在它的 specs 和决策合并后被删除。ledger 和 handoff 仍在 git 历史里，`keelson retro` 从那里读取。设 `land: keep` 可改为归档变更目录。

**`validate` 为什么拒绝一个模型名？**
带日期的模型 ID 会过期。任务里用 effort 层级，`config.yaml → models` 里用系列别名。见 [models.md](models.md)。
