[English](../how-it-works.md)

# 它如何工作

Keelson 是代理环境里的三个表面，加上仓库里的一个事实目录。本页精确描述每个机制。

## 常驻块

`keelson init` 往工具的说明文件（`CLAUDE.md`、`AGENTS.md` 或 `GEMINI.md`）里追加一个块，位于 `<!-- keelson:start -->` 和 `<!-- keelson:end -->` 标记之间。`keelson update` 原地替换这个块；`keelson uninstall` 和 `keelson ablate` 移除它。文件里已有的内容从不被触碰。这个块不到 20 行，说明：

- `.keelson/` 里有什么，以及既有文档从 `config.yaml` 引用；
- 当 `guide: true` 时多一行：所有者正在学习工程，所以要用场景和取舍来解释，并在 spec 变更收尾时附一段简短的教学说明；
- 非平凡工作前运行 `keelson context --paths <files>`，编辑共享模块前运行 `keelson impact <files>`；
- 如何给变更定大小（trivial、quick、spec）；
- 把决策记为已确认或假设，未决问题只阻塞依赖它的切片；
- 只用 `keelson check --record` 声明"完成"，用 `keelson land` 落地，然后重写 `NOW.md`；
- 停下时写 `handoff.md`，恢复时先检查工作树；
- 细节在 `keelson` 技能里。

对 Cursor，同样的文本也写入 `.cursor/rules/keelson.mdc`，带 `alwaysApply: true`。

## Hook（Claude Code）

`init` 把两个自包含的 Node 脚本复制到 `.keelson/hooks/`，并在 `.claude/settings.json` 里注册。它们不依赖 CLI 是否安装。

| Hook | 事件 | 打印 |
|---|---|---|
| `session-start.mjs` | `SessionStart`，在 `startup`、`resume`、`clear`、`compact` 时 | 一行标题；`ROADMAP.md → Now`（最多 400 字符，仍是模板占位符时跳过）；`NOW.md`（最多 900 字符）；活动变更及其层级、状态、任务进度和 owner；每个活动变更交接里的 `Next step`（最多 200 字符） |
| `prompt-state.mjs` | `UserPromptSubmit` | 一行：`[keelson] active: <name> · <work> · verify <state> · <done>/<total> tasks · <n> open`。没有活动变更时什么都不打印 |

会话快照每个会话花费几百 token 一次。每个提示词的那一行花费几十 token，空闲时为零。两个 hook 都不打印指令；它们打印状态。

给 `init` 传 `--no-hooks` 可跳过。`settings.json` 里已有的 hook 被保留；Keelson 只增删命令路径包含 `.keelson/hooks/` 的条目。

## 技能

`init` 把技能复制到工具的技能目录（`.claude/skills/keelson/` 或 `.agents/skills/keelson/`），并把包版本盖进 `SKILL.md` 的 frontmatter，好让 `keelson doctor` 发现过期的安装。它包含 `SKILL.md` 和十三个 reference：

| Reference | 何时阅读 |
|---|---|
| `discover.md` | 所有者不确定自己想要什么，或者正在学习：先场景后技术、缺口归属、一个最高价值问题、范围守卫、承诺前先探索、引导模式 |
| `shape.md` | 理解想要什么：先查事实、假设审计、写回、决策状态、停止规则、单问题访谈、授权、无人值守运行、定大小 |
| `model.md` | 用词或边界开始漂移：术语表与限界上下文、边界与不变量、深模块、设计两次 |
| `context.md` | 知道代码触及什么：三层上下文、影响分析、预算 |
| `plan.md` | 创建 `change.md`、纵向切片、验收、delta specs、effort 层级、与已有跟踪器配合 |
| `engineer.md` | 一个设计或可靠性问题：按交付、结构、演进、运行分组的工程视角；作为词汇的命名模式；作为数字的质量目标 |
| `build.md` | 执行任务：裁定、按层级分派子代理、升级、并行工作、让工件保持真实 |
| `verify.md` | 记录有效性、内容有效性、不悄悄弱化测试、陌生读者评审、完成报告 |
| `harness.md` | 演进控制系统：不变量、前馈/反馈放置、重复失败升级、baseline、sunset 条件 |
| `handoff.md` | 什么放哪里、写交接、安全恢复、`NOW.md` |
| `land.md` | 落地门禁、代码与 specs 一起评审、相撞、发布状态、经验提升 |
| `reconcile.md` | 把新事实写回并保持项目精简：每条事实的去处、重写不追加、预算与压缩、整理节奏 |
| `debug.md` | 复现、定位、修复、命名根因类别 |

