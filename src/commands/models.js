import { requireProjectRoot, findProjectRoot, projectPaths } from '../lib/paths.js';
import { loadConfig } from '../lib/config.js';
import { TIERS, resolveAll, resolveTier, detectAndCache, loadCache, refresh, loadRegistry, loadUserOverrides, saveUserOverrides, datedIdPatterns } from '../lib/models.js';
import { PLATFORMS } from '../platforms/index.js';
import { heading, ok, warn, info, dim } from '../lib/out.js';

export async function models({ flags, positional }, cwd = process.cwd()) {
  const root = findProjectRoot(cwd);
  const cfg = root ? loadConfig(projectPaths(root).config) : null;
  const platform = flags.platform ?? cfg?.tools?.[0] ?? 'claude';
  if (!PLATFORMS[platform]) throw new Error(`unknown platform "${platform}"`);

  if (positional[0] === 'rank') {
    const [, alias, tier] = positional;
    if (!alias || !TIERS.includes(tier)) throw new Error('usage: keelson models rank <alias> <light|standard|deep> [--platform <id>]');
    for (const re of datedIdPatterns()) if (re.test(alias)) throw new Error(`"${alias}" looks like a dated model ID; use the family alias instead`);
    const o = loadUserOverrides();
    o[platform] ??= {};
    o[platform][tier] = alias;
    saveUserOverrides(o);
    ok(`~/.keelson/models.yaml: ${platform}.${tier} = ${alias}`);
    return 0;
  }
  if (flags.detect) {
    const c = detectAndCache();
    ok('detected and cached');
    if (flags.json) console.log(JSON.stringify(c, null, 2));
    else for (const [id, t] of Object.entries(c.tools)) console.log(`  ${id.padEnd(9)} ${t.installed ? `installed ${dim(t.version ?? '')}` : dim('not found')}${t.defaultModel ? `  default: ${t.defaultModel}` : ''}`);
    return 0;
  }
  if (flags.refresh) {
    const r = await refresh({ withProviders: !flags.noProviders });
    ok(`registry: ${r.registry}`);
    for (const [pid, s] of Object.entries(r.providers)) info(`${pid}: ${s}`);
    if (r.newModels.length) {
      warn(`${r.newModels.length} new model(s) seen in provider catalogues:`);
      for (const m of r.newModels) console.log(`  ${m.id}  ${m.inferredTier ? dim(`inferred ${m.inferredTier}`) : dim('unranked — `keelson models rank <alias> <tier>` when the host supports it')}`);
    }
    return 0;
  }
  if (flags.resolve) {
    const tier = String(flags.resolve);
    const r = resolveTier(tier, { platform, projectModels: cfg?.models ?? {} });
    if (flags.json) console.log(JSON.stringify({ platform, tier, ...r }));
    else console.log(r.alias ?? '');
    return r.alias ? 0 : 1;
  }
  // default: table
  const cache = loadCache();
  const reg = loadRegistry();
  heading(`Keelson models — platform: ${platform} ${dim(`(registry ${reg.updated})`)}`);
  const all = resolveAll(platform, cfg?.models ?? {});
  for (const t of TIERS) console.log(`  ${t.padEnd(9)} → ${(all[t].alias ?? '—').padEnd(12)} ${dim(all[t].source)}`);
  if (!PLATFORMS[platform] || !reg.platforms?.[platform]?.subagents) info(`${PLATFORMS[platform].label} has no subagent dispatch in the registry; tiers still guide inline effort`);
  console.log('');
  if (cache) {
    console.log(dim(`local detection${cache.stale ? ' (stale, run --detect)' : ''}: ${Object.entries(cache.tools).filter(([, t]) => t.installed).map(([id, t]) => `${id}${t.defaultModel ? `=${t.defaultModel}` : ''}`).join(', ') || 'no tools found'}`));
    if (cache.unranked?.length) warn(`${cache.unranked.length} unranked model(s) from provider catalogues: ${cache.unranked.map((m) => m.id).join(', ')}`);
  } else info('no local detection yet — run `keelson models --detect`');
  if (flags.json) console.log(JSON.stringify({ platform, tiers: all, cache }, null, 2));
  return 0;
}
