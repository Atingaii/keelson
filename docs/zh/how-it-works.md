[English](../how-it-works.md)

# 工作原理

Keelson 由代理环境中的三个小表面和仓库里的一个事实目录组成。本页精确描述每个机制。

## 常驻块

`keelson init` 在工具的指令文件（`CLAUDE.md`、`AGENTS.md` 或 `GEMINI.md`）末尾追加一段块，夹在 `<!-- keelson:start -->` 和 `<!-- keelson:end -->` 标记之间。`keelson update` 原地替换这段块；`keelson ablate` 移除它。块不到 20 行，内容是：

- `.keelson/` 里有什么；
- 非平凡工作前运行 `keelson context --paths <files>` 或直接读那些文件；
- 如何给变更定大小（trivial、quick、spec）；
- 只在有新鲜命令及其退出码时才声明"完成"；
- 用 `keelson land` 落地完成的工作并重写 `NOW.md`；
- `keelson` 技能持有各阶段的细节。

对 Cursor，同样的文本还会写到 `.cursor/rules/keelson.mdc`，并设 `alwaysApply: true`。

## Hooks（Claude Code）

`init` 把两个自包含的 Node 脚本复制到 `.keelson/hooks/`，并登记到 `.claude/settings.json`。它们不依赖 CLI 是否已安装。

| Hook | 事件 | 打印内容 |
|---|---|---|
| `session-start.mjs` | `SessionStart`，在 `startup`、`resume`、`clear`、`compact` 时 | 一行标题、`NOW.md`（上限 1200 字符）、活动中的变更列表（含层级和任务进度）、已有 spec 的能力 |
| `prompt-state.mjs` | `UserPromptSubmit` | 一行：`[keelson] active: <name> · <phase> · <done>/<total> tasks`。没有活动变更时什么都不打印 |

会话快照每个会话花费一次几百个 token。提示行每轮几十个 token，空闲时为零。两个 hook 都不打印指令，只打印状态。

给 `init` 传 `--no-hooks` 可跳过它们。`settings.json` 里已有的 hooks 会保留；Keelson 只添加命令路径包含 `.keelson/hooks/` 的条目。

## 技能

`init` 把技能复制到工具的技能目录（`.claude/skills/keelson/` 或 `.agents/skills/keelson/`）。它包含 `SKILL.md` 和六份 reference：

| Reference | 何时阅读 |
|---|---|
| `shape.md` | 把请求变成共同理解：先探索、写回、无人值守的会话、访谈、定大小 |
| `plan.md` | 创建 `change.md`、delta specs、带 effort 层级的 `tasks.md`、`ledger.md` |
| `build.md` | 执行任务：裁定、按层级分派子代理、升级、保持产物真实 |
| `verify.md` | 新鲜证据、对照 specs 和 rules 评审、陌生读者评审、完成报告 |
| `land.md` | `keelson land`、`NOW.md`、把经验提升为 rules、decision 写法 |
| `debug.md` | 复现、定位、修复、命名根因类别 |

`SKILL.md` 按阶段路由。代理一次只读一份 reference。每条准则都带一段隐藏的 HTML 注释，含 `id`、它防止的失败（`without`）和删除条件（`sunset`）。`keelson retro` 读取这些注释。

`profile` 设置决定发出多少文本。`lean` 去掉标记为 `<!-- guided -->` 的块。`guided` 保留它们。

## Change 目录

`keelson new <name> --tier quick|spec` 创建 `.keelson/changes/<name>/`：

```text
change.md      frontmatter (tier, created) + Why, What [, How, Alternatives, Impact, Decisions]
tasks.md       checkbox list with (effort: light|standard|deep) and verify: `cmd`
ledger.md      append-only ### entries
specs/<cap>/spec.md   delta spec, spec tier only
```

阶段由文件计算得出，不单独存储：

| 条件 | 阶段 |
|---|---|
| 没有任务 | `planning` |
| 有任务，均未勾选 | `ready` |
| 部分勾选 | `building` |
| 全部勾选，最后一条 `Verify:` 不是 exit 0 或不存在 | `verifying` |
| 全部勾选，最后一条 `Verify:` 为 exit 0 | `landing` |

