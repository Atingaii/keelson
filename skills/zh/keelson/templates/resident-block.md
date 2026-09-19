<!-- keelson:start -->
## Keelson

本仓库把工作事实保存在 `.keelson/`：`INTENT.md`（为什么存在、明确不做什么）、`NOW.md`（当前在做什么）、`specs/`（系统今天的行为）、`rules/`（按路径路由的约定）、`changes/`（进行中的工作）。

- 非平凡工作开始前，运行 `keelson context --paths <files>`，或直接读这些文件。
- 自己判断变更大小：trivial（直接做）· quick（写回你的理解，然后继续）· spec（访谈，起草 `change.md` + delta specs，等待批准）。
- 只有拿到新鲜的命令及其退出码才能说"完成"。`keelson check` 运行项目的检查。
- 用 `keelson land <name>` 落地完成的工作；然后重写 `NOW.md`。
- `keelson` 技能里有各阶段的细节；只读你需要的那份参考。
<!-- keelson:end -->
