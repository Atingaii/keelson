[English](../cli.md)

# CLI 参考

所有命令都可以在项目内任意位置运行；Keelson 向上查找含有 `config.yaml` 或 `INTENT.md` 的 `.keelson/`（用户级的 `~/.keelson/` 永远不算）。退出码 0 表示成功，1 表示错误或检查失败，2 表示未知命令。多数命令支持 `--json` 输出机器可读结果。`--help` 和 `--version` 随处可用；`keelson <command> --help` 打印该命令的用法行。

布尔标志：`--json`、`--force`、`--dry-run`、`--hooks`、`--no-hooks`、`--refresh`、`--detect`、`--keep`、`--quiet`、`--confirm-assumptions`、`--accept-drift`、`--worktree`、`--purge`，以及 7 个一等公民宿主标志（`--claude`、`--codex`、`--opencode`、`--pi`、`--gemini`、`--kiro`、`--codebuddy`）和 `--agents`。值标志接受 `--key value` 或 `--key=value`。`--guide` 是值标志，但也可以裸用：`--guide` 和 `--guide true` 打开引导模式，`--guide false` 关闭。

## `keelson init`

```text
keelson init [--<platform> ...] [--tools a,b] [--guide] [--profile lean|guided]
             [--lang en|zh] [--hooks|--no-hooks] [--dry-run] [--dir <path>]
```

正常情况下只需要执行一次。创建最小常驻控制面：Keelson 维护的 `README.md`、`workflow.md`、`skill/`，用户控制的 `config.yaml`，Keelson 维护的 `manifest.json`，以及核心项目事实 `INTENT.md` + `NOW.md`。**不会**预先生成空 ROADMAP、Glossary、rules、specs、changes、tasks、ledger 或 handoff。

只安装已选宿主真正需要的发现块/Skill shim；每个项目始终还有通用 `AGENTS.md + .agents/skills/` 层。首次运行探测检查命令和已有项目材料。

首次接触任务只要求 Agent 推断并确认项目意图，不会把既有仓库一次性盘点成 specs/rules；这些内容以后在真实工作暴露出长期行为契约或工程不变量时才增长。

工具选择优先级：`--tools a,b`；一等公民标志（`--claude`、`--codex`、`--opencode`、`--pi`、`--gemini`、`--kiro`、`--codebuddy`）或 `--agents`；update 时的项目 config；然后探测本机已安装的一等公民。一个也没有时使用通用 `agents` 层。

- `--guide` 开启引导式对话风格。
- `--no-hooks` 持久写入 `hooks: false`；`--hooks` 重新开启。
- `--dry-run` 预览创建/更新/删除/迁移动作，不写磁盘。
- `--dir` 指定另一个目录。

未知/退役宿主或无效 profile 时以 1 退出。

## `keelson platforms`

```text
keelson platforms [--json]
```

列出 7 个一等公民宿主和通用兜底层，并显示支持层级、说明/Skill 发现路径、hook 能力、可信度以及本机安装/项目配置状态。

## `keelson update`

与 `init` 相同，使用 `config.yaml` 里已有的值。升级包之后运行它，刷新 `.keelson/workflow.md`、`.keelson/skill/`、发现 shim 与 hook，并迁移 `config.yaml`。接受 `--dry-run`。

## `keelson context`

```text
keelson context [--paths a/,b/**] [--json]
```

以 Markdown 打印：配置里的 `context` 文本、`INTENT.md`、`ROADMAP.md`、`NOW.md`、来自 `refs` 的既有引用、活动变更（层级、owner、work 和 verification 状态、进度、未决问题、交接下一步）、有 specs 的能力、glob 匹配给定路径的 rule 文件，以及未提交的文件。`**` 下的 rules 总是打印。路径也可以作为位置参数给出。

```bash
keelson context --paths src/services/notify.js
```

## `keelson impact`

```text
keelson impact <file> [file...] [--json]
```

