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

在已有代码的仓库上，`keelson init` 会把一个首次接触任务写进 `NOW.md`，其中列出它找到的 refs。打开你的代理，随便说点什么。代理会：

1. 读代码库和被引用的文档；
2. 列出它发现的能力；
3. 在 `paths.specs` 下为每个能力写一份 spec，现在时，只写可观察的行为，链接既有文档而不是复制；
4. 为有约定的路径提出 rules，登记在 `rules/index.md`；
5. 在落地任何东西之前请你确认。

在你确认之前，specs 和 rules 都是草稿。让代理在落地前把每份 spec 展示给你。

## 保持跟踪器的权威

项目有 issue 跟踪器时，它仍是"要做什么、按什么顺序"的来源。`ROADMAP.md` 链接它，用几行写明当前里程碑。`change.md` 链接它实现的 issue，只保存跟踪器没有的：决策、验收映射、未决问题和接续状态。Keelson 从不建第二份待办。

## 已有的说明文件

`keelson init` 把它的块追加到 `CLAUDE.md`、`AGENTS.md` 或 `GEMINI.md`，位于 `<!-- keelson:start -->` 和 `<!-- keelson:end -->` 标记之间。文件里已有的一切保留。`keelson update` 只刷新这个块。`keelson uninstall` 只移除这个块。`keelson init --dry-run` 显示文件将被创建、追加还是刷新。

`.claude/settings.json` 里已有的 hook 被保留。Keelson 添加两个命令路径包含 `.keelson/hooks/` 的条目，也只移除这些条目。

## 已有的决策记录

长期决策留在项目的决策记录目录里。每个 spec 的 `Decisions` 段保存简短的现在时一行，并在有记录时链接过去：

```markdown
## Decisions
- payments: idempotency keys on every write; see docs/adr/0007-idempotency.md
```

技能的 `plan.md` reference 要求代理链接，不重述。

## CI

```yaml
- run: npm install -g keelson
- run: keelson validate
- run: keelson check
```

`validate` 在结构错误时失败，并对之后会阻塞落地的任何问题打印警告。`check` 运行 `config.yaml → check` 里的命令。

## 检查安装

```bash
keelson doctor
```

它报告 Node 版本、配置迁移状态、每个配置工具的技能和常驻块是否存在且与 CLI 版本一致、hook 注册情况、每条 `validate` 发现、过期的验证、交接后 HEAD 是否移动、共享契约冲突、知识健康，以及哪些工具 CLI 在 PATH 上。
