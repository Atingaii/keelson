[English](../getting-started.md)

# 快速上手

本页带一个项目走完 `keelson init`、一个 quick 变更、一个带未决问题的 spec 变更、一次交接、第二个会话和一次落地。大约需要二十分钟。

## 安装

Keelson 需要 Node.js 20 或更新版本。

```bash
npm install -g keelson
keelson --version
```

## 初始化项目

```bash
cd your-project
keelson init
```

默认配置 Claude Code。其他代理用 `--tools` 指定，逗号分隔：

```bash
keelson init --tools claude,codex,cursor
```

在一个已有决策记录和 CI 的仓库上，输出示例：

```text
Keelson init in /home/you/your-project
✓ referencing existing decisions: docs/adr
✓ referencing existing tasks: https://github.com/you/your-project/issues
✓ referencing existing ci: .github/workflows
✓ .keelson/INTENT.md (fill in why the project exists and what the agent may decide alone)
✓ .keelson/NOW.md
✓ .keelson/ROADMAP.md (current milestone; link your tracker instead of duplicating it)
✓ .keelson/GLOSSARY.md (shared vocabulary; fill it when two words start meaning the same thing)
✓ .keelson/rules/index.md
✓ .keelson/rules/general.md
✓ .gitignore: .keelson/.local/ (session state and evidence stay on this machine)
✓ .keelson/config.yaml
✓ Claude Code: skill → .claude/skills/keelson
✓ Claude Code: resident block → CLAUDE.md
✓ Claude Code: hooks → .claude/settings.json (session snapshot + per-prompt state line)
· model detection cached in ~/.keelson/models.cache.json (keelson models)

Next
  1. Edit .keelson/INTENT.md — why this project exists, what it will not do, what the agent may decide alone.
  2. Existing codebase? Re-run with --onboard, or ask your agent: "draft specs and rules from the code".
  3. Then just talk to your agent. Nothing else to type.
```

`init` 从不覆盖 `.keelson/` 里已有的文件。它往 `CLAUDE.md`（或 `AGENTS.md`、`GEMINI.md`）追加一个带标记的块，文件其余部分原样保留。它找到的既有资料（架构说明、决策记录、CI、GitHub issues 页面）记录在 `config.yaml` 的 `refs` 下，只引用、不复制。如果 `package.json` 有 `lint`、`typecheck` 或 `test` 脚本，它们会成为检查命令。`keelson init --dry-run` 列出将要写入的内容而不真正写入。

`keelson init --lang zh` 安装中文版的代理技能。

## 写 INTENT.md

打开 `.keelson/INTENT.md`。模板要求五样东西：

- 项目为什么存在，一段话；
- 边界，包括那些诱人但已决定不做的事；
- 硬约束，如运行时、兼容性、许可；
- 授权：代理可以自行决定什么、什么要给出推荐由你决定、什么必须确认；
- 变更定大小与批准的工作默认值。

每一项非平凡工作开始时都会读这个文件。保持在一页以内。

`GLOSSARY.md` 一开始是空的。当两个词开始表示同一件事，或一个词开始表示两件事时，加一行；从那以后代理在 specs 和代码里都用这些术语。

如果你是一边构建一边学习工程，运行 `keelson init --guide`。代理会把选择呈现为带推荐和取舍的场景，在你决定后说出对应的工程概念，并在每个 spec 变更收尾时留一段简短的教学说明。其他一切不变。

## 接入已有代码库

对已经有代码的项目，运行：

```bash
keelson init --onboard
```

这会把一个接入任务写进 `NOW.md`。打开你的代理，说"继续"。代理读代码库，列出它发现的能力，为每个能力写一份 spec，并为有约定的路径提出 rules。当 `refs` 下的某份文档已经描述了某个契约或决策时，spec 链接过去而不是重述。在你确认之前，specs 和 rules 都是草稿。见[已有项目](existing-projects.md)。

## 第一个 quick 变更

用自然语言说你想要什么：

```text
给订单列表加分页。
```

代理对预计要改的文件运行 `keelson context --paths`，读 `INTENT.md`、`NOW.md` 和命中的 rules，用几行写回它的理解。然后运行 `keelson new add-order-pagination`，填好 `change.md`（Why、What、Acceptance）和 `tasks.md`，开始做。任务完成后它运行：

```bash
keelson check --record "pagination on /orders"
```

