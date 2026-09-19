<!-- keelson:start -->
## Keelson

本仓库把工作事实保存在 `.keelson/`：`INTENT.md`（为什么存在、明确不做什么、代理可以独自决定什么）、`ROADMAP.md`（当前里程碑）、`NOW.md`（当前在做什么）、specs（系统今天的行为）、`rules/`（按路径路由的约定）、`changes/`（进行中的工作，空闲时为空）。项目已有的文档通过 `config.yaml` 引用，绝不复制。

- 非平凡工作开始前运行 `keelson context --paths <files>`；改共享模块之前运行 `keelson impact <files>`。
- 变更大小由你判断：trivial（直接做）· quick（写回你的理解，然后继续）· spec（澄清，起草 `change.md` + delta specs + 验收，等待批准）。
- 决策记为已确认或假设；未决问题只阻塞依赖它的切片。
- 只在 `keelson check --record` 之后宣布"完成"；落地会拒绝过期或缺失的证据。已集成时 `keelson land <name>`；然后重写 `NOW.md`。
- 变更中途停下：`keelson handoff <name>` 并填好。恢复：先检查工作树，再 `keelson status`。
- 细节在 `keelson` 技能里；只读你需要的那份参考。
- 如果 `NOW.md` 以 "First contact" 开头，就根据仓库起草 `INTENT.md`（已有代码的项目再加 specs 和 rules）并请所有者确认；永远不要让他们手写。
<!-- keelson:end -->
