// Screenshots every surface with a seeded sample brief: desktop and phone, light and dark.
// node tools/shots.mjs [outDir] [only-name-substring]
import { chromium } from 'playwright';
import { rmSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ext = fileURLToPath(new URL('..', import.meta.url));
const out = process.argv[2] ?? fileURLToPath(new URL('../.impeccable/review/', import.meta.url));
const only = process.argv[3] ?? '';
const profile = `${out}/.profile`;
rmSync(profile, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

const ctx = await chromium.launchPersistentContext(profile, {
  channel: 'chromium', headless: true, args: [`--disable-extensions-except=${ext}`, `--load-extension=${ext}`],
});
const sw = ctx.serviceWorkers()[0] ?? await ctx.waitForEvent('serviceworker');
const id = new URL(sw.url()).host;
const url = p => `chrome-extension://${id}/pages/${p}`;
await new Promise(r => setTimeout(r, 800));
for (const p of ctx.pages()) await p.close();

const errors = [];
const page = await ctx.newPage();
page.on('pageerror', e => errors.push(`pageerror ${e.message}`));
page.on('console', m => m.type() === 'error' && errors.push(`console ${m.text()}`));
const t = new Date(); t.setHours(8, 4, 0, 0);
await page.clock.setFixedTime(t);

async function seed({ brief = true, yesterday = true, progress = null, onboarded = true, lang = 'en' } = {}) {
  await page.goto(url('popup.html'));
  await page.evaluate(async ({ brief, yesterday, progress, onboarded, lang }) => {
    const { DEMO_BRIEF: EN, DEMO_BRIEF_AR } = await import('../js/demo.js');
    const DEMO_BRIEF = lang === 'ar' ? DEMO_BRIEF_AR : EN;
    const day = n => { const d = new Date(); d.setDate(d.getDate() + n); return d.toLocaleDateString('en-CA'); };
    const make = (date, headline) => ({
      date, createdAt: new Date(`${date}T08:03`).getTime(), provider: 'claudecode', model: 'claude-opus-5-5',
      sections: { ...DEMO_BRIEF, headline: headline ?? DEMO_BRIEF.headline }, weather: { place: lang === 'ar' ? 'الرياض' : 'Riyadh', now: 21, unit: '°C', label: 'Clear', icon: 'sun', today: { high: 29, low: 17 } },
      data: {}, done: { 1: true }, feedback: null, apps: ['google', 'slack', 'jira', 'github'], connectors: ['Gmail', 'Slack', 'Atlassian', 'GitHub'],
    });
    await chrome.storage.local.clear();
    const store = {
      settings: { onboarded, demo: true, name: lang === 'ar' ? 'الكردي' : 'Alkurdi', ai: { provider: 'claudecode', model: 'claude-opus-5-5' },
        schedule: { time: '08:00', days: [0, 1, 2, 3, 4], open: 'tab' }, length: 'standard', focus: '', city: 'Riyadh', guidance: '', lang, accountApps: ['Gmail', 'Google Calendar', 'Slack', 'Linear'].map(name => ({ name, connected: true })) },
      briefDates: [],
    };
    for (const [n, on] of [[-3, true], [-2, true], [-1, yesterday], [0, brief]]) {
      if (!on) continue;
      const b = make(day(n), n ? 'Quiet Thursday: the pricing draft went to legal and the board date moved.' : undefined);
      store[`brief:${b.date}`] = b;
      store.briefDates.unshift(b.date);
    }
    if (progress) store.progress = { date: day(0), ...progress };
    await chrome.storage.local.set(store);
  }, { brief, yesterday, progress, onboarded, lang });
}

const VIEWS = [['desktop', 1440, 900], ['phone', 390, 844]];
async function snap(name, page_, prep, { full = false, views = VIEWS, schemes = ['light', 'dark'], after } = {}) {
  if (only && !name.includes(only)) return;
  for (const scheme of schemes) for (const [v, w, hgt] of views) {
    await page.setViewportSize({ width: w, height: hgt });
    await page.emulateMedia({ colorScheme: scheme });
    await prep?.();
    await page.goto(url(page_));
    await page.waitForTimeout(1600);
    await after?.();
    await page.screenshot({ path: `${out}/${name}-${v}-${scheme}.png`, fullPage: full });
  }
}

// Chrome Web Store screenshots: node shots.mjs ../store/screenshots store
if (only === 'store') {
  await page.setViewportSize({ width: 1280, height: 800 });
  const shot = async (name, page_, opts, after) => {
    await seed(opts);
    await page.goto(url(page_));
    await page.waitForTimeout(1600);
    await after?.();
    await page.evaluate(() => document.querySelector('.demo-banner')?.setAttribute('hidden', ''));
    await page.screenshot({ path: `${out}/${name}.png` });
  };
  const next = async n => { for (let k = 0; k < n; k++) { await page.click('#next'); await page.waitForTimeout(1500); } };
  for (const lang of ['en', 'ar']) {
    const ar = lang === 'ar';
    await shot(`${lang}-1-brief`, 'brief.html', { lang });
    await shot(`${lang}-2-todos`, 'brief.html', { lang }, () => page.evaluate(() => document.querySelector('#todos-h, h2:nth-of-type(2)')?.scrollIntoView()));
    await shot(`${lang}-3-writing`, 'brief.html', { lang, brief: false, progress: { running: true, steps: [
      { id: 'claude', label: ar ? 'Claude يقرأ تطبيقاتك المرتبطة' : 'Claude reads your connected apps', state: 'active', note: 'Reading Slack' },
      { id: 'weather', label: ar ? 'نتحقق من الطقس في الرياض' : 'Checking the weather in Riyadh', state: 'pending' },
      { id: 'write', label: ar ? 'نكتب موجزك مع Claude Code' : 'Writing your brief with Claude Code', state: 'pending' },
    ] } });
    await shot(`${lang}-4-setup`, 'welcome.html', { lang, onboarded: false }, () => next(2));
    await shot(`${lang}-5-look`, 'welcome.html', { lang, onboarded: false });
  }
  // The promo tile is drawn over the popup page, whose own scene loop then errors on the cleared canvas.
  const seen = errors.length;
  await page.setViewportSize({ width: 440, height: 280 });
  await page.goto(url('popup.html'));
  await page.evaluate(async () => {
    const { sceneStill } = await import('../js/scene.js');
    document.body.innerHTML = '';
    document.body.style.cssText = 'margin:0;width:440px;height:280px;overflow:hidden;position:relative';
    const c = document.createElement('canvas');
    sceneStill(c, { scene: 'room', time: 'morning', width: 220 });
    c.style.cssText = 'position:absolute;left:50%;bottom:0;height:280px;transform:translateX(-50%);image-rendering:pixelated';
    const title = document.createElement('div');
    title.textContent = 'Morning Brief';
    title.style.cssText = 'position:absolute;left:24px;bottom:20px;font:700 34px/1 Display, serif;color:#f6efe2;letter-spacing:-0.01em;text-shadow:0 2px 0 #3d2a1e';
    document.body.append(c, title);
    await document.fonts.ready;
  });
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${out}/../promo-440x280.png` });
  errors.length = seen;
  await ctx.close();
  rmSync(profile, { recursive: true, force: true });
  console.log(errors.length ? errors.join('\n') : 'no page errors');
  process.exit(0);
}

const steps = [
  { id: 'claude', label: 'Claude reads your connected apps', state: 'active', note: 'Reading Slack' },
  { id: 'weather', label: 'Checking the weather in Riyadh', state: 'pending' },
  { id: 'write', label: 'Writing your brief with Claude Code', state: 'pending' },
];
await snap('brief', 'brief.html', () => seed(), { full: true });
await snap('working', 'brief.html', () => seed({ brief: false, progress: { running: true, steps } }));
await snap('error', 'brief.html', () => seed({ brief: false, progress: { running: false, error: 'Claude Code isn\'t signed in. Run "claude auth login", then try again.', needsSignIn: true, steps: steps.map(s => ({ ...s, state: s.state === 'active' ? 'error' : s.state, note: s.state === 'active' ? 'Needs reconnecting' : '' })) } }), { views: [VIEWS[0]], schemes: ['light'] });

for (let i = 0; i < 5; i++) {
  await snap(`welcome-${i + 1}`, 'welcome.html', () => seed({ onboarded: false }), {
    after: async () => { for (let k = 0; k < i; k++) { await page.click('#next'); await page.waitForTimeout(1500); } },
  });
}
await snap('settings', 'settings.html', () => seed(), { full: true });
await snap('popup', 'popup.html', () => seed(), { views: [['popup', 360, 600]] });
await snap('popup-empty', 'popup.html', () => seed({ brief: false, progress: { running: true, steps } }), { views: [['popup', 360, 600]], schemes: ['light'] });

await ctx.close();
rmSync(profile, { recursive: true, force: true });
console.log(errors.length ? errors.join('\n') : 'no page errors');
