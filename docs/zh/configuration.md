[English](../configuration.md)

# 配置

配置放在两个地方。`.keelson/config.yaml` 按项目、提交进 git。`~/.keelson/` 按用户、从不提交。

## `.keelson/config.yaml`

每个键都是可选的。`keelson init` 写入默认值。未知的键被忽略。

```yaml
version: 4
tools:
  - agents
lang: en
profile: lean
default_tier: auto
confirm:
  quick: proceed
  spec: proceed
land: fold
check:
  - npm run lint
  - name: unit
    command: npm run test
    kind: test
  - name: boundaries
    command: npm run test:architecture
    kind: fitness
guide: false
hooks: true
budgets:
  INTENT: 120
  ROADMAP: 80
  NOW: 60
  GLOSSARY: 200
  spec: 250
  rule: 120
  change: 200
  handoff: 100
  always-on: 300
context: ""
paths:
  specs: .keelson/specs
refs:
  architecture: null
  decisions: docs/adr
  tasks: https://github.com/acme/shop/issues
  ci: .github/workflows
models: {}
effort:
  review_min: standard
  plan_min: deep
  verify_min: deep
  escalate_after: 2
```

| 键 | 默认值 | 含义 |
|---|---|---|
| `version` | `4` | 配置结构版本。旧文件每次读取时在内存中迁移，由 `keelson update` 重写 |
| `tools` | `[agents]` 兜底 | 为哪些宿主生成发现适配。首次 init 自动选择本机已安装且 `verified/documented` 的宿主；一个也没有时只使用通用 `agents` 层。`keelson init --tools` 设置它 |
| `lang` | `en` | 安装的技能和模板的语言：`en` 或 `zh`。`keelson init --lang` 设置它 |
| `profile` | `lean` | `lean` 只发出姿态和原则。`guided` 保留额外的步骤清单和示例。`keelson init --profile` 设置它 |
| `default_tier` | `auto` | 仅供参考。`auto` 表示代理给每个变更定大小。设为 `quick` 或 `spec` 可在代理读的文件里表明偏好 |
| `confirm.quick` | `proceed` | `proceed`：代理写回理解后开始。`wait`：先等批准 |
| `confirm.spec` | `proceed` | `proceed`：短 write-back 后，只要没有真实的所有者决定未解决就直接推进。团队需要显式 plan 审批点时设为 `wait` |
| `land` | `fold` | `fold` 在合并后删除变更目录。`keep` 把它移到 `changes/archive/` |
| `check` | 自动探测 | `keelson check` 按顺序从项目根目录通过 shell 运行的内容。每个条目是一个命令字符串，或对象 `{name, command, kind}`，其中 `kind` 取 `test`、`lint`、`typecheck`、`build`、`fitness`、`check` 之一。对纯字符串，kind 从命令猜测。首次 init 时从 `package.json` 脚本、`pyproject.toml`、`pytest.ini`、`go.mod` 或 `Cargo.toml` 探测 |
| `guide` | `false` | 所有者正在学习工程时设为 `true`。往 `.keelson/workflow.md` 加一行引导模式说明，往 `keelson context` 加一条提示；技能随后用场景和取舍解释，并在 spec 变更收尾时附一段简短的教学说明。`keelson init --guide` 设置它 |
| `hooks` | `true` | 是否安装由 Keelson 管理的 lifecycle/session hook 或 plugin。当前控制 Claude、OpenCode、CodeBuddy bridge；Pi 的 `PI_SESSION_ID` 由宿主内置，所以仍保持 native。`--no-hooks` 持久写成 `false`；`--hooks` 重新开启 |
| `budgets` | 见下文 | 每种文档的软行数预算。Keelson 把压力作为内部信号交给 Agent：大型 spec 自动分片，单例/rule 在 RECONCILE 中自动整理，长期文档只有到 2× 预算才硬失败 |
| `context` | `""` | 打印在 `keelson context` 输出顶部的自由文本。用于放不进 INTENT.md 的事实，比如技术栈概要 |
| `paths.specs` | `.keelson/specs` | 行为契约目录，每个能力一个 `<capability>/spec.md`。指向已有的契约目录即可复用 |
| `refs.architecture` | 自动探测 | 架构说明的路径，由 `keelson context` 引用，从不复制 |
| `refs.decisions` | 自动探测 | 决策记录目录的路径 |
| `refs.tasks` | 自动探测 | issue 跟踪器的 URL 或路径。跟踪器对"要做什么"保持权威 |
| `refs.ci` | 自动探测 | CI 配置的路径 |
| `models` | `{}` | 项目级层级覆盖。`models: { deep: opus }` 对所有平台生效，或 `models: { claude: { deep: opus } }` 按平台。只用别名 |
| `platforms` | 不存在 | 按工具 id 覆盖该工具读取说明和技能的位置。见平台覆盖 |
| `effort.review_min` | `standard` | 评审子代理的最低层级 |
| `effort.plan_min` | `deep` | 起草 `change.md` 和 delta specs 的最低层级 |
| `effort.verify_min` | `deep` | spec 变更最终陌生读者评审的最低层级 |
| `effort.escalate_after` | `2` | 同一层级失败多少次后升一级重新分派 |

