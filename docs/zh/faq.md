[English](../faq.md)

# 常见问题

**没有 hook 也能用吗？**
能。Hook 只在 Claude Code 上存在，而且只注入状态。没有 hook 时，常驻块要求代理在非平凡工作前运行 `keelson context --paths <files>`，你说"继续"时它最先读的是 `NOW.md` 和每个变更的 `handoff.md`。如果在 Claude Code 上也想这样，给 `init` 传 `--no-hooks`。

**支持哪些工具？**
`claude`、`codex`、`cursor`、`opencode` 和 `gemini`。每个都会得到技能目录和说明文件里的常驻块。Cursor 还会得到 `.cursor/rules/keelson.mdc`。`keelson init --tools a,b,c` 一次配置多个。其他读 `AGENTS.md` 和 `.agents/skills/` 的工具可以直接使用 `codex` 的输出。

**我必须在聊天里敲命令吗？**
不必。你像以前一样和代理对话。CLI 由代理自己运行。"grill me"、"status"、"hand off"、"land it"、"retro" 这些短语在技能里有定义好的含义，但没有一个是必须的。

**很小的改动会怎样？**
什么都不发生。trivial 变更（样式、错字、行为不变的单文件修复）不建变更目录、不写回。代理直接做。

**能在代理开工前先批准 quick 变更吗？**
在 `.keelson/config.yaml` 里设 `confirm.quick: wait`。spec 变更总是等批准，除非你设 `confirm.spec: proceed`。

**脚本化运行、没人能批准时会怎样？**
代理不会停滞。它写下理解和计划，把工作假设标记为 `Decisions` 下的 `(assumed)`，在这些假设下构建和验证，记录证据，落地前停下。`NOW.md` 会说明该变更等待审阅。你把计划和 diff 一起看完，运行 `keelson land <name> --confirm-assumptions`，或 `keelson cancel <name>`。

**`keelson land` 为什么拒绝？**
它列出每一个原因：任务或验收项未勾选、spec 变更没有验收清单、有未决问题、verification 是 not-run、failed、partial 或 stale、`(assumed)` 决策没有 `--confirm-assumptions`、`**BREAKING**` 项没有 `Rollout` 段，或者 delta 所依据的 spec 此后变了（重读后传 `--accept-drift`）。修掉原因，而不是伸手去拿 `--force`；`--force` 留给你的明确决定，并且会打印它越过了什么。

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
`config.yaml → budgets` 里的行数预算和 `keelson doctor`。doctor 报告超预算的文档、读起来像历史的需求文字、重复的需求名、闲置两周的变更、超过 25 个任务的变更、超预算的常驻 rules，以及比代码旧的生成文档。每条发现都给出一个压缩建议（用现在时重写、拆分、删除 git 已保留的内容、把可检查的规则移进 `check:`）。没有任何东西会替你重写；技能的 `reconcile.md` reference 告诉代理每条事实属于哪里、如何压缩。

**它对测试驱动开发有立场吗？**
没有。`verify` reference 要求与代码匹配且覆盖验收清单的证据。`guided` profile 加了一条说明：delta spec 里有场景时建议先写测试，问题是视觉性的或涉及未知 API 时建议先做原型。`lean` profile 把方法留给代理。

**它消耗多少 token？**
常驻块不到 20 行。会话启动 hook 打印最多约 1,500 个字符，一次。每个提示词那一行几十个 token，空闲时为空。技能一次读一个 reference，每个 30 到 90 行。Rules 只在 glob 匹配时才读。此外不注入任何东西。

**代理不理它怎么办？**
运行 `keelson doctor`。它检查每个配置工具的技能是否安装且与 CLI 版本一致、常驻块是否在说明文件里、hook 是否已注册。`keelson update` 重新生成这一切。如果代理把变更大小判错了，说"按 spec 处理"或"直接做"。

**怎么把它去掉？**
`keelson uninstall` 移除生成的表面（技能、常驻块、hook、本地状态），保留 `.keelson/`；加 `--purge` 连 `.keelson/` 一起移除。临时对照的话，`keelson ablate` 暂存每个表面，`keelson restore` 逐字节恢复。

**能在 Windows 上运行吗？**
CLI 和 hook 都是普通的 Node 脚本。`keelson check` 通过默认 shell 运行你配置的命令。rules、specs 和 `touches` 里的路径使用正斜杠。

**落地之后 ledger 去哪了？**
用 `land: fold` 时，变更目录在它的 specs 和决策合并后被删除。ledger 和 handoff 仍在 git 历史里，`keelson retro` 从那里读取。设 `land: keep` 可改为归档变更目录。

**`validate` 为什么拒绝一个模型名？**
带日期的模型 ID 会过期。任务里用 effort 层级，`config.yaml → models` 里用系列别名。见 [models.md](models.md)。
