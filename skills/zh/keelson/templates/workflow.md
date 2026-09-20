# Keelson 工作流

项目真相与长期 work item 位于 `.keelson/`；机器本地的会话焦点与验证输出位于 gitignored 的 `.keelson/.runtime/`。**Session 不是 Task**：它只是指向当前对话正在围绕哪个 work item。

每个非平凡修改请求遵循 **ORIENT → BOUND → BUILD → SENSE → RECONCILE**。

- **ORIENT** —— 检查工作树和当前 session focus。同一目标的追问继续使用 focus change；用户说“继续”时运行 `keelson focus --auto`，存在歧义时绝不静默绑定。
- **BOUND** —— trivial 直接改；quick 创建最小有用 change；spec 先写 acceptance、行为 delta 和 plan，再等批准。
- **BUILD** —— 一次推进一个纵向切片。独立的新修改目标创建新 change；围绕同一目标继续追问不会。
- **SENSE** —— 尽早跑便宜检查；完成必须有当前工作树上的新鲜 `keelson check --record` 证据。任务复选框只描述当前计划，不负责判定完成。
- **RECONCILE** —— 每轮修改后根据 acceptance、阻塞项、rollout/兼容性和新鲜 verification 重新计算生命周期。它们满足后状态成为 `ready`，Agent 自动 land；既不等待用户说“做完了”，也不要求历史计划里的每个复选框永远仍然相关。需要时把稳定事实折叠回 specs/rules/glossary。
- 会话结束、长时间空闲、compaction、关闭窗口只改变本机会话 runtime，绝不自动完成、取消或 land 长期 work item。
- `handoff.md` 只用于真正跨人/跨机器或明确所有权转移。普通新会话从 change/task/ledger 状态和可用的 session focus 重建。
- 工件按需创建；空文档不是进度。
- 重复 failure class 升级为作用域 rule 或可执行 fitness check；自动化接管后删掉冗余 prose。
- First contact 只确认 `INTENT.md`；specs/rules 只有真实工作暴露长期真相时才增长。

canonical 路由器是 `.keelson/skill/SKILL.md`。它判断对话意图；生命周期转换来自 work state，而不是用户措辞。
