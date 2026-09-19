# 上下文与影响

项目资料随项目增长；每个任务要读的内容，不能随全部历史一起增长。先知道去哪里找，再只打开这次变更需要的。

## 三层
<!-- keelson: id=context.layers | without: 每个会话要么读全部、要么什么都不读；约定要么淹没、要么漏掉 | sunset: never -->

1. **稳定入口** — 常驻块、`INTENT.md`、`ROADMAP.md → Now`，以及由 `**` 路由的 rules。每次都读；刻意保持短小。
2. **任务资料** — 当前的 `change.md`、它点名的能力的 specs、你将改动路径命中的 rules、覆盖这些能力的测试，以及 spec 链接到的任何 `refs` 文档。`keelson context --paths <files>` 会打印其中大部分。
3. **按需展开** — 调用方、其他入口、相邻模块、git 历史里的过往变更。有问题时再打开，不要预先加载。

绝不因为某条始终有效的约束很少用到就降级它。`**` 之下的安全和兼容性规则每次都读；这正是 `**` 的用意。

## 影响是分析出来的，不是查出来的
<!-- keelson: id=context.impact | without: 代理把 rules 索引和 diff 当成完整的波及范围，漏掉目录之外的调用方 | sunset: never -->

`keelson impact <files>` 按名字列出导入方、文本或路径匹配的 specs、适用的 rules，以及声明了相同路径或能力的活动变更。这是导航。改共享模块之前，靠阅读回答：

- 谁调用它？包括 grep 看不见的动态入口：CLI 命令、定时任务、路由、事件处理器、模板。
- 同一行为有没有另一条进入路径（页面旁边的下载 API，请求处理器旁边的批处理任务）？
- 哪些数据约束、权限规则或兼容性承诺依赖它？查 spec 的 `Decisions`。
- 别人的活动变更是否触及同一契约？`keelson status` 会显示共享契约。

把答案写进 `change.md → Impact`。只列出 diff 里文件的 Impact 段不是分析。

## 预算
<!-- keelson: id=context.budget | without: 上下文不够时，代理悄悄丢掉已经读过的约束，或者靠猜而不是读 | sunset: never -->

一个变更的资料装不下时，不要把约束概括成更宽松的说法。缩小切片，或继续按需读取并说明你还没检查什么。"尚未检查：……"写在 `NOW.md → Blocked / uncertain`。

<!-- guided -->
## spec 变更的阅读顺序
`INTENT.md` → `ROADMAP.md → Now` → `change.md` → 它点名的能力 specs → 命中的 rules → 这些能力的测试 → 对你将改动的文件跑 `keelson impact` → 它找到的调用方 → spec 在 `refs` 下链接的任何文档。
<!-- /guided -->