对一组文件的机械提示：按模块名找到的引用方、路径或文本匹配的 specs、适用的 rules，以及 `touches` 或能力重叠的活动变更。每一行都是导航；动态入口要靠阅读发现。

```text
$ keelson impact src/api/orders.js
Impact hints for src/api/orders.js
Callers / importers (1):
  src/web.js
Specs that may be affected (1):
  orders (mentions orders)
Rules that apply (2):
  rules/general.md  **
  rules/api.md  src/api/**
! active change add-pagination (ann, in-progress) declares these paths or capabilities — coordinate before editing
```

## `keelson focus`

```text
keelson focus [change] [--auto|--clear] [--json]
```

给 Agent 使用的 session 路由命令。它只改变 gitignored 的 conversation pointer，绝不改变长期 work status。

- `focus <change>`：宿主存在稳定 session identity 时，把当前 session 绑定到一个 active change。
- `--auto`：优先保留已有有效 focus；否则选择当前 branch 唯一匹配或全局唯一 active change。
- `--clear`：清掉当前 session pointer，不 cancel/complete change。
- degraded mode：宿主没有经过验证的 session identity 时只返回安全候选，不持久化共享/global focus；多个候选永远不猜。

## `keelson new`

```text
keelson new <name> [--tier quick|spec] [--capability a,b] [--touches globs]
                   [--depends change[,change]] [--worktree] [--owner who] [--json]
```

创建**最小有用**的 change workspace。

`quick`：

```text
changes/<name>/
└── change.md
```

`spec` 还会创建 `tasks.md`；每个 `--capability` 创建一份 delta spec，并带 `base:` 戳（当前主 spec 哈希，或 `new`）。

`new` **不会**创建 `ledger.md`；第一次发生验证/裁定/根因/分派事件时它才出现。`handoff.md` 只有真正调用 `keelson handoff` 时才出现。

frontmatter 记录 tier、创建日期、work status、owner、branch，以及可选依赖/触及路径。`--worktree` 创建隔离 Git worktree/branch。

change 已存在、tier 未知，或在非 Git 项目使用 `--worktree` 时以 1 退出。

## `keelson status`

```text
keelson status [--json]
```

每个活动变更：work、verification 和 release 状态；owner 和分支；切片及其进度和交付内容（没有切片时列出任务）；验收进度；未决问题及其阻塞的内容；等待所有者的假设决策；交接戳以及 HEAD 此后是否移动。然后是活动变更之间的共享契约警告、最后一个 tag 及其后落地的变更，以及 `NOW.md`。

```text
Keelson — shop
2 capabilities in .keelson/specs · 1 active change · HEAD 7a9f37c2b1 · 3 uncommitted

share-links  [spec]  work: in-progress  verify: ~ stale  release: unreleased  (ann @ share-links)
   verified at tree 5bcb829dae, worktree is 9a92f4bead — re-run `keelson check --record` before landing
   ✓ slice Create and access 2/2 — a link can be created and opens the album
   · slice Revoke and expiry 0/3 — revoked or expired links refuse every access path
   acceptance 2/4
   open: default expiry for share links? (blocks Revoke and expiry)
   1 assumed decision awaiting the owner
   handoff 2026-09-19 14:02 at 7a9f37c2b1
```

## `keelson handoff`

```text
keelson handoff [name] [--by who] [--json]
```

创建/重新盖戳一个显式 transfer package，只用于换人/换机器，不用于普通聊天恢复。有 session focus 时优先使用它；否则只有一个 active change 时可省略名字。

## `keelson validate`

```text
keelson validate [--json]
```