`SKILL.md` 按需要路由。代理一次读一个 reference。BOUND 阶段遇到有实质歧义的工作时，会先做紧凑的假设审计，并且一次最多只问一个由用户掌握、真正阻塞结果的问题；审计过程本身不落盘，真正有长期价值的结果才会路由进 `change.md`、specs、rules 或术语表。每条准则带一段隐藏的 HTML 注释，含 `id`、它防止的失败（`without`）和删除条件（`sunset`）。`keelson retro` 读取这些注释。

`profile` 决定发出多少文本。`lean` 剥掉标记为 `<!-- guided -->` 的块。`guided` 保留它们。

Keelson 渲染或安装的包内 Markdown 统一规范为 LF。解析器和 hook 把 LF 与 CRLF 当作相同语义，因此 Windows checkout 或用户编辑出的 CRLF 文件不会改变 Keelson 看到的项目状态；Keelson 也不会仅仅为了换行格式去重写用户文件。

## 变更目录

`keelson new <name> --tier quick|spec [--capability a,b] [--touches globs] [--depends other] [--worktree]` 创建 `.keelson/changes/<name>/`：

```text
change.md      frontmatter (tier, created, status, owner, branch, worktree, depends, touches)
               + Why, What（结果 + 非目标）[, How, Alternatives, Impact], Acceptance, Open questions [, Rollout], Decisions
tasks.md       "## Slice: name" + "Delivers: …" + checkbox tasks with (effort: tier) and verify: `cmd`
ledger.md      append-only ### entries
handoff.md     created by `keelson handoff`, stamped with at/updated/by
specs/<cap>/spec.md   delta spec with a base: stamp, created per --capability
```

`owner` 是 git 用户名（或操作系统用户），`branch` 是当前分支。`--worktree` 运行 `git worktree add -b <name> ../<repo>-<name>` 并记录 `branch: <name>` 和 `worktree:`。`--touches` 声明变更将编辑的路径 glob；`--depends` 指出它等待的其他活动变更。

### 生命周期

```text
keelson new  →  build and tick tasks  →  keelson check --record  →  (keelson handoff when stopping)
             →  keelson land   (fold or archive, specs merged)
             →  keelson cancel (archive as cancelled, nothing merged)
```

`config.yaml → land: fold`（默认）在合并后删除变更目录；它的 ledger 和 handoff 留在 git 历史里，`keelson retro` 从那里读取。`land: keep`，或 `keelson land --keep`，把目录移到 `.keelson/changes/archive/YYYY-MM-DD-<name>/`，并写 `status: integrated`。`keelson cancel` 把它移到 `archive/YYYY-MM-DD-<name>-cancelled/`，写 `status: cancelled` 和一段 `## Cancelled` 说明。

### 落地门禁

以下任一情况成立时，`keelson land` 拒绝并列出每一个原因：

- 任何任务未勾选；
- 任何验收项未勾选，或 spec 变更没有 `## Acceptance` 列表；
- 还有未决问题；
- verification 为 `not-run`、`failed`、`partial` 或 `stale`；
- 存在 `(assumed)` 决策而没有传 `--confirm-assumptions`；
- 某条 `What` 项以 `**BREAKING**` 开头而没有 `## Rollout` 段；
- 某个 delta spec 的 `base:` 与主 spec 不再匹配而没有传 `--accept-drift`。

`--dry-run` 预览合并。`--force` 越过所有门禁并打印越过了什么；它留给所有者的明确决定。

