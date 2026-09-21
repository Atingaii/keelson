<!-- 由 Keelson 生成；`keelson update` 会刷新。项目事实写入各自负责的文件，不要写进这份地图。 -->
# Keelson 项目地图 — {{project}}

`.keelson/` 保存项目事实、契约、决策与变更证据。只有真正值得保留的信息出现时，它才增长。Agent 指导从已安装的 Keelson 包中读取。

## 从这里开始

人通常只需要看两个文件：
- **现在在做什么？** → `NOW.md`
- **项目为什么存在 / 边界是什么？** → `INTENT.md`

Agent 从 `keelson guide workflow` 和 `keelson guide` 开始，再按需读取具体 reference。其他内容都按需自动维护；正常开发不需要任何人管理 Keelson 目录。

## init 后始终存在

| 路径 | 用途 |
|---|---|
| `README.md` | 这份项目地图 |
| `INTENT.md` | 项目目的、边界、硬约束、Agent 权限 |
| `NOW.md` | 当前状态、阻塞、下一具体步骤 |
| `config.yaml` | 用户控制的 Keelson 配置 |
| `manifest.json` | Keelson 维护的安装清单：它负责哪些宿主生成表面 |

## 只有真正需要时才出现

| 路径 | 创建时机 |
|---|---|
| `ROADMAP.md` | 项目存在 tracker 没有清楚表达的里程碑/方向 |
| `GLOSSARY.md` | 共享术语开始重要或出现歧义 |
| `specs/<capability>/spec.md` | 某能力的可观察行为值得成为契约；契约变大后它自动保持为小型索引 |
| `specs/<capability>/requirements/*.md` | 某个 capability 契约超出单文件可读范围时自动出现 |
| `specs/<capability>/decisions/*.md` | capability 局部长期决策增长时自动出现；每个长期决策一个小文件 |
| `rules/index.md` + `rules/*.md` | 稳定工程不变量适用于某路径，并且不适合直接变成 check |
| `changes/<name>/change.md` | 非平凡工作需要可评审的边界 |
| `changes/<name>/tasks.md` | 工作需要明确的多步骤 / 多切片计划 |
| `changes/<name>/ledger.md` | 真正发生了裁定、根因、分派或验证事件 |
| `changes/<name>/handoff.md` | 工作所有权真正跨人/跨机器，或需要显式交接包 |
| `changes/<name>/specs/**` | spec 级变更修改行为契约 |
| `changes/<name>/decisions.json` | 需要结构化选择及其解决历史时 |
| `changes/<name>/ledger.jsonl` + `evidence/` | 产生已签名检查记录、签名公钥和按内容寻址的输出时 |
| `workflow.md` + `skill/` | 负责人明确选择 `--vendor` 复制包内指导时 |

私钥、命令信任、锁和会话焦点保存在本目录之外：Git 私有的 `keelson-runtime` 目录，无 Git 时使用用户缓存。Hook 从已安装的包执行。初始化不会编辑 `.gitignore`；分享检查日志前请审阅其内容。

## 一次变更完成后留下什么

理想结果是**脚手架变少、真相变多**：

- 可观察行为 → 主 specs；
- 稳定约束 → 作用域 rules 或可执行 checks；
- 稳定术语 → glossary；
- 普通跨会话接续 → 长期 change 状态 + 本地 session focus；
- 明确所有权转移 → handoff；
- 完整时间线 → git 历史。

临时 change 工件在落地后 fold 或 archive。空的可选工件应该删除，而不是为了“以后也许用到”长期保留。

## 人类阅读原则

优先写现在时的当前真相。Keelson 会让高频文件保持有界、自动分片大型 spec，并把内部压缩任务交给 Agent。人不需要执行 housekeeping 命令，也不需要理解底层存储布局才能继续工作。

文档先呈现当前事实、结果或下一步，细节链接到其所属文件。Agent 创建与更新时自动读取 `keelson guide writing`；完整需求、未决决定及原始验证证据始终保留。
