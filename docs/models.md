# Effort tiers and models

Tasks normally carry an effort tier; the host resolves it to a model alias. Explicit user model constraints take precedence. Benchmark records retain the actual selected alias rather than implying a tier launched it.

## The three tiers

| Tier | Use for | Examples |
|---|---|---|
| `light` | Mechanical work with a clear boundary and a command that proves it | Follow an existing pattern, config edits, renames, running and reporting tests, formatting |
| `standard` | Work that needs context but has a clear path | Most feature code, ordinary bug fixes, per-task review |
| `deep` | Ambiguity, cross-layer effects, design trade-offs, security, unknown root cause | Drafting `change.md` and delta specs, rulings, hard debugging, the final fresh-reader review |

The agent tags each task in `tasks.md`, grouped into slices when the change has more than one independently deliverable part:

```markdown
## Slice: Paging
Delivers: page and size work on the listing
- [ ] 1. Add page/size parsing to GET /orders (effort: light) — verify: `npm test -- orders.params`
- [ ] 2. Implement paged query in OrderRepo (effort: standard) — verify: `npm test -- orders.repo`

## Slice: Limits
Delivers: oversized pages are handled
- [ ] 3. Decide clamp or reject above 200 and update specs/orders (effort: deep)
```

Every dispatch is recorded in the ledger with a `Result: pass|fail` first line, so `keelson retro` can compute first-pass rates per tier without guessing from prose.

## Floors

`config.yaml → effort` sets minimums the agent respects regardless of the task tag:

| Key | Default | Applies to |
|---|---|---|
| `review_min` | `standard` | Reviewer subagents. A reviewer is also never a lower tier than the implementer it reviews |
| `plan_min` | `deep` | Drafting `change.md` and delta specs |
| `verify_min` | `deep` | The final fresh-reader review on spec changes |
| `escalate_after` | `2` | Failures at one tier before re-dispatching one tier up |

## Escalation

When a task fails verification twice at its tier, the agent re-dispatches it one tier up and records it:

```markdown
### Escalate: task 2 light → standard
Two failures on boundary handling.
```

Failures at `deep` stop and ask the user; `deep` is the top tier and nothing escalates above it. Escalation applies to work that came back wrong. A dispatch that never ran, because of a rate limit, a timeout, or a tool error, is retried once at the same tier and then done inline by the agent, with a `Note:` in the ledger. Escalation makes a wrong tag cheap and lets `light` take on more work as models improve without anyone editing the repository.

## Resolution order

`keelson models --resolve <tier>` returns the first match:

1. An explicit alias on the task, rarely used.
2. `.keelson/config.yaml → models`, either `models: { deep: opus }` or `models: { claude: { deep: opus } }`.
3. `~/.keelson/models.yaml`, written by `keelson models rank`.
4. The registry's `tiers` map for the platform.
5. The registry's `rank` list for the platform: first entry for `light`, second for `standard`, last for `deep`.

The platform is `--platform`, otherwise the first entry in `config.yaml → tools`. A portable-only `agents` project has no model mapping unless the user chooses a first-class host with `--platform`.

## The registry

`registry/models.json` ships with the package. `keelson models --refresh` fetches the copy on the main branch and keeps it in `~/.keelson/registry.json` when its `updated` date is newer.

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

`rank` orders a platform's family aliases from least to most capable. `tiers` is the recommended mapping. `subagents` records whether the platform can dispatch subagents; when it cannot, tiers still guide how much effort the agent spends inline. Platforms whose model names change with every release ship an empty `tiers` map; set one with `keelson models rank`.

## Why no dated IDs

A family alias such as `sonnet` floats to the newest model in that family. A dated ID pins one release and goes stale the day the next one ships. Keelson maps tiers to aliases, so a new release under an existing family changes nothing. `keelson validate` fails when any Markdown, YAML, or JSON file under `.keelson/` matches a pattern in `dated_id_patterns`. `keelson models rank` refuses dated IDs too.

## When a new model family appears

1. If the host exposes a new alias, the agent can use it immediately; the skill tells it to map tiers onto the aliases the host offers, in ascending capability order, and to note unknown aliases in the ledger rather than guess their rank.
2. `keelson models --refresh` with a provider key set lists the provider's catalogue. Models not seen before are recorded. When the name contains exactly one known family word, a tier is inferred and shown; otherwise the model is listed as unranked. Nothing is assigned automatically.
3. To use it for a tier, run `keelson models rank <alias> <tier>`. That writes `~/.keelson/models.yaml` and applies to every project on the machine.
4. When the registry is updated upstream to include the family, `keelson models --refresh` picks it up and the override can be removed.

The project repository is not touched in any of these steps.

## Local detection

`keelson init` and `keelson models --detect` scan the machine without network access for the seven first-class host CLIs (`claude`, `codex`, `opencode`, `pi`, `gemini`, `kiro-cli`, `codebuddy`) and their versions; the default model in `~/.claude/settings.json`, `~/.codex/config.toml`, `ANTHROPIC_MODEL`, and `OPENAI_MODEL`; and which provider API keys are set. The result is cached in `~/.keelson/models.cache.json` and shown by `keelson models`. The cache is marked stale after 24 hours.
