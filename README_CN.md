<p align="center"><img src="docs/assets/keelson-banner.png" alt="Keelson：深蓝与铜色的龙骨标志" width="100%"></p>

# Keelson

**为 AI 辅助开发保留决策，以及能够核验的检查记录。**

[English](README.md) · [快速开始](docs/zh/getting-started.md) · [命令参考](docs/zh/cli.md) · [证据与信任](docs/zh/verification.md)

聊天里的“测试通过”容易丢失，也容易夸大。Keelson 记录实际执行的命令、输出摘要，以及检查对应的代码和契约。代码、规格、规则、配置、验收标准或决策变化后，证据就会失效。`land` 要求当前、完整、在本机受信任的检查记录，以及已完成的验收条件。

Keelson 由本地 CLI 和按需加载的 Agent Skill 组成，直接使用项目已有的仓库、测试和编码助手。CLI 不连接托管服务，不收集遥测，也不调用模型 API。

## 在已有项目中开始

需要 **Node.js 20+**。当前从本仓库安装；这里的 `0.4.0` 不代表已经发布到 npm。

```bash
git clone https://github.com/Atingaii/keelson.git
cd keelson
npm ci
npm link
cd /path/to/your/project
keelson init --codex
```

随后正常让 Codex 修改项目。它可以通过 `keelson guide` 读取指导，再按需读取具体参考。手动体验完整流程：

```bash
keelson new fix-pagination --tier quick
# 实现修复，完成 change.md 的验收项，并配置真实检查命令。
keelson check --trust --record
keelson status
keelson land fix-pagination
```

`--trust` 表示在本机明确同意执行配置中的 shell 命令，使用前先检查命令内容。命令变化后需要重新信任。手写 `Verify:` 文字不能作为归档凭据。[完整操作说明](docs/zh/getting-started.md)。

## 仓库中会留下什么

默认初始化只写入精简配置、项目说明和宿主发现入口，不向项目复制可执行 hook。`keelson guide` 从已安装的包读取指导；需要把指导一起提交的团队可以显式使用 `init --vendor`。

- `.keelson/` 保存项目意图、契约、变更、决策、签名记录和以内容摘要命名的日志。
- 本机密钥、会话绑定、信任记录及锁放在 Git 私有目录；非 Git 项目使用用户缓存目录。
- 初始化不会修改 `.gitignore`。按需提交持久记录，公开之前检查日志是否含敏感输出。
- `update`、`doctor --session` 和 `uninstall` 维护安装。卸载保留项目知识及变更证据。

## 核心能力

**记录实际检查。** Ed25519 签名的 DSSE envelope 包含 in-toto Statement，绑定完整代码树摘要、契约摘要、命令退出码和输出摘要。超时会使检查失败，并尝试终止命令进程组；局部检查不能授权归档。

**跨会话保留决策。** `keelson ask` 区分用户选择、工程判断和待查事实。决策前沿按照依赖关系，每次展示至多三个已具备前提的用户问题。重新打开已确定的决定必须说明原因；不可逆决定不能靠假设通过。

**明确归档门槛。** 验收项、未解决决策、依赖、契约漂移和证据新鲜度共同决定状态。`land --force --reason "…"` 会归档绕过原因。并发检查使用加锁追加；检查未结束时禁止归档，归档中断后先恢复再重试。

这些能力提供本地完整性检查。同一用户权限下的进程仍能读取私钥或修改 CLI。签名不能证明测试有意义、模型身份真实，也不构成任何法律合规认证。从另一台机器复制来的记录需要本机重新检查。[威胁模型及恢复说明](docs/zh/verification.md)。

## 平台与测试范围

Codex 的会话标识已在本地使用中验证。Claude Code、OpenCode、Gemini CLI、Kiro CLI、CodeBuddy、Pi 和通用 Agent Skills 提供生成式适配器及契约测试，不等于所有宿主都已完成真实端到端测试。请在实际使用环境运行 `keelson doctor`。[平台说明](docs/platforms.md)。

## 前端设计与交互

直接告诉 Agent：“改善设置页，保留现有品牌，补齐错误恢复和手机体验。”Keelson 按需提供设计规划、诊断、排版、配色、布局、动效、文案、首次使用、健壮性、适配、性能和浏览器迭代指导。

```bash
keelson design                         # 查看设计能力
keelson design harden "设置表单" --lang zh
keelson guide --list                   # 查看全部按需指导
```

设计命令生成给 Agent 的执行指导；Agent 负责实施、打开真实页面、检查交互并记录证据。命令本身不会启动浏览器或自动修改页面。[前端设计指南](docs/zh/frontend.md)。

## 开发

```bash
npm ci
npm run lint
npm test
npm run validate
npm pack --dry-run
```

[贡献指南](CONTRIBUTING.md) · [MIT 许可证](LICENSE)。
