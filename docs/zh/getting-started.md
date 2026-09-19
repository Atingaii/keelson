[English](../getting-started.md)

# 快速上手

本页带一个项目从 `keelson init` 走到它的第二个会话。大约十分钟。

## 安装

Keelson 需要 Node.js 20 或更高版本。

```bash
npm install -g keelson
keelson --version
```

## 初始化项目

```bash
cd your-project
keelson init
```

默认面向 Claude Code。其他代理用 `--tools` 指定，逗号分隔：

```bash
keelson init --tools claude,codex,cursor
```

示例输出：

```text
Keelson init in /home/you/your-project
✓ .keelson/INTENT.md (fill in why the project exists)
✓ .keelson/NOW.md
✓ .keelson/rules/index.md
✓ .keelson/rules/general.md
✓ .keelson/config.yaml
✓ Claude Code: skill → .claude/skills/keelson
✓ Claude Code: resident block → CLAUDE.md
✓ Claude Code: hooks → .claude/settings.json (session snapshot + per-prompt state line)
· model detection cached in ~/.keelson/models.cache.json (keelson models)

Next
  1. Edit .keelson/INTENT.md — why this project exists and what it will not do.
  2. Existing codebase? Re-run with --onboard, or ask your agent: "draft specs and rules from the code".
  3. Then just talk to your agent. Nothing else to type.
```

`init` 从不覆盖 `.keelson/` 里已有的文件。它在 `CLAUDE.md`（或 `AGENTS.md`、`GEMINI.md`）末尾追加一段带标记的块，文件其余部分保持不动。如果 `package.json` 里有 `lint`、`typecheck` 或 `test` 脚本，它们会被登记为 `config.yaml` 中的检查命令。Go、Rust 和 Python 项目会得到各自惯用的测试命令。

想让代理使用中文版技能，加上 `--lang zh`。

## 写 INTENT.md

打开 `.keelson/INTENT.md`。模板要求四样东西：

- 项目为什么存在，一段话；
- 边界，包括那些诱人但已决定不做的事；
- 硬约束，如运行时、兼容性、许可证；
- 变更定大小和审批的工作默认值。

每一项非平凡工作开始时都会读这个文件。保持在一页以内。

## 接入已有代码库

对已经有代码的项目，运行：

```bash
keelson init --onboard
```

这会把一个入门任务写进 `NOW.md`。打开代理，说"continue"。代理会阅读代码库，列出它的能力，在 `.keelson/specs/` 下为每个能力写一份 spec，并为有约定的路径提议 rules。在你确认之前，specs 和 rules 都只是草稿。让代理在落地任何东西之前先把每份 spec 展示给你。

## 第一个 quick 变更

用自然语言说你想要什么：

```text
给订单列表加分页。
```

代理读取 `INTENT.md`、`NOW.md`，以及与它预计要改的文件匹配的 rules。它用几行写回自己的理解，创建 `.keelson/changes/add-order-pagination/`，填好 `tasks.md`，然后开工。任务完成后它运行检查命令并报告退出码。接着运行 `keelson land`，重写 `NOW.md`，告诉你改了什么。

如果你希望 quick 变更在开工前先获得批准，在 `.keelson/config.yaml` 里设置：

```yaml
confirm:
  quick: wait
```

## 第一个 spec 变更

spec 变更会改变行为契约、新增或删除能力，或放弃显而易见的方案。比如说：

```text
把 Redis pub/sub 换成持久化队列。
```

代理识别出这个大小后会一次问一个问题，宿主有提问工具时就用它。然后创建一个 `spec` 变更，包含：

- `change.md`，含 Why、What、How、Alternatives、Impact 和 Decisions；
- `specs/<capability>/spec.md`，只写 delta：新增、修改和删除的 requirements；
- `tasks.md`，每个任务带一个 effort 层级；
- `ledger.md`，记录裁定、分派、根因和验证证据。

在你批准之前它不会碰代码。说"go"，或者先编辑这些文件再说"go"。

## 落地

当所有任务都已勾选、ledger 里最后一条 `Verify:` 的退出码为 0 时，代理运行：

```bash
keelson land <name> --now "Nothing in flight. Next: watch the queue lag dashboard for a week."
```

delta specs 合并进 `.keelson/specs/`。decision 行折叠进 spec 的 `Decisions` 段。change 目录被删除。`NOW.md` 被重写。代理把这次落地和最后一次代码改动一起提交，让 specs 和满足它们的代码共享同一个版本。

这些你都可以自己看：

```bash
keelson status
keelson validate
keelson check
```

## 下一个会话

打开新会话，说"continue"。在 Claude Code 上，session-start hook 已经打印了 `NOW.md` 和活动中的变更。在其他工具上，代理会先运行 `keelson context`。无论哪种方式，它都从文件而不是记忆里接上上次停下的地方。

## 可选：团队

在 pull request 模板里加一行，要求非平凡工作附带一个 change 目录，并在 CI 里运行：

```bash
keelson validate && keelson check
```

`validate` 在结构错误时返回非零。`check` 在任一配置的命令失败时返回非零。
