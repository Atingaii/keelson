# 完整用户流程

核心规则只有一句：

> **对话生命周期不等于工作生命周期。**

用户可能一直追问、沉默很久、直接关终端、开另一个窗口、第二天再回来，而且从来不说“开始任务”或“任务做完了”。Keelson 仍然必须保持正确。

因此状态被严格分成三层：

```text
长期项目真相          INTENT / specs / rules
长期 work item        changes/<name>/
临时 conversation     .runtime/sessions/<key>.json
```

session 文件只回答：**“这个对话当前聚焦哪个长期 change？”**  
它绝不回答 change 是否已经完成。

## 0. 只初始化一次

```bash
npm install -g keelson
cd my-project
keelson init
```

之后正常使用 Claude Code、Codex、OpenCode、Pi、Gemini CLI、Kiro CLI 或 CodeBuddy。

Fresh init 仍然很小：

```text
.keelson/
├── README.md
├── INTENT.md
├── NOW.md
├── config.yaml
├── manifest.json
├── workflow.md
└── skill/
```

本机 runtime 只有真正需要时出现：

```text
.keelson/.runtime/
├── sessions/<opaque-key>.json
└── evidence/
```

整个目录被 gitignore。

## 1. 一次对话可以无限延长

> **你：** 给订单页面增加搜索。

Agent 确认真正重要的边界，创建长期 change。

```text
.keelson/changes/order-search/
└── change.md
```

如果宿主能提供可信 session identity，Keelson 同时在本地绑定：

```json
{
  "schema": 1,
  "change": "order-search"
}
```

不会保存宿主原始 session id。

用户可以继续问：

> **你：** 为什么选服务端搜索？

这是围绕同一 focus work 的 Explore/解释，不是新 task。

> **你：** 匹配文字也高亮一下。

仍属于同一个结果目标，因此更新已有 `order-search`。

> **你：** 移动端怎么办？

仍是解释性追问，不发生生命周期转换。

> **你：** 对了，billing export 崩溃也修一下。

这是独立修改目标。Agent 创建第二个长期 change，并把**当前 session focus** 切过去；原来的 order-search 仍保持 active，不会因为话题切走就自动完成或取消。

## 2. 直接关窗口几乎不代表任何业务状态

用户直接关闭终端时，Keelson **不会**：

- 判定 focused change 完成；
- 强制创建假的 handoff；
- archive change；
- 重写项目真相；
- 猜测“今天做完了”。

长期 change 原样存在。

Session pointer 只是本机易失状态；即使以后消失，也不会改变 change。

可以把它理解成成熟系统中的一个基本原则：

> **客户端连接是否还活着，不等于业务状态是否完成。**

## 3. 新会话主动恢复焦点

第二天用户打开新窗口：

> **你：** 继续。

Agent 运行：

```bash
keelson focus --auto
```

解析顺序保持保守：

1. 已有有效 focus 就继续；
2. 当前 branch 只有一个匹配 active change 时，选择它；
3. 否则只有一个 active change 时，选择它；
4. 仍有多个候选时，绝不猜。

有歧义时只问一个问题：

> 现在有两个 active change：`order-search` 和 `billing-export-crash`。你要继续哪一个？

不具备可靠 session identity bridge 的宿主走同样的安全降级逻辑：便利性可以下降，但绝不串错任务。

## 4. Quick change 不需要假装项目管理

> **你：** 把内部 buyer 标签改成 customer，行为不变。

Agent 创建：

```text
changes/rename-buyer/
└── change.md
```

不制造空 tasks、ledger、handoff、spec、design。

用户中间连续问十个问题，也不会影响 lifecycle。

实现和验收准备好以后：

```bash
keelson check --record "buyer rename preserves behavior"
```

真正发生验证事件后，`ledger.md` 才出现。

所有 gate 满足时 CLI 直接报告：

```text
rename-buyer: ready → run `keelson land rename-buyer`;
do not wait for the user to say "done"
```

Agent 在宣称完成之前立即 land。

## 5. Spec 级 change 同样与聊天长度无关

> **你：** 用户可以撤销分享链接，撤销后必须立刻不能再打开图片。

行为边界批准后：

```text
.keelson/
├── specs/
│   └── sharing/spec.md
└── changes/revoke-share-link/
    ├── change.md
    ├── tasks.md
    └── specs/sharing/spec.md
```

之后用户可能连续问：

> 为什么不能有宽限期？  
> CDN cache 怎么办？  
> 已经打开的浏览器标签页呢？  
> 顺便把按钮文案改一下。

