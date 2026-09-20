# 可复现的 Coding-Agent 对照协议（冻结版 3）

本目录评估同一 Codex 模型在同一 Flask 基线任务中，项目级方法对可观察代码结果的影响。它不做所有工具的综合排名；安全、证据绑定和决策交互能力另作 feature probes。

## 固定条件

| 项目 | 固定值 |
| --- | --- |
| 模型 | `gpt-5.6-terra`；一次矩阵只允许一种模型 |
| Agent | 本机 `codex-cli 0.155.1`，实际版本写入 provenance |
| 仓库 | `pallets/flask`；每项任务固定 baseline SHA 与上游修复 SHA |
| 方法 | `bare`、`openspec`、`trellis`、`superpowers`；Keelson 只在独立冻结源码后加入 |
| 隔离 | 每次新建基线 Git 工作树；非 root Docker 容器只挂载工作树、固定 Codex 二进制与临时认证副本 |
| 重复 | 冒烟 1 次；正式为每 method × task 3 次，保留全部失败 |

Runner 仅 depth-1 获取指定 baseline，保留本地 `benchmark-baseline` ref 作为可审计差分锚点，删除远端、过期 reflog 并立即 GC；随后机械验证上游修复对象不可访问。Agent prompt 禁止网络搜索上游补丁，只允许使用提供的 baseline 工作树。历史公开任务仍可能存在模型训练污染，结果不能证明对未见新任务的泛化。

bare treatment 明确要求直接完成任务。每个非 bare treatment 都追加相同力度的激活语句：先读取并使用当前工作树内该方法的 guidance/skills，不能仅留下未使用工件。该语句保存于 `treatment.md` 和 `effective-prompt.md`。非 bare 运行只有 raw JSONL 中存在直接命令访问对应项目方法路径时才有 `activation_observed: true`；否则作为保留的未激活尝试，不能计入工作流比较。

冻结后补充的隔离澄清适用于后续运行的所有方法：调用已安装框架的 CLI 时可读取其固定包资源，但仍禁止访问工作树外无关的用户级 guidance、instructions、skills 或 configuration。它解决 Keelson `guide` 的固定包资源与隔离 prompt 的表面冲突，不授予网络、宿主全局目录或额外任务信息访问权。首批 bare、OpenSpec、Trellis 的保存 prompt 没有该句，且其安装引导均位于工作树；报告按原始 `effective-prompt.md` 标识此差异，不把它隐去。

### Frozen-4：OpenSpec Docker CLI 修正

首批 frozen-3 OpenSpec 九格安装了项目内 skills，但容器未提供 `openspec` CLI；raw 中的 `openspec: command not found` 使这些尝试成为 **environment-invalid**，保留原始证据但不参与比较。Frozen-4 将精确固定的 `@fission-ai/openspec@1.13.1` 及依赖安装到每格独立临时目录，只读挂载为 `/opt/openspec`，并在 Codex 前机械执行 `command -v openspec && openspec --version && openspec --help`；包锁 integrity 必须等于 runner 固定值。Frozen-4 原计划的九格会另存目录，不能与 invalid attempt 混合；它在四格后因 login-shell 路径缺陷停止。

Frozen-4 的 smoke 外层使用 `sh -c`，但 Codex 工具命令实际使用 `/bin/bash -lc`，后者重置了该 `PATH`，故 Frozen-4 已落盘的四格同样 environment-invalid 并被停止；原计划的其余五格未启动。Frozen-5 额外以只读 wrapper 将固定 CLI 挂载到 `/usr/local/bin/openspec`，用与模型相同的 `/bin/bash -lc` smoke，并在正式矩阵前让 Codex 只执行 `openspec --version` 与 `openspec list --json`；两项 raw command 均 exit 0。只有 Frozen-5 OpenSpec 九格可以参与比较。

### Frozen-5：队列并行记录

Frozen-5 的 OpenSpec 首四格以串行队列执行；IPv6 r1 完成后，余下 IPv6 r2--r3 与 teardown r1--r3 拆为两个独立的持久 runner 会话和结果根目录，使用相同模型、20 分钟单格上限、镜像、固定包和 effective prompt。每格仍创建独立临时工作树、运行时目录和证据目录，编号以 `--repetition-start` 保持为原定 r1--r3。最初两个非持久后台启动未产生 raw JSONL 或 summary，保留为空目录但不是尝试；它们随后由持久会话重新启动。并行负载可能影响 wall-clock 耗时，因此报告分别保留每格 `codex_elapsed_ms`，不将该时间解释为纯模型效率或作排名结论。

