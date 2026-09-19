[English](../models.md)

# Effort 层级与模型

Keelson 从不在仓库里写具体模型名。任务带一个 effort 层级；分派工作时由宿主把层级解析为模型别名。

## 三个层级

| 层级 | 用于 | 示例 |
|---|---|---|
| `light` | 边界清楚、有命令可证明的机械性工作 | 照现有模式实现、改配置、重命名、运行并报告测试、格式化 |
| `standard` | 需要上下文但路径清楚的工作 | 大多数功能代码、常规 bug 修复、逐任务评审 |
| `deep` | 歧义、跨层影响、设计取舍、安全、根因未知 | 起草 `change.md` 和 delta specs、裁定、疑难调试、最终的陌生读者评审 |

代理在 `tasks.md` 里给每个任务打标：

```markdown
- [ ] 1. Add page/size parsing to GET /orders (effort: light) — verify: `npm test -- orders.params`
- [ ] 2. Implement paged query in OrderRepo (effort: standard) — verify: `npm test -- orders.repo`
- [ ] 3. Decide ack semantics for retries (effort: deep)
```

## 下限

`config.yaml → effort` 设定代理无论任务标签如何都遵守的最低值：

| 键 | 默认值 | 适用于 |
|---|---|---|
| `review_min` | `standard` | 评审子代理。评审者的层级也永远不低于它评审的实施者 |
| `plan_min` | `deep` | 起草 `change.md` 和 delta specs |
| `verify_min` | `deep` | spec 变更最终的陌生读者评审 |
| `escalate_after` | `2` | 同一层级失败多少次后升一级重新分派 |

## 升级

任务在其层级验证失败两次时，代理升一级重新分派并记录：

```markdown
### Escalate: task 2 light → standard
Two failures on boundary handling.
```

`deep` 层级的失败会停下来问用户。升级只针对做出来但验证失败的工作；因限流、超时或工具报错而根本没跑起来的分派，会在同一层级重试一次，然后由代理内联完成，并在 ledger 里记一条 `Note:`。升级机制让打错标签的代价很低，也让 `light` 随着模型进步承担更多工作，而不需要任何人改仓库。

## 解析顺序

`keelson models --resolve <tier>` 返回第一个匹配：

1. 任务上的显式别名，很少用。
2. `.keelson/config.yaml → models`，形式为 `models: { deep: opus }` 或 `models: { claude: { deep: opus } }`。
3. `~/.keelson/models.yaml`，由 `keelson models rank` 写入。
4. 注册表中该平台的 `tiers` 映射。
5. 注册表中该平台的 `rank` 列表：第一项给 `light`，第二项给 `standard`，最后一项给 `deep`。

平台取 `--platform`，否则取 `config.yaml → tools` 的第一项，否则为 `claude`。

## 注册表

`registry/models.json` 随包发布。`keelson models --refresh` 拉取 main 分支上的副本，当其 `updated` 日期更新时保存到 `~/.keelson/registry.json`。

```json
{
  "platforms": {
    "claude": {
      "rank": ["haiku", "sonnet", "opus", "fable"],
      "tiers": { "light": "haiku", "standard": "sonnet", "deep": "opus" },
      "subagents": true
    }
  },
  "providers": {
    "anthropic": { "env": "ANTHROPIC_API_KEY", "catalogue": "https://api.anthropic.com/v1/models", "families": ["haiku", "sonnet", "opus", "fable"] }
  },
  "dated_id_patterns": ["claude-[a-z0-9.-]+-\\d{8}"]
}
```

`rank` 按能力从低到高排列平台的系列别名。`tiers` 是推荐映射。`subagents` 记录该平台能否分派子代理；不能时，层级仍然指导代理在内联执行时投入多少精力。模型名每次发布都变的平台，其 `tiers` 映射为空；用 `keelson models rank` 设置一个。

## 为什么不用带日期的 ID

`sonnet` 这样的系列别名会浮动到该系列的最新模型。带日期的 ID 锁定某一次发布，下一版发布当天就过期。Keelson 把层级映射到别名，所以同一系列下的新版本什么都不改变。`.keelson/` 下任何 Markdown、YAML 或 JSON 文件匹配 `dated_id_patterns` 中的模式时，`keelson validate` 失败。`keelson models rank` 同样拒绝带日期的 ID。

## 出现新模型系列时

1. 如果宿主暴露了新别名，代理可以立即使用；技能告诉它把层级按能力升序映射到宿主提供的别名上，并把未知别名记入 ledger 而不是猜测其排位。
2. 设置了 provider 密钥时，`keelson models --refresh` 列出该 provider 的目录。以前没见过的模型会被记录。名称恰好包含一个已知系列词时推断并显示一个层级；否则列为未分层。不会自动分配任何东西。
3. 要把它用于某个层级，运行 `keelson models rank <alias> <tier>`。它写入 `~/.keelson/models.yaml`，对本机所有项目生效。
4. 上游注册表更新纳入该系列后，`keelson models --refresh` 会拉取到，届时可以移除覆盖。

以上任何一步都不会碰项目仓库。

## 本地检测

`keelson init` 和 `keelson models --detect` 在无网络的情况下扫描本机：`claude`、`codex`、`gemini`、`opencode`、`cursor-agent` 哪些在 PATH 上及其版本；`~/.claude/settings.json`、`~/.codex/config.toml`、`ANTHROPIC_MODEL`、`OPENAI_MODEL` 中的默认模型；哪些 provider API 密钥已设置。结果缓存在 `~/.keelson/models.cache.json`，由 `keelson models` 显示。缓存 24 小时后标记为过期。
