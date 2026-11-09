// node tools/guard-test.mjs: checks which tool calls host/guard.mjs lets through.
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';

const guard = new URL('../host/guard.mjs', import.meta.url).pathname;
const decide = input => JSON.parse(execFileSync(process.execPath, [guard], { input })).hookSpecificOutput.permissionDecision;
const allow = ['ToolSearch', 'StructuredOutput', 'mcp__claude_ai_Linear__list_issues', 'mcp__claude_ai_Slack__slack_read_channel',
  'mcp__claude_ai_Slack__slack_search_public', 'mcp__codex_apps__github__search_issues', 'mcp__codex_apps__hatif__staging__list_calls'];
const deny = ['Bash', 'Read', 'exec_command', 'apply_patch', 'mcp__rea__read_bytes', 'mcp__claude_ai_Slack__slack_send_message',
  'mcp__claude_ai_Slack__slack_schedule_message', 'mcp__claude_ai_Slack__slack_add_reaction', 'mcp__claude_ai_Linear__save_comment',
  'mcp__codex_apps__github__create_issue', 'mcp__codex_apps__search_service__web_run', 'mcp__codex_apps__sites__list_sites'];
for (const n of allow) assert.equal(decide(JSON.stringify({ tool_name: n })), 'allow', n);
for (const n of deny) assert.equal(decide(JSON.stringify({ tool_name: n })), 'deny', n);
assert.equal(decide('not json'), 'deny');
console.log(`guard ok: ${allow.length} allowed, ${deny.length + 1} denied`);
