# 本机 Codex 对照结果（原始机械验收）

本报告只汇总已完成的固定正式矩阵：`gpt-5.6-terra`、本机 `codex-cli 0.155.1`、每格 20 分钟上限、Flask 三个固定 baseline 任务、每 task/method 三次重复。固定协议、任务 SHA、Docker 隔离、验收门槛和已知限制见 [`PROTOCOL.md`](PROTOCOL.md)；每格 raw JSONL、命令、补丁、时耗、tokens 与判分输出位于下列结果根。这里呈现的是一次本机实验的可观察结果，不是框架能力的综合排名或对新任务泛化的证明。

## 有效正式矩阵

`P` 表示该格同时通过预声明 public regression 与冻结 hidden acceptance，并达到机械源文件门槛；`F` 表示至少一项机械条件失败。每一格的 `regression_pass` 和 `acceptance_pass` 在对应 `summary.json` 分开保存，基线既有环境故障不归咎模型（全部正式任务先通过 baseline/oracle 预检）。

| 方法 | autoescape r1/r2/r3 | IPv6 r1/r2/r3 | teardown D-17 r1/r2/r3 | 原机械通过格 |
| --- | --- | --- | --- | --- |
| bare | P / P / P | P / P / P | P / P / P | 9 / 9 |
| Trellis | P / P / P | P / P / P | F / P / P | 8 / 9 |
| Superpowers | F / P / F | P / F / P | P / F / P | 5 / 9 |
| OpenSpec (Frozen-5) | F / F / P | P / P / P | F / F / F | 4 / 9 |
| Keelson (`7b2c303ead606eef1b5d0bcabc40d95d7189d378`) | P / P / P | P / P / P | P / P / P | 9 / 9 |

这些是已保留的单次重复格，不应被简化成“产品优劣”结论。尤其 OpenSpec 的有效 r1/r2 D-17 格按 raw 完成了 OpenSpec planning/validation 后未实施 Flask 变更；该观察描述本次单轮自治完成状态，不表示 OpenSpec 无法完成此类任务。

有效根目录如下：

- bare：`results/2026-09-20-formal-frozen-3-bare/`
- Trellis：`results/2026-09-20-formal-frozen-3-trellis/`
- Superpowers：`results/2026-09-20-formal-frozen-3-superpowers/`
- Keelson：`results/2026-09-20-formal-frozen-3-keelson-7b2c303/`
- OpenSpec：`results/2026-09-20-formal-frozen-5-openspec-cli/`、`...-parallel-ipv6-r2-r3/`、`...-parallel-teardown-r1-r3/`。

后两个 OpenSpec 分片使用相同 frozen-5 包、prompt、模型、单格预算和独立工作树；它们只为缩短尾部时间而并行，重复编号仍为原定 r1--r3。并行可能影响 wall-clock，故只保留每格 `codex_elapsed_ms`，不把时耗作纯模型效率或排名解释。

## 时耗、tokens 与行为证据

以下是每方法九格中位数。`codex_elapsed_ms` 不含 clone/依赖安装；token 缺失保持 `null`，不估算。它们受本机服务与并行负载影响，只作证据索引。本表把偶数个已观察 token 的中位数按两个中央值的算术平均计算；先前表误用 upper-middle，故 bare output 从 1,923 校正为 1,843、Trellis output 从 6,232 校正为 6,013，原始 raw 没有变化。

| 方法 | elapsed n / 中位数 | input n / 中位数 | cached input n / 中位数 | output n / 中位数 | reasoning output n / 中位数 |
| --- | ---: | ---: | ---: | ---: | ---: |
| bare | 9 / 93,046 ms | 8 / 159,511 | 8 / 145,536 | 8 / 1,843 | 8 / 676 |
| Trellis | 9 / 280,231 ms | 8 / 668,953.5 | 8 / 618,112 | 8 / 6,013 | 8 / 2,168.5 |
| Superpowers | 9 / 148,517 ms | 9 / 316,691 | 9 / 283,904 | 9 / 3,270 | 9 / 1,613 |
| OpenSpec | 9 / 217,965 ms | 9 / 567,056 | 9 / 527,616 | 9 / 4,637 | 9 / 1,246 |
| Keelson | 9 / 397,149 ms | 9 / 760,454 | 9 / 705,536 | 9 / 9,102 | 9 / 2,529 |

