import { guidanceOptions, readGuidance } from './guide.js';

// A brief is input to the host agent, never a claim that an audit already ran.
const actions = [
  ['plan', 'frontend', 'Plan the experience', '规划体验', 'Map the primary task, constraints, screen structure and acceptance before implementation.', '先明确主要任务、约束、页面结构和验收，再实施。'],
  ['build', 'frontend', 'Build a complete interface', '构建完整界面', 'Implement a working vertical slice, including real states and browser verification.', '实现能走通的完整任务，补齐真实状态并在浏览器验收。'],
  ['audit', 'frontend-review', 'Audit interface quality', '审查界面质量', 'Inspect the running interface for accessibility, responsive, state and performance failures; report evidence before changing code.', '检查运行中的可访问性、响应式、状态与性能问题；先报告证据。'],
  ['critique', 'frontend-review', 'Review the design', '评审设计', 'Explain how hierarchy, composition and interaction help or obstruct the primary task.', '指出层级、构图与交互如何帮助或阻碍主要任务。'],
  ['polish', 'frontend-review', 'Finish the interface', '打磨界面', 'Fix the highest-impact inconsistencies, then repeat the task and visual checks.', '修复影响最大的细节不一致，再复测任务与视觉表现。'],
  ['simplify', 'frontend-visual', 'Simplify the surface', '简化界面', 'Remove redundant decoration and choices while preserving information, discoverability and function.', '去掉冗余装饰和选择，保留信息、可发现性和功能。'],
  ['bolder', 'frontend-visual', 'Strengthen the expression', '增强表现力', 'Make a deliberate focal point through scale, composition or color without competing with the task.', '通过比例、构图或颜色建立明确焦点，服务主要任务。'],
  ['quieter', 'frontend-visual', 'Reduce visual noise', '收敛视觉噪声', 'Reduce competing emphasis and ornament while retaining hierarchy and brand recognition.', '减少互相争抢的强调与装饰，保留层级和品牌识别。'],
  ['typeset', 'frontend-visual', 'Refine typography', '优化排版', 'Establish readable type roles, hierarchy, line length and robust fallback fonts.', '建立可读的字体角色、层级、行长和可靠回退。'],
  ['color', 'frontend-visual', 'Refine color', '优化配色', 'Use semantic color roles and verify contrast and non-color state cues.', '使用语义色彩角色，验证对比度与非颜色状态提示。'],
  ['layout', 'frontend-visual', 'Refine layout', '优化布局', 'Improve grouping, alignment, density and responsive reading order.', '改进分组、对齐、密度和响应式阅读顺序。'],
  ['animate', 'frontend-visual', 'Add purposeful motion', '完善动效', 'Clarify transitions and feedback with interruptible motion and a reduced-motion path.', '用可中断动效说明转换与反馈，并提供减少动态效果路径。'],
  ['clarify', 'frontend-interaction', 'Clarify interface copy', '优化界面文案', 'Make labels, actions, errors and recovery specific to what the user is doing.', '让标签、操作、错误与恢复文案准确对应用户任务。'],
  ['onboard', 'frontend-interaction', 'Improve first use', '完善首次使用', 'Create a short path from an honest empty state to the first useful outcome.', '从真实空状态出发，以最短路径得到首个有用结果。'],
  ['harden', 'frontend-interaction', 'Harden interactions', '补齐交互边界', 'Exercise failures, retries, permissions, slow work, long content and localization.', '覆盖失败、重试、权限、慢操作、长内容与本地化。'],
  ['adapt', 'frontend-delivery', 'Adapt across devices', '适配设备', 'Preserve the primary task across content-driven breakpoints, input modes and zoom.', '在由内容决定的断点、输入方式和缩放下保留主要任务。'],
  ['optimize', 'frontend-delivery', 'Improve measured performance', '改进实测性能', 'Measure the affected journey, fix the dominant bottleneck, then remeasure correctness and speed.', '测量受影响流程，修复主要瓶颈，再复测正确性和速度。'],
  ['extract', 'frontend-delivery', 'Extract reusable design', '提取复用设计', 'Consolidate repeated stable tokens or components while preserving their behavior.', '提取已稳定重复的 token 或组件，并保持行为一致。'],
  ['document', 'frontend-delivery', 'Document the design system', '记录设计系统', 'Record observed tokens, components, states and usage decisions in existing project docs.', '在现有文档记录观察到的 token、组件、状态和使用决策。'],
  ['explore', 'frontend-delivery', 'Explore visual directions', '探索视觉方向', 'Compare materially different compositions on the same real content and task; label tradeoffs.', '用相同真实内容与任务比较明显不同的构图，并说明取舍。'],
  ['iterate', 'frontend-delivery', 'Iterate in the browser', '浏览器迭代', 'Observe, change one coherent area, reload, compare and repeat until acceptance is met.', '观察、修改一个完整区域、重载对照，直到满足验收。'],
  ['delight', 'frontend-visual', 'Add a thoughtful detail', '增加体验细节', 'Add a small context-appropriate moment that rewards progress without delaying the task.', '增加契合场景的小反馈，回应进展而不拖慢任务。'],
];