对 `.keelson/` 和 specs 目录的结构检查。错误（退出 1）：缺少 `INTENT.md` 或 `NOW.md`；`profile` 或 `land` 无效；引用了缺失的 rule 文件；spec 目录没有 `spec.md`；重复的需求；层级或 work 状态无效；缺少 `Why`/`What`；spec 层级缺少 `How`/`Alternatives`/`Impact` 或备选少于两个；effort 标记无效；`Verify:` 条目没有命令或退出码；未知的根因类别；`.keelson/` 下任何位置出现带日期的模型 ID。警告：模板占位符、未列入索引的 rules、没有场景的需求、没有检查类型的验收项、没有 `blocks:` 的未决问题、依赖了不活动的变更、`**BREAKING**` 没有 `Rollout`、没有 `Delivers:` 的切片、没有 `tree` 的 `Verify:`、没有 `Result:` 的 `Dispatch:`、没有 `at:` 的交接、缺失的 refs 路径、`.gitignore` 没有 `.keelson/.local/`，以及以层命名的切片（`database`、`backend`、`frontend`、`ui`、`api`、`model`、`storage`、`infra` 及其变体），因为一个切片应该是一条贯穿所有层的、用户可观察的路径。

```text
! changes/demo/tasks.md: slice "Backend" is named after a layer; a slice should be one user-observable path through all layers (tracer bullet)
```

## `keelson check`

```text
keelson check [cmd...] [--record [claim]] [--change name] [--quiet] [--json]
```

运行 `config.yaml → check` 里的条目（或作为位置参数给出的单条命令），把每条输出保存到 `.keelson/.runtime/evidence/<timestamp>-<n>.log`，并为每个条目打印一个退出码。条目可以是命令字符串或 `{name, command, kind}`；有名字的条目在命令前打印名字和类型：

```text
keelson check — 3 commands
✓ unit (test) `npm run test` exit 0
✓ boundaries (fitness) `npm run test:architecture` exit 0
✓ `npm run lint` exit 0
```

计算工作树指纹，形成一条 `Verify:`，写明每条命令、退出码和 `tree <hash>`。没有 `--record` 时打印这条记录；有 `--record` 时追加到活动变更的 `ledger.md`（有多个活动变更时用 `--change` 指定）。`--record "<claim>"` 设置条目标题；否则为 `checks pass` 或 `checks failed`。

任何命令失败时以 1 退出；记录仍会写入，带失败的退出码。

```bash
keelson check --record "pagination end to end"
keelson check "npm test -- orders" --record --change add-pagination
```

## `keelson land`

```text
keelson land [name] [--now "<text>"] [--confirm-assumptions] [--accept-drift]
             [--keep] [--force] [--dry-run]
```

以下情况下拒绝并列出每一个原因：任务或验收项未勾选、spec 变更没有验收清单、还有未决问题、verification 不是 `passed`、存在 `(assumed)` 决策而没有 `--confirm-assumptions`、`**BREAKING**` 项没有 `## Rollout`、某个 delta 的 `base:` 与主 spec 不再匹配而没有 `--accept-drift`。然后把每个 delta 合并进 `<paths.specs>/<capability>/spec.md`，追加 `Decisions` 行，删除变更目录（或在 `--keep` 或 `land: keep` 时以 `integrated` 归档）。`--now` 重写 `NOW.md`。`--dry-run` 预览。`--force` 越过门禁并打印越过了什么。

```text
$ keelson land add-pagination
keelson: cannot land "add-pagination":
  - 1 acceptance item(s) unchecked
  - verification stale (verified at tree 5bcb829dae, worktree is 9a92f4bead)
Fix them, or pass --force if the user explicitly asked.
```

## `keelson cancel`

```text
keelson cancel <name> [--reason "<why>"]
```

设置 `status: cancelled`，追加一段带日期和原因的 `## Cancelled` 说明，并把目录移到 `changes/archive/YYYY-MM-DD-<name>-cancelled/`。不往 specs 合并任何内容。

## `keelson retro`

```text
keelson retro [--json]
```

从活动变更、归档和 git 历史读取 ledger。打印根因计数、每个层级的分派统计、verify 条目、每个带 sunset 条件的指导块，以及达到阈值时的建议（删掉指导、加一条 rule、调整 effort 标记）。