这会运行检查命令，把输出保存到 `.keelson/.local/evidence/`，并在 ledger 里追加一条 `Verify:`，带每条命令的退出码和工作树指纹。代理勾选已运行过检查的验收项，然后运行 `keelson land add-order-pagination --now "…"`，告诉你改了什么。

如果你更希望在 quick 变更开工前先批准，在 `.keelson/config.yaml` 里设置：

```yaml
confirm:
  quick: wait
```

## 第一个 spec 变更

spec 变更会改变行为契约、新增或删除能力、涉及迁移，或放弃显而易见的方案。比如说：

```text
让用户可以用链接分享相册。
```

代理识别出大小，一轮一轮地问那些阻塞下一个切片的问题，每个问题配一条推荐和它的取舍。然后运行 `keelson new share-links --tier spec --capability sharing --touches src/api/**` 并起草：

- `change.md`，含 Why、What、How、Alternatives、Impact、Acceptance、Open questions 和 Decisions；
- `specs/sharing/spec.md`，只写 delta：新增、修改和删除的需求，带主 spec 的 `base:` 戳；
- `tasks.md`，分切片，每个切片写明交付什么，每个任务带 effort 层级；
- `ledger.md`，记录裁定、分派、根因和验证证据。

假设你还没决定链接的过期时间。代理会这样记录：

```markdown
## Open questions
- default expiry for share links? — blocks: Revoke and expiry

## Decisions
- sharing: links are unguessable tokens; sequential ids rejected because they leak album count
- (assumed) sharing: links expire after 7 days by default
```

未决问题只阻塞以它命名的那个切片。代理等你批准计划，然后构建"创建与访问"切片，记录证据，并因为还有一个未决问题和一个假设决策而在落地前停下。`keelson status` 显示：

```text
share-links  [spec]  work: in-progress  verify: ✓ passed  release: unreleased  (ann)
   ✓ slice Create and access 2/2 — a link can be created and opens the album
   · slice Revoke and expiry 0/3 — revoked or expired links refuse every access path
   acceptance 2/4
   open: default expiry for share links? (blocks Revoke and expiry)
   1 assumed decision awaiting the owner
```

## 停下与恢复

代理在变更中途停下时，会运行 `keelson handoff share-links` 并填好六个部分：目标与已确认的决策、已完成、未决与受阻、已排除、下一步、验证。它会同步重写 `NOW.md`。

打开新会话，说"继续"。在 Claude Code 上，会话启动 hook 已经打印了 `NOW.md`、活动变更和交接里的下一步。在其他工具上，代理先运行 `keelson context`。它用 `keelson status` 检查未提交的文件和 HEAD 是否在交接之后移动过，从不重置未提交的工作，然后从下一步接着做。

回答那个未决问题：

```text
继续。过期时间 30 天。
```

代理更新 `change.md`（删除未决问题，确认决策）、delta spec 和切片，构建它，记录新的证据。任何编辑之后旧证据都算过期；`keelson land` 会这么说。

## 落地

当每个任务和验收项都已勾选、没有未决问题、最后一条 `Verify:` 与当前工作树匹配时，代理运行：

```bash
keelson land share-links --confirm-assumptions --now "Nothing in flight. Next: watch share-link error rate for a week."
```

`--confirm-assumptions` 是你的决定，不是代理的：它把 `(assumed)` 决策作为已确认折叠进 spec。delta specs 合并进 `specs/sharing/spec.md`。决策行折叠进它的 `Decisions` 段。变更目录被删除。`NOW.md` 被重写。代理把落地和最后一次代码改动一起提交，让 specs 和代码共享一个修订。

如果落地被拒绝，消息会列出每一个原因：

```text
keelson: cannot land "share-links":
  - 1 open question(s): default expiry for share links?
  - verification stale (verified at tree 5bcb829dae, worktree is 9a92f4bead)
  - 1 assumed decision(s) would be folded as confirmed; pass --confirm-assumptions once the owner agrees
```

这些你都可以自己查看：

```bash
keelson status
keelson validate
keelson doctor
```

## 团队与 CI

在 pull request 模板里加一行，要求非平凡工作附带变更目录，并在 CI 里运行：

```bash
keelson validate && keelson check
```

`validate` 在结构错误时非零退出：缺失的段落、未知的状态、带日期的模型 ID、损坏的 rule 引用。`check` 在任何配置的命令失败时非零退出。发布状态来自 git tag：`keelson status` 列出上一个 tag 之后落地的变更。见[协作](collaboration.md)。
