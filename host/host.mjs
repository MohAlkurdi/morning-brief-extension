// Native messaging host: lets the extension run prompts through the user's own Claude Code or Codex login.
// The CLIs do the authentication; this process never reads their credentials.
import { spawn, execFile } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const BIN = { claude: process.env.CLAUDE_BIN || 'claude', codex: process.env.CODEX_BIN || 'codex' };
const GUARD = `"${process.execPath}" "${join(import.meta.dirname, 'guard.mjs')}"`;

function send(msg) {
  const body = Buffer.from(JSON.stringify(msg));
  const head = Buffer.alloc(4);
  head.writeUInt32LE(body.length);
  process.stdout.write(Buffer.concat([head, body]));
}

let buf = Buffer.alloc(0);
let child = null;
process.stdin.on('data', chunk => {
  buf = Buffer.concat([buf, chunk]);
  while (buf.length >= 4 && buf.length >= 4 + buf.readUInt32LE(0)) {
    const len = buf.readUInt32LE(0);
    const msg = JSON.parse(buf.subarray(4, 4 + len).toString());
    buf = buf.subarray(4 + len);
    handle(msg);
  }
});
process.stdin.on('end', () => { child?.kill(); process.exit(0); });

function handle(msg) {
  const codex = msg.engine === 'codex';
  if (msg.type === 'status') return codex ? codexStatus() : claudeStatus();
  if (msg.type === 'complete') return codex ? codexComplete(msg) : claudeComplete(msg);
  send({ type: 'error', message: `Unknown request: ${msg.type}` });
}

const run = (bin, args, timeout) => new Promise(resolve =>
  execFile(bin, args, { timeout, cwd: tmpdir() }, (err, stdout, stderr) => resolve({ err, out: `${stdout ?? ''}${stderr ?? ''}` })));

const titleCase = s => s.replace(/_+/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).replace(/^Github$/, 'GitHub');

// Turns a CLI's line-delimited JSON output into calls, one parsed event per line.
function lines(stream, onEvent) {
  let rest = '';
  stream.setEncoding('utf8').on('data', chunk => {
    rest += chunk;
    let i;
    while ((i = rest.indexOf('\n')) >= 0) {
      const raw = rest.slice(0, i);
      rest = rest.slice(i + 1);
      try { if (raw.trim()) onEvent(JSON.parse(raw)); } catch {}
    }
  });
}

function start(bin, args, input, { onEvent, onClose, cwd = tmpdir() }) {
  let stderr = '';
  child = spawn(bin, args, { cwd, stdio: ['pipe', 'pipe', 'pipe'] });
  child.stdin.end(input);
  lines(child.stdout, onEvent);
  child.stderr.setEncoding('utf8').on('data', c => { stderr += c; });
  child.on('error', err => onClose({ error: `Couldn't start ${bin}: ${err.message}` }));
  child.on('close', code => { child = null; onClose({ code, stderr }); });
}

// ---------- Claude Code ----------

async function claudeStatus() {
  const [auth, mcp] = await Promise.all([run(BIN.claude, ['auth', 'status', '--json'], 20_000), run(BIN.claude, ['mcp', 'list'], 60_000)]);
  let s = null;
  try { s = JSON.parse(auth.out); } catch {}
  if (!s) return send({ type: 'status', installed: !auth.err || auth.err.code !== 'ENOENT', loggedIn: false, message: auth.err?.message });
  // Lines look like "claude.ai Slack: https://mcp.slack.com/mcp - ✔ Connected"
  const connectors = [...mcp.out.matchAll(/^claude\.ai (.+?): \S+ - (.+)$/gm)]
    .map(([, name, state]) => ({ name, connected: /connected/i.test(state) && !/needs|fail/i.test(state) }));
  send({ type: 'status', installed: true, loggedIn: !!s.loggedIn, plan: s.subscriptionType ?? null, connectors });
}