完整逐格值、缺失值、所纳入根目录和计算规则见可再运行的 [`../benchmarks/summarize-results.mjs`](../benchmarks/summarize-results.mjs) 及其产物 [`results/2026-09-20-formal-frozen-5-summary.json`](results/2026-09-20-formal-frozen-5-summary.json)。脚本只对有限数值取中位数，未观察到的 token 不以零补齐。

## 安装 footprint（独立描述，非得分）

footprint 是 runner 对每格 treatment 在工作树中 provision 的路径、文件、行数和 bytes 的记录；Python 验收依赖和临时 runner 工件已排除。下表为各方法九格中位数；top-level path 是九格并集。它量化安装侵入性，不表示功能、质量或安全总分。

| 方法 | 文件 / 行 / bytes | top-level path |
| --- | ---: | --- |
| bare | 0 / 0 / 0 | — |
| OpenSpec | 10 / 1,359 / 91,661 | `.agents`, `openspec` |
| Trellis | 105 / 21,573 / 846,072 | `.agents`, `.codex`, `.gitattributes`, `.trellis`, `AGENTS.md` |
| Superpowers | 75 / 11,116 / 443,125 | `.agents` |
| Keelson | 7 / 168 / 8,462 | `.agents`, `.keelson`, `AGENTS.md` |

`behavior-audit.json` 是从 `codex.events.jsonl` 提取的复核索引：它分别记录 harness 结果、实际 pytest/`keelson check` 命令的 exit 与输出摘录、终稿可解析测试数字、事件配对和终稿收尾性。它不是完整 shell 语义或自然语言事实判定；最终完成声称须结合 raw 人工审读。正式 bare D-17 r2 与 Trellis IPv6 r2 缺 `turn.completed`，所以源码和 harness 结果仍在表中，但它们的 tokens/终稿行为证据标记为不完整，未被补造。

对于 Keelson，D-17 三格均没有观察到重开 settled D-17 的 marker；这是 raw 可观察行为，不推断未表达的推理。Keelson D-17 r3 的过程文档曾把 ExceptionGroup 的最低 Python 版本写错，终稿已经改为 Python 3.11+/旧版 fallback；因此数字测试证据匹配不代表过程中的每一技术表述都正确。

## 明确排除的 OpenSpec 尝试

以下 **13 格** 各自保留 raw，但 **environment-invalid**，不能进入上表：

- `results/2026-09-20-formal-frozen-3-openspec/`：仅放入 skills，模型容器没有 `openspec` CLI；
- `results/2026-09-20-formal-frozen-4-openspec-cli/`：外层 smoke 可见 CLI，但模型实际 `/bin/bash -lc` 重置 PATH 后不可用。

Frozen-5 将精确固定的 `@fission-ai/openspec@1.13.1` 资源只读挂载，并把 wrapper 放在 login shell 保留的 `/usr/local/bin/openspec`；同一模型 smoke 实际执行 `openspec --version` 与 `openspec list --json` 均为 exit 0。有效 Frozen-5 raw 没有 `openspec: command not found`。初始两条被执行环境回收的并行启动也只留下空目录、没有 raw 或 summary，非尝试、未计数。

## 后冻结补充与探索（不改写上表）

原 D-17 hidden acceptance 已冻结后，另有一个更严格的 `supplemental/test_teardown_contract.py`，包含额外 `appcontext_popped` 与嵌套上下文恢复边界。它是后冻结 robustness probe；不能把它的失败回写为原 prompt 的机械失败，也不能把其每一细节说成原 prompt 的逐字要求。

补充 replay 保留完整 patch precondition、patch SHA、应用/环境/测试阶段和原格结果。当前已落盘的有效结果按各自 `results/2026-09-20-supplemental-d17-*` 目录报告：bare 2/3、Trellis 0/3、Superpowers 2/3、OpenSpec Frozen-5 0/3、Keelson 7b2c303 0/3。Keelson r1 位于 `...-keelson-first/`，r2/r3 位于 `...-keelson-r2-r3-valid/`；另有一个 runner-error 目录未评估 candidate，保持排除。失败中可见的 `popped` 异常遮蔽聚合错误是该新增边界的观察，不等价于原六个 teardown-error 要求全部失败。

