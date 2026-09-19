# Keelson 工作流

这是项目本地的执行内核。项目事实统一放在 `.keelson/`；已有项目文档只从 `config.yaml` 引用，不复制。任务需要的深层指导统一放在 `.keelson/skill/`，仅按需读取。

每个非平凡变更都遵循 **ORIENT → BOUND → BUILD → SENSE → RECONCILE**。

- **ORIENT（定向）** — 检查当前工作树并运行 `keelson context --paths <files>`；修改共享模块前运行 `keelson impact <files>`。
- **BOUND（定界）** — trivial 直接做；quick 先写回理解再 `keelson new`；spec 先澄清验收边界、起草 delta specs，批准后再实现。
- **BUILD（构建）** — 一次只推进一个纵向切片。不要夹带无关清理；不得静默削弱测试或改变行为契约。
- **SENSE（感知）** — 尽早运行便宜且相关的检查。只有当前工作树上的新鲜 `keelson check --record` 证据之后，才能宣称完成、修复或通过。
- **RECONCILE（收敛）** — 把稳定事实写回 specs/rules/glossary/NOW；未完成工作用 `keelson handoff <name>` 留下可恢复状态。
- 同一类失败反复出现时运行 `keelson retro`，把它提升为窄范围 rule 或可执行 fitness check；自动化接管不变量后删减重复提示词。
- 如果 `NOW.md` 以 "First contact" 开头，就根据仓库起草 `INTENT.md`，已有代码时再起草 specs/rules，然后请所有者确认或修正。不要让所有者手写脚手架。

canonical 任务路由器是 `.keelson/skill/SKILL.md`。只读取它为当前任务路由到的 reference。
