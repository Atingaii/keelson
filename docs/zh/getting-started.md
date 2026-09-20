[English](../getting-started.md)

# 快速上手

Keelson 面向用户只有一条流程：

> **运行一次 `keelson init`，之后继续像原来一样和 Coding Agent 对话。**

从连续追问、session 恢复、quick/spec 变更、显式 transfer handoff、验证、自动 ready/land、bug 修复，到升级和卸载的完整故事见[完整用户流程](user-flow.md)。

## 安装

需要 Node.js 20+。

```bash
npm install -g keelson
keelson --version
```

## 初始化

```bash
cd your-project
keelson init
```

没有指定宿主时，Keelson 自动探测本机已安装、发现路径已 verified/documented 的一等公民 CLI；一个也没有时，使用通用 `AGENTS.md + .agents/skills/` 层。

也可以显式指定：

```bash
keelson init --claude
keelson init --codex --opencode
keelson init --gemini --kiro
```

查看一等公民宿主：

```bash
keelson platforms
```

## init 会创建什么

Fresh init 刻意保持很小：

```text
.keelson/
├── README.md
├── INTENT.md
├── NOW.md
├── config.yaml
├── manifest.json
├── workflow.md
└── skill/
    ├── SKILL.md
    └── references/
```

不会预先创建空 ROADMAP、Glossary、rules、specs、changes、tasks、ledger 或 handoff。

在 `.keelson/` 外，Keelson 只写已选宿主真正需要的薄发现表面；完整指导仍只有 `.keelson/` 里一份。

`manifest.json` 记录当前安装真正负责哪些生成表面，因此以后 `update`、`uninstall` 或切换宿主时可以准确对齐，而不是猜。

## 第一次接触

正常打开你使用的 Coding Agent，直接提出真实需求。

第一次非平凡对话时，Agent 会：

1. 读取仓库与已有引用材料；
2. 根据已有证据起草 `.keelson/INTENT.md`；
3. 用一次很短的交流让你确认或纠正项目边界；
4. 继续整理当前真实需求。

它不会把整个仓库一次性盘点成 specs/rules。只有当前工作真的暴露出行为契约或稳定工程不变量时，这些文件才出现。

例如：

> **你：** 给订单页面加搜索。  
> **Agent：** 我理解为在现有订单列表中按订单号和客户名过滤；不做全站搜索，也不改变公开 API。我发现已有分页契约，会保持不变。这个边界对吗？

确认之后就正常继续。

Agent 不会因为“数据库、队列、一致性模型、架构模式”这些技术选项存在，就把它们丢给你选择。每个问题之前，它都会先判断：这个答案会改变什么、谁真正拥有答案、仓库证据或一个便宜实验能不能解决。可逆的工程细节由 Agent 沿用项目惯例或合理默认值自行决定。你回答“**不确定**”也完全有效，它会据此继续调查、默认或做小实验，而不是逼你猜术语。

只有你明确说“**grill me / 深挖一下**”时，Agent 才会沿重要决策树继续追问；普通工作只要下一个安全纵向切片已有清楚结果、边界和验收，就停止提问并开始做。

## 后续哪些内容会长出来

只有有实际信息时才出现：

- `ROADMAP.md` —— 有值得写进仓库、而不是 tracker 的里程碑/方向；
- `GLOSSARY.md` —— 术语开始重要或产生歧义；
- `rules/` —— 稳定的路径作用域工程不变量需要跨会话保存；
- `specs/` —— 可观察行为需要长期契约；
- `changes/` —— 非平凡工作正在进行；
- `.runtime/sessions/` —— 宿主/session identity 可以保存本地 focus pointer 时；
- `.runtime/evidence/` —— 产生本机验证输出时。

quick change 最开始只有 `change.md`。spec 级变更还会有任务计划和行为 delta。真正发生验证事件后 ledger 才出现；handoff 只在显式换人/换机器交接时出现，普通新聊天使用本地 session focus/candidate 恢复。

## 用户可能会主动运行的命令

```bash
keelson status
```
查看活动工作（包括机械推导的 `ready`）、当前 session focus、verification 新鲜度、open questions、transfer handoff 和 release 状态。

```bash
keelson doctor
```
诊断 runtime/shim/manifest 漂移、项目结构、过期证据、冲突和 knowledge health。

```bash
npm install -g keelson@latest
keelson update
```
升级或切换宿主后，刷新 package-owned guidance 并对齐生成表面。

```bash
keelson uninstall
```
移除生成的 integration/runtime 表面但保留项目事实。只有明确想删除整个 `.keelson/` 时才加 `--purge`。

用户不需要记住那些主要给 Agent 使用的命令。

## 下一步

- [完整用户流程](user-flow.md)
- [核心概念](concepts.md)
- [工作原理](how-it-works.md)
- [已有项目](existing-projects.md)