`profile` 或 `land` 的值不在允许集合内时 `keelson validate` 报错；`paths.specs` 或本地的 `refs.*` 路径不存在时发出警告。

### 文档预算

| 键 | 默认值 | 适用于 |
|---|---|---|
| `INTENT` | `120` | `.keelson/INTENT.md` |
| `ROADMAP` | `80` | `.keelson/ROADMAP.md` |
| `NOW` | `60` | `.keelson/NOW.md` |
| `GLOSSARY` | `200` | `.keelson/GLOSSARY.md` |
| `spec` | `250` | 每个 `<paths.specs>/<capability>/spec.md` |
| `rule` | `120` | `rules/index.md` 里列出的每个文件 |
| `change` | `200` | 每个活动的 `change.md` |
| `handoff` | `100` | 每个活动的 `handoff.md` |
| `always-on` | `300` | 由 `**` 或 `*` 路由的 rule 文件之和，因为每个会话都会读它们 |

预算按行计算，是软压缩阈值。超过预算会警告，并在 `status` / `context` 中显示知识压力。长期真相（`INTENT`、`ROADMAP`、`NOW`、`GLOSSARY`、specs、rules，以及常驻 rule 集合）的硬上限是**配置预算的 2 倍**；超过后 `validate` / `doctor` 会失败，`land` 也会在写入前拒绝会越过硬上限的 spec 或 NOW。活跃 `change.md` 与 `handoff.md` 是临时脚手架，因此只警告。把某个键设为 `0` 可关闭对应预算。

### 检查类型

`fitness` 标记一条把架构或质量约束变成命令的检查：依赖方向测试、接口兼容性检查、延迟预算。`keelson check` 在每条结果旁打印名字和类型，技能的 `verify.md` reference 把整组检查视为机械证据，它是必要的，永远不充分。

### 平台覆盖

每个工具从哪里读取说明和技能，来自随包附带的注册表；`keelson platforms` 会打印它。内置注册表采用标准层优先：canonical 运行时始终只在 `.keelson/`；平台注册路径只描述发现 shim。已经读取 `AGENTS.md` + `.agents/skills/` 的宿主直接复用这套通用发现表面。若旧版本或本地安装需要不同路径，项目可以在 `platforms.<id>` 下覆盖某个工具条目的任意键：

```yaml
platforms:
  opencode:
    skillsDir: .opencode/skills
  kiro:
    instructions: .kiro/steering/keelson.md
    instructionsFormat: kiro
```

键：`instructions`（接收发现块的文件）、`instructionsFormat`（`kiro` 写一个带 inclusion 头的独立 steering 文件，而不是带标记的块）、`skillsDir`（单文件 `keelson/SKILL.md` 发现 shim 安装到哪里）、`rulesFile` 和 `rulesFormat`（`mdc` 为带 frontmatter 的 rule 文件，`md` 为纯 Markdown），以及你明确覆盖某个已知本地安装时需要的宿主字段。Session adapter 内部字段由注册表维护，正常不应项目级覆盖。覆盖对 `init`、`update`、`doctor`、`uninstall` 和 `ablate` 生效。当一等公民宿主的旧版/本地安装使用不同的已知路径时使用它。

