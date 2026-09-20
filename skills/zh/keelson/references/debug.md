# Debugging（调试）

不知道原因的修复只是恰好通过的猜测。本参考的存在，是为了让原因被找到、被命名，并反馈回项目。


界面工作按需加载 `frontend.md`；视觉与交互验收遵循 `frontend-review.md` 和 `frontend-delivery.md`。

## 先复现，再定位，再修
<!-- keelson: id=debug.reproduce-first | without: 代理凭假设改代码；症状挪了位置，原因还在，bug 换个名字回来 | sunset: 当 retro 显示 guessed-fix = 0 across the last 20 root-cause entries（最近 20 条根因记录中 guessed-fix 为 0）时 -->

1. 完整读错误和堆栈。它通常直接指出那一行。
2. 确定性地复现：一个失败的测试、一个脚本，或精确的步骤。复现不了，就无法知道它已被修好。
3. 定位：观察到的行为从哪里开始偏离预期？在边界处加日志或断言，而不是通读一切。
4. 提出一个假设，用最小的改动验证它，然后才写修复。
5. 再次运行复现；必须通过。保留反向检查：把修复撤掉，回归测试要失败。然后 `keelson check --record`。

如果连续三个假设都失败，停下来从头重读问题；你很可能在错误的层。

## 命名根因
<!-- keelson: id=debug.category | without: bug 一个一个修，背后的模式永远看不见 | sunset: never -->

追加到当前 change 的 ledger（或为这次修复创建一个 quick change）：

```markdown
### Root cause: implicit-assumption
Callback handler assumed exactly one delivery; broker guarantees at-least-once.
Fix: idempotency key on `notify`. Prevention: rule in `rules/services.md`.
```

分类，每条一个：

| 分类 | 含义 |
|---|---|
| `missing-rule` | 没有约定说明该怎么做 |
| `cross-layer` | 两层之间的契约不清楚 |
| `propagation` | 改了一处，漏了依赖它的地方 |
| `test-gap` | 单元通过，集成失败 |
| `implicit-assumption` | 代码依赖了没写下来的东西 |
| `guessed-fix` | 之前的修复处理的是症状，不是原因 |

分类是 `missing-rule` 或 `cross-layer` 时，提出本可以预防它的 rule 或 spec 需求，并趁上下文新鲜时加上。

<!-- guided -->
## 修复方式不明显时
问问最近改了什么（对失败区域 `git log -p`）、数据长什么样、失败是在你的代码里还是在对某个依赖的假设里。这三者是不同的层；先选层，再找行。
<!-- /guided -->
