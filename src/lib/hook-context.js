import crypto from 'node:crypto';
import { readSession, writeSession } from './session.js';
import { activeWorkflow, phaseContext, renderPhaseContext, workflowHint } from './workflow.js';

/** Match the identity exported to each host's CLI tools, without persisting raw IDs. */
export function hookEnvironment(host, input, inherited = process.env) {
  const env = { ...inherited };
  // Codex child events identify the child thread with agent_id; session_id
  // identifies the shared root. Match the child's CODEX_THREAD_ID in shell tools.
  const child = host === 'codex' && typeof input.agent_id === 'string' ? input.agent_id.trim() : '';
  const id = child || (typeof input.session_id === 'string' ? input.session_id.trim() : '');
  if (id) {
    const namespace = host === 'codex' ? 'codex_thread_id' : host;
    env.KEELSON_SESSION_ID = crypto.createHash('sha256').update(`${namespace}:${id}`).digest('hex').slice(0, 32);
  }
  return env;
}

export function sessionContext(root, env, event, host) {
  const session = writeSession(root, {
    source: `${host}-hook`, ...(event === 'SessionStart' ? { injectedContexts: [] } : {}),
  }, env);
  const lines = [workflowHint(root, env)];
  const focus = session?.state.change ?? readSession(root, env).state?.change;
  if (focus) {
    const workflow = activeWorkflow(root, focus, env);
    if (workflow.change) lines.push(renderPhaseContext(phaseContext(root, workflow)));
  }
  return lines.join('\n\n');
}
