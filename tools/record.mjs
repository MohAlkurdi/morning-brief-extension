import { chromium } from 'playwright';
import { rmSync, mkdirSync, readdirSync, renameSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ext = fileURLToPath(new URL('..', import.meta.url));
const out = fileURLToPath(new URL('../demo/out/', import.meta.url));
const profile = fileURLToPath(new URL('../demo/out/profile', import.meta.url));
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
const W = 1440, H = 900;
const shots = process.argv.includes('--shots');

const ctx = await chromium.launchPersistentContext(profile, {
  channel: 'chromium', headless: true, viewport: { width: W, height: H },
  recordVideo: shots ? undefined : { dir: out, size: { width: W, height: H } },
  args: [`--disable-extensions-except=${ext}`, `--load-extension=${ext}`],
});
const sw = ctx.serviceWorkers()[0] ?? await ctx.waitForEvent('serviceworker');
const id = new URL(sw.url()).host;
const url = p => `chrome-extension://${id}/pages/${p}`;
const errors = [];
// The page clock is pinned to 08:04; shift the service worker's clock to match so "Written at" agrees.
const target = new Date(); target.setHours(8, 3, 0, 0);
await sw.evaluate(t => {
  const Real = Date, off = t - Real.now();
  globalThis.Date = class extends Real {
    constructor(...a) { super(...(a.length ? a : [Real.now() + off])); }
    static now() { return Real.now() + off; }
  };
}, target.getTime());

// Close the welcome tab the extension opens on install; we drive our own page.
await new Promise(r => setTimeout(r, 800));
for (const p of ctx.pages()) await p.close();
const page = await ctx.newPage();
page.on('pageerror', e => errors.push(`pageerror ${e.message}`));
page.on('console', m => m.type() === 'error' && errors.push(`console ${m.text()}`));
const t = new Date(); t.setHours(8, 4, 0, 0);
await page.clock.setFixedTime(t);

const wait = ms => page.waitForTimeout(ms);
let n = 0;
const shot = async name => shots && page.screenshot({ path: `${out}${String(++n).padStart(2, '0')}-${name}.png`, fullPage: false });

async function overlay() {
  await page.evaluate(() => {
    if (document.getElementById('__cur')) return;
    const st = document.createElement('style');
    st.textContent = `#__cur{position:fixed;z-index:99999;left:0;top:0;width:22px;height:22px;pointer-events:none;transition:transform .05s linear}
#__cur svg{filter:drop-shadow(0 2px 3px rgb(0 0 0/.35))}
#__cur.down::after{content:"";position:absolute;left:-12px;top:-12px;width:24px;height:24px;border-radius:50%;background:rgb(239 125 60/.35);animation:__p .4s ease-out}
@keyframes __p{from{transform:scale(.3);opacity:1}to{transform:scale(1.6);opacity:0}}
#__cap{position:fixed;z-index:99998;left:50%;top:18px;transform:translateX(-50%);max-width:880px;padding:14px 24px;border-radius:14px;background:rgb(24 18 14/.86);color:#fff;font:500 19px/1.4 -apple-system,system-ui,sans-serif;text-align:center;backdrop-filter:blur(8px);box-shadow:0 14px 40px -10px rgb(0 0 0/.5);transition:opacity .35s;pointer-events:none}
#__cap:empty{opacity:0}#__cap b{color:#f5b54f}`;
    document.documentElement.append(st);
    const c = document.createElement('div'); c.id = '__cur';
    c.innerHTML = '<svg width="22" height="22" viewBox="0 0 22 22"><path d="M3 2l15 8-6.5 1.6L8.5 18z" fill="#fff" stroke="#111" stroke-width="1.4" stroke-linejoin="round"/></svg>';
    document.documentElement.append(c);
    const cap = document.createElement('div'); cap.id = '__cap';
    document.documentElement.append(cap);
    addEventListener('mousemove', e => { c.style.transform = `translate(${e.clientX - 3}px,${e.clientY - 2}px)`; }, true);
    addEventListener('mousedown', () => { c.classList.remove('down'); void c.offsetWidth; c.classList.add('down'); }, true);
    const pos = window.__lastPos; if (pos) c.style.transform = `translate(${pos[0] - 3}px,${pos[1] - 2}px)`;
  });
  await page.mouse.move(mouse.x, mouse.y);
}
const mouse = { x: W / 2, y: H / 2 };
async function caption(html) { await overlay(); await page.evaluate(h => { document.getElementById('__cap').innerHTML = h; }, html); }
async function go(p) { await page.goto(url(p)); await page.waitForLoadState('networkidle'); await overlay(); }
async function moveTo(loc) {
  await loc.scrollIntoViewIfNeeded();
  const b = await loc.boundingBox();
  const x = b.x + Math.min(b.width / 2, 60), y = b.y + b.height / 2;
  await page.mouse.move(x, y, { steps: 22 });
  mouse.x = x; mouse.y = y;
  await wait(180);
}
async function click(loc) { await moveTo(loc); await loc.click(); await wait(350); }
async function type(loc, text) { await click(loc); await loc.pressSequentially(text, { delay: 55 }); }
async function scrollTo(y, steps = 30) {
  const from = await page.evaluate(() => scrollY);
  for (let i = 1; i <= steps; i++) { await page.evaluate(v => scrollTo(0, v), from + (y - from) * (1 - (1 - i / steps) ** 3)); await wait(16); }
}

// 1. Welcome
await go('welcome.html?demo=1');
await caption('After install, <b>Morning Brief</b> opens a short setup. This tour uses a sample workspace.');
await wait(2600); await shot('welcome');
await type(page.locator('#step input'), 'Ali');
await wait(900);
await caption('The greeting over the scene already uses your name.');
await wait(1800);
await click(page.locator('.scene-tile').nth(1));
await caption('Pick the place your brief opens on. The scene follows the hour it was written.');
await wait(2200);
await click(page.locator('#next'));

// 2. AI
await caption('Next, connect Claude. <b>Claude Code</b> writes your brief on the Claude plan you already pay for.');
await wait(1800); await shot('ai');
await click(page.locator('.provider[data-id="claudecode"]'));
await click(page.getByRole('button', { name: /Check connection/ }));
await page.locator('#next:not([disabled])').waitFor();
await wait(800);
await caption('Connected through Claude Code on this computer. Morning Brief never sees your Claude sign-in.');
await wait(2200); await shot('ai-done');
await click(page.locator('#next'));

// 3. Apps
await caption('Claude reads the apps already connected to your Claude account. Nothing is ever sent or changed.');
await page.locator('#next:not([disabled])').waitFor();
await wait(2200); await shot('apps-done');
await scrollTo(0);
await click(page.locator('#next'));

// 4. Routine
await caption('When it arrives, how long it is, and what it should care about.');
await wait(1500);
await click(page.locator('.segmented button', { hasText: 'Standard' }));
await type(page.locator('.routine textarea'), 'Anything from customers or my manager first. Launch week for Atlas 2.0.');
await type(page.locator('.routine input').last(), 'Riyadh');
await page.locator('.routine input').last().blur();
await wait(700); await shot('routine');
await click(page.locator('#next'));

// 5. Done
await caption('All set. From now on it\'s waiting every weekday at 08:00.');
await wait(2600); await shot('done');
await click(page.locator('#next'));

// 6. Generating
await page.waitForURL(/brief\.html/);
await overlay();
await caption('Your first brief: a light comes on in the scene for every app it reads.');
await page.locator('.step').first().waitFor();
await wait(1600); await shot('generating');
await page.locator('.lead-block').waitFor({ timeout: 60000 });
await overlay();

// 7. Brief
await caption('Good morning. One calm page: the headline, the summary, and everything below it.');
await wait(3200); await shot('brief');
await scrollTo(380, 50);
await caption('<b>Push your work forward</b>: ideas that connect dots across your tools.');
await wait(2600);
await scrollTo(760, 40);
await caption('<b>Top to-dos</b>, most urgent first. Tick them off as you go.');
await wait(800);
await click(page.locator('.todo input').nth(0));
await click(page.locator('.todo input').nth(1));
await wait(1200); await shot('todos');
await caption('<b>Your day</b>, annotated with what to prepare, and the <b>people</b> you\'ll meet.');
await moveTo(page.locator('#day'));
await wait(2800);
await moveTo(page.locator('#people'));
await wait(2400);
await caption('<b>Looking ahead</b>: tell tomorrow\'s brief what to look out for.');
await type(page.locator('#guidance'), 'Prep notes for the board meeting');
await page.locator('#guidance').blur();
await wait(1800); await shot('ahead');
await caption('Ask anything about your morning.');
await type(page.locator('#question'), 'What should I do first?');
await click(page.locator('#send'));
await page.locator('.answer .caret').waitFor({ state: 'detached', timeout: 30000 });
await wait(3200); await shot('ask');
await page.keyboard.press('Escape');
await caption('Rate it, and tomorrow\'s brief adjusts.');
await click(page.getByRole('button', { name: /Yes/ }));
await wait(1500);

// 8. Popup
await go('popup.html');
await page.addStyleTag({ content: 'html{min-height:100vh;background:linear-gradient(#2b2440,#b8645a 70%,#f2a35e);display:flex;justify-content:flex-end;align-items:flex-start;padding:24px 40px}body{border-radius:14px;box-shadow:0 30px 70px -20px rgb(0 0 0/.6);background:var(--ground);overflow:hidden}' });
await caption('The toolbar button shows what\'s next at a glance.');
await wait(3400); await shot('popup');

// 9. Settings
await go('settings.html');
await caption('Everything can be changed later in Settings.');
await wait(1500); await shot('settings');
await scrollTo(1100, 60);
await wait(1200);
await scrollTo(2600, 60);
await wait(1800);
await caption('');
await wait(400);

const video = page.video();
await ctx.close();
if (video) renameSync(await video.path(), `${out}journey.webm`);
console.log(errors.length ? `ERRORS:\n${errors.join('\n')}` : 'no page errors');
