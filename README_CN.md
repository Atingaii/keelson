<p align="center"><img src="https://raw.githubusercontent.com/Atingaii/keelson/main/docs/assets/keelson-banner.png" alt="Keelson" width="620"></p>

<p align="center"><strong>让 Agent 先想清楚，再按规范做完，把经验留在仓库。</strong></p>
<p align="center">为编码 Agent 提供项目记忆、工程方法和验收流程。你描述目标，Agent 推进实现，把决策与验证留在代码旁。</p>

<p align="center">
<a href="https://github.com/Atingaii/keelson/blob/main/README.md">English</a> ·
<a href="#快速开始">快速开始</a> ·
<a href="https://github.com/Atingaii/keelson/blob/main/docs/zh/README.md">文档</a> ·
<a href="https://github.com/Atingaii/keelson/blob/main/docs/platforms.md">Agent 支持</a>
</p>

<p align="center">
<a href="https://www.npmjs.com/package/@zyaiting/keelson"><img src="https://img.shields.io/npm/v/%40zyaiting%2Fkeelson" alt="npm 版本"></a>
<a href="https://github.com/Atingaii/keelson/actions/workflows/ci.yml"><img src="https://github.com/Atingaii/keelson/actions/workflows/ci.yml/badge.svg?branch=main" alt="CI"></a>
<a href="https://github.com/Atingaii/keelson/blob/main/LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="MIT license"></a>
</p>

## 为什么选择 Keelson？

Keelson 将软件工程中的成熟做法带进日常 Agent 对话：先对齐结果，留下决策依据，再检查实际产出。它围绕四个常见问题展开。

**1. Agent 做出来的，并不是你想要的。**

“加个筛选”背后，还有默认行为、边界情况和兼容性。Keelson 引导 Agent 先读代码，自动调查模糊目标和相互关联的选择，把需求变成具体的验收示例，再开始实现。这借鉴了**行为驱动开发（BDD）**：通过例子尽早发现理解偏差，只对影响方向的选择提问。

**2. 换个会话，又得解释同一个项目。**

新 Agent 看得到代码，却未必知道“成员”的业务含义，也不知道某个方案为什么被否决。Keelson 将领域术语、决策和未完成工作留在仓库。**统一语言**与**决策记录**让后续会话沿用已有词汇和理由，减少重复解释。

**3. 说“完成了”，却不知道验证了什么。**

测试通过可能没有覆盖原始需求，旧结果也可能对应旧代码。Keelson 引导小步实现、逐项验收，并将检查记录绑定到受检输入。**短反馈循环**由此落实到完成条件：验证缺失或过期时，正常归档会被阻止。

**4. 页面能用，但用起来不顺手。**

反馈不清楚、保存失败丢输入、手机上操作别扭，都是可用性问题。Keelson 将**可用性启发式原则**转成层级、交互、响应式和无障碍指导，由 Agent 在浏览器中观察界面、实际操作，并结合代码检查验收。

Keelson 由 **Agent Skill + 本地 CLI** 组成：Skill 指导 Agent 如何工作，CLI 管理项目状态与验证记录。适用于新功能、问题修复、重构和前端体验优化。

## 环境要求

- **Node.js 20+**，以及 npm、Git。
- 一个能读取项目、修改文件并执行命令的编码 Agent。
- 一个本地项目目录；建议使用 Git 管理代码和项目知识。