## Spec 合并语义

主 specs 位于 `<paths.specs>/<capability>/spec.md`：

```markdown
# orders

## Purpose
...

## Requirement: Order listing
The system SHALL ...

### Scenario: Default page
- WHEN ...
- THEN ...

## Decisions
- orders: offset pagination over cursor; cursor rejected because the table needs page jumps
```

变更里的 delta spec 带一个 `base:` 戳（创建 delta 时主 spec 的哈希，或 `new`）和三个段：

```markdown
---
base: 4233e56865
---
## ADDED Requirements
### Requirement: Page size limit
...

## MODIFIED Requirements
### Requirement: Order listing
(full replacement text)

## REMOVED Requirements
### Requirement: Legacy CSV export
```

落地时，按能力：

- `REMOVED` 按名字删除需求；名字不存在时报告。
- `MODIFIED` 按名字替换需求；名字不存在时改为新增并报告。
- `ADDED` 追加；名字已存在时替换并报告为修改。
- 名字比较不区分大小写。delta 里的 `#### Scenario:` 标题在主 spec 里规范化为 `###`。

然后 `change.md` 里 `## Decisions` 下每条以能力前缀开头的行（`- orders: …`，前面可以有 `(confirmed)` 或 `(assumed)`）被追加到该能力的 `## Decisions` 段。已存在的行跳过。没有前缀的行跳过并警告。还没有 spec 的能力会新建一份。

漂移：如果主 spec 在 delta 写成之后改变了，`base:` 不再匹配，落地会拒绝，直到代理重读它并传 `--accept-drift`。

## 工作树指纹

验证的过期检测需要"代码此刻的样子"有一个稳定的标识。在 git 仓库里，Keelson 用一个一次性索引构建真实的 tree 对象：把 `.keelson/` 排除后 `git add -A` 到临时的 `GIT_INDEX_FILE`，然后 `git write-tree`，截取 10 个字符。已跟踪和未跟踪的文件都计入，`.gitignore` 被遵守，往 ledger 追加不会让它记录的证据失效。没有 git 时，指纹是 `node_modules`、`.git` 和 `.keelson` 之外所有文件的内容哈希。

`keelson check` 把指纹作为 `tree <hash>` 写进 `Verify:` 条目。`keelson status`、`land` 和 `doctor` 重新计算并比较。

## GLOSSARY.md

`.keelson/GLOSSARY.md` 每个术语一行：代码、specs 和对话共用的那个含义。`init` 用模板播种它；`keelson context` 在它有了真实内容后打印（模板占位行被跳过）。一个术语在系统另一部分表示不同的东西时，两行都保留，各自写明所属部分。它和其他文档一样有行数预算。

## 检查条目

`config.yaml → check` 接受命令字符串或对象 `{name, command, kind}`。`keelson check` 把两者都规范化为 name、command 和 kind；对字符串，name 就是命令本身，kind 从命令猜测（lint 和格式化工具为 `lint`，类型检查器为 `typecheck`，构建步骤为 `build`，提到 architecture、dependencies、boundaries、compatibility 或 contracts 的命令为 `fitness`，测试运行器为 `test`，否则为 `check`）。有名字的条目在输出和 `--json` 里打印名字和 kind。`fitness` 检查是变成可执行的约束；技能要求在一条规则反复被打破时把它变成这样一条检查。

## 知识健康

`keelson doctor` 在不编辑任何东西的前提下计算：

- `INTENT.md`、`ROADMAP.md`、`NOW.md`、`GLOSSARY.md`、每份 spec、`rules/index.md` 里列出的每个 rule 文件，以及每个活动的 `change.md` 和 `handoff.md` 的行数，与 `config.yaml → budgets` 比较；由 `**` 或 `*` 路由的 rule 文件还会求和并与 `always-on` 比较；
- 每份 spec 的需求正文是否匹配历史叙述的措辞（`used to be`、`was changed to`、`has been replaced by`、`we then/later moved`、`as of <year>`、带 `changed`、`moved`、`switched` 或 `replaced` 的带日期句子）以及名为 `Update`、`Changelog`、`History` 或 `Migration notes` 的标题；
- 跨能力的需求名（不区分大小写），找出重复；
- 每个活动变更中 `change.md`、`tasks.md`、`ledger.md`、`handoff.md` 里最新的修改时间（14 天后视为闲置）和任务数（超过 25 视为过大）；
- `docs/generated/` 下的文件是否比 `src/`（没有 `src/` 时为项目根目录）下最新的文件旧一天以上。