function claudeComplete({ system, input, schema, model, connectors }) {
  if (model && !/^claude-[\w.-]+$/.test(model)) return send({ type: 'error', message: `Invalid model: ${model}` });
  const args = [
    '-p', '--output-format', 'stream-json', '--verbose', '--include-partial-messages',
    '--setting-sources', '', '--no-session-persistence',
    // Connectors: read-only claude.ai connectors only. Local settings, plugins and MCP servers stay off,
    // built-in tools are removed, and guard.mjs vets every remaining call. Without: no tools at all.
    ...(connectors
      ? ['--settings', JSON.stringify({ hooks: { PreToolUse: [{ matcher: '.*', hooks: [{ type: 'command', command: GUARD }] }] } }),
        '--disallowedTools', 'Bash,Edit,Write,Read,NotebookEdit,Task,Agent,WebFetch,WebSearch,Skill,Workflow,Artifact,ArtifactData,ArtifactComments',
        '--max-turns', '40']
      : ['--tools', '', '--strict-mcp-config']),
    '--system-prompt', system ?? '',
    ...(model ? ['--model', model] : []),
    ...(schema ? ['--json-schema', JSON.stringify(schema)] : []),
  ];
  let block = null, finished = false;
  start(BIN.claude, args, input ?? '', {
    onEvent: e => {
      if (e.type === 'stream_event' && e.event.type === 'content_block_start') block = e.event.content_block;
      const d = e.type === 'stream_event' && e.event.type === 'content_block_delta' ? e.event.delta : null;
      // With a schema the reply arrives as StructuredOutput tool input; other text and tool input is the model working.
      if (d?.type === 'text_delta' && !schema) send({ type: 'delta', text: d.text });
      else if (d?.type === 'input_json_delta' && d.partial_json && block?.name === 'StructuredOutput') send({ type: 'delta', text: d.partial_json });
      else if (e.type === 'assistant') {
        for (const c of e.message?.content ?? []) {
          if (c.type === 'tool_use' && c.name.startsWith('mcp__claude_ai_')) send({ type: 'tool', app: c.name.split('__')[1].replace(/^claude_ai_/, '').replace(/_/g, ' ') });
        }
      } else if (e.type === 'result') {
        finished = true;
        if (e.is_error) send({ type: 'error', message: e.result || `Claude Code failed (${e.subtype}).`, signIn: /log ?in|auth/i.test(e.result ?? '') });
        else send({ type: 'done', text: e.structured_output ? JSON.stringify(e.structured_output) : e.result });
      }
    },
    onClose: ({ error, code, stderr }) => {
      if (finished) return;
      send({ type: 'error', message: error ?? (stderr.trim().split('\n').pop() || `Claude Code exited with code ${code}.`), signIn: /log ?in|auth/i.test(stderr ?? '') });
    },
  });
}

// ---------- Codex (ChatGPT plan) ----------

async function codexStatus() {
  const { err, out } = await run(BIN.codex, ['login', 'status'], 20_000);
  if (err?.code === 'ENOENT') return send({ type: 'status', installed: false, loggedIn: false, message: err.message });
  send({ type: 'status', installed: true, loggedIn: /logged in using chatgpt/i.test(out), apiKey: /api key/i.test(out) });
}

function codexComplete({ system, input, schema, model, connectors }) {
  if (model && model !== 'default' && !/^[\w.-]+$/.test(model)) return send({ type: 'error', message: `Invalid model: ${model}` });
  const dir = mkdtempSync(join(tmpdir(), 'morning-brief-'));
  if (schema) writeFileSync(join(dir, 'schema.json'), JSON.stringify(schema));
  const args = [
    'exec', '--json', '--ephemeral', '--skip-git-repo-check', '--ignore-user-config', '--ignore-rules', '-s', 'read-only',
    // No shell, web search or sub-agents. Without connectors, every app is switched off too.
    '-c', 'features.shell_tool=false', '-c', 'web_search="disabled"', '-c', 'features.multi_agent=false',
    '-c', 'apps._default.destructive_enabled=false',
    ...(connectors
      // Codex skips hooks it hasn't been told to trust; this one ships with the helper and is passed here, not read from disk config.
      ? ['--dangerously-bypass-hook-trust', '-c', 'features.hooks=true',
        '-c', `hooks.PreToolUse=[{matcher="*",hooks=[{type="command",command=${JSON.stringify(GUARD)},timeout=10}]}]`]
      : ['-c', 'features.apps=false']),
    ...(model && model !== 'default' ? ['-m', model] : []),
    ...(schema ? ['--output-schema', join(dir, 'schema.json')] : []),
    '-',
  ];
  let last = null, failure = null;
  start(BIN.codex, args, `${system ?? ''}\n\n---\n\n${input ?? ''}`, {
    cwd: dir,
    onEvent: e => {
      const it = e.item;
      if (e.type === 'item.started' && it?.type === 'mcp_tool_call') send({ type: 'tool', app: titleCase(String(it.tool).split('.')[0]) });
      else if (e.type === 'item.completed' && it?.type === 'agent_message') { last = it.text; if (!schema) send({ type: 'delta', text: it.text }); }
      else if (e.type === 'turn.failed') failure = e.error?.message ?? 'Codex failed.';
      else if (e.type === 'error') failure = e.message;
    },
    onClose: ({ error, code, stderr }) => {
      rmSync(dir, { recursive: true, force: true });
      const why = error ?? failure ?? (code ? stderr.trim().split('\n').pop() || `Codex exited with code ${code}.` : null);
      if (why || last == null) send({ type: 'error', message: why ?? 'Codex returned no answer.', signIn: /log ?in|auth|401/i.test(why ?? '') });
      else send({ type: 'done', text: last });
    },
  });
}
