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

你仍然正常说话：

> **你：** 用户可以撤销分享链接，撤销后必须立刻不能再打开图片。

Agent 先读项目、写回边界，只问真正影响方案的问题：

> **Agent：** 我会把撤销定义为所有图片访问路径立即拒绝；已经下载到浏览器里的字节无法远程抹除；不设宽限期。相比定时宽限，我建议即时拒绝，因为“立刻”本身就是需求。这个边界批准吗？

批准后，它只创建这次工作真正需要的工件，按纵向切片实现，并把验证绑定到精确工作树。

需要停下：

> **你：** 先停在这里。  
> **Agent：** 已写 handoff。下一步：让 revoked link 的直接图片访问也拒绝。

第二天：

> **你：** 继续。  
> **Agent：** 从已记录的 handoff 继续；之前的决策已经确认，不重新提问。

宣称完成之前必须有新鲜证据；验证之后代码再发生变化，证据自动变成 stale。

## 快速开始

需要 Node.js 20+。

```bash
npm install -g keelson
cd your-project
keelson init
```

正常安装到这里就结束了。

之后在项目里打开 Claude Code、Codex、OpenCode、Pi、Gemini CLI、Kiro CLI 或 CodeBuddy CLI，照常对话。

大多数用户真正会运行的只有：

```bash
keelson init       # 一次
keelson status     # 可选：查看当前状态
keelson doctor     # 诊断
keelson update     # 升级或切换宿主后
keelson uninstall  # 删除生成的集成表面
```

其余 CLI 命令主要给 Coding Agent 使用。

## 一条黄金路径

Keelson 把自然语言工作路由成六类意图：

| 意图 | 含义 |
|---|---|
| **Explore** | 思考、比较、澄清；明确要求修改之前保持只读 |
| **Change** | 给功能/重构/迁移定边界，再交付最小纵向切片 |
| **Fix** | 复现 → 定位 → 回归检查 → 修复 → 验证 |
| **Resume** | 读取 NOW + handoff，从记录的下一步继续 |
| **Finish** | Verify → review → land → 折叠长期真相 |
| **Improve** | 把重复失败提升为 spec、作用域 rule 或可执行 check |

这只是 Agent 的路由模式，不是用户需要背的命令。

完整示例见：**[完整用户流程](docs/zh/user-flow.md)**。

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

可选知识只有真的有内容时才出现：

```text
ROADMAP.md                   # 真有里程碑需要保留时
GLOSSARY.md                  # 术语开始重要或歧义时
rules/                       # 真有稳定作用域不变量时
specs/<capability>/spec.md   # 真有行为契约时
changes/<name>/              # 非平凡工作进行中时
.local/                      # 本机证据，gitignored
```

一个 quick change 最开始甚至只有：

```text
changes/rename-buyer/
└── change.md
```

只有真正需要计划、证据、跨会话交接或行为 delta 时，`tasks.md`、`ledger.md`、`handoff.md`、delta specs 才出现。

**空脚手架不是进度。**

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

| 宿主 | 说明发现 | Skill 发现 | 依据 |
|---|---|---|---|
| Claude Code | `CLAUDE.md` | `.claude/skills/` | verified |
| Codex CLI | `AGENTS.md` | `.agents/skills/` | verified |
| OpenCode | `AGENTS.md` | `.agents/skills/` | documented |
| Pi | `AGENTS.md` | `.agents/skills/` | documented |
| Gemini CLI | `GEMINI.md` | `.agents/skills/` | documented |
| Kiro CLI | `AGENTS.md` | `.kiro/skills/` | documented |
| CodeBuddy CLI | `CODEBUDDY.md` | `.codebuddy/skills/` | documented |
| 通用 Agent Skills 读取器 | `AGENTS.md` | `.agents/skills/` | fallback |

只有发现路径经过真实验证或宿主官方文档支撑，并且通过相同 init/update/doctor/uninstall 契约的宿主，才叫 first-class。

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
