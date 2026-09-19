[English](../collaboration.md)

# 协作：Session、人与 Agent

Keelson 刻意把**普通对话续接**与**真正所有权交接**分开。

## 普通 Session 续接

AI 窗口随时可能关闭。这既不是 handoff，也不是生命周期转换。

宿主能提供稳定 session identity 时，Keelson 在本地维护一个 gitignored 指针：

```text
.keelson/.runtime/sessions/<opaque-key>.json
→ change: <active-change>
```

它只表示“这个对话当前聚焦这个 change”。

新 session 可以运行：

```bash
keelson focus --auto
```

解析顺序保持保守：已有有效 focus → 当前 branch 唯一匹配 → 全局唯一 active change。多个候选永远不猜。

宿主没有经过验证的 identity bridge 时，也会给出同样的候选，但不会把它保存成共享/global focus；Agent 在后续命令中显式使用 change 名。这可以避免两个并行窗口意外共用一个可变 pointer。

## 并行 Session

因此两个窗口可以分别：

```text
session A → order-search
session B → billing-export
```

互不串线。有 focus 时，`check --record`、`land`、`cancel`、`handoff` 优先使用当前 session 的 change。

独立的新修改目标创建新长期 change，并且只移动当前 session focus。切换 focus 永远不会自动完成或取消之前的 change。

## Handoff 是显式交接

`handoff.md` 会提交 Git，所以只用于另一台机器/另一个人真正需要的信息。

适用场景：

- 换开发者/Agent 所有权；
- worktree 明确转交；
- 所有者要求一个 cold-start transfer package。

```bash
keelson handoff <change>
```

它记录 commit、已确认决策、done/blocked、已排除方案、下一具体步骤和 verification。

不要因为一个聊天窗口关了就创建 handoff。普通 session 恢复从长期 change 工件 + 本地 focus/candidate 状态重建。

## 长期与本地

| 信息 | 位置 | 进 Git |
|---|---|---|
| 工作边界、验收、计划、决策、ledger | `.keelson/changes/<name>/` | 是 |
| 明确交接包 | `changes/<name>/handoff.md` | 是 |
| session focus | `.keelson/.runtime/sessions/` | 否 |
| 检查输出 | `.keelson/.runtime/evidence/` | 否 |
| 项目真相 | specs/rules/INTENT 等 | 是 |

## 并行实现与隔离

`keelson new` 记录 owner 和 branch。第二个写入者需要时使用独立 branch/worktree：

```bash
keelson new share-links --tier spec --capability sharing --worktree
```

`touches` 与 capability delta 暴露语义重叠：

```bash
keelson new order-export --touches "src/api/**,src/export/**" --depends add-order-pagination
```

两个 active change 触及同一声明路径或能力时会产生 shared-contract warning。Keelson 暴露冲突，Git branch/worktree 隔离文件，tracker/PR/CI 协调所有权和集成。

## 集成别人工作以后

代码 merge 后旧 verification 可能因为 fingerprint 改变而 stale。另一 change 改过你 delta 的主 spec 时，`land` 会报告 spec drift，必须重读之后才能 `--accept-drift`。

## Release 状态

实现 ready、integration 和 release 仍是三个不同事件。

- `ready`：长期 work gate + 当前 verification 满足；
- `keelson land`：集成/fold change；
- Git tag：release boundary。

Breaking change 仍需 Rollout；Keelson 从不自行执行生产操作。
