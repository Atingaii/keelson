# Landing（落地）

把完成的工作折叠回项目的常驻事实。change 目录是脚手架；留下来的是 `specs/`、`rules/`、`NOW.md` 和 git 历史。

## `keelson land <name>`
<!-- keelson: id=land.command | without: delta specs 永远合不回去，specs 不再描述当前系统 | sunset: never -->

只要还有未勾选的任务，或最后一条 `Verify:` 不是 `exit 0`，命令就拒绝落地（只有用户明确要求时才用 `--force` 覆盖）。然后它会：

1. 把每个 delta spec 合并进 `.keelson/specs/<capability>/spec.md`（ADDED 追加，MODIFIED 按需求名替换，REMOVED 删除）；
2. 把 `change.md` 的 `Decisions` 行追加到对应 spec 的 `## Decisions` 节，现在时；
3. 删除 change 目录（`land: fold`，默认），或移到 `changes/archive/YYYY-MM-DD-<name>/`（`land: keep`）；
4. 打印改动了什么。

把落地和最后一次代码改动一起提交，让 specs 和满足它们的代码共享同一个版本。完整的 ledger 在 git 历史里仍可取回；`keelson retro` 就从那里读。

## 更新 `NOW.md`
<!-- keelson: id=land.now | without: 下一个会话两眼一抹黑，从 git 里重新推导状态 | sunset: never -->

重写整个文件，现在时，三个短段：正在进行什么（或"nothing in flight"）、什么被阻塞或不确定、下一个具体步骤。覆盖，绝不追加日志。`keelson land --now "<text>"` 可以替你写。

## 把经验提升为 rules
<!-- keelson: id=land.promote | without: 同一条约定在每个变更里被重新发现、重新解释 | sunset: never -->

先问自己，再用一句话问用户：这次变更是否暴露了一条值得写下来的约定？一个未来每次改这条路径都应遵循的模式，一个本可以更早抓住 bug 的检查，一个从代码里看不出来的约束。是，就加进命中的 `rules/<scope>.md`（或新建一个并在 `rules/index.md` 登记）。rule 要短且可检验；无法检验的 rule 只是愿望。

## spec `Decisions` 的写法

一条决策一到三行，现在时，写明被否决的选项：`- messaging: consumers are idempotent; exactly-once delivery rejected because the broker does not provide it`。决策日后被推翻时，改写这一行并在末尾留一句：`(previously: at-most-once, abandoned after duplicate-notification incident)`。绝不让 `Decisions` 变成变更日志。
