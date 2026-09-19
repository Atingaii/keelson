# {{project}}

## Why this exists
一段话。这个项目解决什么问题，为谁解决。如果这段话错了，建在它之上的一切都是错的。

## Boundaries
- In scope: …
- Explicitly not: …（把那些诱人但已决定不做的事写下来）

## Hard constraints
- …（运行时、兼容性、性能、安全、许可证）

## Authorizations
代理可以独自决定什么，什么必须带着推荐拿回来。
- Decides alone: 已确认范围内的局部实现选择；测试结构；遵循既有模式的命名。
- Recommends, owner decides: 任何改变用户可见行为、范围或长期承诺的事；新依赖；公共接口变化。
- Always confirms: 不可逆数据操作、生产修改、权限扩大、破坏兼容性。

## Working defaults
- Change sizing: auto（由代理判断；单次请求可用"按 spec 处理"/"直接做"覆盖）
- Quick changes: proceed after write-back（写回理解后直接继续）
- Spec changes: wait for approval（等待批准）