## `keelson models`

```text
keelson models [--platform <id>] [--json]
keelson models --detect
keelson models --refresh [--no-providers]
keelson models --resolve <light|standard|deep>
keelson models rank <alias> <light|standard|deep>
```

默认：一张层级到别名的表，带每条解析的来源，以及本地探测摘要。`--detect` 重新扫描已安装的工具和 provider key。`--refresh` 拉取注册表，并在设置了 key 时拉取 provider 目录。`--resolve` 为脚本打印一个别名，无法解析时以 1 退出。`rank` 写入用户级覆盖，拒绝带日期的 ID。见 [models.md](models.md)。

## `keelson doctor`

```text
keelson doctor [--json]
```

报告 Node 版本、待执行的配置迁移、canonical runtime 完整性、`.keelson/manifest.json` desired-state 完整性，以及每个已配置宿主的发现 shim 目标/内容、说明块、hook 注册与已注册 hook 脚本完整性。然后是每条 `validate` 发现、过期的验证、交接后 HEAD 移动、对活动变更的依赖、共享契约冲突、知识健康，以及 PATH 上缺失的工具 CLI。任何发现是错误时以 1 退出。

### 知识健康

关于项目文档的发现，以警告或信息报告并附建议的修复，从不自动应用：

| 类型 | 报告时机 |
|---|---|
| `budget` | `INTENT.md`、`ROADMAP.md`、`NOW.md`、`GLOSSARY.md`、某份 spec、某个 rule 文件、某个活动的 `change.md` 或 `handoff.md` 超过了 `config.yaml → budgets` 里的行数预算；或由 `**` 路由的 rule 文件之和超过 `always-on` 预算 |
| `narrative` | 某份 spec 的需求文字读起来像历史（`used to be`、`was changed to`、`has been replaced by`、带日期的变更句子、`Update` 或 `Changelog` 之类的标题） |
| `duplicate` | 同一个需求名出现在两个能力里 |
| `idle` | 某个活动变更已经 14 天或更久没有被触碰 |
| `oversized` | 某个活动变更有超过 25 个任务 |
| `stale-generated` | `docs/generated/` 下的某个文件比源码树旧一天以上 |

```text
knowledge health: findings are suggestions for small compactions, never automatic rewrites
! budget: INTENT.md is 153 lines (budget 120) → compact: rewrite the current truth, split by capability or scope, delete history that git already keeps, move automatable rules into checks
! narrative: .keelson/specs/orders/spec.md reads like history in places → current truth is present tense; reasons go to Decisions, the sequence of changes stays in git
```

## `keelson ablate` / `keelson restore`

```text
keelson ablate [--dry-run]
keelson restore [--force] [--dry-run] [--dir <path>]
```

`ablate` 把每个 Keelson 表面（生成的说明文件、宿主 skill shim 目录、配置过的宿主专用 rule 文件、`.claude/settings.json`、`.keelson/`）复制到 `~/.keelson/ablations/<hash>/`，记录暂存内容的哈希和每个路径在移除后的哈希，然后移除它们。`restore` 验证暂存完好，若任何受管路径在 ablate 期间发生了变化则拒绝（除非 `--force`），把一切复制回来，并删除暂存。

## `keelson uninstall`

```text
keelson uninstall [--purge]
```

移除生成的运行时/集成表面：宿主 skill shim 目录、发现块、配置过的宿主专用 rule 文件、`.claude/settings.json` 里的 hook 条目、`.keelson/workflow.md`、`.keelson/skill/`、`.keelson/hooks/`、`.keelson/.runtime/` 与兼容旧版 `.keelson/.local/`。保留 `.keelson/` 中的项目事实（INTENT、NOW、ROADMAP、rules、specs、changes）。`--purge` 连 `.keelson/` 一起移除；存放在它之外的 specs 不受影响。