这些都只是 conversation turns。Agent 判断它们是解释、同一目标的增量修改，还是独立的新修改目标；不需要“开始/结束任务”的自然语言标记。

## 6. Ready 是推导状态，不是用户宣布

只有长期/机械状态同时满足：

```text
必须的 tasks 完成
AND acceptance 完成
AND 没有 blocking open questions
AND 没有未确认 assumptions
AND breaking change 有 rollout
AND 当前 tree 上 verification 通过
```

change 才成为 `ready`。

`tasks.md` 在所有 tier 都只是可变执行计划；它可以不存在、未全部勾选，或随实现路径重写，只要已接受的结果已经满足就不会阻止 ready。

Spec change 的权威是 Acceptance 契约和行为 delta，而不是 plan。

如果测试绿了之后又改代码，verification 自动 stale，`ready` 也消失。

因此用户从来不需要说：

> “这个任务完成了。”

仓库状态已经能够回答。

## 7. 完成是 Agent 自动状态转换

当 `keelson check --record` 使当前 change 进入 `ready`，Agent 随即：

```bash
keelson land
```

有 session identity 时，focused change 会自动选中。

Landing 会：

- 把行为 delta 折叠进主 spec；
- 把长期决策放回它解释的行为旁边；
- 按配置删除/归档临时 change 工件；
- 清掉所有仍指向该 change 的本地 session pointer。

只有 land 成功后才能宣称这个 change 完成。

如果仍缺所有者决定，就只停在那一个决定上。

## 8. Land 后用户继续问也没问题

> **你：** 这里为什么用 unique index？

纯解释问题，直接回答；不会把已经落地的 change 复活。

> **你：** 重复提交不要返回 409，改成返回已有记录。

这是新的行为修改目标；非平凡时建立新 change。

因此两个方向都没有“一个聊天 = 一个任务”的假设。

## 9. Handoff 只用于真正交接

普通跨 session 续接**不需要** `handoff.md`。

只有真正发生：

- 换开发者/Agent/机器；
- 长期 worktree 明确交给别人；
- 所有者要求一个可提交的 cold-start transfer package；

才运行：

```bash
keelson handoff <change>
```

Handoff 之所以提交 Git，是因为另一台机器需要它。

普通新聊天窗口直接从长期 change 状态 + 本地 session focus / candidate resolution 重建即可。

## 10. 并行对话

例如两个 Agent 窗口：

```text
session A → order-search
session B → billing-export
```

各自有独立的 gitignored pointer：

```text
.runtime/sessions/
├── a1….json → order-search
└── b9….json → billing-export
```

`check --record`、`land`、`handoff` 优先使用当前 session focus，避免一个窗口把另一个 change 的证据写错或 land 错。

如果 session identity 不可用/有歧义，Keelson 拒绝猜测，要求显式 change 名。

这是 fail-safe，而不是功能缺失。

## 11. Fix 同样如此

> **你：** customer name 有 emoji 时接口 500。

Agent 复现、加回归检查、修根因、验证。

用户期间可以继续问各种技术问题；同一个 work item 持续 focus。

当 regression acceptance + 当前 tree verification 满足时，它自动 `ready` 并 land，不需要结束语。

## 12. 项目真相比 Work 活得更久

一次 change land 后只留下长期真相：

- 可观察行为 → specs；
- 稳定不变量 → rules/checks；
- 稳定术语 → glossary；
- 项目级方向/状态 → 真有需要时的 ROADMAP/NOW；
- 完整历史 → Git。

本地 session pointer 可以消失，临时 change 工件 fold。

生命周期变成：

```text
conversation/session   分钟～小时，本机
change/work item       分钟～数天/数周，提交 Git
project truth          数月～数年，提交 Git
git history            永久记录
```

## 13. 用户真正要做什么

通常只有：

```bash
keelson init
```

然后正常自然语言。

想看状态：

```bash
keelson status
```

诊断/升级：

```bash
keelson update
```

知识维护本身是自动的：Agent 在 RECONCILE 中消费内部 health signal，大型 spec 自动分片，runtime 缓存自动回收。 `doctor` 是诊断工具，不是用户必须执行的 housekeeping 步骤。

`focus`、`new`、`context`、`impact`、`check`、`land` 和少见的 `handoff` 主要由 Agent 使用。

## 一屏心智模型

```text
conversation turns
      │
      ▼
session focus ───────────────┐
（本机、易失）               │
      │                      │
      ▼                      │
durable change/work item ◄───┘
（提交 Git、独立生命周期）
      │
      │ gate + evidence 推导 ready
      ▼
自动 land
      │
      ▼
durable project truth
```

**用户不需要通过聊天措辞来做生命周期记账。**
