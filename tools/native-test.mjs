import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import { rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ext = fileURLToPath(new URL('..', import.meta.url));
// ENGINE=codex tests the ChatGPT path through Codex; default is Claude Code.
const engine = process.env.ENGINE === 'codex' ? 'codex' : 'claude';
const provider = engine === 'codex' ? 'codex' : 'claudecode';
const [quick, full] = engine === 'codex' ? ['default', 'default'] : ['claude-haiku-5-5', 'claude-sonnet-5-5'];
const profile = '/tmp/mb-native-test/profile';
if (!process.env.SKIP_INSTALL) rmSync('/tmp/mb-native-test', { recursive: true, force: true });
const launch = () => chromium.launchPersistentContext(profile, {
  channel: 'chromium', headless: true, args: [`--disable-extensions-except=${ext}`, `--load-extension=${ext}`],
});

let ctx = await launch();
const sw = ctx.serviceWorkers()[0] ?? await ctx.waitForEvent('serviceworker');
const id = new URL(sw.url()).host;
await ctx.close();

if (!process.env.SKIP_INSTALL) console.log(execFileSync('sh', [`${ext}host/install.sh`, id], {
  env: { ...process.env, MB_DIR: '/tmp/mb-native-test/helper', NATIVE_HOSTS_DIRS: `${profile}/NativeMessagingHosts` },
}).toString());

ctx = await launch();
const page = await ctx.newPage();
await page.goto(`chrome-extension://${id}/pages/settings.html`);
const result = await page.evaluate(async ({ engine, provider, quick }) => {
  const ai = await import('../js/ai.js');
  const core = await import('../js/core.js');
  const status = await ai.helperStatus(engine);
  await core.saveSettings({ demo: false, ai: { provider, model: quick, connectors: false } });
  let deltas = 0;
  const text = await ai.complete({ system: 'Reply in one short sentence.', input: 'Say good morning to Ali.', onDelta: () => deltas++ });
  const json = await ai.complete({
    system: 'Fill the schema.', input: 'Headline for a calm Monday.',
    schema: { type: 'object', properties: { headline: { type: 'string' } }, required: ['headline'], additionalProperties: false },
  });
  return { status: { installed: status.installed, loggedIn: status.loggedIn, plan: status.plan }, text, deltas, json: JSON.parse(json) };
}, { engine, provider, quick });
console.log(JSON.stringify(result, null, 2));

// Full brief written from the user's claude.ai connectors (read-only), like a real morning.
const brief = await page.evaluate(async ({ provider, full }) => {
  const core = await import('../js/core.js');
  const { generate } = await import('../js/generate.js');
  await core.saveSettings({ onboarded: true, name: 'Ali', ai: { provider, model: full }, accountApps: [] });
  const started = Date.now();
  const b = await generate({ interactive: true });
  const { progress } = await core.api.storage.local.get('progress');
  return {
    seconds: Math.round((Date.now() - started) / 1000), connectors: b.connectors, apps: b.apps, headline: b.sections.headline,
    counts: Object.fromEntries(Object.entries(b.sections).filter(([, v]) => Array.isArray(v)).map(([k, v]) => [k, v.length])),
    steps: progress.steps.map(s => `${s.label}: ${s.state}${s.note ? ` (${s.note})` : ''}`),
  };
}, { provider, full });
console.log(JSON.stringify(brief, null, 2));
await page.goto(`chrome-extension://${id}/pages/brief.html`);
await page.setViewportSize({ width: 1280, height: 1600 });
await page.waitForTimeout(1500);
await page.screenshot({ path: `/tmp/mb-native-test/brief-${engine}.png`, fullPage: true });
await ctx.close();
