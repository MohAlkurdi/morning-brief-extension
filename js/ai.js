import { api, getSettings } from './core.js';
import { NATIVE_HOST } from './config.js';
import { demoStream } from './demo.js';

export class NeedsSignIn extends Error {}

export const PROVIDERS = {
  claudecode: { label: 'Claude Code', sub: 'Uses your Claude plan and your Claude connectors' },
};

export const CLAUDE_MODELS = [
  { id: 'claude-opus-5-5', label: 'Claude Opus 5.5 — best briefs' },
  { id: 'claude-sonnet-5-5', label: 'Claude Sonnet 5.5 — faster, cheaper' },
  { id: 'claude-haiku-5-5', label: 'Claude Haiku 5.5 — fastest' },
];

// Talks to host/host.mjs over native messaging. Claude Code on this computer signs in and runs the prompt.
function nativeRequest(message, onMessage) {
  return new Promise((resolve, reject) => {
    let port;
    try { port = api.runtime.connectNative(NATIVE_HOST); } catch (e) { return reject(new NeedsSignIn(`The Morning Brief helper isn't installed. ${e.message}`)); }
    let settled = false;
    const settle = (fn, v) => { if (settled) return; settled = true; port.disconnect(); fn(v); };
    port.onMessage.addListener(m => onMessage(m, v => settle(resolve, v), e => settle(reject, e)));
    port.onDisconnect.addListener(p => {
      const why = p?.error?.message ?? api.runtime.lastError?.message;
      if (!settled) { settled = true; reject(new NeedsSignIn(`The Morning Brief helper isn't installed or stopped${why ? ` (${why})` : ''}. Install it from Settings, then try again.`)); }
    });
    port.postMessage(message);
  });
}

export const helperStatus = () => nativeRequest({ type: 'status', engine: 'claude' }, (m, ok) => m.type === 'status' && ok(m));

export async function complete({ system, input, schema, onDelta, onTool }) {
  const { ai, demo, lang } = await getSettings();
  if (demo) return demoStream({ system, input, schema, onDelta, lang });
  if (ai?.provider !== 'claudecode') throw new NeedsSignIn('Connect Claude in Settings first.');
  let text = '';
  return nativeRequest({ type: 'complete', engine: 'claude', system, input, schema, model: ai.model, connectors: true }, (m, ok, fail) => {
    if (m.type === 'tool') onTool?.(m.app);
    else if (m.type === 'delta') onDelta?.(text += m.text);
    else if (m.type === 'done') ok(m.text);
    else if (m.type === 'error') fail(m.signIn ? new NeedsSignIn('Claude Code isn\'t signed in. Run "claude auth login", then try again.') : new Error(`Claude Code: ${m.message}`));
  });
}

const item = extra => ({
  type: 'object',
  additionalProperties: false,
  required: ['title', 'detail', 'source', 'link', ...Object.keys(extra)],
  properties: {
    title: { type: 'string' },
    detail: { type: 'string' },
    source: { type: 'string', description: 'App id the item came from: google, microsoft, slack, jira, confluence, github, linear, notion, or weather' },
    link: { type: 'string', description: 'A URL copied from the input data, or an empty string' },
    ...extra,
  },
});
const list = extra => ({ type: 'array', items: item(extra) });
const str = description => ({ type: 'string', description });

export const BRIEF_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['headline', 'summary', 'pushForward', 'todos', 'updates', 'day', 'people', 'lookingAhead'],
  properties: {
    headline: str('One short, specific line that captures the day. No greeting.'),
    summary: str('Two or three sentences: what matters most today and why.'),
    pushForward: list({}),
    todos: list({ priority: { type: 'string', enum: ['high', 'normal'] }, due: str('Short due hint like "today 3pm" or empty') }),
    updates: list({}),
    day: list({ start: str('HH:MM in the user timezone, or "All day"'), end: str('HH:MM or empty'), where: str('Room, link label or empty') }),
    people: list({ meeting: str('Which meeting today, with time') }),
    lookingAhead: list({}),
  },
};

export const SECTIONS = [
  { key: 'pushForward', title: 'Push your work forward', hint: '2–3 proactive, strategic suggestions that connect dots across tools — things worth doing that nobody asked for yet' },
  { key: 'todos', title: 'Top to-dos', hint: 'concrete actions owed by the user, most urgent first; mark high priority sparingly' },
  { key: 'updates', title: 'New updates', hint: 'a digest of the messages, emails, docs and changes worth knowing about, merged by topic' },
  { key: 'day', title: 'Your day', hint: "today's meetings in time order; detail says what it's about and what to prepare, drawn from the other tools" },
  { key: 'people', title: 'Important people', hint: "people the user meets today worth a note: who they are, recent threads with them, what they're waiting on" },
  { key: 'lookingAhead', title: 'Looking ahead', hint: "tomorrow's meetings, deadlines and prep, shaped by the user's guidance" },
];

const LENGTH = {
  short: 'Keep it very short: at most 3 items per section and one sentence per detail.',
  standard: 'Keep it skimmable: at most 5 items per section and one or two sentences per detail.',
  detailed: 'Be thorough: up to 8 items per section, with useful context in each detail.',
};

export function briefPrompt(settings) {
  return `You write ${settings.name || 'the user'}'s Morning Brief: a calm, sharp summary of their work tools so they start the day already caught up.

Rules:
- Only state what the data supports. Never invent people, meetings, tasks or numbers. Leave a section empty when nothing fits.
- Merge related items across tools into one (an email, Slack thread and Jira issue about the same launch are one update).
- Skip newsletters, automated notifications, marketing and noise.
- Write like a trusted chief of staff: specific, warm, no filler, no exclamation marks. Use names.
- Copy links only from the data. Set "source" to the app id the item came from.
- Times are in the user's timezone, 24-hour HH:MM.
- ${LENGTH[settings.length] ?? LENGTH.standard}
${settings.lang === 'ar' ? `- ${ARABIC}` : ''}
${settings.focus ? `- The user wants the brief to care about: ${settings.focus}` : ''}

Sections:
${SECTIONS.map(s => `- ${s.key}: ${s.hint}`).join('\n')}`;
}

export const gatherPrompt = since => `

Before writing, gather the data yourself with your connector tools (find them with ToolSearch). Always read your sources first; never write the brief from nothing. You can only read; never try to send, create or change anything.
- Cover everything since ${since}, plus today's and tomorrow's calendar.
- Use every connected source that fits: email, calendar, chat DMs and mentions, issues and tickets assigned to the user, docs they're involved in.
- Make a few targeted calls per source, not dozens. If a source fails or has nothing, skip it silently. Never write that something is missing, empty or "didn't come through" (no calendar, no email): just leave that section empty.
- Set "source" to the closest of: google, microsoft, slack, jira, confluence, github, linear, notion. Otherwise use the connector's name in lowercase.
Then return the brief.`;

export const ASK_CONNECTORS = `\nYou can also look things up with your read-only connector tools (find them with ToolSearch) when the brief doesn't answer the question.`;

export const ARABIC = 'Write every text field in Arabic (clear Modern Standard Arabic, warm and natural). Keep people\'s names, product names and ticket keys as they appear in the data. Use Western digits for times and numbers.';

export const ASK_PROMPT = `You answer questions about the user's morning using their brief and the raw data it was written from.
Answer in a few sentences or a short list. Be specific and cite which app something came from. If the data doesn't say, say so.`;