重点适配 **Claude Code、Codex CLI 和 CodeBuddy CLI**，也支持其他编码 Agent 的集成入口；各宿主的能力与验证范围见 [Agent 支持](https://github.com/Atingaii/keelson/blob/main/docs/platforms.md)。

## 快速开始

**1. 安装 CLI：**

```bash
npm install -g @zyaiting/keelson
```

**2. 在你的项目中初始化**，选择使用的 CLI：

```bash
cd /path/to/your/project
keelson init --claude --lang zh       # Claude Code
# 或：keelson init --codex --lang zh
# 或：keelson init --codebuddy --lang zh
```

**3. 在这个目录启动 Agent，直接提出需求。** 初始化只需一次；后续正常对话即可。

> 给任务列表加一个优先级筛选。

升级 CLI：`npm install -g @zyaiting/keelson@latest`，然后在项目中运行 `keelson update`。更多设置见[上手教程](https://github.com/Atingaii/keelson/blob/main/docs/zh/getting-started.md)；其他宿主见 [Agent 支持](https://github.com/Atingaii/keelson/blob/main/docs/platforms.md)。

## 从一句需求到一次完成

**调查 → 决策 → 实现 → 独立复核 → 验证 → 知识回写**

初始化后，普通需求自动触发相应流程：调查需求、带着推荐澄清关键选择、应用工程与 UI/UX 指导、实现、验证，并保留结果供后续会话接续。你无需点名 Skill 或管理工作流命令。明确的小修改使用最小变更记录；简单缺口一次问一个，复杂问题一轮问完前提已明确的整组决定，每题给推荐与理由。Agent 先区分真正要解决的问题与提出的实现手段；确认的答案进入同一变更的验收、实施与独立审查，决定明确后继续已授权的工作。

实现前，Agent 自动启动已澄清的变更，加载声明的规范与规则；复核使用从原始需求和契约生成的独立上下文包。验收后，持久决策回写到项目规范，下次开发继续使用这些知识。

Claude Code、Codex 和 CodeBuddy 集成均支持恢复流程上下文，并对受支持的文件修改执行启动门禁。Codex 首次提示时需在 `/hooks` 中信任生成的 hooks；各宿主原有权限确认继续生效。禁用 hooks 时，由已安装指导驱动相同 CLI。详见[自动化机制与边界](https://github.com/Atingaii/keelson/blob/main/docs/zh/automation.md)。

你也可以这样说：

- **讨论方案：**“先看看这个功能应该放在哪里，暂时不改代码。”
- **改善界面：**“优化设置页，保留品牌风格，保存失败时不要丢输入，并检查手机端体验。”
- **接着开发：**“继续上次的改动，先确认还剩什么。”

涉及界面的任务中，Agent 会从 22 个可组合的[设计动作](https://github.com/Atingaii/keelson/blob/main/docs/zh/frontend.md)中按需选择，包括审视、简化、打磨和适配；可通过 `keelson design` 查看。实际界面效果需要 Agent 使用浏览器检查。

## 项目里会留下什么？

初始化保留最少的项目文件，后续随实际开发补充：

| 位置 | 用途 |
| --- | --- |
| `.keelson/INTENT.md`、`.keelson/NOW.md` | 项目目标、约束与当前进展。 |
| `.keelson/config.yaml` | 项目检查命令和工作流配置。 |
| `.keelson/changes/`、`.keelson/specs/`、`.keelson/rules/` | 按需建立的变更、行为契约和项目规则。 |
| 宿主入口，如 `AGENTS.md` | 引导 Agent 加载 Keelson。 |

项目文档先呈现当前结果与下一步，任务按小组组织，详细依据通过链接查看。完整需求、决策和验证证据始终保留。

默认从已安装的包读取指导。需要把指导副本一并提交时，才使用 `--vendor`。目录与选项详见[配置文档](https://github.com/Atingaii/keelson/blob/main/docs/zh/configuration.md)。

## 工程学原理

前面的做法来自已有的软件工程与交互设计知识。Keelson 将它们用于仓库中的具体工作：

| 原理 | 在 Keelson 中如何落地 |
| --- | --- |
| [行为驱动开发（BDD）](https://cucumber.io/docs/bdd/) | 用验收示例描述可观察的行为，指导实现和需求核对。 |
| 领域驱动设计中的[统一语言](https://martinfowler.com/bliki/UbiquitousLanguage.html) | 按需记录业务术语及代码名称映射，让对话和代码中的词含义一致。 |
| [架构决策记录（ADR）](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions) | 在仓库保留简短决策与取舍，让后续会话理解当时的背景。 |
| [小步迭代与反馈](https://agilemanifesto.org/principles.html) | 先做出可工作的切片，检查后调整；小改动保持轻量，复杂时再补充计划。 |
| [可用性启发式原则](https://www.nngroup.com/articles/ten-usability-heuristics/) | 通过实际界面操作，检查状态是否可见、用词是否一致、错误能否恢复、用户能否掌控操作。 |

首次执行前应审阅 `.keelson/config.yaml` 中的检查命令。Agent 使用 `keelson check --trust --record` 运行并记录检查；退出码通过仍需对照验收标准。详见[验证与信任](https://github.com/Atingaii/keelson/blob/main/docs/zh/verification.md)。

## 文档与参与

[完整文档](https://github.com/Atingaii/keelson/blob/main/docs/zh/README.md) · [命令参考](https://github.com/Atingaii/keelson/blob/main/docs/zh/cli.md) · [前端设计](https://github.com/Atingaii/keelson/blob/main/docs/zh/frontend.md) · [贡献指南](https://github.com/Atingaii/keelson/blob/main/CONTRIBUTING.md) · [反馈问题](https://github.com/Atingaii/keelson/issues) · [MIT](https://github.com/Atingaii/keelson/blob/main/LICENSE)
