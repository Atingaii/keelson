# 工程决策方法

当一个技术选择并不显然、撤销成本高，或者它依赖“性能更好、可靠性更高、可扩展、成本更低、可维护性更强”等主张时，读取本文件。这里是一套**做选择的方法**，不是又一张清单。`model.md` 负责领域语言和边界，`design-lenses.md` 负责指出哪类风险值得看，本文件负责说明如何推理、如何取得证据。

## 从第一性问题出发，而不是从既有解法出发
<!-- keelson: id=engineer.first-principles | without: 用户点名的技术或已有惯例被误当成需求本身，设计开始优化某个机制而不是最终结果 | sunset: never -->

选 pattern 或产品之前，把问题还原成六类信息：

1. **已观察事实** —— 代码、测试、telemetry、文档或用户真实建立了什么事实。
2. **结果** —— 这次变更最终必须产生什么可观察结果。
3. **硬约束** —— 兼容、法规、授权、预算、平台、期限。
4. **不变量** —— 即使实现换掉也必须一直成立的东西。
5. **假设** —— 目前相信、但还没有证据的判断。
6. **机制** —— cache、queue、service、database、framework、pattern、模型阶段、抽象层。

机制是 hypothesis，不是 requirement。把技术名删掉再问：**如果不存在这个机制，到底哪条性质会失败？** 现有架构是重要证据，也经常构成兼容性约束；但“以前一直这么做”本身不能成为继续复制偶然复杂度的理由。

优先选择能保留结果、约束和不变量的最小问题定义。当前契约或测量趋势没有要求时，不提前替未来更大的问题设计。

## 增加机制之前，先写出可证伪的主张
<!-- keelson: id=engineer.hypothesis | without: 架构只用“更快”“更安全”“更可扩展”等形容词解释，最后无法区分有效改进与偶然结果 | sunset: never -->

对于真正重要且不确定的选择，先用紧凑格式写工程主张：

```text
Hypothesis: 机制 X 在条件 Z 下改善/保护响应 Y。
Baseline: 当前方案或更简单的方案 B。
Measure: M。
Decision threshold: T。
Budget: 足以区分方案的最小实验。
```

例如：“cache 在 500 rps 下把列表 p95 保持在 200 ms 内”；“idempotency key 在 at-least-once 重试时阻止重复扣款”；“第二个 Agent 的独立 review 能发现实现者自己遗漏的 requirement gap”。

如果主张不能直接量化，就找最强的可观察 proxy 或结构性证据；两者都没有时，把它当作所有者取舍或可逆默认值，而不是已被证明的工程事实。

## 用最便宜、但足以改变决定的实验
<!-- keelson: id=engineer.experiment | without: 本可用一个薄端到端切片、spike、benchmark 或故障注入解决的问题，被长时间停留在直觉争论里 | sunset: never -->

选择能区分方案的最低成本探针：

- **Tracer bullet** —— 先让一个真实用户动作端到端穿过所有必要层。
- **Spike / prototype** —— 用完即弃，用来学习 API、集成、UI 交互或迁移限制。
- **Benchmark / load test** —— 用代表性 workload 检验性能或成本主张。
- **Failure injection** —— timeout、retry、duplicate、crash、依赖丢失、partial failure。
- **Ablation / counterfactual** —— 去掉或简化某个机制，看它宣称的收益是否一起消失。

实验事实进 ledger；只有由实验产生的长期决定进入长期知识。Prototype 跑通过一次，并不等于那份 prototype code 就应该直接进生产。

## 消融用于归因，不用于走形式
<!-- keelson: id=engineer.ablation | without: 完整系统一旦通过，里面新增的每个组件都会永久留下，即使从未证明过它真的贡献了任何东西 | sunset: never -->

当一个机制声称值得它带来的复杂度时，把它和更简单的 baseline 比较：

1. 尽可能保持 workload、环境、配置、数据集和 random seed 一致。
2. 测 baseline。
3. disable、remove 或 simplify 这个机制。
4. 测同一响应。
5. 用**实验前就确定**的 threshold 比较差异。

效果可以忽略时，这个机制还没有赚到它的复杂度；删除它，或者把结论标成 inconclusive。结果有噪声就重复，不挑最好看的一次。

