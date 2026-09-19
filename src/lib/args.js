/** Tiny argv parser: --flag, --key value, --key=value, positionals. */
export function parseArgs(argv) {
  const flags = {};
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--') {
      positional.push(...argv.slice(i + 1));
      break;
    }
    if (a.startsWith('--')) {
      const [k, v] = a.slice(2).split(/=(.*)/s);
      const key = k.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      if (v !== undefined) flags[key] = v;
      else if (i + 1 < argv.length && !argv[i + 1].startsWith('--') && !['json', 'force', 'dryRun', 'hooks', 'noHooks', 'onboard', 'refresh', 'detect', 'help', 'version', 'yes', 'keep', 'noProviders', 'quiet'].includes(key)) flags[key] = argv[++i];
      else flags[key] = true;
    } else if (a.startsWith('-') && a.length === 2) {
      flags[a[1]] = true;
    } else positional.push(a);
  }
  return { flags, positional };
}

export const list = (v) => (v === undefined || v === true ? [] : String(v).split(',').map((s) => s.trim()).filter(Boolean));
