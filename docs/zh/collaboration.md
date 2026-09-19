[English](../collaboration.md)

# 协作：会话、人与代理

"做了一个任务"和"让项目持续推进"之间的分界线，是下一个会话、下一个人或下一个模型能否在不重做、不撤销的前提下接着做，以及两个人或两个代理能否同时工作而不互相覆盖。本页两者都讲。

## 跨会话

### NOW.md

项目级快照：在做什么、卡在哪或有什么不确定（包括"尚未检查：…"），以及下一步具体做什么。现在时，整体重写，从不追加。`keelson land --now "<text>"` 在落地时写它；代理每次停下时重写它。会话启动 hook 打印它。

### handoff.md

一个变更的接续状态，与变更一起提交。`keelson handoff <name>` 从模板创建它，或给已有的重新盖戳：

```markdown
---
at: 7a9f37c2b1
updated: 2026-09-19 14:02
by: ann
---
```

`at` 是这份交接所描述的 commit。代理填六个部分：

| 部分 | 内容 |
|---|---|
| 目标与已确认的决策 | 一段话，现在时，链接 `change.md` |
| 已完成 | 已完成并验证的切片或任务，附证明它的 `Verify:` |
| 未决与受阻 | 每项写明它阻塞什么 |
| 已排除 | 被否的假设或方案，附证据，让后来者不再重试 |
| 下一步 | 第一个具体动作，小到可以冷启动 |
| 验证 | 最后一条 `Verify:`（命令、退出码、tree）和尚未检查的内容 |

交接是当前状态的摘要。它被覆盖，从不当作日记追加。

### 恢复

1. `keelson status`：每个变更的 work、verification 和 release 状态；HEAD 是否在交接之后移动；未提交的文件。
2. 如果 HEAD 移动过或工作树不干净，先读 `git log` 和 `git diff` 再信任交接。其他工作可能已落地，共享契约可能已变动。
3. 从不为了"干净开始"而删除或重置未提交的改动。要么问，要么绕开它们。
4. 在旧验证上继续构建之前先重新运行 `keelson check --record`；任何编辑之后它都算过期。
5. 从**下一步**接着做；再次停下时更新 `handoff.md` 和 `NOW.md`。

会话启动 hook 打印每个活动变更的下一步，所以在 Claude Code 上代理在读任何东西之前就看到了它。在其他工具上，发现块先把它指向 `.keelson/workflow.md`，其中 ORIENT 步骤要求先运行 `keelson context`。

### 什么提交、什么留在本地

| 信息 | 位置 | 进 git |
|---|---|---|
| `NOW.md`、`handoff.md`、`ledger.md`、变更工件 | `.keelson/` | 是 |
| 检查输出、本机状态 | `.keelson/.local/` | 否，由 `init` 加入 `.gitignore` |

另一台机器上的同事需要的一切都提交。

## 并行

### 所有权与隔离

`keelson new` 在 `change.md` 里记录 owner（git 用户名）和当前分支。第二个写代码的人，在自己的分支和 worktree 上创建变更：

```bash
keelson new share-links --tier spec --capability sharing --worktree
```

这会运行 `git worktree add -b share-links ../<repo>-share-links`，并在 frontmatter 里记录 `branch: share-links` 和 `worktree:`。`keelson status` 在每个变更旁显示 owner 和分支。

### 声明变更触及什么

```bash
keelson new order-export --touches "src/api/**,src/export/**" --depends add-order-pagination
```

`touches` 列出变更将编辑的路径 glob。`depends` 指出它等待的活动变更；它们存在期间 `status` 打印"depends on active: …"，依赖不再活动时 `validate` 发出警告。

### 共享契约

两个活动变更声明了重叠的 `touches`，或都带有同一能力的 delta spec（或决策行），就是一个共享契约。`keelson status` 发出警告：

```text
! shared contract: add-pagination and order-export both touch specs/orders — align the interface before implementing both
```

`keelson impact <files>` 对声明了这些文件的任何活动变更打印同样的警告。应对方式是先在 delta spec 里把契约谈定，落地或引用它，然后两边再各自实现。

### 集成了别人的工作之后

合并之前记录的证据按定义已经过期；`keelson status` 显示它，`land` 拒绝它。如果另一个变更修改了你的 delta 所依据的 spec，`land` 报告漂移，要求你重读之后再传 `--accept-drift`。

### 边界

磁盘上的文件不是分布式锁。分支不消除语义冲突。Keelson 暴露重叠；它不仲裁重叠。跨机器认领工作和控制合并属于跟踪器、pull request 和 CI，这正是 `refs.tasks` 和 `refs.ci` 存在的原因，也是 `keelson validate && keelson check` 应该在 CI 里运行的原因。

## 发布状态

已实现、已集成、已发布是三个状态。`keelson land` 标记集成：在变更到达目标分支时运行它（已合并，或在单人仓库里已提交到主线）。发布来自 git tag：`keelson status` 打印最后一个 tag 以及其后折叠的变更，它们都是未发布。

```text
last release v1.4.0; landed since: share-links, order-export
```

### Rollout 段

以 `**BREAKING**` 开头的 `What` 项标记一个破坏性变更，没有描述兼容窗口、迁移和回滚的 `## Rollout` 段时，`keelson land` 会拒绝它。迁移和生产步骤留在 `NOW.md → Next` 里直到执行完毕。Keelson 提醒；它从不执行生产操作。
