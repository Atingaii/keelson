# 前端设计

[English](../frontend.md)

像平时一样告诉 Coding Agent：“改善设置页，沿用现有视觉系统，保存失败后保留输入，并适配手机。”Keelson 将界面工作路由到具体设计指导，沿用项目的变更、决策和验证流程。

## 选择要实现的结果

```bash
keelson design
keelson design plan "账号设置" --lang zh
keelson design audit "结算页面" --lang zh
keelson design harden "邀请表单" --lang zh
keelson design polish "控制台" --lang zh
keelson design adapt "订单表格" --lang zh
keelson design --json
```

CLI 输出 **Agent 执行指导**，不会调用模型、浏览 URL、修改页面或自动打分。将请求交给已安装 Skill 的 Coding Agent，它会读取相关指导，使用项目代码和可用工具执行。目标参数是描述文本，绝不是 shell 命令。默认沿用项目语言，`--lang en|zh` 可覆盖；未初始化的项目外也能运行。

| 结果 | 动作 |
|---|---|
| 规划并实现完整体验 | `plan`、`build` |
| 找到并修复设计质量问题 | `audit`、`critique`、`polish` |
| 完善视觉表达 | `simplify`、`bolder`、`quieter`、`typeset`、`color`、`layout`、`animate`、`delight` |
| 完善真实用户路径 | `clarify`、`onboard`、`harden` |
| 适配与交付 | `adapt`、`optimize`、`extract`、`document`、`explore`、`iterate` |

`audit` 和 `critique` 先提供证据与发现，不自行授权无关修改；已有修改授权仍然有效。小表单 bug 保持最小修复，新界面才需要连贯设计方向和完整任务路径。

## Agent 如何执行

1. 读取现有组件、token、内容、产品意图和受影响页面，保留已确定的品牌与产品决策。
2. 明确主要任务与可观察验收，只加载当前问题需要的指导。
3. 完成或改进一条完整路径，覆盖适用的加载、空态、成功、错误、权限与恢复状态。
4. 打开真实页面，查看渲染结果，执行相关交互，检查所需视口和键盘路径；修复后再次验证。
5. 运行项目检查，按既有验证流程记录实际观察、执行内容和未验证范围。

设置表单需要同时检查层级、保存失败、值保留、重试和重复提交；营销页需要明确受众、主操作、真实内容、有意图的构图、可用的手机阅读顺序和实测加载表现；局部 bug 需要复现并修复具体失败，不扩大为全面重设计。

## 什么证据支持实现结果

截图说明一个可见状态，浏览器交互运行说明执行过的行为，自动测试保护它实际断言的内容。构建成功不能独自证明视觉或交互结果。

保留足够复现发现的信息：路由、视口、内容/状态、步骤和结果。亲自查看截图，不只看截图命令退出码。最后一次编辑后重跑相关检查；浏览器或必要服务不可用时继续独立工作，并明确列出未验证浏览器场景，不能把它们写成通过。

浏览器与图像能力由宿主提供。Keelson 提供工作流程与记录，不内置浏览器、视觉编辑器或图像服务。结果取决于实现、内容、模型与实际验证。签名记录能证明什么，参见[验证与信任](verification.md)。

## 直接读取指导

```bash
keelson guide --list
keelson guide --list --json
keelson guide frontend --lang zh
keelson guide frontend-review --lang zh
keelson guide frontend-visual --lang zh
keelson guide frontend-interaction --lang zh
keelson guide frontend-delivery --lang zh
keelson help design
```

入口按问题路由。review 覆盖证据与收尾；visual 覆盖构图、字体、颜色、图像与动效；interaction 覆盖状态、控件、文案与语言；delivery 覆盖适配、性能、组件提取、文档和浏览器迭代。所有指导均有中英文版本，从已安装包按需读取，无须复制到项目。
