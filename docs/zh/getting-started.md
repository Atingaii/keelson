# 快速开始

需要 Node.js 20+ 和 npm。全局安装 CLI 后，在你的项目中初始化：

```bash
npm install -g @zyaiting/keelson
cd /path/to/your/project
keelson init --codex --lang zh
```

安装只需一次；每个项目分别初始化。全局安装让 Agent 后续能持续调用 `keelson`。其他宿主见 [Agent 支持](../platforms.md)。

升级时运行 `npm install -g @zyaiting/keelson@latest`，再到各项目运行 `keelson update`。源码开发见[贡献指南](../../CONTRIBUTING.md)，维护者发布步骤见 [npm 发布](publishing.md)。

初始化创建精简的项目说明和宿主入口，不修改 `.gitignore`。在项目中启动 Codex，正常提出修改需求；它通过 `keelson guide` 加载指导。

手动体验：

1. `keelson new fix-pagination --tier quick` 创建变更。
2. 在 `.keelson/changes/fix-pagination/change.md` 写明结果和验收方法。
3. 完成代码和测试，实际验证后勾选验收项。
4. 在 `.keelson/config.yaml` 的 `check` 中填写项目已有检查命令，例如 `npm test`。
5. 检查命令内容后运行 `keelson check --trust --record`。
6. 查看 `keelson status`，门槛全部满足后运行 `keelson land fix-pagination`。

没有配置检查时会报错。测试退出码不能代替需求覆盖审查。规格级变更还需要 How、Impact，以及行为变化对应的差量契约。

`keelson ask` 保存决策及依据，`keelson doctor --session` 诊断会话身份。`update` 更新集成入口；`uninstall` 保留项目知识和证据。希望把包内指导一起提交时，显式使用 `init --vendor`。

详情见[证据与信任](verification.md)、[CLI](cli.md)及[配置](configuration.md)。
