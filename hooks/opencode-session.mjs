import crypto from 'node:crypto';

const hash = (value, n) => crypto.createHash('sha256').update(String(value)).digest('hex').slice(0, n);
const stringValue = (value) => typeof value === 'string' && value.trim() ? value.trim() : null;

function lookupSession(input) {
  if (!input || typeof input !== 'object') return null;
  for (const key of ['session_id', 'sessionId', 'sessionID']) {
    const value = stringValue(input[key]);
    if (value) return value;
  }
  for (const key of ['input', 'event', 'properties', 'hook_input', 'hookInput']) {
    const value = lookupSession(input[key]);
    if (value) return value;
  }
  return null;
}

function shellQuote(value) {
  return `'${String(value).replace(/'/g, "'\\''")}'`;
}

function powershellQuote(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

function shellBase(value) {
  return String(value ?? '').replace(/\\/g, '/').split('/').pop()?.toLowerCase() ?? '';
}

function windowsPosix(env) {
  if (env?.MSYSTEM || env?.MINGW_PREFIX || env?.OPENCODE_GIT_BASH_PATH) return true;
  if (/(msys|mingw|cygwin)/i.test(env?.OSTYPE ?? '')) return true;
  return /^(bash|sh|zsh)(\.exe)?$/.test(shellBase(env?.SHELL));
}

function prefix(identity, platform, env) {
  if (platform === 'win32' && !windowsPosix(env)) return `$env:KEELSON_SESSION_ID = ${powershellQuote(identity)}; `;
  return `export KEELSON_SESSION_ID=${shellQuote(identity)}; `;
}

function alreadyInjected(command) {
  const first = String(command).trimStart().split(/[;&|]/, 1)[0].trimStart();
  return /^KEELSON_SESSION_ID\s*=/.test(first) ||
    /^export\s+KEELSON_SESSION_ID\s*=/.test(first) ||
    /^env\s+.*KEELSON_SESSION_ID\s*=/.test(first) ||
    /^\$env:KEELSON_SESSION_ID\s*=/i.test(first);
}

// Project-local OpenCode plugin. It does one thing: carry the current OpenCode
// session identity into shell commands so Keelson CLI calls resolve the same
// private keelson-runtime/sessions/<key>.json pointer. It never decides work status.
export default async ({ platform = process.platform, env = process.env } = {}) => ({
  'tool.execute.before': async (input, output) => {
    if (String(input?.tool ?? '').toLowerCase() !== 'bash') return;
    const args = output?.args;
    if (!args || typeof args !== 'object') return;
    const key = typeof args.command === 'string' ? 'command' : typeof args.cmd === 'string' ? 'cmd' : null;
    if (!key || !args[key].trim() || alreadyInjected(args[key])) return;
    const raw = lookupSession(input);
    if (!raw) return;
    const opaque = hash(`opencode:${raw}`, 32);
    args[key] = prefix(opaque, platform, env) + args[key];
  },
});