冻结 `fa7c874b8b136089e78a69f559d39724f0178f14` 的 Keelson 指导迭代已完成三次 fresh D-17：r1/r2 位于 `results/2026-09-20-exploration-keelson-fa7c874-d17/`，r3 位于独立持久会话根 `...-d17-parallel-r3/`；三格都通过原机械验收（3/3），并有完整 token 与事件捕获。因 r3 为缩短尾部而与 r2 并行，时间不与正式矩阵作效率比较。串行队列在 r2 后额外启动过一个无父进程的重复 r3 容器，已停止；其没有 raw events、未评估 candidate，`runner-interrupted.json` 明确标为 `comparison_eligible: false`，有效 r3 只有前述独立根的一个。探索 supplemental 为 2/3：r1 位于 `results/2026-09-20-supplemental-exploration-fa7c874-r1/` 且失败，表现为新增 `popped` 边界的 `ValueError` 覆写聚合错误；r2/r3 位于各自 `...-fa7c874-r2/` 与 `...-fa7c874-r3/` 且通过。不能从这三格推断指导变更的因果效果：r1 是在实现后才读取新增 verify 段，也未补充完整 late-observer 测试。它保持模型、预算和原机械验收，另单列 supplemental；其结果绝不替换 `7b2c303…` 的五方法表。该探索的**测量 SHA** 是 `fa7c874…`；最终提交以交付 main 为准，不能把它替代或归因给此冻结测量版本。

冻结 `3090c729b9631abd74013674cd883cdf5e69f8a9` 的第二轮 fresh D-17 在 parser 性能测量窗口结束后启动三条独立 Docker 单元，原 prompt、`gpt-5.6-terra` 与每格 20 分钟上限不变；三格均通过原机械验收（3/3）。有效 raw 位于 `results/2026-09-20-exploration-keelson-3090c72-d17-post-parser-r1/` 至 `...-r3/`，逐格 tokens、时耗和行为审计汇总在 [`results/2026-09-20-exploration-keelson-3090c72-summary.json`](results/2026-09-20-exploration-keelson-3090c72-summary.json)。三条启动前只留下 setup/provenance 而无 Codex JSONL、summary 或 candidate 评估的目录 `...-d17-r1/` 至 `...-r3/`，各有 `runner-interrupted.json` 并明确 `comparison_eligible: false`；它们不计为尝试。有效三格并发以缩短探索尾部，故中位 `codex_elapsed_ms` 707,755 只作本机证据，不作效率比较。

该轮 supplemental 为 2/3：r1/r3 通过，r2 在 `appcontext_popped.send` 的新增末尾异常边界失败，覆盖先前的聚合错误；原 prompt 并未逐字要求此 `popped` 边界，故补充失败不改写原机械 3/3。r2 的 raw 在实现前实际执行 `keelson guide design-lenses`，其输出包含 `lenses.failure-contract` 的“后续 finalizer 或 observer”风险，随后才读取源码、建立 D-17 工作项、实现、运行 public/full suite 与记录 check/land；这证明该指导被加载并进入工作流，但该一个失败说明它没有覆盖所有 late-observer 边界。第二轮不是 guidance-only 消融：同一冻结包还含 `src/lib/evidence.js`、`fs.js`、`git.js` 与 `runtime-path.js` 的性能/平台修复。因此不能将本轮分数归因于四个 guidance 文件，也不替换正式五方法矩阵或第一轮探索。

安全/签名/事务、代码漂移、决策重开与安装 footprint 不与上述代码结果合成为总分。Keelson 自身工程回归可以作为其工程证据，各方法记录的 installation footprint 可以量化侵入性；竞品没有对应公开接口或统一 probe 的位置应为 `NA`，不是零分。

补充的 package diff 审计发现，`fa7c874` 相对 `7b2c303` 还包含 ablation、初始化及平台所有权/迁移修复；第二轮候选 `3090c72` 相对 `fa7c874` 也包含 Windows 写入/锁、真实内容指纹、运行目录查找和 importer 修复。因此两轮都是冻结完整产品版本的探索，不是只改变指引的因果消融。分别在 [`ITERATION.md`](supplemental/ITERATION.md) 与 [`ITERATION-2.md`](supplemental/ITERATION-2.md) 记明补充披露的时点；它们不修改历史分数或正在运行的条件。

## 可复核性与清理

提交前对 raw 运行 secrets 扫描，只记录命中文件名和数量，不输出值。保留证据所需的结果、固定任务与冻结 package SHA；对应源码提交保留在 Git 历史中。独立审阅完成后清理了临时 checkout、runner 工作树、下载缓存和本轮 Docker 镜像。第三方 Flask 源码、竞品技能文本和原始模型工具输出按 [`../benchmarks/NOTICE.md`](../benchmarks/NOTICE.md) 与 [`../benchmarks/licenses/`](../benchmarks/licenses/) 的来源/许可保存，而不视为本项目 MIT 原创内容。
