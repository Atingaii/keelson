# Keelson

[English](README.md)

一层承重而不显形的 AI 编码代理工作流。初始化一次，之后照常对话。

[![npm version](https://img.shields.io/npm/v/keelson?style=flat-square)](https://www.npmjs.com/package/keelson)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg?style=flat-square)](LICENSE)
[![CI](https://img.shields.io/github/actions/workflow/status/Atingaii/keelson/ci.yml?branch=main&style=flat-square)](https://github.com/Atingaii/keelson/actions/workflows/ci.yml)

Keelson 把项目的工作事实保存在一个小小的 `.keelson/` 目录里：项目为什么存在、当前在做什么、系统今天如何运作、哪些约定适用于哪些路径。代理动手前先读这些事实，完成后再把新事实写回去。你还是像以前那样和它对话。聊天里没有任何需要敲的命令。

## 为什么需要它

- **代理每个会话都会忘掉项目。** 约定、决策和做到一半的工作都留在聊天记录里，然后消失。Keelson 把它们保存在仓库中，代理几秒钟就能读完。
- **规格和代码会渐行渐远。** 一份写一次的"它是怎么工作的"，一个月内就会失真。Keelson 把每次变更合并回规格，让规格始终描述当前的系统。
- **每个任务都跑在最贵的模型上。** 一次重命名和一个设计决策花的钱一样多。Keelson 给任务打上 effort 层级，运行时再把层级解析成模型别名。

## 用起来是什么感觉

```text
你：    给订单列表加分页。

代理：  我的理解是：GET /orders 加 offset 分页（page、size，默认 20），
        沿用 rules/api.md 里的响应封装；表格加分页器，不做无限滚动。
        假设：排序仍为 created_at desc。
        完成标准：`npm test -- orders` 通过，分页器正常渲染。
        这是 quick 变更，开始了。

        ……编辑代码，跑测试……

        完成：/orders 已支持 offset 分页，表格已有分页器。
        证据：`npm test -- orders` exit 0（14 passed）；`npm run lint` exit 0。
        已落地：.keelson/specs/orders 已更新，NOW.md 已重写。
```

第二天，新会话：

```text
你：    continue

代理：  NOW.md 显示没有进行中的工作；上一步是观察一周订单延迟看板。
        有什么新任务吗？
```

## 快速开始

需要 Node.js 20 或更高版本。

```bash
npm install -g keelson
cd your-project
keelson init                      # 默认面向 Claude Code
keelson init --tools claude,codex # 或同时面向多个工具
```

然后：

1. 编辑 `.keelson/INTENT.md`，写清项目为什么存在、明确不做什么。
2. 和代理对话。没有别的要敲。

已有代码的项目？运行 `keelson init --onboard`。它会把一个入门任务写进 `NOW.md`；对代理说"continue"，它会从代码中起草 specs 和 rules 供你确认。

想让代理使用中文版技能？运行 `keelson init --lang zh`，安装的 SKILL.md、references 和常驻块都会是中文版本。

Claude Code 用户也可以从插件市场安装技能：

```text
/plugin marketplace add Atingaii/keelson
/plugin install keelson@keelson
```

`keelson init` 和其他命令仍然需要 CLI。

## `.keelson/` 里有什么

| 路径 | 内容 | 谁来写 |
|---|---|---|
| `INTENT.md` | 项目为什么存在、边界、硬约束、工作默认值 | 你，写一次 |
| `NOW.md` | 当前在做什么、卡在哪、下一步。现在时，覆盖式更新 | 代理，在落地时 |
| `specs/<capability>/spec.md` | 系统今天的行为：requirements、scenarios、decisions | 代理，在落地时合并 |
| `rules/index.md` 与 `rules/*.md` | 按路径 glob 路由的约定 | 你和代理 |
| `changes/<name>/` | 每个进行中的变更一个目录：`change.md`、`tasks.md`、`ledger.md`、delta specs | 代理 |
| `config.yaml` | 工具、profile、检查命令、模型覆盖 | `keelson init` |

没有进行中的工作时 `changes/` 是空的。变更落地后，它的 delta specs 合并进 `specs/`，decisions 折叠进对应 spec 的 `Decisions` 段，目录被删除。ledger 留在 git 历史中。

## 它是怎么运转的

三个小机制让代理不需要每次被告知该做什么。

1. **一个常驻块**，不到 20 行，写在 `CLAUDE.md` 或 `AGENTS.md` 里。它说明 `.keelson/` 里有什么、如何给变更定大小、如何证明工作完成。
2. **两个 hook**（Claude Code）。一个在会话开始时打印 `NOW.md` 和活动中的变更；另一个每次提示打印一行当前变更及其阶段，项目空闲时什么都不打印。hook 只注入状态，从不注入指令。
3. **一个技能**，按阶段路由。`SKILL.md` 约 50 行，为 shaping、planning、building、verifying、landing、debugging 各指向一个 reference。代理只读它需要的那一份。

技能里没有任何门禁。每条准则都说明它为什么存在，好让代理判断何时不适用。

## 变更大小

大小由代理判断。你可以用"按 spec 处理"或"直接做"覆盖。

| 大小 | 信号 | 会发生什么 |
|---|---|---|
| trivial | 样式、错字、单文件显式修复、行为不变 | 直接做完。不建 change 目录 |
| quick | 涉及多个文件、意图清楚、行为契约不变 | 代理用几行写回理解，创建 change，继续 |
| spec | 行为契约变化、新增或删除能力、放弃显而易见的方案 | 代理访谈你，起草 `change.md` 和 delta specs，等待批准 |

如果 quick 变更也希望先批准，在 `config.yaml` 里设 `confirm.quick: wait`。

## Effort 层级与模型

`tasks.md` 里的任务带一个 effort 层级：`light`、`standard` 或 `deep`。当宿主提供子代理时，代理按任务层级解析出的模型分派每个任务。评审者的层级永远不低于实施者。同一层级失败两次就升一级。

层级按以下顺序解析为模型别名：显式指定 → 项目 `config.yaml` → `~/.keelson/models.yaml` → 内置注册表 → 平台 rank 兜底。注册表把层级映射到浮动的系列别名，从不映射到带日期的模型 ID。同一系列发布新版本时，什么都不用改。`keelson validate` 会拒绝 `.keelson/` 中任何带日期的 ID。

```bash
keelson models                    # 本平台的 层级 → 别名
keelson models --resolve light    # 只打印别名，供脚本使用
keelson models --refresh          # 拉取最新注册表；设置了密钥时核对 provider 目录
keelson models rank <alias> deep  # 为新系列写一条用户级覆盖
```

详见 [docs/zh/models.md](docs/zh/models.md)。

## 设计上会越来越薄

技能 references 里的每条准则都带一条隐藏注释：它防止的失败，以及应当删除它的条件。`keelson retro` 读取所有 ledger，包括从 git 历史中恢复的已落地变更的 ledger，统计根因数量、各层级一次通过率和验证失败次数，并建议删掉哪些准则、补上哪些 rules。

同一份源文件出两种 profile。`lean`（默认）只保留姿态和原则。`guided` 增加步骤清单和示例。用 `keelson init --profile guided` 切换。

## 支持的工具

| 工具 | 技能位置 | 指令文件 | Hooks |
|---|---|---|---|
| Claude Code（`claude`） | `.claude/skills/keelson/` | `CLAUDE.md` | 有 |
| Codex CLI（`codex`） | `.agents/skills/keelson/` | `AGENTS.md` | 无 |
| Cursor（`cursor`） | `.agents/skills/keelson/` | `AGENTS.md` 和 `.cursor/rules/keelson.mdc` | 无 |
| OpenCode（`opencode`） | `.agents/skills/keelson/` | `AGENTS.md` | 无 |
| Gemini CLI（`gemini`） | `.agents/skills/keelson/` | `GEMINI.md` | 无 |

没有 hooks 时，常驻块会告诉代理在非平凡工作前运行 `keelson context`。

## CLI

| 命令 | 用途 |
|---|---|
| `keelson init` | 创建 `.keelson/`，安装技能、常驻块和 hooks |
| `keelson update` | 升级后重新生成生成物 |
| `keelson context --paths <files>` | 打印 INTENT、NOW、活动中的变更，以及匹配这些路径的 rules |
| `keelson new <name> --tier quick\|spec` | 搭建一个 change 目录 |
| `keelson status` | 活动中的变更、阶段、任务、NOW.md |
| `keelson validate` | 结构校验；有错误时返回非零 |
| `keelson check` | 运行项目的检查命令并报告退出码 |
| `keelson land [name]` | 合并 delta specs，折叠 decisions，删除或归档变更 |
| `keelson retro` | ledger 指标与裁剪建议 |
| `keelson models` | 把 effort 层级解析为模型别名 |
| `keelson ablate` / `restore` | 移除所有 Keelson 表面做 A/B 对照，然后原样恢复 |

完整参考：[docs/zh/cli.md](docs/zh/cli.md)。

## 文档

- [快速上手](docs/zh/getting-started.md)
- [工作原理](docs/zh/how-it-works.md)
- [配置](docs/zh/configuration.md)
- [CLI 参考](docs/zh/cli.md)
- [Effort 层级与模型](docs/zh/models.md)
- [常见问题](docs/zh/faq.md)
- [English](README.md)

## 参与贡献

欢迎提 issue 和 pull request。见 [CONTRIBUTING.md](CONTRIBUTING.md)。本仓库自己也在用 Keelson；`.keelson/` 里就是一个活的示例。

## 许可证

[MIT](LICENSE)