export async function design({ positional = [], flags = {} }, cwd = process.cwd()) {
  const options = guidanceOptions(flags, cwd);
  const zh = options.lang === 'zh';
  const catalog = actions.map(([name, reference, en, cn, goal, goalZh]) => ({ name, reference, title: zh ? cn : en, objective: zh ? goalZh : goal }));
  const [action, ...parts] = positional;
  if (!action) {
    if (flags.json) console.log(JSON.stringify({ kind: 'design-catalog', lang: options.lang, actions: catalog }, null, 2));
    else console.log([
      zh ? 'Keelson 前端设计' : 'Keelson frontend design', '',
      'Usage: keelson design <action> [target] [--lang en|zh] [--json]', '',
      ...catalog.map(({ name, title }) => `  ${name.padEnd(12)} ${title}`), '',
      zh ? '命令生成 Agent 执行指导；宿主 Agent 负责修改和浏览器验证。' : 'Commands prepare agent guidance; the host agent implements and verifies in the browser.',
      zh ? '例如：keelson design harden "设置表单"' : 'Example: keelson design harden "settings form"',
    ].join('\n'));
    return 0;
  }
  const selected = catalog.find((entry) => entry.name === action);
  if (!selected) throw new Error(`unknown design action "${action}". Run \`keelson design\` to list actions.`);
  const references = [...new Set(['frontend', selected.reference])];
  const brief = {
    kind: 'design-brief', lang: options.lang, action,
    target: parts.join(' ').trim() || (zh ? '当前请求涉及的界面' : 'the interface in the current request'),
    title: selected.title, objective: selected.objective,
    execution: zh ? '这是指导，尚未执行审查或修改。由宿主 Agent 使用项目代码和可用浏览器工具完成；目标文本不是 shell 命令。' : 'Guidance only; no audit or modification has run. The host agent uses project code and available browser tools. The target is text, not a shell command.',
    mode: ['audit', 'critique', 'plan', 'explore'].includes(action) ? 'review' : 'change',
    references: references.map((name) => ({ name, content: readGuidance(name, options) })),
  };
  if (flags.json) console.log(JSON.stringify(brief, null, 2));
  else console.log([
    `# ${brief.title}`, '', `${zh ? '目标' : 'Target'}: ${brief.target}`, '', brief.objective, '', brief.execution,
    ...(brief.mode === 'review' ? ['', zh ? '先诊断或提出方案；仅在已有修改授权范围内改动。' : 'Start with findings or a proposal; modify only within existing authorization.'] : []),
    ...brief.references.flatMap(({ name, content }) => ['', `--- ${name} ---`, '', content.trimEnd()]),
  ].join('\n'));
  return 0;
}
