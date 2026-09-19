<!-- 由 Keelson 生成；`keelson update` 会刷新。项目事实写入各自负责的文件，不要写进这份地图。 -->
# Keelson 项目地图 — {{project}}

`.keelson/` 是项目的工程控制面：给人看的当前事实、给 Agent 的 canonical 指导，以及工作进行中才存在的临时变更状态。只有真正值得保留的信息出现时，它才增长。

## 从这里开始

- **Agent 开始工作：** `workflow.md` → `skill/SKILL.md`。
- **人想知道“现在怎样了”：** `NOW.md`。
- **项目为什么存在 / 边界 / 权限：** `INTENT.md`。
- **某个能力今天怎样工作：** 有契约时看 `specs/<capability>/spec.md`。
- **已有进行中的工作：** 先看 `changes/<name>/change.md`，再只看旁边实际存在的工件。

## init 后始终存在

| 路径 | 用途 |
|---|---|
| `README.md` | 这份项目地图 |
| `workflow.md` | 小型、始终适用的执行内核 |
| `skill/` | canonical Keelson 路由器与按需 references |
| `INTENT.md` | 项目目的、边界、硬约束、Agent 权限 |
| `NOW.md` | 当前状态、阻塞、下一具体步骤 |
| `config.yaml` | 用户控制的 Keelson 配置 |
| `manifest.json` | Keelson 维护的安装清单：它负责哪些宿主生成表面 |

## 只有真正需要时才出现

| 路径 | 创建时机 |
|---|---|
| `ROADMAP.md` | 项目存在 tracker 没有清楚表达的里程碑/方向 |
| `GLOSSARY.md` | 共享术语开始重要或出现歧义 |
| `specs/<capability>/spec.md` | 某能力的可观察行为值得成为契约 |
| `rules/index.md` + `rules/*.md` | 稳定工程不变量适用于某路径，并且不适合直接变成 check |
| `changes/<name>/change.md` | 非平凡工作需要可评审的边界 |
| `changes/<name>/tasks.md` | 工作需要明确的多步骤 / 多切片计划 |
| `changes/<name>/ledger.md` | 真正发生了裁定、根因、分派或验证事件 |
| `changes/<name>/handoff.md` | 工作必须跨会话 / 跨人继续 |
| `changes/<name>/specs/**` | spec 级变更修改行为契约 |
| `.local/` | 产生本机验证证据时；gitignored |
| `hooks/` | 已选宿主存在 Keelson 生命周期 hook 集成 |

## 一次变更完成后留下什么

理想结果是**脚手架变少、真相变多**：

- 可观察行为 → 主 specs；
- 稳定约束 → 作用域 rules 或可执行 checks；
- 稳定术语 → glossary；
- 当前接续状态 → NOW；
- 完整时间线 → git 历史。

临时 change 工件在落地后 fold 或 archive。空的可选工件应该删除，而不是为了“以后也许用到”长期保留。

## 人类阅读原则

优先写现在时的当前真相。某份文件开始难扫读时，`keelson doctor` 会给出 knowledge-health 信号；应压缩或拆分，而不是继续追加历史段落。
