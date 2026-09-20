[English](../existing-projects.md)

# 已有项目

大多数长期项目已经有架构说明、决策记录、跟踪器和 CI。Keelson 引用它们，而不是再建第二套真相。本页讲如何在这样的仓库上接入。

## init 会探测什么

首次 `keelson init` 时，CLI 查找既有资料，并把找到的记录在 `config.yaml` 的 `refs` 下：

| Ref | 查找位置 |
|---|---|
| `architecture` | `ARCHITECTURE.md`、`docs/architecture`、`docs/architecture.md`、`docs/ARCHITECTURE.md`、`doc/architecture` |
| `decisions` | `docs/adr`、`docs/decisions`、`doc/adr`、`adr`、`decisions`、`docs/ADR` |
| `tasks` | GitHub issues 页面，当 `origin` 远端指向 GitHub 时从中推导 |
| `ci` | `.github/workflows`、`.gitlab-ci.yml`、`Jenkinsfile`、`.circleci`、`azure-pipelines.yml` |

它也会注意到 `docs/specs`、`docs/contracts`、`specs` 或 `spec` 并打印一条提示。这些目录里的东西不会被移动或复制。`keelson context` 在"Existing project material (read, do not duplicate)"下打印这些 refs，技能要求代理在提问之前先读它们，并从 specs 链接过去而不是重述。

也可以在 `config.yaml` 里手动设置任何 ref：

```yaml
refs:
  architecture: docs/design/overview.md
  decisions: docs/adr
  tasks: https://github.com/acme/shop/issues
  ci: .github/workflows
```

本地 ref 路径不存在时，`keelson validate` 发出警告。

## 指向已有的行为契约

如果项目已经把行为契约以 Markdown 保存，每个能力一个目录、目录里一个 `spec.md`，把 `paths.specs` 设为那个目录，Keelson 就在那里读取和合并：

```yaml
paths:
  specs: docs/contracts
```

文件需要采用 Keelson 的形状（`## Requirement:` 段、其下的 `### Scenario:` 块，以及一个 `## Decisions` 列表），合并才能工作。否则保留默认的 `.keelson/specs`，并从每个 spec 链接到既有文档。

## 接入

```bash
keelson init
```

已有代码的仓库中，init 会记录它能识别到的既有材料，并在 `NOW.md` 写一个首次接触任务。

Agent 随后：

1. 读取与第一个真实需求相关的仓库内容和引用材料；
2. 根据已经存在的证据起草 `INTENT.md`：目的、边界、硬约束和授权范围；
3. 用一次很短的交流让你确认或纠正项目边界；
4. 继续整理当前真实需求。

它**不会**把整个仓库一次性盘点成第二套文档系统。

以后真实工作触及某个能力时，只有可观察行为值得成为长期契约，才创建 Keelson spec；只有稳定工程不变量需要跨会话保存、且不适合直接变成可执行 check 时，才创建作用域 rule。已有 architecture / decision / spec 文档继续通过 `refs` 或 `paths.specs` 保持权威。

## 保持跟踪器的权威

项目有 issue 跟踪器时，它仍是"要做什么、按什么顺序"的来源。`ROADMAP.md` 链接它，用几行写明当前里程碑。`change.md` 链接它实现的 issue，只保存跟踪器没有的：决策、验收映射、未决问题和接续状态。Keelson 从不建第二份待办。

## 已有的说明文件

`keelson init` 把它的块追加到 `CLAUDE.md`、`AGENTS.md` 或 `GEMINI.md`，位于 `<!-- keelson:start -->` 和 `<!-- keelson:end -->` 标记之间。文件里已有的一切保留。`keelson update` 只刷新这个块。`keelson uninstall` 只移除这个块。`keelson init --dry-run` 显示文件将被创建、追加还是刷新。

`.claude/settings.json` 里已有的 hook 被保留。Keelson 注册自己的 hook 命令，只移除能识别为自身所有的注册项。格式损坏的配置会报错，不会被覆盖。

## 已有的决策记录

长期决策留在项目的决策记录目录里。每个 spec 的 `Decisions` 段保存简短的现在时一行，并在有记录时链接过去：

```markdown
## Decisions
- payments: idempotency keys on every write; see docs/adr/0007-idempotency.md
```

技能的 `plan.md` reference 要求代理链接，不重述。

## CI

```yaml
# Install a reviewed, pinned Keelson Git revision first; see getting-started.md.
- run: keelson validate
- run: keelson check --trust
```

`validate` 在结构错误时失败，并对之后会阻塞落地的任何问题打印警告。`check` 运行 `config.yaml → check` 里的命令。

## 检查安装

```bash
keelson doctor
```

它报告 Node/配置状态、所选集成入口、指导加载方式、宿主能力、验证发现、过期证据和共享契约冲突。夹具覆盖与真实宿主支持不同，参见[平台能力](../platforms.md)。
