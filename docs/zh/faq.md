[English](../faq.md)

# 常见问题

**没有 hooks 也能用吗？**
能。hooks 只为 Claude Code 存在，而且只注入状态。没有 hooks 时，常驻块会告诉代理在非平凡工作前运行 `keelson context --paths <files>`；你说"continue"时它第一个读的就是 `NOW.md`。在 Claude Code 上想这样用，给 `init` 传 `--no-hooks`。

**支持哪些工具？**
`claude`、`codex`、`cursor`、`opencode` 和 `gemini`。每个都会得到技能目录和指令文件里的常驻块。Cursor 还会得到 `.cursor/rules/keelson.mdc`。用 `keelson init --tools a,b,c` 一次面向多个工具。其他读取 `AGENTS.md` 和 `.agents/skills/` 的工具可以直接使用 `codex` 的输出。

**我需要在聊天里敲命令吗？**
不需要。你像以前一样和代理对话，CLI 由代理自己运行。"grill me"、"status"、"land it"、"retro" 这类短语在技能里有明确含义，但没有一个是必须的。

**很小的改动会发生什么？**
什么都不会。trivial 变更（样式、错字、行为不变的单文件修复）不建 change 目录，也不写回理解。代理直接做完。

**能让代理在开工前先等我批准 quick 变更吗？**
在 `.keelson/config.yaml` 里设 `confirm.quick: wait`。spec 变更总是等待批准，除非你设了 `confirm.spec: proceed`。

**团队怎么用？**
提交 `.keelson/`。要求非平凡的 pull request 附带 change 目录。在 CI 里运行 `keelson validate && keelson check`。`NOW.md` 是每个仓库一份；多人并行时保持它简短，让每个活动中的 change 目录承载自己的状态。

**在 monorepo 里能用吗？**
能。rules 按路径 glob 路由，所以 `packages/api/**` 和 `packages/web/**` 可以各有自己的 rule 文件。specs 按能力名组织，能力名可以带路径段，如 `api/orders`。

**它对测试驱动开发有立场吗？**
没有。`verify` reference 要求在任何完成声明之前先拿到新鲜证据。`guided` profile 多一条提示：delta spec 里有 scenario 时建议先写测试。`lean` profile 把方法留给代理。

**它消耗多少 token？**
常驻块不到 20 行。session-start hook 每个会话打印一次几百个 token。每次提示的那一行只有几十个 token，空闲时为空。技能一次只读一份 reference，每份约 30 到 60 行。rules 只在 glob 匹配时才读。此外什么都不注入。

**代理不理它怎么办？**
检查你的工具对应的技能目录是否存在、常驻块是否在指令文件里；`keelson update` 会重新生成两者。在 Claude Code 上，确认 hooks 在 `.claude/settings.json` 里且 `node` 在 PATH 上。如果代理把变更大小判错了，说"按 spec 处理"或"直接做"。

**怎么把它去掉？**
临时对照，用 `keelson ablate` 把所有表面收起来，`keelson restore` 原样恢复。永久移除，删掉 `.keelson/`、技能目录、指令文件中 `keelson:start` 和 `keelson:end` 标记之间的块，以及 `.claude/settings.json` 里的两条 hook 条目。

**能在 Windows 上运行吗？**
CLI 和 hooks 都是纯 Node 脚本，不用 shell 特性，只有 `keelson check` 例外，它通过默认 shell 运行你配置的命令。rules 和 specs 里的路径使用正斜杠。

**落地后 ledger 去哪了？**
`land: fold` 时，change 目录在 specs 和 decisions 合并后被删除。ledger 仍在 git 历史里，`keelson retro` 从那里读取。设 `land: keep` 则改为归档 change 目录。

**为什么 `validate` 拒绝某个模型名？**
带日期的模型 ID 会过期。任务里用 effort 层级，`config.yaml → models` 里用系列别名。见 [models.md](models.md)。
