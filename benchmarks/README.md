# 可复现 benchmark 工具与证据

本目录的 runner 在 Docker 边界内调用本机 `codex-cli`，比较同一模型在 Flask 历史任务基线上的可观察代码结果。它保留每一个完成、失败、超时、环境无效和日志捕获不完整的尝试；不根据单次结果给任何框架做综合排名。

完整冻结协议、任务 SHA、验收门槛和已知限制在 [`../evals/PROTOCOL.md`](../evals/PROTOCOL.md)。第三方工具来源和许可证见 `licenses/` 与 [`NOTICE.md`](NOTICE.md)。原始模型事件和模型生成补丁不是本项目原创内容；它们以对应的 provenance、任务基线和第三方许可标识保存。

## 运行前提

- 本机可运行 Docker，且当前用户具有非交互 `sudo docker` 权限。
- `codex-cli 0.155.1` 及其本地认证可用。认证只会在容器临时 home 中复制；结果中不得提交认证字段。
- 从 Flask 固定 baseline 的 `uv.lock` 在容器内解析并安装 Python 测试依赖。
- 竞品包及 Keelson 源码必须使用记录在 provenance 中的固定 revision。不要把用户级 `.codex`、`.agents` 或全局 skills 挂进容器。

先构建隔离镜像并做环境预检：

```bash
node benchmarks/run.mjs --verify-environment \
  --output evals/results/<timestamp>-environment-preflight
```

预检要求每项任务的 baseline 与 upstream oracle 均通过完整预声明 public regression，baseline hidden 验收失败、oracle hidden 验收通过。任一条件不满足时，不应启动正式单元。

## 单元与矩阵

每个正式单元都是新的 depth-1 baseline 工作树。runner 删除 remote、清理 reflog 和对象后，验证上游修复不可访问，并保存 `benchmark-baseline` 作为所有补丁和变更的差分锚点。

```bash
# bare、Trellis、Superpowers 示例
node benchmarks/run.mjs --matrix --method bare --repetitions 3 \
  --model gpt-5.6-terra --timeout-minutes 20 --isolation docker \
  --output evals/results/<timestamp>-bare

# OpenSpec：先确保固定 CLI 的同一 login-shell smoke 通过
node benchmarks/run.mjs --verify-method openspec --isolation docker \
  --output evals/results/<timestamp>-openspec-runtime
node benchmarks/run.mjs --smoke-framework-model openspec --model gpt-5.6-terra \
  --timeout-minutes 5 --isolation docker \
  --output evals/results/<timestamp>-openspec-model-smoke

# Keelson：来源必须是 clean、npm ci 完成的冻结 checkout
node benchmarks/run.mjs --matrix --method keelson --repetitions 3 \
  --model gpt-5.6-terra --timeout-minutes 20 --isolation docker \
  --keelson-source /path/to/frozen-keelson \
  --output evals/results/<timestamp>-keelson
```

为缩短尾部时间，可在不同输出根并行运行尚未开始的单元。`--repetition-start N` 让分片仍使用固定的 r1--r3 编号，例如：

```bash
node benchmarks/run.mjs --task flask-ipv6-server-name --method openspec \
  --repetition-start 2 --repetitions 2 --model gpt-5.6-terra \
  --timeout-minutes 20 --isolation docker \
  --output evals/results/<timestamp>-openspec-ipv6-r2-r3
```

不同单元不得共享 worktree、运行时目录或输出目录。并行负载可能影响 wall-clock；报告应保留每格 `codex_elapsed_ms`，不能把这一时间直接解释为模型效率。

## 证据结构与结果解释

每个 `<task>__<method>__rN/` 目录包括：

- `effective-prompt.md`、`treatment.md` 与方法运行时/激活证据；
- Python 锁定依赖、setup footprint、源码历史清理和隔离命令记录；
- `codex.events.jsonl`、stdout/stderr、终态 HEAD 和相对 `benchmark-baseline` 的补丁；
- `public-regression.*`、`hidden-acceptance.*` 与 `summary.json`。

`summary.json` 的 `regression_pass` 与 `acceptance_pass` 分别指 public regression 和隐藏验收；只有 Codex 正常退出、二者均通过并达到源文件变更门槛时，机械 `pass` 才为 true。环境既有失败属于预检问题，不能归因给模型。

运行后生成可审阅的原始事件索引：

```bash
node benchmarks/audit-results.mjs evals/results/<root>
```

`behavior-audit.json` 把 harness 机械结果、实际命令退出/输出、终稿中可解析的测试数字、事件捕获完整性、终稿是否为收尾性陈述分开。它是启发式索引，尤其 shell/heredoc 和自然语言数字需人工复核；不能由 harness 通过反推模型曾执行某一命令，也不能由缺失事件推定虚构。

需要重算中位数、token 覆盖率和 setup footprint 时，向汇总器传入**仅纳入比较**的根目录；它会将缺失值保留为未观察到，而不会替换为零：

```bash
node benchmarks/summarize-results.mjs evals/results/<summary>.json \
  evals/results/<eligible-root-1> \
  evals/results/<eligible-root-2>
```

## 结果目录分层

报告应明确分别列出：

- **有效正式单元**：完成全部固定前置 smoke、固定 prompt 和机械验收的单元；
- **environment-invalid 尝试**：例如 CLI 在模型实际 login shell 中不可用；保留 raw，但不得计入比较；
- **原验收后的 supplemental probe**：与原机械分数并列展示，不能回写原协议分数；
- **后续 Keelson 探索**：使用不同冻结 SHA 或指导迭代的 fresh 单元，单列且不替代五方法矩阵；
- **捕获不完整单元**：源码补丁和 harness 结果仍可报告，但 token、终稿和行为结论必须标记其证据限制。

安全/档案、代码漂移和决策重开若有统一实际 probe，须与主矩阵分开报告。本次可用的 Keelson 工程回归与各方法实际安装 footprint 也只能作为各自证据；没有对应公开接口或统一 probe 的方法应为 `NA`，不作为零分或综合排名依据。

## 提交前检查

保留 raw 文件的同时，仅报告 secrets 扫描命中的文件名和数量，绝不打印值。确认所有结果的 provenance、任务 SHA、方法 revision、模型、timeout 和实际有效 prompt 可对应；保留失败和无效尝试的原因。临时 worktree、下载缓存和容器由 runner 或任务清理，原始证据、固定依赖说明和已引用的冻结 checkout 则保留到审阅完成。

## CLI 时延实测

运行 `node benchmarks/cli-performance.mjs --out benchmarks/cli-performance.json`，在 5000 文件的固定 Git 项目中，每组预热 3 次、测量 30 次。计时包含新 Node 进程及输出捕获；测试命令自身成本另外测量，`check` 净开销为估计值。signed `status`/`context` 使用已签名的新鲜记录，不以无记录路径替代。每次迭代、失败启动、硬件和环境条件都保留在 [原始结果](cli-performance.json)。

最新完整迭代测量 `997c94e` 加已注明摘要的 `34da3a0` 两文件补丁。p95 为：signed status 634.104 ms、signed context 779.032 ms、ask 323.139 ms、impact 302.530 ms、validate 210.487 ms、check 净开销 988.123 ms、record 净开销 996.910 ms、land 690.677 ms、init 1050.479 ms。按初稿预算分别为五项未达、四项达到；不能据此宣称所有性能目标通过。共享机器的起止负载均已记录。后续短诊断只用于选择实现，不能替代这组完整样本或宣称达标。
