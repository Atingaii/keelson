# Keelson

**面向 Coding Agent 的项目本地工程 Harness。**  
只需运行一次 `keelson init`，之后继续像平时一样使用 Claude Code、Codex、OpenCode、Gemini CLI 或其他受支持 Agent。

[![npm version](https://img.shields.io/npm/v/keelson?style=flat-square)](https://www.npmjs.com/package/keelson)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg?style=flat-square)](LICENSE)
[![CI](https://img.shields.io/github/actions/workflow/status/Atingaii/keelson/ci.yml?branch=main&style=flat-square)](https://github.com/Atingaii/keelson/actions/workflows/ci.yml)

[English](README.md) · [快速开始](#快速开始) · [工作原理](docs/zh/how-it-works.md) · [核心概念](docs/zh/concepts.md)

Coding Agent 写代码很快，但**聊天窗口不是可靠的软件工程真源**：设计理由埋在历史对话里，新会话又从头理解项目，task checkbox 很容易被误当成“完成”，代码一改旧 verification 就已经失效，架构也可能因为一句“最佳实践”而不断增加不必要的复杂度。

Keelson 把 **项目真相、当前工作、工程决策和绑定代码版本的证据** 留在仓库中。用户仍然只需要正常表达需求；Keelson 与 Agent 负责工程记账、按任务加载必要上下文，并且只把真正属于用户的决定交给用户。

## 为什么是 Keelson？

| Coding Agent 常见失败 | Keelson 的处理 |
|---|---|
| 新会话每次从零开始 | Intent、spec、rule、decision 与进行中的 change 都持久化在仓库；session 只保存本地 focus |
| Agent 要么猜产品意图，要么把技术选型甩给用户 | 自适应决策访谈：先调查，再一次只问一个真正属于所有者的决定，同时给出产品后果、工程影响和有依据的默认推荐 |
| tasks 都勾完了，却没有证明需求真的满足 | “完成”来自 acceptance + 当前代码树上的新鲜 evidence，而不是 checkbox，也不依赖用户说“做完了” |
| 架构因为“最佳实践”越来越重 | 第一性还原、可证伪 hypothesis、最小实验、消融/反事实验证；只有广泛且难以撤销的决定才升级为架构问题 |
| 项目知识越积越多，最终每轮都注入整个历史 | Progressive disclosure、作用域 rule、有界 hot file、自动 spec 分片与 runtime GC |
| Agent 越开越多，吞吐没有提高，冲突反而更多 | 只有任务边界清晰、输出能独立验证、merge contract 明确时才并行 |

Keelson 的长期取向是：**事实优先于流程、证据优先于断言、单一真源优先于复制、渐进披露优先于永久仪式、强默认值 + 明确逃生口。**

## 设计思想与理论来源

Keelson 不是凭空发明一套“AI 开发流程”，也不是要求每个任务都执行全部经典方法。它把成熟的软件工程思想压缩成按需触发的 reasoning tools：当前任务真的遇到相应不确定性或风险时才加载。

| 来源 / 思想 | 在 Keelson 中如何落地 |
|---|---|
| [Matt Pocock 的 skills / Grill](https://github.com/mattpocock/skills) | 实现前先对齐；一次解决一个决定；问题必须具体并带推荐，而不是一次丢给用户一堵问题墙 |
| [Trellis](https://github.com/mindfold-ai/trellis) | 项目级长期上下文沉淀在仓库；与具体 Agent 解耦；通过 progressive disclosure 按任务加载，而不是把全部规则永久塞进 prompt |
| **第一性原理** + *The Pragmatic Programmer* | 先拆事实、结果、约束、不变量、假设与机制；优先可逆选择；用 tracer bullet / prototype 先学习再承诺 |
| John Ousterhout, *A Philosophy of Software Design* | Deep module、information hiding、以复杂度为核心敌人；真实设计分叉才使用 “Design It Twice” |
| Eric Evans, *Domain-Driven Design* | Ubiquitous language、bounded context、不变量；系统边界跟随领域含义，而不是跟随文件夹形式 |
| Martin Fowler, *Refactoring* + Michael Feathers, *Working Effectively with Legacy Code* | Characterization test、seam、behavior-preserving 小步重构；替换旧系统优先增量迁移而不是盲目 big-bang rewrite |
| *Software Architecture in Practice* + Fred Brooks, *The Mythical Man-Month* | Quality-attribute scenario、显式 trade-off、conceptual integrity、沟通/协调成本，以及 second-system effect |
| *Building Evolutionary Architectures* + 实验设计 / 消融实验 | 用 fitness function 长期保护真正重要的性质；baseline → hypothesis → measure → threshold；必要时做 counterfactual removal 与小型 factorial experiment 识别交互效应 |

这些思想最终被压成一条很短的内部工程循环：

```text
理解真正 outcome
→ 区分事实与假设
→ 用最低成本方式减少不确定性
→ 只在真正 decision frontier 询问用户
→ 默认选择简单、可逆的设计
→ 声称某个机制有可测收益时，用实验/消融证明
→ 只有广泛且昂贵难改的决定才升级为架构设计
→ 在当前代码树上验证
→ 把长期行为/决策沉淀，并把重复约束自动化
```

一个 trivial 修改可能几乎跳过所有这些步骤；而迁移、并发、安全边界、性能主张等风险任务会自动触发更多工程方法。**理论是按需调用的思考工具，不是强制仪式。**

## 60 秒例子

用户**不需要**告诉 Keelson “任务开始了”或“任务做完了”。

> **你：** 用户可以撤销分享链接，撤销后必须立刻不能再打开图片。

Agent 创建/绑定一个长期 change，这个会话继续聚焦它。

> **你：** 为什么不能保留 5 分钟宽限期？  
> **Agent：** 它能降低缓存压力，但与“立刻”冲突，因此仍建议即时拒绝。

> **你：** 直接图片 URL 也要失效。  
> **Agent：** 仍然属于同一个 change，我把这条访问路径加入已有验收边界。

> **你：** 那移动端呢？  
> **Agent：** 这是围绕同一目标的解释性追问，不会创建新 task；同一撤销契约适用。

用户可以一直这样问，不需要说“结束任务”。

当 Acceptance 满足、没有活动依赖/阻塞问题/未确认假设/未对齐 spec drift、需要的 rollout 已存在，并且当前代码树上 verification 新鲜，Keelson 机械推导 work state 为 **ready**。Agent 在宣称完成之前自动 land，不等待用户说“做完了”。

如果用户直接关掉窗口，长期 change 仍然保持进行中；消失的只是本地 session focus。新会话在候选明确时可用 `keelson focus --auto` 恢复。提交进 Git 的 `handoff.md` 只用于真正跨人/跨机器的所有权转移，不再承担普通聊天续接。

## 快速开始

需要 Node.js 20+。

```bash
npm install -g keelson
cd your-project
keelson init
```

正常安装到这里就结束了。

之后在项目里打开 Claude Code、Codex、OpenCode、Pi、Gemini CLI、Kiro CLI 或 CodeBuddy CLI，照常对话。

正常使用真正需要的只有：

```bash
keelson init       # 一次，然后正常和 Agent 对话
```

`status` 只是可选查看，`doctor` 只用于排障，`update` 只在升级/切换宿主时使用，`uninstall` 用于移除。知识整理、spec 分片、runtime 清理以及其余工程命令都由 Keelson/Agent 内部处理。

## 一条黄金路径

“用户现在在问什么”和“工作生命周期走到哪里”是两件事。

Keelson 只把消息分成五类对话意图：

| 意图 | 含义 |
|---|---|
| **Explore** | 思考、比较、解释、澄清；明确要求修改之前保持只读 |
| **Change** | 构建/重构/迁移，或继续修改当前 focus 的同一目标 |
| **Fix** | 复现 → 定位 → 回归检查 → 修复 → 验证 |
| **Resume** | 新会话在候选明确时重新绑定到已有长期工作 |
| **Improve** | 把重复失败提升为 spec、作用域 rule 或可执行 check |

**“完成”不是一种对话意图。** 它来自 work item 的机械状态：验收完成、无阻塞问题/假设、必要 rollout 已存在、当前工作树验证新鲜。满足这些 gate 后 change 自动成为 `ready`，Agent 进入 land/reconcile，不等待用户说“做完了”。

Session 只是本机焦点指针；结束 session 绝不会自动完成、取消或 land change。

完整例子见：**[完整用户流程](docs/zh/user-flow.md)**。

## 不懂系统设计也可以直接用

Keelson 不会把每个功能都变成架构访谈。Agent 先读仓库，可逆的实现细节自己决定；只有**你的答案会改变产品行为、风险边界、公开兼容性、成本或其他长期承诺**时才提问。

必须问时，默认一次只解决一个具体决定：

> **你：** 做一个让多个 Agent 共享记忆的服务。  
> **Agent：** **需要决定：** 一条记忆默认由谁可见？  
> - **A. 仅创建者可见。** **工程影响：** `memory.owner_id` + 所有权校验即可；现有关系型数据库通常足够。  
> - **B. 默认私有，可显式分享。** **工程影响：** 增加 `memory_share` / ACL 授权关系并复用现有鉴权中间件；现有 PostgreSQL/MySQL 通常足够，初期不需要 Redis。  
> - **C. 团队默认共享。** **工程影响：** 增加 workspace/team membership，并让查询默认带 workspace scope；仍可使用现有关系型数据库，但权限测试与迁移复杂度更高。  
> - **不确定 —— 采用你的推荐。**  
> **推荐：B。** 权限边界更清晰，同时仍支持协作。**建议实现：** 优先复用项目现有数据库和鉴权栈；只有真实需求迫使时才增加新基础设施。

先让人理解后果，再补技术术语。“不确定”是合法答案：Keelson 会继续调查、采用可逆默认值，或用一个很小的原型把取舍变得可见。`guide: true` 只额外增加教学解释；**问题本身是否容易理解，不依赖新手模式**。

跨领域工程问题也不是全量问卷，而是按风险触发：支付可能触发数据完整性和对账，webhook 触发幂等/重试，登录权限触发安全/隐私。最终这些风险应该变成 acceptance、rule 或 evidence，而不是一篇没人维护的“架构检查文档”。

遇到非显然技术选择时，Keelson 不用“最佳实践”替代思考，而走一条 evidence-driven loop：**事实/结果/不变量 → baseline + 可证伪 hypothesis → 最便宜的实验或消融 → 只有难以撤销的边界或质量属性真正需要时才升级为架构设计 → 用 fitness check 固化值得长期保护的性质**。Cache、queue、microservice、database、framework、抽象层或额外 Agent stage 都必须证明自己值得那份复杂度；移除之后目标没有明显变差，就优先删掉，而不是替它寻找理由。

## 控制面一开始很小，只在需要时增长

Fresh init 只有：

```text
.keelson/
├── README.md
├── INTENT.md
├── NOW.md
├── config.yaml
├── manifest.json
├── workflow.md
└── skill/
    ├── SKILL.md
    └── references/
```

长期项目知识只有真的有内容时才出现：

```text
ROADMAP.md                   # tracker 没有表达清楚的里程碑/方向
GLOSSARY.md                  # 重要共享术语
rules/                       # 稳定作用域不变量
specs/<capability>/          # 行为契约；小契约单文件，大契约自动分片
changes/<name>/              # 进行中的长期 work item
```

机器本地的易失状态单独放：

```text
.runtime/
├── sessions/<key>.json      # 当前对话只保存 focus 到哪个 change
└── evidence/                # 检查输出
```

`.runtime/` 被 gitignore。session 文件从来不是 task record，也从不记录“completed”。

quick change 最开始可以只有：

```text
changes/rename-buyer/
└── change.md
```

只有真正需要计划、证据、行为 delta 或明确所有权交接时，`tasks.md`、`ledger.md`、delta specs、`handoff.md` 才出现。

大型 capability 会在需要时自动变成小型 `spec.md` 索引 + `requirements/*.md` + `decisions/*.md`；ADR/rule/spec 的文件数量可以随项目演进增加，但单个高频文件和每次注入上下文始终保持有界。旧 session/evidence 会自动回收，用户不需要维护这些目录。

**空脚手架不是进度；关闭一次对话也不是完成；控制面维护也不是用户任务。**

## 一份 canonical runtime

完整 Keelson 指导只有一份真源：

```text
.keelson/workflow.md
.keelson/skill/
```

`AGENTS.md`、`CLAUDE.md`、`GEMINI.md`、`CODEBUDDY.md` 和各宿主 Skill 目录只是很薄的发现 shim，全部指回同一个 runtime，不复制 references。

因此支持更多 Agent 不会让项目规则复制 N 份。

## 一等公民宿主

官方矩阵有意控制在 7 个 CLI + 通用标准层：

| 宿主 | 说明发现 | Skill 发现 | Session focus | 依据 |
|---|---|---|---|---|
| Claude Code | `CLAUDE.md` | `.claude/skills/` | **native** | verified |
| Codex CLI | `AGENTS.md` | `.agents/skills/` | degraded | verified |
| OpenCode | `AGENTS.md` | `.agents/skills/` | **native** | documented |
| Pi | `AGENTS.md` | `.agents/skills/` | **native** | documented |
| Gemini CLI | `GEMINI.md` | `.agents/skills/` | degraded | documented |
| Kiro CLI | `AGENTS.md` | `.kiro/skills/` | degraded | documented |
| CodeBuddy CLI | `CODEBUDDY.md` | `.codebuddy/skills/` | **native** | documented |
| 通用 Agent Skills 读取器 | `AGENTS.md` | `.agents/skills/` | degraded | fallback |

只有 discovery/lifecycle 路径经过真实验证或宿主官方文档支撑，并通过统一契约的宿主才叫 first-class。Session focus 是独立能力：当前 Claude hooks、OpenCode 项目 plugin、Pi 内置 session env、CodeBuddy hooks 为 `native`；`degraded` 表示长期 work 仍正确，但有歧义的对话必须显式选择 change。`--no-hooks` 会关闭 hook/plugin bridge（Pi 的 session env 是宿主内置，因此仍 native）。

## 高可用不是附加项

Keelson 把自己的安装也当成控制系统，而不是一堆复制文件。

- **Desired state：** `.keelson/manifest.json` 记录 Keelson 真正拥有的生成表面。
- **Reconciliation：** `keelson update` 清理过期 Keelson adapter，同时保留旁边的用户文件。
- **可恢复替换：** package-owned Skill 目录只有新版本完整写好后才替换上一份完整版本。
- **Drift detection：** `keelson doctor` 检查 runtime、shim、hook、manifest、证据新鲜度、冲突和 knowledge health。
- **证据绑定版本：** `keelson check --record` 把验证绑定到工作树指纹；之后编辑代码会自动 stale。
- **减少 toil：** 重复错误应该变成最窄的 rule 或可执行 check，之后删掉重复 prose。

## Keelson 不是什么

- 不是项目管理器——优先级仍属于你的 tracker；
- 不是 Agent runtime——没有 daemon，也不自己调用模型；
- 不替代测试和 CI；
- 不是正确性证明；
- 不要求把整个项目文档化；
- 不是用户每天需要操作的一套新流程。

它负责的是：当 Agent 不断更换时，让**项目意图、当前真相、进行中状态和证据**仍然一致。

## 文档

**从这里开始：** [中文文档首页](docs/zh/README.md)

- [快速上手](docs/zh/getting-started.md)
- [完整用户流程](docs/zh/user-flow.md)
- [核心概念](docs/zh/concepts.md)
- [工作原理](docs/zh/how-it-works.md)
- [已有项目](docs/zh/existing-projects.md)
- [协作](docs/zh/collaboration.md)
- [验证](docs/zh/verification.md)
- [配置](docs/zh/configuration.md)
- [CLI 参考](docs/zh/cli.md)
- [effort 层级与模型](docs/zh/models.md)
- [FAQ](docs/zh/faq.md)
- [English](README.md)

## 参与贡献

欢迎 issue 和 pull request。见 [CONTRIBUTING.md](CONTRIBUTING.md)。

Keelson 自己也使用 Keelson；仓库里的 `.keelson/` 是成熟项目的活例子。里面存在的可选工件是因为它们真的承载信息，而不是因为 init 预先创建了模板。

## License

MIT — 见 [LICENSE](LICENSE)。
