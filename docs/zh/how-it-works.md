[English](../how-it-works.md)

# 工作原理

Keelson 分成两层：

1. `.keelson/` 下**很小的常驻控制面**；
2. 只有真实工作产生值得保留的信息时才出现的**按需项目工件**。

Keelson 自己维护的 runtime 文件可以由 `keelson update` 重新生成；项目事实不会因为升级 Keelson 而被覆盖。

## 最小常驻控制面

Fresh init 创建：

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

职责刻意分开：

- `INTENT.md` —— 项目目的、边界、硬约束、所有者与 Agent 权限；
- `NOW.md` —— 当前状态、不确定性和下一具体步骤；
- `config.yaml` —— 用户控制的机械配置；
- `manifest.json` —— Keelson 负责的宿主生成表面清单；
- `workflow.md` —— 小型执行内核；
- `skill/SKILL.md` —— 把用户意图路由到按需工程能力；
- `README.md` —— 人类项目地图。

ROADMAP、Glossary、rules、specs、活动 changes、ledger、handoff、evidence 和 hooks 都不是常驻要求。只有真的承载信息或已选宿主集成需要时才出现。

## Canonical runtime 与宿主发现

完整 Agent 指导只存在一份：

```text
.keelson/workflow.md
.keelson/skill/
```

各宿主通过它们本来就会读取的路径发现它。Keelson 按需往 `CLAUDE.md`、`AGENTS.md`、`GEMINI.md`、`CODEBUDDY.md` 写一个很薄的标记块，并在宿主文档规定的 Skill 目录写一个单文件 shim。

这些都是指针，不是副本。Skill shim 只告诉 Agent 去读 `.keelson/skill/SKILL.md`，不会复制 references。

每个项目始终还有通用 `AGENTS.md + .agents/skills/keelson/SKILL.md` 发现层。只有宿主确实需要时才增加原生路径。

实现不使用 symlink，因此 Windows、macOS、Linux 采用同一套布局。

## Desired state、manifest 与恢复

`.keelson/manifest.json` 是安装清单，不是项目知识。它记录当前 Keelson 安装真正负责的生成发现表面。

运行 `update` 时：

1. config 定义目标宿主集合；
2. manifest 描述之前由 Keelson 拥有的生成表面；
3. 清除已经不需要且**能够确认属于 Keelson**的 adapter；
4. 目标状态仍需要的共享路径原地保留；
5. 刷新当前 adapter；
6. 重写 manifest。

已知旧路径只有在内容带有 Keelson 签名时才清理，因此同目录下的用户文件不会被连带删除。旧版 `.keelson/.managed.json` 仍可作为兼容输入读取，并迁移成 `manifest.json`。

Keelson 对 package-owned Skill 目录采用可恢复替换：先完整生成同级临时目录，旧完整版本一直保留到新版本准备好，再进行替换；失败时上一份仍可使用。下一次 update 还能恢复上一次中断留下的 temp/backup。

`keelson doctor` 会把 canonical workflow、Skill 文件集合/内容、发现 shim、manifest 状态和已注册 hook 脚本，与当前 CLI 本应生成的结果比较。漂移报告会指出具体表面和修复路径。

## Hook（Claude Code）

Claude Code 启用 hook 时，init 把两个自包含 Node 脚本复制到 `.keelson/hooks/` 并注册到 `.claude/settings.json`。运行时不依赖全局 Keelson 常驻进程。

| Hook | 事件 | 用途 |
|---|---|---|
| `session-start.mjs` | `SessionStart` | 紧凑当前状态：NOW、活动 changes、handoff 下一步 |
| `prompt-state.mjs` | `UserPromptSubmit` | 一行活动 change / verification 状态；空闲时不输出 |

Hook 注入的是**状态，不是工作流指令**。工作流仍然来自 canonical runtime。

`--no-hooks` 会把 `hooks: false` 持久写进项目 config，之后 update 保持关闭；`--hooks` 显式重新开启。宿主设置文件里其他人的 hooks 不会被覆盖。

## 意图路由与内部能力

canonical Skill 不再把 13 个 reference 暴露成 13 条用户工作流，而是先把请求归为六种意图：

| 意图 | 路由 |
|---|---|
| Explore | discover + shape，只读 |
| Change | shape → context → 需要时 plan → build |
| Fix | debug → verify |
| Resume | handoff + 当前上下文 |
| Finish | verify → land → reconcile |
| Improve | harness → reconcile |

`model.md` 和 `engineer.md` 是二级 lens：只有术语/边界漂移，或存在真实设计/可靠性取舍时才读取。

因此渐进披露同时发生在两侧：用户只需要一个很小的心智模型；Agent 遇到复杂任务时仍能进入更深工程能力。

## 渐进式 change workspace

每个非平凡变更先只有一个长期边界：

```text
.keelson/changes/<name>/
└── change.md
```

quick change 可能直到验证前都不需要其他文件。

spec 级变更需要显式计划和行为 delta，因此创建时有：

```text
changes/<name>/
├── change.md
├── tasks.md
└── specs/<capability>/spec.md
```

其他文件由事件触发：

- 第一次发生 Ruling、Root cause、Dispatch、Escalate 或 Verify 时才有 `ledger.md`；
- 工作需要穿过会话/人员边界时才有 `handoff.md`；
- 只有受影响能力才有额外 delta spec；
- 检查真正产生本机输出时才有 `.local/evidence/`。

这样文件存在本身就有含义，而不是空模板。

`change.md` 是可评审边界：why、outcome/non-goal、acceptance；spec 级再包含 approach、alternatives、impact、open questions、rollout、decisions。`tasks.md` 是执行状态，不是 design doc。Delta specs 只描述可观察行为。


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
