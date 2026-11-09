export const api = globalThis.browser ?? globalThis.chrome;

export const today = (d = new Date()) => d.toLocaleDateString('en-CA');

export const DEFAULTS = {
  onboarded: false,
  demo: false, // sample workspace: simulated sign-ins and canned data
  name: '',
  ai: null, // { provider: 'claudecode', model }
  accountApps: [], // connectors on the Claude account, as last reported by Claude Code: [{ name, connected }]
  schedule: { time: '08:00', days: [1, 2, 3, 4, 5], open: 'tab' },
  length: 'standard',
  focus: '',
  city: '',
  guidance: '',
  lang: 'en', // 'en' | 'ar': the brief page and the brief itself
  scene: 'room', // picture at the top of the brief: room | rooftop | cabin | town
};

export async function getSettings() {
  const { settings } = await api.storage.local.get('settings');
  return { ...DEFAULTS, ...settings };
}

export async function saveSettings(patch) {
  const next = { ...(await getSettings()), ...patch };
  await api.storage.local.set({ settings: next });
  return next;
}

const KEEP_BRIEFS = 14;

export async function getBrief(date = today()) {
  const key = `brief:${date}`;
  return (await api.storage.local.get(key))[key];
}

export async function saveBrief(brief) {
  const { briefDates = [] } = await api.storage.local.get('briefDates');
  const dates = [...new Set([brief.date, ...briefDates])].sort().reverse();
  await api.storage.local.set({ [`brief:${brief.date}`]: brief, briefDates: dates.slice(0, KEEP_BRIEFS) });
  await api.storage.local.remove(dates.slice(KEEP_BRIEFS).map(d => `brief:${d}`));
}

export async function briefDates() {
  return (await api.storage.local.get('briefDates')).briefDates ?? [];
}

export function nextRun(schedule, from = new Date()) {
  const [h, m] = schedule.time.split(':').map(Number);
  for (let i = 0; i < 8; i++) {
    const d = new Date(from);
    d.setDate(d.getDate() + i);
    d.setHours(h, m, 0, 0);
    if (d > from && schedule.days.includes(d.getDay())) return d;
  }
  return null;
}

export function isDueToday(schedule, now = new Date()) {
  const [h, m] = schedule.time.split(':').map(Number);
  return schedule.days.includes(now.getDay()) && now.getHours() * 60 + now.getMinutes() >= h * 60 + m;
}