一次只改一个因素的 ablation 会漏掉交互效应。如果 X 只有在 Y 存在时才有作用，就用最小的组合矩阵（很多时候 2×2 已经够）而不是根据孤立移除直接下结论。目标是取得足以支撑工程决定的因果信息，不是做统计表演。

## 只有“以后很难改”时才升级成架构问题
<!-- keelson: id=engineer.architecture | without: 每个代码组织选择都被叫作“架构”，真正昂贵的边界反而没有显式比较取舍 | sunset: never -->

当决定范围广或撤销昂贵时才把它当 architecture：data ownership/schema、public contract、trust boundary、deployment/service boundary、concurrency model、durable storage、外部平台依赖，或者会被大量后续变更继承的运行拓扑。

存在真正的架构分叉时：

- 把相关 **quality-attribute scenario** 写成：stimulus → environment → expected response → measurable response。
- 选定前画**两个可信设计**。只有真实 fork 才这样做，不为了填模板硬造第二个方案。
- 按当前需要比较：复杂度、可修改性、可靠性、安全、性能/成本、可测试性、迁移/回滚、运维、blast radius、可逆性。
- 选择满足当前测量/需求、同时保留可信演进路径的最简单方案。
- 决定跨领域且以后很贵时，如果项目配置了 `refs.decisions`，写一个短 ADR：context、decision、consequences，以及**什么时候应该重审**。
- 可以度量的架构特征变成 `fitness` check。

架构不是图画了多少张、pattern 用了多少个；架构是会塑造后续变化成本的关键边界和取舍。

## 让变化尽量局部
<!-- keelson: id=engineer.structure | without: 接口直接镜像 framework/database，调用方知道太多实现细节，一个小产品改动会扩散到很多无关模块 | sunset: never -->

- **隐藏复杂度。** 宁要小接口 + 深实现，不要很多暴露内部细节的薄 wrapper。调用方需要知道得越少越好。
- **让 policy 远离易变 detail。** 当真实边界能降低替换/测试成本时，不让 domain/use-case 直接依赖 framework、transport、database 或 vendor-specific shape。
- **一起变化的东西尽量放在一起。** 一个功能反复需要改五个目录，是边界有问题的证据。
- **边界跟着领域走。** 同一个词在两个区域含义或不变量不同，就用 `model.md` 明确 bounded context 与翻译关系。
- **Pattern 是共同词汇，不是目标。** 问题已经长成某个 pattern 的形状时才给它命名。
- **新基础设施必须说明当前压力。** 新 queue、cache、service、datastore、framework、protocol 或 abstraction 必须能指向当前约束、测量结果或 failure mode。

## 安全地演进现有系统
<!-- keelson: id=engineer.evolution | without: 没人真正理解的旧行为被一次性重写，回归要等切换后才发现，现代化风险集中到一次发布 | sunset: never -->

面对已有/legacy code，按 **characterize → 找 seam → 小步 behavior-preserving refactor → verify → 再改行为**。Refactoring 本身不是行为修改，而是为后续行为修改创造更安全的形状。

无法一次安全替换时，优先 parallel change / branch by abstraction 或增量 strangler：新旧实现先在受控边界后共存，traffic/data/caller 再逐步迁移。风险高时明确 rollback 或 reverse migration。

绿地集成先用一条薄 tracer bullet 证明完整路径，再横向铺开。除非所有者接受 cutover 风险，并且有证据表明增量迁移显著更差，否则不要默认 big-bang rewrite。

## 把长期质量变成可执行约束
<!-- keelson: id=engineer.fitness | without: 架构质量只能依靠 reviewer 记住散文，导致同一约束被一遍遍重新发现、重新违反 | sunset: never -->

“快”“可靠”“安全”“可扩展”都不是可执行 requirement。给它范围和响应指标，写入 spec；当命令能测时，加入 `config.yaml → check`，`kind: fitness`。

Fitness check 保护的是**重要性质**，不是某个喜欢的实现形状。某条 dependency-direction check 在它保护稳定 policy 时可能合理；“系统必须分五层”则不是有价值的 fitness function，除非五层本身就是需求。

同一种 review comment 反复出现，是信号：要么设计该继续简化，要么那条 invariant 应该自动化。
