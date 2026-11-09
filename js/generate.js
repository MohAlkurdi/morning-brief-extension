import { api, getSettings, getBrief, saveBrief, today } from './core.js';
import { appForConnector } from './apps.js';
import { complete, briefPrompt, gatherPrompt, BRIEF_SCHEMA, ASK_PROMPT, ASK_CONNECTORS, PROVIDERS, ARABIC, NeedsSignIn } from './ai.js';
import { t } from './i18n.js';
import { weather } from './weather.js';
import { DEMO_DATA } from './demo.js';

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function setProgress(patch) {
  const { progress } = await api.storage.local.get('progress');
  await api.storage.local.set({ progress: { ...progress, ...patch } });
}

// Progress callbacks fire without awaiting; queue the read-modify-writes so none is lost.
let queue = Promise.resolve();
function step(id, patch) {
  return queue = queue.then(async () => {
    const { progress } = await api.storage.local.get('progress');
    await setProgress({ steps: progress.steps.map(s => (s.id === id ? { ...s, ...patch } : s)) });
  });
}

function window(lastBrief) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const fallbackHours = start.getDay() === 1 ? 72 : 24;
  const since = lastBrief?.createdAt && Date.now() - lastBrief.createdAt < 4 * 864e5
    ? new Date(lastBrief.createdAt)
    : new Date(Date.now() - fallbackHours * 36e5);
  return { start, end: new Date(start.getTime() + 2 * 864e5), since, hours: Math.ceil((Date.now() - since) / 36e5) };
}

export async function isRunning() {
  const { progress } = await api.storage.local.get('progress');
  return progress?.running && Date.now() - progress.startedAt < 5 * 60e3;
}

export async function generate({ interactive = false } = {}) {
  if (await isRunning()) return;
  const s = await getSettings();
  const demo = s.demo;

  await api.storage.local.set({
    progress: {
      running: true, startedAt: Date.now(), error: null, date: today(),
      steps: [
        { id: 'claude', label: t('work.readingAll', { ai: 'Claude' }, s.lang), state: 'pending' },
        ...(s.city ? [{ id: 'weather', label: t('work.weather', { city: s.city }, s.lang), state: 'pending' }] : []),
        { id: 'write', label: t('work.write', { ai: PROVIDERS[s.ai?.provider]?.label ?? 'AI' }, s.lang), state: 'pending' },
      ],
    },
  });

  // Chrome stops an idle service worker after 30s; extension API calls reset that timer
  // while the model call is in flight.
  const keepAlive = setInterval(() => api.runtime.getPlatformInfo(), 20_000);
  try {
    if (!s.ai) throw new NeedsSignIn('Choose an AI in Settings first.');

    const previous = await getBrief(new Date(Date.now() - 864e5).toLocaleDateString('en-CA'));
    const ctx = { ...window(previous), interactive };
    const data = demo ? DEMO_DATA : {};

    let forecast = null;
    if (s.city) {
      await step('weather', { state: 'active' });
      forecast = await weather(s.city, s.lang).catch(() => null);
      await step('weather', { state: forecast ? 'done' : 'error', note: forecast ? '' : t('work.unavailable', {}, s.lang) });
    }

    const used = new Set();
    let writing = false;
    const startWriting = async () => {
      if (writing) return;
      writing = true;
      await step('claude', { state: 'done', note: [...used].join(', ') });
      await step('write', { state: 'active' });
    };
    await step('claude', { state: 'active' });
    if (demo) for (const name of s.accountApps.filter(c => c.connected).map(c => c.name)) { used.add(name); await step('claude', { note: `Reading ${name}` }); await sleep(700); }
    let last = 0;
    const text = await complete({
      system: briefPrompt(s) + gatherPrompt(ctx.since.toString()),
      schema: BRIEF_SCHEMA,
      onTool: app => { used.add(app); if (!writing) step('claude', { note: `Reading ${app}` }); },
      input: JSON.stringify({
        now: new Date().toString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        user: s.name,
        weather: forecast,
        guidanceForLookingAhead: s.guidance,
        feedbackOnYesterdaysBrief: previous?.feedback ?? null,
        data,
      }),
      onDelta: text => { startWriting(); if (text.length - last > 600) { last = text.length; step('write', { note: t('work.words', { n: Math.round(text.length / 6) }, s.lang) }); } },
    });
    await startWriting();
    if (!demo && !used.size) {
      const message = t('work.noReads', { ai: 'Claude' }, s.lang);
      await step('claude', { state: 'error', note: '' });
      throw new Error(message);
    }
    await step('write', { state: 'done', note: '' });

    const brief = {
      date: today(), createdAt: Date.now(), provider: s.ai.provider, model: s.ai.model ?? null,
      sections: JSON.parse(text), weather: forecast, data, done: {}, feedback: null,
      apps: [...new Set([...used].map(appForConnector).filter(Boolean))],
      connectors: [...used],
    };
    await saveBrief(brief);
    await setProgress({ running: false, error: null, finishedAt: Date.now() });
    return brief;
  } catch (e) {
    await setProgress({ running: false, error: e.message, needsSignIn: e instanceof NeedsSignIn });
    throw e;
  } finally {
    clearInterval(keepAlive);
  }
}

export async function ask(brief, question, onDelta) {
  const s = await getSettings();
  return complete({
    system: ASK_PROMPT + ASK_CONNECTORS + (s.lang === 'ar' ? `\n${ARABIC}` : ''),
    input: `${JSON.stringify({ now: new Date().toString(), brief: brief.sections, data: brief.data })}\n\nQUESTION: ${question}`,
    onDelta,
  });
}
