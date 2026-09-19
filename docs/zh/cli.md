[English](../cli.md)

# CLI 参考

所有命令可在项目内任意位置运行；Keelson 会向上查找 `.keelson/`。退出码 0 表示成功，1 表示错误或检查失败，2 表示未知命令。多数命令支持 `--json` 输出机器可读结果。`--help` 和 `--version` 随处可用。

布尔标志：`--json`、`--force`、`--dry-run`、`--no-hooks`、`--onboard`、`--refresh`、`--detect`、`--keep`、`--quiet`。取值标志接受 `--key value` 或 `--key=value`。

## `keelson init`

```text
keelson init [--tools claude,codex,cursor,opencode,gemini] [--profile lean|guided]
             [--lang en|zh] [--no-hooks] [--onboard] [--dir <path>]
```

创建 `.keelson/`，含 `INTENT.md`、`NOW.md`、`rules/index.md`、`rules/general.md`、`config.yaml` 和一个空的 `changes/`。为每个工具安装技能、常驻块，以及（Claude Code）hooks。首次运行时检测检查命令。运行本地模型检测。从不覆盖 `.keelson/` 中已有的文件。

- `--onboard` 把 `NOW.md` 重写为面向已有代码库的入门任务。
- `--no-hooks` 跳过 hook 安装。
- `--dir` 指定另一个目录。

工具或 profile 未知时退出码为 1。

## `keelson update`

等同于用 `config.yaml` 中已有的值再运行一次 `init`。升级包之后运行它，重新生成技能、常驻块和 hooks。

## `keelson context`

```text
keelson context [--paths a/,b/**] [--json]
```

以 Markdown 打印：config 里的 `context` 文本、`INTENT.md`、`NOW.md`、活动中的变更及其阶段和进度、已有 spec 的能力，以及 glob 匹配给定路径的 rule 文件。带 `**` 的 rules 总是打印。在 git 仓库中还会列出未提交的文件。路径也可以作为位置参数给出。

```bash
keelson context --paths src/services/notify.js
```

## `keelson new`

```text
keelson new <name> [--tier quick|spec] [--capability <name>]
```

从模板创建 `.keelson/changes/<slug>/`。`quick`（默认）写一份简短的 `change.md`；`spec` 写完整版，并在给出 `--capability` 时在 `specs/<capability>/spec.md` 生成一份 delta spec。变更已存在时退出码为 1。

```bash
keelson new "NATS migration" --tier spec --capability messaging
```

## `keelson status`

```text
keelson status [--json]
```

```text
Keelson — demo
1 capability with specs · 1 active change

nats-migration  [spec]  building  2/4 tasks
   ✓ 1 Add NATS publisher adapter (standard)
   ✓ 2 Migrate notify consumer (light)
   · 3 Decide ack semantics (deep)
   · 4 Remove CSV export (light)
   1 ruling; last verify: none

NOW.md
...
```

## `keelson validate`

```text
keelson validate [--json]
```

检查项：`INTENT.md` 和 `NOW.md` 存在；`profile` 和 `land` 的值；`rules/index.md` 的每条都指向存在的文件；specs 有 requirements、scenarios 且无重名；每个变更具备其层级要求的段；spec 变更至少列出两个备选；任务的 effort 标签有效；`Verify:` 条目带命令和退出码；根因类别已知；`.keelson/` 内没有任何带日期的模型 ID。警告不影响退出码。有任何错误时退出码为 1。

## `keelson check`

```text
keelson check [--quiet] [--json]
```

从项目根目录依次运行 `config.yaml → check` 里的每条命令并打印其退出码。`--quiet` 隐藏命令自身的输出。最后给出一段可直接粘贴的 ledger 行。任一命令失败时退出码为 1；未配置任何命令时给出警告并以 0 退出。

```text
keelson check — 2 commands
✓ `npm run lint` exit 0
✓ `npm run test` exit 0

all checks passed
Ledger line:
### Verify: <claim>
`npm run lint` exit 0; `npm run test` exit 0
```

## `keelson land`

```text
keelson land [name] [--now "<text>"] [--keep] [--force] [--dry-run]
```

只有一个活动变更时名称可省略。任务未勾选，或最后一条 `Verify:` 缺失或非零时拒绝执行；`--force` 覆盖。合并 delta specs，折叠 decisions，然后删除目录（或用 `--keep` / `land: keep` 归档）。`--now` 重写 `NOW.md`。`--dry-run` 只报告不写入。

```text
Landing nats-migration (spec)
✓ specs/messaging: +1 added, ~1 modified, -1 removed
✓ specs/messaging: 2 decision lines folded
✓ removed .keelson/changes/nats-migration (ledger stays in git history)
✓ NOW.md rewritten
· commit the landing together with the last code change
```

## `keelson retro`

```text
keelson retro [--json]
```

从活动中的变更、archive 和 git 历史读取 ledger。打印根因数量、各层级分派统计、verify 总数、每个带 sunset 条件的准则块，以及建议。总是以 0 退出；没有 ledger 条目时给出警告。

## `keelson models`

```text
keelson models [--platform <id>] [--json]
keelson models --detect
keelson models --refresh [--no-providers]
keelson models --resolve light|standard|deep
keelson models rank <alias> light|standard|deep [--platform <id>]
```

- 无标志：一张 层级 → 别名 的表，附每条映射的来源，以及本地检测摘要。
- `--detect`：扫描已安装的工具、它们配置的默认模型、哪些 provider 密钥已设置；写入 `~/.keelson/models.cache.json`。
- `--refresh`：拉取最新注册表；设置了 provider 密钥时，列出各 provider 的目录并记录以前没见过的模型。`--no-providers` 跳过目录调用。这是唯一使用网络的命令。
- `--resolve`：只打印别名。无法解析时退出码为 1。
- `rank`：写一条用户级覆盖。拒绝带日期的模型 ID。

平台默认取 `config.yaml → tools` 的第一项，在项目之外默认为 `claude`。

## `keelson ablate` 与 `keelson restore`

```text
keelson ablate [--dry-run]
keelson restore [--force] [--dry-run] [--dir <path>]
```

`ablate` 把每个 Keelson 表面（指令文件、技能目录、`.cursor/rules/keelson.mdc`、`.claude/settings.json`、`.keelson/`）复制到 `~/.keelson/ablations/<hash>/`，记录哈希，移除常驻块和 hook 条目，删除其余部分。用它对照有无 Keelson 时的代理会话。已存在 ablation 时退出码为 1。

`restore` 校验暂存内容完好、且在收起期间没有任何受管路径被改动，然后把一切复制回来并删除暂存。`--force` 覆盖已被改动的路径。