除非所有任务已勾选且最后一条 `Verify:` 的退出码为 0，`keelson land` 会拒绝执行。用户明确要求时可用 `--force` 覆盖。

### fold 还是 keep

`config.yaml` 的 `land: fold`（默认）在合并后删除 change 目录。它的 ledger 留在 git 历史里，`keelson retro` 从那里读取。`land: keep` 或 `keelson land --keep` 则把目录移到 `.keelson/changes/archive/YYYY-MM-DD-<name>/`。

## Spec 合并语义

主 specs 位于 `.keelson/specs/<capability>/spec.md`：

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

变更中的 delta spec 使用三个段：

```markdown
## ADDED Requirements
### Requirement: Page size limit
...

## MODIFIED Requirements
### Requirement: Order listing
(full replacement text)

## REMOVED Requirements
### Requirement: Legacy CSV export
```

落地时，对每个能力：

- `REMOVED` 按名称删除 requirement；名称不存在时会报告。
- `MODIFIED` 按名称替换 requirement；名称不存在时改为添加并报告。
- `ADDED` 追加；名称已存在时替换并作为 modified 报告。
- 名称比较不区分大小写。

然后，`change.md` 里 `## Decisions` 下所有带能力前缀的行（`- orders: ...`）被追加到该能力的 `## Decisions` 段。已存在的行跳过。没有前缀的行跳过并给出警告。尚无 spec 的能力会新建一份只含 decisions 的 spec。

## NOW.md

`NOW.md` 是快照，不是日志。每次落地时以及工作中途停下时都整体重写。现在时，三个简短部分：当前活动的、被阻塞或不确定的、下一个具体步骤。`keelson land --now "<text>"` 会写它。session-start hook 会打印它。

## Rules 路由

`.keelson/rules/index.md` 把 glob 映射到同目录下的文件，一行一条：

```markdown
- `**` → general.md — applies to every change
- `src/api/**` → api.md — HTTP layer
- `src/services/**` → services.md
```

箭头可以是 `→`、`->` 或 `:`。破折号后的说明可选。`keelson context --paths a,b` 打印 glob 匹配任一路径的所有 rule 文件；单独的 `**` 和 `*` 总是匹配。

glob 语义：`**/` 匹配零个或多个目录；单独的 `**` 匹配任何东西；`*` 在单个路径段内匹配；`?` 匹配一个字符；`{a,b}` 匹配备选项。不含通配符的 glob，如 `src/api` 或 `src/api/`，匹配该路径及其下所有内容。

`keelson validate` 把 index 中指向缺失文件的条目报为错误，把未列入 index 的 rule 文件报为警告，因为未列入的文件永远不会被路由到。

## Ledger 条目与 retro

`ledger.md` 只追加。每条是一个 `###` 标题加正文：

| 条目 | 含义 | 解析的字段 |
|---|---|---|
| `### Ruling: <topic>` | 代理没有停下而是自己做出的决定 | 计数 |
| `### Root cause: <category>` | 已修复 bug 的类别 | `missing-rule`、`cross-layer`、`propagation`、`test-gap`、`implicit-assumption`、`guessed-fix` |
| `### Verify: <claim>` | 状态声明的证据 | 正文中反引号里的命令和 `exit N` |
| `### Dispatch: task N → <tier> (<alias>)` | 一次子代理分派 | 层级、任务，以及正文中的一行 `Result: pass\|fail` |
| `### Escalate: task N <tier> → <tier>` | 升一级重新分派 | from、to |
| `### Note: <text>` | 其他任何内容 | 无 |

`keelson validate` 要求每条 `Verify:` 同时带命令和退出码，每条 `Root cause:` 使用已知类别。

`keelson retro` 从活动中的变更、archive 和 git 历史（过去提交中删除的 `.keelson/changes/` 下的文件）收集 ledger。它计算：

- 各类别的根因数量；
- 每个层级：分派数、失败数、从该层级升级的次数、一次通过率；
- verify 条目数及失败数；
- 裁定数。

然后列出每个带 sunset 条件的准则块，并在达到阈值时给出建议：删除某个块、为反复出现的类别添加 rule、或调整 effort 标注。
