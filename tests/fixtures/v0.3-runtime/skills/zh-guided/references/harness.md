# 演进 Harness

一个有效的 Harness 做两件事：在 Agent 动手**之前**让正确路径更容易，在 Agent 动手**之后**给它足够便宜的信号来自我纠正。目标不是把模型写成脚本，而是把稳定的软件工程知识从聊天中搬到“能够可靠承载它的最小控制点”里。

## 约束不变量，不微操实现
<!-- keelson: id=harness.invariants | without: prose micromanages implementation details, goes stale with the code, and agents satisfy the recipe while violating the real boundary | sunset: never -->

写下长期必须成立的东西：依赖方向、API 兼容性、边界处的数据校验、验收条件、延迟预算。除非某个库、类结构或修改顺序本身就是契约，否则不要把它写死。

把不变量放到最窄的权威位置：

- 可观察的产品行为 → capability spec；
- 某些路径专属的工程约定 → `.keelson/rules/`；
- 可度量的不变量 → `config.yaml → check`，`kind: fitness`；
- 临时实现选择 → `change.md`，变更落地后删除。

好的机械检查只报告**哪个不变量在什么位置被破坏**，修复方式留给 Agent 判断。

## 把控制放在最便宜、最有用的位置
<!-- keelson: id=harness.control-loop | without: everything becomes always-on prose or a late CI surprise, wasting context before the edit and feedback time after it | sunset: never -->

| | 生成前（feedforward） | 生成后（feedback） |
|---|---|---|
| inferential | resident block、skill、scoped rules、specs | fresh-reader review、语义评审 |
| computational | codemod、typed API、generator | lint、typecheck、单元/集成测试、结构/fitness 检查 |

便宜且确定性的控制尽量靠近修改发生的位置：BUILD 回路里跑定向检查，宣布完成前跑配置好的完整检查，高成本/慢评审只在风险值得时使用。同一个规则不要同时复制到 resident、skill、rule 文件和 CI；选一个真相源，其余地方只指向它。

## 用“升级”处理重复错误，而不是不断长提示词
<!-- keelson: id=harness.promotion | without: recurring mistakes live as chat folklore, while every incident adds more prose and the always-on context grows without becoming more enforceable | sunset: when project-specific controls can no longer be traced to a live invariant or recurring failure -->

使用这条升级阶梯：

1. **第一次出现：** 修缺陷；如果问题走到了验证阶段，记录 root cause。
2. **同一类问题反复出现：** 运行 `keelson retro`，找出这些失败共同违反的稳定不变量。
3. **语义预防：** 在最窄的 spec/rule/reference 中补充或收紧规则，让 Agent 在编辑前更容易做对。
4. **确定性预防：** 如果脚本可以可靠发现违例，就做成 `fitness` check；如果足够快，再接入日常本地/CI 路径。
5. **自动化稳定后：** 删除或缩短只是重复检查内容的 prose。

不要把一次性的审美分歧自动化。只有错误会重复、代价明显、检测信号稳定时，才值得升级 Harness。

## 保留失败归因与回归证明能力
<!-- keelson: id=harness.attribution | without: the agent fixes failures that pre-date its change or records green checks that would also pass with the bug restored | sunset: never -->

高风险工作开始前，如果不先跑一次就无法判断失败是不是历史遗留，就建立有针对性的 baseline。实现过程中优先运行能定位当前切片的最小检查。修 bug 时保留负向回归证明：去掉修复后，新测试必须失败。宣布完成时，再针对你要声称的**同一棵工作树**运行新鲜的完整配置检查。

baseline 失败不等于可以忽略测试。把既有失败写清楚，不要扩大它，并独立验证你真正改到的表面，直到 baseline 能被单独修复。

## 让 Harness 可被删减
<!-- keelson: id=harness.adaptive | without: the repository accumulates workarounds for old model limitations and every future agent pays their context and process cost | sunset: when every non-permanent control has an explicit removal trigger and retro is run regularly -->

每条 Harness 规则都隐含一个假设：Agent 或项目在没有帮助时做不好某件事。这个假设需要被反复验证。优先保留绑定项目不变量的控制，而不是绑定某一个模型当前缺点的补丁。如果某条控制只是为了补偿观察到的 Agent 行为，就给它 sunset 条件，或至少给出继续保留它的可度量理由。

`keelson retro` 就是 Harness 的维护回路：根据 ledger 与失败证据去**新增、加强、放松或删除**指导。成熟的 Harness 应该越来越精准，而不是只会越来越大。
