# Keelson 文档

Keelson 只有一条黄金路径：**初始化一次，之后继续像原来一样使用 Coding Agent**。CLI 在对话下面维护项目状态、契约和证据。

## 从这里开始

1. [快速上手](getting-started.md) —— 安装与初始化。
2. [完整用户流程](user-flow.md) —— 从日常对话到变更、验证、交接、落地的完整例子。
3. [核心概念](concepts.md) —— INTENT、change、证据、reconcile 的心智模型。
4. [工作原理](how-it-works.md) —— runtime、发现 shim、manifest、hook 与磁盘结构。

## 指南

- [已有项目](existing-projects.md) —— 不复制已有文档地接入 Keelson。
- [协作](collaboration.md) —— 跨会话、跨人、并行变更、handoff、worktree。
- [验证](verification.md) —— 证据、工作树指纹、stale 检查。
- [effort 层级与模型](models.md) —— `light | standard | deep`，不使用带日期模型 ID。

## 参考

- [配置](configuration.md)
- [CLI](cli.md)
- [FAQ](faq.md)

## 用户通常真正需要运行的命令

大多数用户只需要：

```bash
keelson init       # 一次
keelson status     # 可选，查看当前状态
keelson doctor     # 诊断
keelson update     # 升级或切换宿主之后
keelson uninstall  # 移除生成的集成表面
```

`context`、`impact`、`new`、`check`、`handoff`、`land` 等命令主要给 Coding Agent 使用。用户不需要记住它们。
