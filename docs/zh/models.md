[English](../models.md)

# effort 层级与模型

Keelson 从不在仓库里写模型名。任务带一个 effort 层级；分派工作时由宿主把层级解析为模型别名。

## 三个层级

| 层级 | 用于 | 例子 |
|---|---|---|
| `light` | 边界清楚、有命令能证明的机械工作 | 照既有模式写、改配置、重命名、跑测试并汇报、格式化 |
| `standard` | 需要上下文但路径清楚的工作 | 大多数功能代码、普通 bug 修复、逐任务评审 |
| `deep` | 歧义、跨层影响、设计取舍、安全、未知根因 | 起草 `change.md` 和 delta specs、裁定、疑难调试、最终的陌生读者评审 |

代理在 `tasks.md` 里给每个任务打标；变更有多个可独立交付的部分时按切片分组：

```markdown
## Slice: Paging
Delivers: page and size work on the listing
- [ ] 1. Add page/size parsing to GET /orders (effort: light) — verify: `npm test -- orders.params`
- [ ] 2. Implement paged query in OrderRepo (effort: standard) — verify: `npm test -- orders.repo`

## Slice: Limits
Delivers: oversized pages are handled
- [ ] 3. Decide clamp or reject above 200 and update specs/orders (effort: deep)
```

每次分派都记入 ledger，正文第一行是 `Result: pass|fail`，让 `keelson retro` 不必从散文里猜就能算出每个层级的一次通过率。

## 下限

`config.yaml → effort` 设定代理无论任务标记如何都遵守的最低值：

| 键 | 默认值 | 适用于 |
|---|---|---|
| `review_min` | `standard` | 评审子代理。评审者也永远不低于它评审的实现者 |
| `plan_min` | `deep` | 起草 `change.md` 和 delta specs |
| `verify_min` | `deep` | spec 变更最终的陌生读者评审 |
| `escalate_after` | `2` | 同一层级失败多少次后升一级重新分派 |

## 升级

一个任务在它的层级验证失败两次时，代理升一级重新分派并记录：

```markdown
### Escalate: task 2 light → standard
Two failures on boundary handling.
```

`deep` 的失败停下来问用户；`deep` 是最高层级，没有更高可升。升级只针对做出来但做错了的工作。因限流、超时或工具报错而根本没跑起来的分派，在同一层级重试一次，然后由代理内联完成，并在 ledger 里记一条 `Note:`。升级让打错标记的代价很低，也让 `light` 随着模型进步承担更多工作，而不需要任何人改仓库。

## 解析顺序

`keelson models --resolve <tier>` 返回第一个匹配：

1. 任务上的显式别名，很少用。
2. `.keelson/config.yaml → models`，`models: { deep: opus }` 或 `models: { claude: { deep: opus } }`。
3. `~/.keelson/models.yaml`，由 `keelson models rank` 写入。
4. 注册表里该平台的 `tiers` 映射。
5. 注册表里该平台的 `rank` 列表：第一项给 `light`，第二项给 `standard`，最后一项给 `deep`。

平台是 `--platform`，否则是 `config.yaml → tools` 的第一项，否则是 `claude`。

## 注册表

`registry/models.json` 随包发布。`keelson models --refresh` 拉取 main 分支上的副本，当它的 `updated` 日期更新时保存在 `~/.keelson/registry.json`。

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

`rank` 把一个平台的系列别名从弱到强排序。`tiers` 是推荐的映射。`subagents` 记录该平台能否分派子代理；不能时，层级仍然指导代理内联投入多少精力。模型名随每次发布变化的平台，`tiers` 映射为空；用 `keelson models rank` 设置。

## 为什么不用带日期的 ID

`sonnet` 这样的系列别名浮动指向该系列最新的模型。带日期的 ID 钉住一次发布，下一次发布那天就过期。Keelson 把层级映射到别名，所以同一系列的新版本什么都不用改。`.keelson/` 下任何 Markdown、YAML 或 JSON 文件匹配 `dated_id_patterns` 里的模式时，`keelson validate` 失败。`keelson models rank` 也拒绝带日期的 ID。

## 出现新模型系列时

1. 如果宿主提供了新别名，代理可以立即使用；技能要求它把层级按能力升序映射到宿主提供的别名上，并把未知别名记入 ledger 而不是猜它的排位。
2. 设置了 provider key 时，`keelson models --refresh` 列出 provider 的目录。之前没见过的模型被记录。名字里恰好包含一个已知系列词时，推断出一个层级并显示；否则列为未分级。没有任何东西被自动分配。
3. 要把它用于某个层级，运行 `keelson models rank <alias> <tier>`。这会写入 `~/.keelson/models.yaml`，对本机所有项目生效。
4. 上游注册表更新并包含该系列后，`keelson models --refresh` 会拉取到，覆盖就可以删掉。

这些步骤都不触碰项目仓库。

## 本地探测

`keelson init` 和 `keelson models --detect` 在不联网的情况下扫描本机：`claude`、`codex`、`gemini`、`opencode`、`cursor-agent` 中哪些在 PATH 上及其版本；`~/.claude/settings.json`、`~/.codex/config.toml`、`ANTHROPIC_MODEL` 和 `OPENAI_MODEL` 里的默认模型；以及设置了哪些 provider API key。结果缓存在 `~/.keelson/models.cache.json`，由 `keelson models` 显示。缓存 24 小时后标记为过期。
