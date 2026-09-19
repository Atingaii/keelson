# 停下与继续

"做完了一个任务"和"推动了一个项目"的分界线，是下一个会话、下一个人、下一个模型能否不重做、不推翻地继续。两个文件承担这件事：项目级的 `NOW.md`，以及跨会话变更的 `changes/<name>/handoff.md`。

## 什么放在哪里
<!-- keelson: id=handoff.split | without: 会话日志要么当噪音提交进去，要么全部 gitignore，团队没有任何接续记录 | sunset: never -->

| 信息 | 存放位置 |
|---|---|
| 整个项目当前在做什么、什么受阻、下一步 | `NOW.md`，提交进 git，整份重写 |
| 单个变更的接续状态：已确认的决策、完成的切片、未决和受阻项、已排除的假设、下一步、验证状态 | `changes/<name>/handoff.md`，提交进 git |
| 检查输出、会话草稿、本机状态 | `.keelson/.local/`，永不提交 |

另一台机器上的同事需要的东西，都不是本地状态。

## 写交接
<!-- keelson: id=handoff.write | without: 下一个会话从翻 git 历史开始；被否决的假设被重试；未验证的工作被当成已验证 | sunset: never -->

运行 `keelson handoff <name>`（创建或重新盖戳 `handoff.md`，写入提交、时间和作者），填好六个段落。它是当前状态摘要：整份覆盖，绝不追加日记。

- **Goal and confirmed decisions** — 一段话，现在时，链接 `change.md` 而不是重复它。
- **Done** — 已完成且已验证的切片或任务，附证明它的 `Verify:`。
- **Open and blocked** — 每一项写明它阻塞什么。
- **Ruled out** — 已否决的假设或方案，附证据，免得有人重试。
- **Next step** — 第一个具体动作，小到能冷启动。
- **Verification** — 最后一条 `Verify:`（命令、退出码、tree）以及还没检查什么。

然后重写 `NOW.md`，让项目视图与之一致。下一个会话打开时，session-start hook 会打印交接里的下一步。

## 恢复
<!-- keelson: id=handoff.resume | without: 代理对着已经移动的工作树执行过期的交接，或者"清理掉"负责人想保留的未提交改动 | sunset: never -->

1. `keelson status`：工作、验证、发布状态，HEAD 是否自交接以来移动过，未提交的文件。
2. HEAD 移动过或工作树有改动，先读改了什么（`git log`、`git diff`）再信交接；可能有其他工作已落地，共享契约可能已变化。
3. 绝不为了"干净开始"删除或重置未提交的改动。要么问，要么绕开它们。
4. 在之前的验证上继续之前先重跑 `keelson check --record`；任何改动之后它按定义已过期。
5. 从 **Next step** 继续；再次停下时更新 `handoff.md` 和 `NOW.md`。

## NOW.md
<!-- keelson: id=handoff.now | without: 下一个会话两眼一抹黑，从 git 里重新推导状态 | sunset: never -->

整份重写，现在时，三个短段：正在进行什么（或"nothing in flight"）、什么受阻或不确定（包括"尚未检查：……"）、下一个具体步骤。`keelson land --now "<text>"` 在落地时替你写。暂停、受阻、取消都是正常状态；照实写，不要为了结束会话硬把变更说成"完成"。