竞品只写进本次工作树，不安装或链接全局 skills。Superpowers 固定官方仓库 SHA，复制 `skills/` 至工作树 `.agents/skills/superpowers`。Keelson 采用已 `npm ci` 的 clean 冻结快照，容器中先验证 `keelson --version` 和 `keelson guide`，再以默认 `keelson init --codex` 初始化；探索性的 `--guide` 初始化不能计入正式矩阵。

容器使用只读根文件系统、非 root、drop-all capabilities、no-new-privileges 与临时 home，宿主 `.agents` 和全局 skills 不挂载。Docker seccomp 禁止内层 bwrap 的 user namespace，因此 Codex 在该外层边界内以 `--sandbox danger-full-access` 执行。raw JSONL 中对 `/home/node/.agents`、`/home/node/.codex` 或宿主全局路径的直接读取会使比较失格。

## 任务、环境与验收

三项任务均来自 Flask 的历史上游修复：IPv6 server-name、自动转义扩展名大小写、teardown 回调错误聚合。任务 prompt 不含上游补丁、隐藏测试或得分信号；teardown 含既有 settled decision D-17。

每次任务预检从该 baseline 的 `uv.lock` 解析 Flask `tests` 组、pytest 及其运行时依赖的精确版本，并在 Docker 内安装到该工作树 `.bench-pydeps`。预检必须满足：baseline 的完整预声明 public suite 通过，原始 upstream-fix 的同一 public suite 通过，baseline hidden 验收失败，oracle hidden 验收通过。否则环境无效，不能运行正式矩阵。执行：

```bash
node benchmarks/run.mjs --verify-environment
```

每一 agent 运行同样执行完整预声明 public suite 与之后复制进入的 hidden test。`regression_pass` 表示 public 退出码为 0；`acceptance_pass` 表示 hidden 退出码为 0；`source_file_threshold_met` 是辅助的 `src/` 变更门槛。`pass` 仅在 Codex 正常退出、public/hidden 均通过且源文件门槛满足时为 true。既有基线环境失败会在预检中单独报告，绝不归咎模型。

## 证据与运行

每格保存初始化、依赖冻结、环境安装、Codex JSONL/stderr、最终补丁（含模型新增的未跟踪源/测试/文档文件，不含 setup/依赖工件）、final HEAD 与其相对 baseline 的提交列表、public/hidden 输出、时长、tokens、方法激活证据与 setup footprint（路径、文件数、行数、bytes）。变更与补丁一律相对 `benchmark-baseline`，故模型提交也会保留。`codex_elapsed_ms` 与 `harness_elapsed_ms` 分开记录。token 缺失为 `null`，不会估算；超时和失败不会覆盖重跑。

```bash
node benchmarks/run.mjs --matrix --method bare --repetitions 3
node benchmarks/run.mjs --matrix --method openspec --repetitions 3
node benchmarks/run.mjs --matrix --method trellis --repetitions 3
node benchmarks/run.mjs --matrix --method superpowers --repetitions 3
# 最终 Keelson SHA 交付后：
node benchmarks/run.mjs --matrix --method keelson --repetitions 3 --keelson-source /tmp/keelson-bench-keelson-final
```

`evals/results/` 中的探索、环境无效和正式尝试均保留，但报告必须明确区分。提交 raw JSONL 前运行 secrets 扫描；第三方来源、许可证和 attribution 见 [`../benchmarks/licenses/`](../benchmarks/licenses/) 与 [`../benchmarks/NOTICE.md`](../benchmarks/NOTICE.md)。

## 来源核验（2026-09-20）

- OpenSpec：<https://github.com/Fission-AI/OpenSpec/blob/main/docs/installation.md>、<https://github.com/Fission-AI/OpenSpec/blob/main/docs/supported-tools.md>
- Trellis：<https://github.com/mindfold-ai/trellis>、<https://github.com/mindfold-ai/docs/blob/main/beta/start/install-and-first-task.mdx>
- Superpowers：<https://github.com/obra/superpowers>

版本、SHA、npm integrity 和隔离配置也逐次写入 `provenance.json`。