### 迁移

`version: 1` 的文件获得 `paths` 和 `refs`；`version: 2` 的文件获得 `guide` 和 `budgets`；v4 之前的文件获得持久的 `hooks: true`。旧文件读取时会先在内存中迁移；`keelson update` 把它们重写为版本 4、对齐生成表面的所有权清单，并且只清理能确认属于 Keelson 的旧适配文件。`keelson update --dry-run` 会先显示迁移与待清理表面。

## `.keelson/INTENT.md`

不是配置，却是决定代理能自己做多少的文件。模板的 `Authorizations` 段有三行：

- **自行决定**：已确认范围内的局部实现选择；测试结构；遵循既有模式的命名。
- **给出推荐，所有者决定**：任何改变用户可见行为、范围或长期承诺的事；新依赖；公共接口变化。
- **必须确认**：不可逆的数据操作、生产变更、权限扩大、破坏兼容性。

按项目情况编辑这几行。`Working defaults` 段用文字表述定大小和批准的偏好；`config.yaml` 是 CLI 实际执行的，两者应当一致。

## 变更 frontmatter

`keelson new` 往 `change.md` 写这些键：

| 键 | 由谁设置 | 含义 |
|---|---|---|
| `tier` | `--tier` | `quick` 或 `spec` |
| `created` | 日期 | 创建日期 |
| `status` | `new`、`land --keep`、`cancel`，或代理 | work 状态：`clarifying`、`in-progress`、`blocked`、`ready`、`in-review`、`integrated`、`cancelled`。`ready` 通常由 acceptance/gate + 当前树新鲜 verification 推导；长期显式 `blocked`/`integrated`/`cancelled` 覆盖推导 |
| `owner` | git 用户名，或 `--owner` | 谁在推动这个变更 |
| `branch` | 当前分支，或 worktree 分支 | 工作在哪里进行 |
| `worktree` | `--worktree` | 为该变更创建的 worktree 的相对路径 |
| `depends` | `--depends a,b` | 它等待的活动变更 |
| `touches` | `--touches globs` | 变更将编辑的路径 glob；用于共享契约警告和影响分析 |
| `release` | 代理 | 在 `status` 里显示的自由文本；缺省为 `unreleased` |

## `~/.keelson/`

| 文件 | 由谁写 | 用途 |
|---|---|---|
| `models.yaml` | `keelson models rank <alias> <tier>` | 用户级层级覆盖，`platform → tier → alias`。高于注册表，低于项目配置 |
| `models.cache.json` | `keelson init`、`keelson models --detect`、`--refresh` | 已安装的工具及版本、配置的默认模型、哪些 provider key 存在、在 provider 目录里见过的模型、未分级的模型。24 小时后视为过期 |
| `registry.json` | `keelson models --refresh` | 内置注册表的更新副本，当它的 `updated` 日期更新时使用 |
| `ablations/<hash>/` | `keelson ablate` | 一个项目的暂存文件和清单。由 `keelson restore` 删除 |

## 环境变量

| 变量 | 作用 |
|---|---|
| `ANTHROPIC_MODEL`、`OPENAI_MODEL` | 由 `keelson models --detect` 报告为工具的默认模型 |
| `ANTHROPIC_API_KEY`、`OPENAI_API_KEY`、`GEMINI_API_KEY` | 探测时记录它们是否存在。`--refresh` 用前两个查询 provider 目录 |
| `CLAUDE_PROJECT_DIR` | 由 Claude Code 设置；hook 用它找到项目 |
| `KEELSON_SESSION_ID` | Claude/OpenCode/CodeBuddy native bridge 注入的 opaque session identity；只用于选择 `.keelson/.runtime/sessions/<key>.json` |
| `PI_SESSION_ID` | Pi 自动提供给 shell tool；Keelson 只在内存中哈希它来解析本地 session focus |
| `NO_COLOR` | 关闭 CLI 彩色输出 |
| `KEELSON_DEBUG` | 出错时打印堆栈 |
