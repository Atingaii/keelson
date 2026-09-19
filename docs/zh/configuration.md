[English](../configuration.md)

# 配置

配置分两处。`.keelson/config.yaml` 属于项目，随仓库提交。`~/.keelson/` 属于用户，从不提交。

## `.keelson/config.yaml`

每个键都是可选的。`keelson init` 写入默认值。未知键会被忽略。

```yaml
version: 1
tools:
  - claude
lang: en
profile: lean
default_tier: auto
confirm:
  quick: proceed
  spec: wait
land: fold
check:
  - npm run lint
  - npm run test
context: ""
models: {}
effort:
  review_min: standard
  plan_min: deep
  verify_min: deep
  escalate_after: 2
```

| 键 | 默认值 | 含义 |
|---|---|---|
| `version` | `1` | 配置模式版本 |
| `tools` | `[claude]` | 要为其生成文件的工具。`claude`、`codex`、`cursor`、`opencode`、`gemini` 中的一个或多个。`keelson init --tools` 设置它 |
| `lang` | `en` | 安装的技能和模板的语言：`en` 或 `zh`。`keelson init --lang` 设置它 |
| `profile` | `lean` | `lean` 只发出姿态和原则。`guided` 保留额外的步骤清单和示例。`keelson init --profile` 设置它 |
| `default_tier` | `auto` | 仅供参考。`auto` 表示代理为每个变更定大小。设为 `quick` 或 `spec` 可在代理读取的文件中表明偏好 |
| `confirm.quick` | `proceed` | `proceed`：代理写回理解后直接开始。`wait`：先等待批准 |
| `confirm.spec` | `wait` | spec 变更总是等待，除非你设为 `proceed` |
| `land` | `fold` | `fold` 在合并后删除 change 目录。`keep` 把它移到 `changes/archive/` |
| `check` | 自动检测 | `keelson check` 从项目根目录通过 shell 按顺序运行的命令。首次 init 时从 `package.json` 脚本、`pyproject.toml`、`go.mod` 或 `Cargo.toml` 检测 |
| `context` | `""` | 打印在 `keelson context` 输出顶部的自由文本。放那些不适合写进 INTENT.md 的事实，比如技术栈摘要 |
| `models` | `{}` | 项目级层级覆盖。`models: { deep: opus }` 对所有平台生效，或 `models: { claude: { deep: opus } }` 按平台生效。只能用别名 |
| `effort.review_min` | `standard` | 评审子代理的最低层级 |
| `effort.plan_min` | `deep` | 起草 `change.md` 和 delta specs 的最低层级 |
| `effort.verify_min` | `deep` | spec 变更最终陌生读者评审的最低层级 |
| `effort.escalate_after` | `2` | 同一层级失败多少次后升一级重新分派 |

`profile` 或 `land` 的值超出允许范围时，`keelson validate` 报错。

## `.keelson/INTENT.md` 的工作默认值

`INTENT.md` 以 `Working defaults` 段结尾。它是代理阅读的文字，不是被解析的配置。用它把同样的偏好用语言写出来，例如"凡是涉及 `payments/` 的一律按 spec 处理"。两个文件应当一致；`config.yaml` 是 CLI 实际执行的那份。

## `~/.keelson/`

| 文件 | 谁来写 | 用途 |
|---|---|---|
| `models.yaml` | `keelson models rank <alias> <tier>` | 用户级层级覆盖，`platform → tier → alias`。优先级高于注册表，低于项目配置 |
| `models.cache.json` | `keelson init`、`keelson models --detect`、`--refresh` | 已安装的工具及版本、配置的默认模型、哪些 provider 密钥存在、在 provider 目录中见过的模型、未分层的模型。24 小时后视为过期 |
| `registry.json` | `keelson models --refresh` | 内置注册表的较新副本，当其 `updated` 日期更晚时使用 |
| `ablations/<hash>/` | `keelson ablate` | 某个项目被收起的文件和清单。由 `keelson restore` 移除 |

## 环境变量

| 变量 | 作用 |
|---|---|
| `ANTHROPIC_MODEL`、`OPENAI_MODEL` | 被 `keelson models --detect` 报告为该工具的默认模型 |
| `ANTHROPIC_API_KEY`、`OPENAI_API_KEY`、`GEMINI_API_KEY` | 检测时记录它们是否存在。`--refresh` 用前两个查询 provider 目录 |
| `CLAUDE_PROJECT_DIR` | 由 Claude Code 设置；hooks 用它定位项目 |
| `NO_COLOR` | 关闭 CLI 彩色输出 |
| `KEELSON_DEBUG` | 出错时打印堆栈 |
