# 快速开始

使用 Node.js 20 或以上版本，从仓库安装：

```bash
git clone https://github.com/Atingaii/keelson.git
cd keelson
npm ci
npm link
cd /path/to/your/project
keelson init --codex --lang zh
```

`npm link` 将当前源码的 CLI 放到命令路径。团队需要可复现安装时，应固定 Git 提交。包名为 `@atingaii/keelson`，此处不代表已发布到 npm。

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
