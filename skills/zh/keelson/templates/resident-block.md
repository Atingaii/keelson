<!-- keelson:start -->
## Keelson

本仓库把项目事实保存在 `.keelson/`；已有文档只从 `config.yaml` 引用，绝不复制。完整工作流在 `keelson` skill 中，深层 reference 仅按需读取。

- **定向：** 非平凡修改前先看工作树并运行 `keelson context --paths <files>`；改共享模块前运行 `keelson impact <files>`。
- **定界：** trivial 直接做；quick 先写回理解再 `keelson new`；spec 先澄清、写验收与 delta specs，获批后再实现。
- **构建：** 一次只推进一个纵向切片。无关清理不要顺手带入；不得静默削弱测试或改变行为契约。
- **感知：** 尽早跑便宜且相关的检查；只有当前工作树上的新鲜 `keelson check --record` 证据之后才能说“完成/修复/通过”。
- **收敛：** 把稳定事实写回 specs/rules/NOW；未完成工作用 `keelson handoff <name>` 留下可恢复状态。
- 同一类失败重复出现时运行 `keelson retro`；把模式提升为窄范围 rule 或可执行 fitness check，再删减重复提示词。
- 如果 `NOW.md` 以 "First contact" 开头，就根据仓库起草 `INTENT.md`（已有代码时再加 specs/rules）并请所有者确认；不要让所有者手写脚手架。
<!-- keelson:end -->
