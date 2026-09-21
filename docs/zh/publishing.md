# 发布到 npm

Keelson 的公开包为 `@zyaiting/keelson`，可执行命令为 `keelson`。npm 前缀属于 `zyaiting`；GitHub 仓库仍为 `Atingaii/keelson`。

## 用户安装

需要 Node.js 20+ 和 npm：

```bash
npm install -g @zyaiting/keelson
cd /path/to/your/project
keelson init --codex --lang zh
```

随后在该目录启动编码 Agent，直接描述需求。其他宿主见 [Agent 支持](../platforms.md)。全局安装使 Agent 后续始终能调用 `keelson`；仅运行一次 `npx ... init` 不会提供这个持续可用的命令。

升级时运行 `npm install -g @zyaiting/keelson@latest`，再到各个已初始化项目中运行 `keelson update`。`update` 更新项目集成入口，不负责下载新版 CLI。

## 维护者发布

1. 使用 `zyaiting` npm 账号，或已获得该包发布权限的账号。验证邮箱并启用双重验证，在自己的终端登录：

   ```bash
   npm login --registry=https://registry.npmjs.org/
   npm whoami --registry=https://registry.npmjs.org/
   ```

2. 更新版本号、锁文件、对应技能版本及 `CHANGELOG.md`。已发布的包名与版本组合不可复用。审阅改动及打包内容：

   ```bash
   npm ci
   npm pack --dry-run
   ```

   文件白名单包含 CLI、运行时模块、技能、hooks 和 registry，排除了仓库历史、`.keelson/`、测试及私有运行时文件。发布前仍需审阅最终文件清单。

3. 获得负责人的发布授权后，执行发布并完成 npm 的认证提示：

   ```bash
   npm publish --access public
   npm view @zyaiting/keelson version
   ```

   现有 `prepublishOnly` 会运行测试套件，失败会停止发布。npm 会先[扫描新发布的包](https://github.blog/changelog/2026-07-28-npm-publish-time-malware-scanning-and-dual-use-metadata/)，因此发布成功后可能仍需等待几分钟才能安装。等待并核验准确版本、验证全新安装后，再宣布可用；不要为解决这段延迟而重复发布同一版本。不要将密码、token 或恢复码发到聊天或 issue。

## 自动发布

现有 `.github/workflows/release.yml` 在推送 `v*` 标签时运行，需要仓库的 `NPM_TOKEN` secret。它会安装依赖、执行检查、发布 npm 包并创建 GitHub Release。手动发布过的版本不要再推送标签：该工作流会尝试重复发布。

npm 的[可信发布](https://docs.npmjs.com/trusted-publishers/)可通过 GitHub Actions OIDC 取代长期 token。npm 包设置填写 GitHub 用户 `Atingaii`、仓库 `keelson`、工作流文件名 `release.yml`；工作流还需使用支持的 Node/npm 版本及 OIDC 认证。仓库目前尚未完成这项迁移。

官方说明：[公开 scoped package](https://docs.npmjs.com/creating-and-publishing-scoped-public-packages/) · [双重验证设置](https://docs.npmjs.com/configuring-two-factor-authentication/)。
