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

不带标志时，它选用本机已安装的编码工具。用每个工具一个标志点名你在用的那些（`keelson platforms` 列出全部）：

```bash
keelson init --claude --codex --cursor
```

在一个已有决策记录和 CI 的仓库上，输出示例：

```text
Keelson init in /home/you/your-project
· tools detected on this machine: Claude Code (override with --tools or --<platform>)
✓ referencing existing decisions: docs/adr
✓ referencing existing tasks: https://github.com/you/your-project/issues
✓ referencing existing ci: .github/workflows
✓ .keelson/README.md (human project map; created by Keelson)
✓ .keelson/INTENT.md (the agent drafts it from the code on first contact; confirm it when it asks)
✓ .keelson/NOW.md
✓ .keelson/ROADMAP.md (current milestone; link your tracker instead of duplicating it)
✓ .keelson/GLOSSARY.md (shared vocabulary; fill it when two words start meaning the same thing)
✓ .keelson/rules/index.md
✓ .keelson/rules/general.md
✓ .gitignore: .keelson/.local/ (session state and evidence stay on this machine)
✓ .keelson/config.yaml
✓ Claude Code: skill → .claude/skills/keelson; instructions → CLAUDE.md
✓ cross-tool layer: skill → .agents/skills/keelson; instructions → AGENTS.md
✓ Claude Code: hooks → .claude/settings.json (session snapshot + per-prompt state line)
· model detection cached in ~/.keelson/models.cache.json (keelson models)
✓ .keelson/NOW.md: first-contact task written for the agent (draft INTENT, specs, and rules from the code)

Done. Open your agent in this directory and start talking.
  On first contact it reads the repository, drafts .keelson/INTENT.md, the specs, and the rules, and asks you to confirm before anything lands.
```

`init` 从不覆盖 `.keelson/` 里已有的项目事实文件。唯一例外是 `.keelson/README.md`：它是 Keelson 自己维护的人类导航，`keelson update` 会刷新。它往 `CLAUDE.md`（或 `AGENTS.md`、`GEMINI.md`）追加一个带标记的块，文件其余部分原样保留。它找到的既有资料（架构说明、决策记录、CI、GitHub issues 页面）记录在 `config.yaml` 的 `refs` 下，只引用、不复制。如果 `package.json` 有 `lint`、`typecheck` 或 `test` 脚本，它们会成为检查命令。`keelson init --dry-run` 列出将要写入的内容而不真正写入。

`keelson init --lang zh` 安装中文版的代理技能。

## 首次接触

如果你是人直接打开 `.keelson/`，先看 `.keelson/README.md`；它会告诉你接下来该看 `NOW.md`、`INTENT.md`、对应 spec 还是活动变更。在项目目录下打开你的代理，随便说点什么，或者只说"你好"。`NOW.md` 里有一个首次接触任务，于是代理读取仓库，起草 `.keelson/INTENT.md`（项目为什么存在、边界、硬约束、代理可以自行决定什么）；对已有代码的项目，还会为每个能力写一份 spec，为有约定的路径写 rules。它用一次简短的交流请你确认或修正，并保留你的回答。如果你一上来就提了需求，它会在整理那个变更的过程中顺带完成，并一起确认。这些文件你永远不需要手写。


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
