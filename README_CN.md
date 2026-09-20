<p align="center"><img src="docs/assets/keelson-banner.png" alt="Keelson：深蓝与铜色的龙骨标志" width="100%"></p>

# Keelson

**让编码 Agent 拥有项目记忆、设计指导和可核验的变更记录。**

[![CI](https://github.com/Atingaii/keelson/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/Atingaii/keelson/actions/workflows/ci.yml)
[![Node.js 20+](https://img.shields.io/badge/Node.js-20%2B-417e38)](package.json)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

[English](README.md) · [快速开始](#快速开始) · [前端设计](#前端设计) · [完整文档](docs/zh/README.md)

Keelson 由**本地 CLI + Agent Skill** 组成，帮助你和编码 Agent 持续开发真实项目。它把项目目标、决策、验收标准和检查结果留在仓库中，让工作能够跨会话接续；Agent 则按需读取指导，完成规划、实现、审阅与验证。

- **接着上次的工作继续。** 项目背景和已经确定的决策与代码一起保存。
- **让流程适应任务大小。** 小修复使用轻量变更，较大的功能通过明确的行为契约推进。
- **完善整个界面体验。** 设计指导覆盖视觉层级、文案、交互状态、无障碍与响应式适配。
- **看清实际验证了什么。** 记录执行过的命令及其对应代码；检查输入变化后，原记录会失效。

直接使用现有代码和测试工具。CLI 在本地运行，无需账号，不收集遥测，也不调用模型 API。

## 快速开始

需要 **Node.js 20+**。从仓库安装：

```bash
git clone https://github.com/Atingaii/keelson.git
cd keelson
npm ci
npm link
```

进入你要开发的项目，完成初始化：

```bash
cd /path/to/your/project
keelson init --codex --lang zh
```

在该项目中打开编码 Agent，像平常一样提出需求：

> 改善设置页，保留现有品牌风格。保存失败时保留已填写的内容，并检查手机端和键盘操作流程。

Agent 通过 `keelson guide` 读取工作指导，检查项目现状、记录目标，再按任务加载所需内容。第一次修改时，它还应把项目已有的测试、代码检查或构建命令配置到 `.keelson/config.yaml`。执行前先检查这些命令。

**初始化一次，之后继续通过对话推进开发。** Agent 负责变更流程；你可以用 `keelson status` 查看进度和阻塞项。

`npm link` 使用当前本地源码目录，请保留该目录。配置方法和第一次完整变更见[上手教程](docs/zh/getting-started.md)。

## 一次修改如何完成

1. **理解项目。** 阅读代码、约束和已有决策；遇到需要用户决定的选择时再提问。
2. **明确变更。** 写清预期结果和可观察的验收标准；范围较大时补充行为契约。
3. **实现与审阅。** 完成修改、审阅差异并实际操作受影响的功能；具备工具时，界面工作还需进行浏览器检查。
4. **验证并保留结果。** 执行配置的检查，完成验收、解决未定决策，再把变更及其证据归档。

项目说明随着实际开发逐步补齐。小修复可以保持轻量；跨多个会话的功能也能留下足够上下文，供下一个 Agent 接续。[日常使用流程 →](docs/zh/user-flow.md)

## 前端设计

Keelson 提供 **22 个设计动作**，指导内容支持中英文。你可以直接在对话中描述目标，也可以查看某个动作的执行指导：

```bash
keelson design                               # 查看全部设计动作
keelson design audit "结算流程"
keelson design harden "设置表单"
keelson design polish "数据面板"
keelson design adapt "订单表格"
```

| 改善方向 | 设计动作 |
| --- | --- |
| 方向探索与实现 | `plan`、`build`、`explore` |
| 审阅与细节完善 | `audit`、`critique`、`polish` |
| 视觉层级与表达 | `simplify`、`bolder`、`quieter`、`typeset`、`color`、`layout` |
| 动效与细节 | `animate`、`delight` |
| 文案与用户流程 | `clarify`、`onboard`、`harden` |
| 适配与交付 | `adapt`、`optimize`、`extract`、`document`、`iterate` |

对于设置表单，除了排版与布局，还要检查输入保留、保存失败、重试和重复提交。对于落地页，则要明确主要行动入口、手机端阅读顺序和一致的视觉方向。

CLI 输出指导，Agent 负责实现，并使用宿主可用的浏览器工具检查、操作真实页面。未能实际执行的浏览器场景会保留为未验证项。[前端设计指南 →](docs/zh/frontend.md)

## 初始化后会增加什么

执行 `keelson init --codex --lang zh` 后，受管理的文件如下：

```text
your-project/
├── AGENTS.md                       # 给 Agent 的简短入口
├── .agents/skills/keelson/SKILL.md   # 按需加载 Skill 的入口
└── .keelson/
    ├── README.md                   # 项目记录说明
    ├── INTENT.md                   # 项目目标与约束
    ├── NOW.md                      # 当前状态与下一步
    ├── config.yaml                 # 宿主、语言与检查命令
    └── manifest.json               # 受管理的集成文件
```

原有源码保留在原位置，已有 `AGENTS.md` 内容也会保留。`changes/`、`specs/`、`rules/` 和其他项目说明在**实际需要时才增加**，初始化不会预先铺满空文档。

默认从已安装的包读取指导。只有需要把指导一并纳入版本管理时，才添加 `--vendor`，额外复制出 `.keelson/workflow.md` 和 `.keelson/skill/`。不加这个选项也能使用全部设计动作。

项目知识和变更证据可以通过 Git 共享。本机密钥、信任记录和会话状态保存在 Git 私有目录；非 Git 项目使用用户缓存目录。[项目结构与核心概念 →](docs/zh/concepts.md)

## 常用命令

| 命令 | 用途 |
| --- | --- |
| `keelson status` | 查看进行中的变更、完成条件与阻塞项 |
| `keelson doctor` | 诊断项目配置和宿主集成 |
| `keelson guide --list` | 查看可按需读取的指导 |
| `keelson update` | 更新当前项目的集成文件 |
| `keelson uninstall` | 移除集成，保留项目知识和变更证据 |

<details>
<summary>手动执行一次变更</summary>

```bash
keelson new fix-pagination --tier quick
# 在 change.md 中明确验收标准，实现修复，并逐项验证。
# 在 .keelson/config.yaml 中配置项目检查命令，确认命令内容。
keelson check --trust --record
keelson status
keelson land fix-pagination
```

`--trust` 表示在本机授权执行配置的 shell 命令；命令变化后需要重新信任。`land` 在验收、决策、依赖及当前完整检查证据均满足门槛后归档变更，不会执行 Git 提交或推送。

签名记录把本地检查结果与检查输入关联起来，不能证明测试本身足够充分，也不能防御具有相同用户权限的进程。[证据、信任与恢复说明 →](docs/zh/verification.md)

</details>

## Agent 支持

Codex 的会话标识已在本地使用中验证。另提供 Claude Code、OpenCode、Gemini CLI、Kiro CLI、CodeBuddy、Pi 和通用 Agent Skills 集成。这些集成已有适配器契约测试，尚未逐一完成真实宿主端到端验证。请在实际环境运行 `keelson doctor`，并查看[平台配置与支持范围](docs/platforms.md)。

## 文档与贡献

- [上手教程](docs/zh/getting-started.md)：安装、配置检查并完成一次变更。
- [配置说明](docs/zh/configuration.md) · [命令参考](docs/zh/cli.md) · [常见问题](docs/zh/faq.md)。
- [工作原理](docs/zh/how-it-works.md) · [证据与信任](docs/zh/verification.md)。
- [贡献指南](CONTRIBUTING.md) · [更新记录](CHANGELOG.md) · [MIT 许可证](LICENSE)。

开发 Keelson 本身时运行：

```bash
npm ci
npm run lint
npm test
npm run validate
npm pack --dry-run
```
