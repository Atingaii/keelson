# Keelson 工作流

这是项目本地执行内核。项目真相位于 `.keelson/`；已有项目文档只从 `config.yaml` 引用，不复制。任务需要的深层指导位于 `.keelson/skill/`，只按需加载。

每个非平凡变更都遵循 **ORIENT → BOUND → BUILD → SENSE → RECONCILE**。

- **ORIENT** —— 检查当前工作树并运行 `keelson context --paths <files>`；修改共享模块前运行 `keelson impact <files>`。
- **BOUND** —— trivial 直接做；quick 写回理解并只创建最小有用 change 工件；spec 先澄清验收、写行为 delta 和计划，再等批准。
- **BUILD** —— 一次推进一个纵向切片。不要夹带无关清理；不得静默削弱测试或改变行为契约。
- **SENSE** —— 尽早运行便宜且相关的检查。宣称 done/fixed/passing 之前必须有当前工作树上的新鲜 `keelson check --record` 证据。
- **RECONCILE** —— 把稳定事实折叠回 specs/rules/glossary/NOW；跨会话未完成工作用 `keelson handoff <name>`。
- **工件按需出现。** 空文档不是进度。ROADMAP、GLOSSARY、rules、specs、tasks、ledger、handoff 只有在承载下一位人或下一会话需要的信息时才创建。
- 同类失败反复出现时用 `keelson retro` 提升为作用域 rule 或可执行 fitness check；自动化接管不变量后删掉重复提示词。
- 如果 `NOW.md` 以“First contact”开头，就从仓库起草 `INTENT.md`，并只创建有真实证据支撑的 specs/rules，然后让所有者确认或纠正。

canonical 任务路由器是 `.keelson/skill/SKILL.md`。它先识别用户意图，再只加载该意图需要的 references。