每条发现都带一个建议的修复。输出是一份小压缩清单，由人或代理去做，并像任何其他变更一样落地。

## NOW.md

`NOW.md` 是快照，不是日志。每次落地和每次中途停下时整体重写：在做什么、卡在哪或有什么不确定（包括"尚未检查：…"）、下一步具体做什么。`keelson land --now "<text>"` 写它。会话启动 hook 打印它。

## Rules 路由

`.keelson/rules/index.md` 把 glob 映射到同目录下的文件，一行一条：

```markdown
- `**` → general.md — applies to every change
- `src/api/**` → api.md — HTTP layer
- `src/services/**` → services.md
```

箭头可以是 `→`、`->` 或 `:`。破折号后的说明可选。`keelson context --paths a,b` 打印 glob 匹配任一路径的每个 rule 文件；单独的 `**` 和 `*` 总是匹配。

Glob 语义：`**/` 匹配零个或多个目录；单独的 `**` 匹配一切；`*` 在一个路径段内匹配；`?` 匹配一个字符；`{a,b}` 匹配备选项。没有通配符的 glob，如 `src/api` 或 `src/api/`，匹配该路径及其下的一切。

`keelson validate` 把索引里引用了缺失文件的条目报告为错误，把没有列入索引的 rule 文件报告为警告。

## 影响提示

`keelson impact <files>` 对给定文件打印：

- 调用方：`import`、`require`、`from`、`include` 或 `use` 行提到该模块基名的文件（通过 `git grep`，没有 git 时遍历文件）；
- 可能受影响的 specs：目录名出现在某个文件路径中、或 spec 文本包含某个文件基名中的词的能力；
- 适用的 rules，路由方式与 `context` 相同；
- `touches` 覆盖这些文件、或能力与找到的 specs 匹配的活动变更。

这些输出的每一行都是提示。动态入口、路由、任务和模板要靠阅读发现。

## Ledger 条目与 retro

`ledger.md` 只追加。每个条目是一个 `###` 标题加正文：

| 条目 | 含义 | 解析的字段 |
|---|---|---|
| `### Ruling: <topic>` | 代理在授权范围内没有停下而是自行做出的决定 | 计数 |
| `### Root cause: <category>` | 已修复 bug 的类别 | `missing-rule`、`cross-layer`、`propagation`、`test-gap`、`implicit-assumption`、`guessed-fix` |
| `### Verify: <claim>` | 某个状态声明的证据 | 反引号里的命令、`exit N`（取最高）、`tree <hash>` |
| `### Dispatch: task N → <tier> (<alias>)` | 一次子代理分派 | 层级、任务，以及正文第一行的 `Result: pass\|fail` |
| `### Escalate: task N <tier> → <tier>` | 升一级重新分派 | from、to |
| `### Note: <text>` | 其他任何事 | 无 |

`keelson validate` 要求每条 `Verify:` 有命令和退出码，在没有 `tree` 时警告，在 `Dispatch:` 没有 `Result:` 行时警告，并要求每条 `Root cause:` 使用已知类别。

`keelson retro` 从活动变更、归档和 git 历史（过去提交中在 `.keelson/changes/` 下被删除的 ledger）收集 ledger。它计算每类根因的数量；每个层级的分派数、失败数、没有结果的条目数、从该层级升走的次数，以及基于已知结果的一次通过率；verify 条目数和失败数；裁定数。然后列出每个带 sunset 条件的指导块，并在达到阈值时打印建议：删掉某个块、为反复出现的类别加一条 rule，或调整 effort 标记。
