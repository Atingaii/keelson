# Keelson

[English](README.md)

面向长期项目的 Coding Agent 工程协作层。初始化一次，之后照常对话。

[![npm version](https://img.shields.io/npm/v/keelson?style=flat-square)](https://www.npmjs.com/package/keelson)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg?style=flat-square)](LICENSE)
[![CI](https://img.shields.io/github/actions/workflow/status/Atingaii/keelson/ci.yml?branch=main&style=flat-square)](https://github.com/Atingaii/keelson/actions/workflows/ci.yml)

AI 写代码很快。但每个会话都从零开始：不记得项目为什么长成现在这样、哪些路走过又被否掉、哪些活做了一半、哪条约定适用于哪里。在一个要活好几年的项目上，这笔代价大过任何单次任务省下的时间。

- **理由消失。** 那段看起来别扭的代码是有意为之的取舍。三个月后，一个新会话把它"清理"掉，重新打开一个早已关闭的 bug。六月被否决的方案，九月又被提了出来。
- **规格漂移。** 描述系统行为的文档曾经是真的。没有人随每次改动更新它，于是它变成小说，而代理读的就是小说。
- **"测试通过"不等于"需求满足"。** 周二代码上的一次全绿，对周三的改动什么都说明不了；对那条没人写测试的验收标准，也什么都说明不了。
- **没人能接着做。** 下一个会话、下一个人、下一个模型，从 git 和聊天记录里重新推导状态，重试早已排除的假设，把过期的验证当成现状。
- **并行工作相撞。** 两个变更用两种方式实现同一个契约，冲突在合并时才浮现。

Keelson 把项目需要的事实留在仓库里，以代理在恰当时机读取、完成后写回的形式。它很小：一组核心文件、一个只做机械性工作的薄 CLI、一个代理按需阅读的技能。完整的工程能力在变更需要时才展开。项目状态和代码在同一个 pull request 里接受审查。验证接入你已有的 Git、测试和 CI。轻，意味着你不用管理流程，不意味着项目丢掉它需要的设计、计划和状态。

## 理念

```text
→ 事实优先于流程
→ 状态优先于仪式
→ 证据优先于断言
→ 复用优先于复制
→ 随模型变强而变薄
```

## 实际效果

```text
你：   让用户可以用链接分享相册。

代理： 我的理解是：每个相册一个分享链接，拿到链接的人都能打开，
       支持撤销和过期。不做：按账号授权。发现：rules/api.md 里的
       鉴权规则要求每次读取都经过 canView()。这会新增一个能力，
       所以是 spec 变更。
       规划前只问一个最高价值问题：撤销后的链接要保留缩略图缓存吗？
       我建议不保留；这样泄露的链接在撤销后什么也泄露不了。

你：   撤销后不留缩略图。过期时间我还没想好。

代理： 已记录。过期时间作为未决问题，只阻塞"撤销与过期"这个切片。
       我现在按"链接默认 7 天过期"的假设先做"创建与访问"。

       ... keelson new share-links --tier spec --capability sharing
       ... 起草 change.md（验收项、未决问题、假设决策）、delta spec，
           以及含两个切片的 tasks.md；构建切片 1 ...
       ... keelson check --record "share links: create and access"

       完成：切片"创建与访问"。POST /shares 和分享页。
       证据：`npm run lint` exit 0；`npm test` exit 0 · tree 5bcb829dae。
       验收 2/4 已勾选；另外两项属于过期切片。
       未落地：一个未决问题和一个假设决策需要你确认。
       已写交接；NOW.md 已更新。
```

第二天，新会话：

```text
[keelson] Active changes: share-links (spec, in-progress, 3/5 tasks, ann)
  share-links handoff → next: decide expiry, then build "Revoke and expiry"

你：   继续。过期时间 30 天，链接可以延长一次。

代理： 更新 change.md：过期决策已确认，未决问题关闭，delta spec
       增加延长场景。构建第二个切片。
       ... keelson check --record "share links: revoke and expiry" ...
       5 个任务和 4/4 验收项全部勾选。落地。
       ... keelson land share-links --confirm-assumptions --now "Nothing in flight."
       specs/sharing 已更新（+3 条需求，3 条决策）。变更已折叠；
       ledger 留在 git 历史里。在下一个 tag 之前保持未发布。
```

## 快速开始

需要 Node.js 20 或更新版本。

```bash
npm install -g keelson
cd your-project
keelson init                 # 自动选 verified/documented 宿主；否则只装通用 AGENTS.md 层
keelson init --claude --codex   # 或点名你使用的一等公民宿主
```

这是唯一的一步。canonical 运行时统一位于 `.keelson/`：`workflow.md` 加 `skill/` 与其 references。init 只在外部写入很薄的发现入口，例如 `AGENTS.md` 和 `.agents/skills/keelson/SKILL.md`，所以以后换 Agent 也只会找到同一份真源，不会复制整套规则。在该目录下打开你的代理，开始对话。首次接触时，它读取仓库，起草 `.keelson/INTENT.md`（项目为什么存在、明确不做什么、代理可以自行决定什么）；对已有代码的项目，还会为每个能力写一份 spec，为有约定的路径写 rules。然后用一次简短的交流请你确认。这些文件你永远不需要手写。

`keelson init` 还会引用它找到的架构说明、决策记录、CI 和 issue 跟踪器，而不是复制它们。见[已有项目](docs/zh/existing-projects.md)。

`keelson init --lang zh` 安装中文版的代理技能。

Claude Code 用户也可以从插件市场安装技能（`/plugin marketplace add Atingaii/keelson`，然后 `/plugin install keelson@keelson`）。`keelson init` 和其他命令仍然需要 CLI。

## 仓库里留下什么

| 路径 | 内容 | 谁来写 |
|---|---|---|
| `.keelson/README.md` | 人类导航：先看什么、每个 Keelson 文件干什么、落地后什么会留下 | Keelson；`update` 刷新 |
| `.keelson/workflow.md` | canonical 常驻执行主回路 | Keelson；`update` 刷新 |
| `.keelson/skill/` | canonical `SKILL.md` 与按需 references | Keelson；`update` 刷新 |
| `.keelson/INTENT.md` | 项目为什么存在、边界、硬约束、代理可以自行决定什么 | Agent 起草；负责人确认 |
| `.keelson/ROADMAP.md` | 当前里程碑；之后的工作只写方向。有跟踪器时链接过去 | 你和代理 |
| `.keelson/NOW.md` | 在做什么、卡在哪、下一步。现在时，整体重写 | 代理，在停下或落地时 |
| `.keelson/GLOSSARY.md` | 一个术语一个含义，specs、代码和对话共用 | 你和代理，在用词开始漂移时 |
| specs（`paths.specs`，默认 `.keelson/specs/<capability>/spec.md`） | 系统今天如何运作：需求、场景、带被否方案的决策 | 代理，在落地时合并 |
| `.keelson/rules/` | 由 `rules/index.md` 按路径 glob 路由的约定 | 你和代理 |
| `.keelson/changes/<name>/` | 每个进行中的变更一个目录：`change.md`、`tasks.md`、`ledger.md`、`handoff.md`、delta specs | 代理 |
| `.keelson/config.yaml` | 工具、profile、检查命令、`paths.specs`、指向既有资料的 `refs`、文档预算、引导模式、模型覆盖 | `keelson init` |
| `.keelson/.local/` | 检查证据和本机状态。已加入 gitignore | `keelson check` |

无事进行时 `changes/` 为空。既有文档从 `config.yaml → refs` 引用，从不复制。

## 长期项目必须回答的六个问题

| 几个月之后，还能… | Keelson 的机制 |
|---|---|
| 说清项目解决什么、不做什么、决定过什么吗？ | `INTENT.md`；每个 spec 的 `Decisions` 段写明被否的方案；`(assumed)` 决策只在所有者确认后才折叠进去 |
| 换代理、换会话后准确接着做吗？ | `NOW.md`、每个变更的 `handoff.md`（盖有 commit 戳）、会话启动 hook 打印下一步 |
| 同时改多个模块而不漏掉依赖方吗？ | 三层上下文、`keelson impact <files>` 列出引用方和受影响的 specs、`keelson status` 里的共享契约警告 |
| 让人或代理并行工作而不互相覆盖吗？ | 每个变更有 owner 和分支、`keelson new --worktree`、`touches` 和 `depends`、冲突被暴露；跟踪器、pull request 和 CI 保持权威 |
| 相信绿色测试就是需求满足吗？ | 验收项映射到测试、命令、人工检查或评审；证据带工作树指纹，下次编辑后过期；陌生读者评审 |
| 合并后保持 specs、架构和后续工作同步吗？ | `keelson land` 拒绝过期证据、未决问题和漂移的 spec；delta specs 合并进真相；发布状态来自 tag；经验提升为 rules 和检查 |

## 三个状态，而不是一个 Done

每个变更带三个维度，由 `keelson status` 报告：

| 维度 | 取值 | 来源 |
|---|---|---|
| work | `clarifying`、`in-progress`、`blocked`、`in-review`、`integrated`、`cancelled` | `change.md` 里的 `status:`，否则由任务和 ledger 推导 |
| verification | `not-run`、`passed`、`failed`、`partial`、`stale` | 最后一条 `Verify:`，与当前工作树指纹比较 |
| release | `unreleased`，或 `release:` 写的内容 | git tag；上一个 tag 之后落地的变更都是未发布 |

于是"已实现、测试通过、等待你评审、未合并"和"已合并、迁移未执行"都能表达，而且都不是"完成"。

## 它如何工作

1. **一个极薄的发现块**，写在 `CLAUDE.md`、`AGENTS.md`、`GEMINI.md` 或 `CODEBUDDY.md` 里。它只把宿主指向 `.keelson/workflow.md` 和 `.keelson/skill/SKILL.md`，不再复制工作流。
2. **两个 hook**（Claude Code）。一个在会话启动时打印路线图的 `Now`、`NOW.md`、活动变更和交接的下一步。另一个在每个提示词前打印一行 work 与 verification 状态，项目空闲时什么都不打印。Hook 注入状态，从不注入指令。
3. **一个 canonical 技能**，位于 `.keelson/skill/SKILL.md`，按需要路由到 references。各宿主的 skill 目录只留一个发现 shim，不再各复制一套 references。
4. **一个薄 CLI**，只做机械性工作：搭脚手架、算指纹、合并 specs、记录证据、拒绝没有证据的落地。理解需求、分析影响、评审代码仍然由代理完成。

技能里没有任何东西是对代理的门禁。门禁作用于工件。

### 给正在学习工程的人

`keelson init --guide` 把所有者标记为一边构建一边学习工程的人。代理会先问场景再问技术，给每个选择配上推荐、原因、备选和取舍，在决定之后说出对应的工程概念，并在每个 spec 变更收尾时留一段简短的教学说明在对话里。文件、门禁和状态与其他人完全相同。

## 变更大小

大小由代理判断。你可以用"按 spec 处理"或"直接做"覆盖。

| 大小 | 信号 | 会发生什么 |
|---|---|---|
| trivial | 样式、错字、单文件显式修复、行为不变 | 直接做。不建变更目录 |
| quick | 涉及多个文件、意图清楚、行为契约不变 | 代理写回理解，创建带验收清单的变更，继续 |
| spec | 行为契约变化、新增或删除能力、迁移、放弃显而易见的方案 | 代理澄清到下一个切片可交付，起草带验收项和 delta specs 的 `change.md`，等待批准 |

在 `config.yaml` 里设 `confirm.quick: wait`，quick 变更也会先等你批准。无人值守运行时，代理在 `(assumed)` 决策下构建，落地前停下。

## effort 层级与模型

任务带一个 effort 层级：`light`、`standard` 或 `deep`。宿主提供子代理时，代理按层级解析出的模型分派每个任务，评审者不低于实现者，验证失败两次升一级。层级解析为浮动的模型系列别名，从不使用带日期的 ID，所以新模型发布不需要改仓库里的任何东西。见 [docs/zh/models.md](docs/zh/models.md)。

## 设计成会越来越薄

技能里的每条准则都带一段隐藏注释：它防止的失败，以及应当删除它的条件。`keelson retro` 读取每一份 ledger（包括从 git 历史里找回的已折叠变更），建议删掉哪些指导、补上哪些 rules 或检查。同一份源生成两个 profile：`lean`（默认）只保留姿态和原则，`guided` 加上步骤清单和示例。

项目文档也用同样的方式保持精简。`config.yaml` 给每种文档一个行数预算，`keelson doctor` 报告知识健康：超预算的文档、读起来像历史的需求文字、跨能力重复的需求、闲置两周的变更、超过 25 个任务的变更、超预算的常驻 rules、比代码旧的生成文档。每条发现都是一个小修复的建议，从不自动重写。原则是：项目资料可以随项目增长，但每次任务读取的内容不能随全部历史一起增长。

## 坦诚的边界

- 路径路由和 `keelson impact` 是导航，不是证明。grep 看不见的调用方仍然要靠代理阅读。
- 磁盘上的文件不是分布式锁，分支也不消除语义冲突。跨机器的认领与合并控制属于你的跟踪器、pull request 和 CI。
- 第二个代理同意第一个代理，是一个信号，不是正确性证明。真正被检查的是验收清单。
- 当前只有 Claude Code 使用 Keelson hook。其余一等公民宿主使用各自官方文档明确的说明/Skill 发现路径，并共同指向同一 `.keelson/` 真源。Claude Code 已做端到端使用，Codex 已验证 Skill 加载；其余适配器依赖宿主官方文档和统一适配契约，不把“有目录”夸大成完整会话验证。
- Keelson 从不执行生产操作。它提醒，你来运行。
- 大型项目的长期演进是设计目标。0.x 版本在真实的 Claude Code 会话和小项目上跑过；Codex CLI 适配器验证过能加载技能，但还没有完整走完一个变更。超出这个范围的说法都视为未验证。

## 支持的工具

Keelson 有意把官方矩阵控制得很小：**7 个一等公民 CLI 宿主 + 1 个通用标准兜底层**。要称为一等公民，必须同时满足：发现路径已经真实验证或有宿主官方文档；init/update/uninstall 的所有权确定；完整指导只有一份 `.keelson/` 真源；`doctor` 能诊断；并通过同一套跨平台适配契约测试。名单之外的工具如果读取 `AGENTS.md` 和/或 `.agents/skills/`，仍可使用 `--agents`；Keelson 不再为它们猜一个专用隐藏目录。

| 宿主 | 标志 | 说明发现路径 | Skill 发现路径 | Hook | 依据 |
|---|---|---|---|---|---|
| Claude Code | `--claude` | `CLAUDE.md` | `.claude/skills/` | 会话启动 + prompt 状态 | verified |
| Codex CLI | `--codex` | `AGENTS.md` | `.agents/skills/` | — | verified |
| OpenCode | `--opencode` | `AGENTS.md` | `.agents/skills/` | — | documented |
| Pi coding agent | `--pi` | `AGENTS.md` | `.agents/skills/` | — | documented |
| Gemini CLI | `--gemini` | `GEMINI.md` | `.agents/skills/` | — | documented |
| Kiro CLI | `--kiro` | `AGENTS.md` | `.kiro/skills/` | — | documented |
| CodeBuddy CLI | `--codebuddy` | `CODEBUDDY.md` | `.codebuddy/skills/` | — | documented |
| 通用 Agent Skills 读取器 | `--agents` | `AGENTS.md` | `.agents/skills/` | — | 标准兜底 |

没有显式指定宿主时，`keelson init` 只自动选择本机已安装、且路径为 verified/documented 的一等公民；一个也没有时只安装通用层。不管选择几个宿主，最终都收敛到同一份 `.keelson/workflow.md + .keelson/skill/`。`keelson platforms` 会显示支持层级、路径、可信度、本机安装状态和项目配置状态。
## CLI

| 命令 | 用途 |
|---|---|
| `keelson init` / `update` | 创建或刷新 canonical `.keelson/` 运行时、宿主发现 shim 与 hook。`--dry-run` 预览 |
| `keelson context --paths <files>` | INTENT、ROADMAP、NOW、活动变更、引用、命中的 rules |
| `keelson impact <files>` | 引用方、受影响的 specs 和 rules、重叠的活动变更 |
| `keelson new <name>` | 搭建带 owner、分支、delta 基线的变更；`--worktree` 隔离 |
| `keelson status` | work、verification、release 状态；切片、验收、未决问题、冲突 |
| `keelson check --record` | 运行检查、保存证据、追加带工作树指纹的 `Verify:` 条目 |
| `keelson handoff <name>` | 创建或重新盖戳 `handoff.md` |
| `keelson land <name>` | 合并 delta specs、折叠决策、折叠或归档变更；没有证据则拒绝 |
| `keelson cancel <name>` | 把变更归档为已取消，不合并任何内容 |
| `keelson validate` | 结构检查，有错误时非零退出 |
| `keelson retro` | ledger 指标和裁剪建议 |
| `keelson models` | effort 层级到模型别名的解析 |
| `keelson doctor` | 诊断安装并报告知识健康 |
| `keelson platforms` | 列出受支持的工具、它们的文件位置以及哪些已安装 |
| `keelson ablate` / `restore` | 摘除全部表面做 A/B 对照，再原样恢复 |
| `keelson uninstall` | 移除生成的表面；`--purge` 连 `.keelson/` 一起移除 |

完整参考：[docs/zh/cli.md](docs/zh/cli.md)。

## 文档

- [快速上手](docs/zh/getting-started.md)
- [概念](docs/zh/concepts.md)
- [它如何工作](docs/zh/how-it-works.md)
- [已有项目](docs/zh/existing-projects.md)
- [协作：会话、人与代理](docs/zh/collaboration.md)
- [验证](docs/zh/verification.md)
- [配置](docs/zh/configuration.md)
- [CLI 参考](docs/zh/cli.md)
- [effort 层级与模型](docs/zh/models.md)
- [常见问题](docs/zh/faq.md)
- [English](README.md)

## 参与贡献

欢迎 issue 和 pull request。见 [CONTRIBUTING.md](CONTRIBUTING.md)。本仓库自己也在用 Keelson；看看 `.keelson/` 就是一个活的例子。

## 许可

[MIT](LICENSE)
