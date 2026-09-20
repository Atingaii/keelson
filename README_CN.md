# Keelson

**面向 Coding Agent 的项目本地工程控制面。**  
初始化一次，之后继续像原来一样使用你的 Agent。

[![npm version](https://img.shields.io/npm/v/keelson?style=flat-square)](https://www.npmjs.com/package/keelson)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg?style=flat-square)](LICENSE)
[![CI](https://img.shields.io/github/actions/workflow/status/Atingaii/keelson/ci.yml?branch=main&style=flat-square)](https://github.com/Atingaii/keelson/actions/workflows/ci.yml)

Coding Agent 很擅长产出代码，却不擅长把项目状态跨会话保存下来：为什么当初这样决定、什么行为属于契约、还有什么没确认、验证证据是不是来自当前代码、下一个 Agent 应该从哪里继续。

Keelson 把这些事实留在仓库里，并且只在真正需要时让 Agent 读取。

```text
事实优先于流程
证据优先于断言
单一真源优先于复制
渐进披露优先于永久仪式
强默认值 + 明确逃生口
```

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

大型 capability 会在需要时自动变成小型 `spec.md` 索引 + `requirements/*.md` + 可选 `decisions.md`；ADR/rule/spec 的文件数量可以随项目演进增加，但 Agent 每次只按需读取相关文件。旧 session/evidence 会自动回收，用户不需要维护这些目录。

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
