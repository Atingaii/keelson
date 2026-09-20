# 发布到 npm

仓库当前配置为 `@atingaii/keelson`，版本 `0.4.0`。提交到 Git 不等于发布到 npm；以下用户安装命令仅在成功发布后可用。

## 首次发布

1. [注册 npm 账号](https://www.npmjs.com/signup)，验证邮箱并启用双重验证。公开的 scoped package 可以免费发布。npm 用户名与 GitHub 用户名相互独立。
2. 确认包名前缀。发布 `@atingaii/keelson` 需要拥有 npm 的 `atingaii` 账号，或获得该 npm 组织的发布权限。如果注册了其他用户名，先一起修改 `package.json`、锁文件和安装示例中的包名。包名未被使用不代表已经拥有前缀权限。
3. 在你自己的终端中进入仓库并登录：

   ```bash
   npm login --registry=https://registry.npmjs.org/
   npm whoami --registry=https://registry.npmjs.org/
   ```

4. 审阅本次版本和打包内容：

   ```bash
   npm ci
   npm pack --dry-run
   ```

   发布包包含 CLI、运行时模块、技能、hooks 和 registry。包的文件白名单排除了仓库历史、`.keelson/`、测试及私有运行时文件。为 `CHANGELOG.md` 补充发布日期，并按确定的包名准备 README 安装说明。

5. 负责人批准公开发布后，执行发布并完成 npm 的认证提示：

   ```bash
   npm publish --access public
   npm view @atingaii/keelson@0.4.0 version
   ```

   如果包名有变，使用确认后的名称。现有 `prepublishOnly` 会运行测试套件，检查失败会停止发布。确认 npm 上的版本可用后，再宣布发布并将 README 默认安装方式改为 npm。

不要将密码、token 或恢复码发到聊天或 issue。已发布的包名与版本组合不可复用，后续发布需要新版本号。

## 发布后，用户如何安装

需要 Node.js 20+ 和 npm：

```bash
npm install -g @atingaii/keelson
cd /path/to/your/project
keelson init --codex --lang zh
```

随后在该目录启动编码 Agent，直接描述需求。其他宿主见 [Agent 支持](../platforms.md)。全局安装使 Agent 后续始终能调用 `keelson`；仅运行一次 `npx ... init` 不会提供这个持续可用的命令。

升级时运行 `npm install -g @atingaii/keelson@latest`，再到各个已初始化项目中运行 `keelson update`。`update` 更新项目集成入口，不负责下载新版 CLI。

## 后续自动发布

现有 `.github/workflows/release.yml` 在推送 `v*` 标签时运行，目前需要仓库的 `NPM_TOKEN` secret。它会安装依赖、执行检查、发布 npm 包并创建 GitHub Release。推送标签属于发布操作，需要负责人批准，不要用推标签来试验配置。

首次发布后，可以迁移到 npm 的[可信发布](https://docs.npmjs.com/trusted-publishers/)，通过 GitHub Actions OIDC 取代长期 token。npm 包设置填写 GitHub 用户 `Atingaii`、仓库 `keelson`、工作流文件名 `release.yml`；同时需要将工作流切换到支持的 Node/npm 版本及 OIDC 认证。仓库目前尚未完成这项迁移。

官方说明：[公开 scoped package](https://docs.npmjs.com/creating-and-publishing-scoped-public-packages/) · [双重验证设置](https://docs.npmjs.com/configuring-two-factor-authentication/)。
