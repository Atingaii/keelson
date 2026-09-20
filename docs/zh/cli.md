[English](../cli.md)

# CLI 参考

在项目中运行，使用 `keelson <command> --help` 查看用法。退出码：0 成功、1 操作或检查失败、2 未知命令、4 尚未信任命令、5 持久 JSON 损坏。

## 安装与工作

```bash
keelson init --codex
keelson update --dry-run
keelson update
keelson doctor --session --json
keelson guide workflow
keelson new add-pagination --tier spec --capability orders
keelson context --paths src/api/** --json
keelson focus add-pagination
keelson status --json
keelson handoff add-pagination --by maintainer
```

默认保留项目事实与小型发现入口，从安装包按需读取指导；--vendor 才复制指导。只选择 Claude 不附加 agents 入口，不添加 .gitignore 规则。支持 --tools、宿主标志、--lang、--profile、--guide、--hooks/--no-hooks、--dir。

new 支持 --depends、--owner、--worktree。quick 只创建 change.md；spec 添加 tasks 和指定 delta。focus --clear 只清除会话指针。Codex 使用 CODEX_THREAD_ID，可用 KEELSON_SESSION_ID 显式指定；无可靠身份时不保存共享焦点。私有运行时位于 Git 私有目录或外部用户缓存。

## 决策

```bash
keelson ask add D17 --change add-pagination --owner user --question "客户端应观察到什么顺序？" --recommend "创建时间"
keelson ask settle D17 --change add-pagination --answer "创建时间" --basis "用户已选择"
keelson ask frontier --change add-pagination --json
keelson ask list --change add-pagination
```

owner 为 user、agent 或 reality；支持 --depends D1,D2 和 --irreversible。frontier 最多展示三个已就绪且独立的用户问题，并单列调查任务。已解决问题不重复询问。

assume 需要 answer 与 basis，不可逆决定不能假设；reject 需要 basis。修改已解决决定前使用 reopen D17 --reason，旧答案保留。未解决或假设中的决策阻止正常落地。

## 检查与落地

```bash
keelson check --trust --record --change add-pagination
keelson check --record --change add-pagination --timeout 600000 --json
keelson attest add-pagination --json
keelson validate --json
keelson land add-pagination --dry-run
keelson land add-pagination --keep --now "分页已集成。"
keelson cancel add-pagination --reason "被更小的方案取代"
```

首次先审阅命令再使用 --trust，命令组改变后重新信任。命令运行在本机 shell，不是沙箱。空检查组失败；timeout 按每条命令的毫秒计，输出上限 2 MiB。

--record 写签名 ledger.jsonl 和日志；ledger.md 文字不是验证权威。完整配置检查必须成功，代码及验收输入在运行期间不变。单独执行的部分命令即使成功也只是 partial。--quiet 隐藏实时输出，--json 输出机器可读结果。

attest 导出活动或归档证据及本机验证状态，非新鲜可信通过时返回非零；归档变更仅在原名称唯一时可直接使用原名。没有记录原名的旧归档仅识别无后缀的 `YYYY-MM-DD-<name>`；取消或碰撞后缀不能证明原名，必须按报错中列出的精确归档目录名指定。跨机器需重跑。validate 只检查结构，不执行测试。详见[验证边界](verification.md)。

land 要求验收完成、完整证据新鲜可信、决策依赖解决、契约协调、破坏性变更有 rollout。任务复选框仅供计划。--accept-drift 确认已审阅的基线差异，不能替代重新检查。--confirm-assumptions 只处理旧文字假设，结构化假设必须 settle。

--force --reason 记录签名 override 和被越过的门禁，不会将失败变成通过，仅在授权后使用。运行中检查阻止落地和取消。写入失败时回滚，下次 land 恢复中断事务。带签名证据的变更即使配置 fold 也归档；cancel 不合并契约。

## 维护

retro 汇总账本；models 管理模型层级建议，不负责启动模型。ablate/restore 可逆暂存和恢复集成，维护时停止其他写入者。uninstall 保留项目事实，--purge 才明确删除 .keelson 数据。提交前审阅日志内容。
