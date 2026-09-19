# 完整用户流程

最重要的 UX 原则只有一句：**Keelson 不是让用户再操作一套流程。** 用户继续像原来一样和 Claude Code、Codex、OpenCode、Pi、Gemini CLI、Kiro CLI 或 CodeBuddy CLI 对话；Keelson 在对话下面，把真正值得保留的内容变成可评审的项目状态。

## 0. 安装与初始化

```bash
npm install -g keelson
cd my-project
keelson init
```

如果探测到一等公民宿主，Keelson 安装对应发现 shim；否则只使用通用 `AGENTS.md + .agents/skills/` 层。

新项目一开始刻意保持很小：

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

不会预先创建空 ROADMAP、Glossary、rules、specs、changes、tasks、ledger、handoff。

## 1. 第一次对话：只确认项目意图，不盘点整个仓库

打开你平常使用的 Coding Agent：

> **你：** 给订单页面加搜索。

第一次接触时，Agent 先读仓库，根据已经存在的事实起草 `.keelson/INTENT.md`。它不会试图一次性给整个仓库建立完整知识库。

> **Agent：** 我先读了项目。我的理解是：这是内部订单管理应用；公开 API 明确不在范围内；破坏性生产操作仍需显式确认。我已经把这些写进 INTENT。  
> 这次“搜索”我理解为：在现有订单列表里按订单号和客户名过滤，不做全站搜索。这个边界对吗？

你只纠正真正重要的内容。Agent 根据回答重写 INTENT/NOW，然后继续。

## 2. Explore：讨论本身保持只读

> **你：** 先别做，客户端搜索还是服务端搜索更适合？

Keelson 路由到 **Explore**。Agent 读取现有代码、spec、rule，比较方案；不会因为“正在思考”就创建 change。

如果小实验比讨论更便宜，可以做只读 benchmark/spike。只有结果会影响未来工作时，才把结果写入长期事实。

## 3. Quick change：最开始只有一个文件

例如需求清楚且不改变行为契约：

> **你：** 把后台界面里的内部字段 buyer 全部改叫 customer，行为不变。

Agent 写回理解后，内部相当于执行：

```bash
keelson new rename-buyer --tier quick
```

此时只出现：

```text
.keelson/changes/rename-buyer/
└── change.md
```

不会生成空 tasks 或 ledger。

实现完成后 Agent 运行：

```bash
keelson check --record "buyer renamed without behavior change" --change rename-buyer
```

因为现在真的产生了验证事件，`ledger.md` 才出现。

如果一轮会话完成，就永远不需要 `handoff.md`。

## 4. Spec 级变更：边界 → 批准 → 切片

例如行为契约真正变化：

> **你：** 用户可以撤销分享链接，撤销后必须立刻不能再打开图片。

Agent 路由到 **Change**。实现之前做四件事：

1. 读取当前项目状态与影响面；
2. 区分事实、计划依赖的假设、必须由用户决定的问题；
3. 写出可评审的变更边界和验收；
4. 写行为 delta 和实现切片。

这时目录才真正长出来：

```text
.keelson/
├── specs/
│   └── sharing/spec.md
└── changes/revoke-share-link/
    ├── change.md
    ├── tasks.md
    └── specs/sharing/spec.md
```

Agent 先展示真正影响方案的选择：

> **Agent：** 建议契约：撤销后所有图片访问路径立即拒绝；已经下载到浏览器里的字节无法远程抹除；不设宽限期。  
> 备选是 5 分钟宽限，但它不满足“立刻失效”。我建议即时拒绝。  
> 验收有三条：撤销后页面访问失败、直接图片访问失败、其他未撤销链接不受影响。这个边界批准吗？

默认 spec 级变更得到批准后再写代码。

## 5. Build：一次完成一条纵向切片

批准后，不按“数据库 → 后端 → 前端”逐层做，而是先跑通最窄的真实用户动作：

```text
Slice 1：撤销 + 页面访问被拒绝
Slice 2：直接图片访问被拒绝
Slice 3：管理 UI + 回归覆盖
```

实现过程中跑便宜、局部的检查；只有宣称完成前才跑完整配置检查。

如果发现稳定不变量，例如“所有 share 鉴权必须经过 canViewShare()”，只有未来会重复需要时才持久化；能够被命令检查时，优先变成 check，而不是继续加 prose。

