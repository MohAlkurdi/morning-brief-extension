// PreToolUse hook for brief runs that read the user's Claude connectors or ChatGPT apps.
// Allows tool search, the structured reply and read-only connector tools; denies everything else.
// Codex lets a call through when a hook crashes, so any failure here still answers "deny".
const reply = (ok, why) => process.stdout.write(JSON.stringify({
  hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: ok ? 'allow' : 'deny', permissionDecisionReason: why },
}));

// ChatGPT apps that reach the open web or change account settings: never part of a brief.
const CODEX_BLOCKED = /^mcp__codex_apps__(search_service|sites|plugin_management|safety_settings|codex_document_control|chatgpt_space|pets)__/;
// Some apps prefix their tools with the app name (slack_read_channel).
const READ = /^(?:[a-z0-9]+_)?(get|list|search|read|query|find|fetch|whoami|lookup|view)(_|$)/i;

try {
  let input = '';
  for await (const chunk of process.stdin) input += chunk;
  const name = String(JSON.parse(input).tool_name ?? '');
  const connector = name.startsWith('mcp__claude_ai_') || (name.startsWith('mcp__codex_apps__') && !CODEX_BLOCKED.test(name));
  // StructuredOutput is how Claude Code's --json-schema returns the brief.
  const ok = name === 'ToolSearch' || name === 'StructuredOutput' || (connector && READ.test(name.split('__').at(-1)));
  reply(ok, ok ? 'Read-only.' : 'Morning Brief only reads.');
} catch {
  reply(false, 'Morning Brief only reads.');
}
