# 风险触发式设计镜头

这些是 **Agent 内部工程镜头，不是架构问卷**。只启用当前变更真正触发的镜头。先读仓库和已有契约，再把发现路由成默认值、实验、验收、检查或一个真正属于所有者的决定。

## 触发、检查、路由
<!-- keelson: id=lenses.triggered | without: 每个功能都被迫走巨型清单，而真正重要的跨领域风险仍可能因为机械打勾而漏掉 | sunset: never -->

| 镜头 | 常见触发 | 提问前先检查 | 优先沉淀为 |
|---|---|---|---|
| 用户 + 领域 | 新流程、含糊名词、多角色 | actor/job、现有流程、共享语言、所有权边界 | 场景/非目标；术语真重要时才进 glossary |
| 数据 + 完整性 | 持久化、schema、导入导出、删除、金额 | 真源、不变量、生命周期、保留、迁移、审计/对账 | requirement + 迁移/回滚/对账证据 |
| 安全 + 隐私 | 登录、权限、secret、PII、上传、不可信输入/工具 | 资产、信任边界、最小权限、滥用途径、验证 | 负向 acceptance + 安全检查 |
| 并发 + 异步 | queue、webhook、worker、实时、多写者 | 重复、顺序、幂等、重试、超时、取消、部分失败 | 重复/乱序/重试/故障测试 |
| API + 兼容性 | 公共 API、event/schema/config/存储格式 | 消费方、版本、breaking 定义、弃用、rollout/rollback | 兼容契约 + rollout 证据 |
| 可靠性 + 运维 | 关键路径、后台任务、外部依赖 | 失败表现、恢复、可观测性、安全降级、人工处置 | 恢复检查 + metric/log/runbook 指针 |
| 性能 + 成本 | 明确延迟/吞吐/数据量/成本目标、测出的热点 | workload、SLO、基线、增长假设、资源上限 | benchmark/load/cost 检查；不凭想象加缓存 |
| 界面 + 可访问性 | UI、表单、导航、交互流程 | 主任务、错误/恢复、键盘/focus、理解成本、破坏性操作 | usability/accessibility acceptance |
| AI + 非确定性 | LLM、Agent、RAG、模型/工具调用 | eval case、fallback、数据边界、prompt/tool injection、授权、可复现性 | eval 集 + 安全/fallback acceptance |

触发某个镜头只意味着“检查这个维度”，**绝不意味着把这一行所有问题都问给用户**。

## 优先简单、可逆的架构
<!-- keelson: id=lenses.simplicity | without: Agent 会为假想规模提前设计、在压力尚不存在时增加抽象，或者把所有未来可能性都当成今天的需求 | sunset: never -->

使用能满足当前契约、并保留可信演进路径的最简单设计。新增 service、queue、cache、抽象层、数据库、框架或协议之前，先说清楚**现在**到底是哪一个具体压力需要它。

未来规模/功能只是 hypothesis，不是 requirement。能低成本验证的就做 spike/benchmark；以后能局部修改的就优先采用可逆方案继续推进。优先“深模块 + 窄接口”，不要为了形式漂亮堆很多只镜像实现的浅包装。

## 把风险变成证据，而不是散文
<!-- keelson: id=lenses.evidence | without: 设计评审留下大量看起来很完整的文档，但代码变化后关键性质没有真正受到保护 | sunset: never -->

每个触发镜头最终必须落成以下一种或几种：

- **已有保证**：已有 spec/rule/test 已覆盖 → 直接复用；
- **所有者决定** → 在 decision frontier 只问那个问题；
- **工程默认值** → 自行决定；只有未来工作需要理由时才记录；
- **低成本未知** → spike、原型、benchmark 或查看 telemetry；
- **稳定不变量** → 窄作用域 rule，能自动化时优先 fitness/check；
- **验收/证据义务** → 加入对应的故障/兼容/安全/性能/迁移/可访问性场景；
- **明确不在范围内** → 只有省略会像遗漏时才点名一次。

不要因此创建一份通用 NFR 文档或架构检查清单。

## 用 Fitness Function 保护架构
<!-- keelson: id=lenses.fitness | without: 架构质量依赖评审者记住文字规则，随着项目演进会逐渐腐化 | sunset: never -->

长期架构性质只要能机械测量，就优先做成 `config.yaml → check`，不要反复靠散文提醒：

- 禁止的依赖方向；
- 公共 schema/API 兼容性；
- latency 或 bundle-size 上限；
- migration 可回滚检查；
- security/static-analysis 策略；
- accessibility 测试；
- 确定性的 contract/eval suite。

文字只保留足够解释**为什么**存在这个 guard、适用于哪里。重复出现的 review comment 本身就是信号：应该用 fitness check 或更窄的 rule 替代散文。

## 优先处理不可逆风险
<!-- keelson: id=lenses.priority | without: Agent 会围绕可逆的实现品味争论，却对数据损失、权限、兼容、迁移或故障语义默默猜测 | sunset: never -->

大致按这个顺序解决：

**不可逆数据/安全/生产副作用 → 对外兼容/迁移/昂贵长期承诺 → 故障/并发正确性 → 用户可见行为/可访问性 → 有测量依据的可靠性/性能/成本 → 可逆实现偏好**

安全内部使用紧凑循环：**保护什么 → 可能怎么出错 → 什么控制负责预防/检测 → 什么证据证明控制有效**。

性能和规模先测量再加机制。分布式/异步场景默认考虑重试与部分失败，除非 transport contract 明确证明不会发生。破坏性行为必须把恢复/回滚说清楚。