## 6. Stop / Resume：信息穿过会话边界

做到 Slice 1 需要停下：

```bash
keelson handoff revoke-share-link
```

此时 `handoff.md` 才出现：

```text
changes/revoke-share-link/
├── change.md
├── tasks.md
├── handoff.md
└── specs/sharing/spec.md
```

它记录当前 commit、已确认决策、完成内容、阻塞、下一具体步骤。

第二天：

> **你：** 继续。

新会话读取 NOW + handoff，从已记录的下一步继续；不会重新做 discovery，也不会让你重复已经确认过的问题。

## 7. Verify：证据绑定到精确工作树

宣称完成之前：

```bash
keelson check --record "revocation end-to-end" --change revoke-share-link
```

`ledger.md` 记录命令、退出码和工作树指纹。

此后只要代码变化，`keelson status` 就把这次验证标为 **stale**。旧代码上的绿色结果不能继续拿来证明当前代码。

同时 Agent 必须把每个 Acceptance 映射到真实 test/check/manual/review；“测试都绿”不代表没覆盖的验收项自动成立。

## 8. Finish：评审 → 折叠真相 → 删除脚手架

任务、验收完成且证据新鲜后：

```bash
keelson land revoke-share-link
```

存在以下情况会拒绝落地：

- 未决问题；
- 未完成验收；
- stale / missing verification；
- 未确认工作假设；
- breaking change 没有 rollout；
- delta spec 已漂移。

成功后：

- delta 行为合并进主 spec；
- 稳定决策留在对应行为旁边；
- 临时 change 脚手架默认删除；
- 完整历史留给 Git；
- NOW 重写为当前状态。

**实现过程中文档可以变多，但完成后临时工件应该变少。**

## 9. Fix：Bug 不需要伪装成 Feature 流程

> **你：** customer name 里有 emoji 时接口返回 500，修一下。

Agent 路由到 **Fix**：

1. 复现；
2. 定位；
3. 加负向回归检查；
4. 修根因；
5. 当前树上重新验证。

如果只是局部 bug，不会为了“流程完整”硬造 design/spec。只有修复暴露出缺失的行为契约或反复出现的不变量时，才持久化它。

## 10. Improve：重复失败升级为更强控制

同类问题反复出现时：

```bash
keelson retro
```

提升路径保持很窄：

```text
一次性缺陷
→ 重复失败类别
→ 作用域 rule / spec 澄清
→ 可执行 fitness check
→ 删除已经冗余的 prose
```

Harness 应该越来越精确，而不是越来越大。

## 11. 用户自己通常会运行什么

### 看当前状态

```bash
keelson status
```

查看活动变更、verification 是否新鲜、open questions、handoff、release 状态。

### 诊断

```bash
keelson doctor
```

Doctor 检查 canonical runtime、宿主 shim、安装 manifest、hook、项目结构、证据新鲜度、冲突与 knowledge health，并告诉你修复动作。

### 升级 / 切换 Coding Agent

```bash
npm install -g keelson@latest
keelson update
```

`manifest.json` 记录 Keelson 实际拥有的生成表面；update 把当前磁盘状态收敛到配置目标，并清理过期的 Keelson 文件，不删除旁边的用户内容。

### 移除 Keelson

```bash
keelson uninstall
```

默认删除生成的 runtime / integration 表面，但保留项目事实。只有明确想把整个 `.keelson/` 一起删除时才用 `--purge`。

## 一屏心智模型

```text
你
 │
 │ 正常自然语言
 ▼
Coding Agent
 │
 ├─ Explore ───────────── 只读思考
 ├─ Change ────────────── 定边界 → 纵向交付
 ├─ Fix ───────────────── 复现 → 修复
 ├─ Resume ────────────── NOW + handoff
 ├─ Finish ────────────── verify → land
 └─ Improve ───────────── 失败 → 更强控制
 │
 ▼
.keelson/
 ├─ 始终存在：intent + now + runtime + config + manifest
 ├─ 按需出现：roadmap / glossary / rules / specs
 └─ 进行中才有：change 工件 + evidence + handoff
```

黄金路径应该很无聊：**init 一次，正常对话，需要可见性时才看 status。**
