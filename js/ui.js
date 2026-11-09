import { api, getSettings, saveSettings } from './core.js';
import { CLAUDE_MODELS, PROVIDERS, helperStatus } from './ai.js';
import { connectorArt } from './apps.js';
import { t, tn, locale, isRtl } from './i18n.js';
import { pxIcon } from './pixel-icons.js';

export function h(tag, props, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props ?? {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'style') el.style.cssText = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k in el) el[k] = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  el.append(...kids.flat(Infinity).filter(k => k != null && k !== false));
  return el;
}

export const $ = (s, root = document) => root.querySelector(s);
const sleep = ms => new Promise(r => setTimeout(r, ms));
export const calm = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

// Icons are 9×9 pixel glyphs (js/pixel-icons.js). In right-to-left pages, arrows point the other way.
export function icon(name, cls = '') {
  const flip = isRtl() && (name === 'forward' || name === 'back');
  return pxIcon(flip ? (name === 'forward' ? 'back' : 'forward') : name, `icon ${cls}`.trim());
}

const pickMark = () => h('span', { class: 'pick-mark', 'aria-hidden': 'true' }, icon('check'));

// App marks: a drawn pixel icon on the app's colour, chosen by what the app is for.
const MARKS = { google: 'mail', microsoft: 'mail', slack: 'hash', jira: 'ticket', confluence: 'doc', github: 'branch', linear: 'ring', notion: 'doc' };
function markKey(art, name = '') {
  if (/calendar/i.test(name)) return 'calendar';
  if (/teams/i.test(name)) return 'updates';
  if (/drive|docs/i.test(name)) return 'doc';
  return art?.mark ?? MARKS[art?.id] ?? 'spark';
}
export const appIcon = (app, size = '', name = app?.name) =>
  h('span', { class: `app-icon ${size}`, style: `--c:${app.color}`, 'aria-hidden': 'true' }, pxIcon(markKey(app, name)));

export function toast(text) {
  const el = $('.toast') ?? document.body.appendChild(h('div', { class: 'toast', role: 'status' }));
  el.textContent = text;
  el.classList.add('show');
  clearTimeout(el.timer);
  el.timer = setTimeout(() => el.classList.remove('show'), 2600);
}

async function busy(button, label, fn) {
  const original = button.textContent;
  button.disabled = true;
  button.textContent = label;
  try { return await fn(); } finally { button.disabled = false; button.textContent = original; }
}

const errorLine = () => h('p', { class: 'form-error', role: 'alert' });

// ---------- AI provider ----------

export const PROVIDER_ART = { claudecode: { color: '#c96442', glyph: 'CC', mark: 'spark' } };

export function providerCard(id, { selected, onPick, badge }) {
  const p = PROVIDERS[id];
  return h('button', { type: 'button', class: `provider${selected ? ' selected' : ''}`, onclick: () => onPick(id), 'aria-pressed': String(!!selected) },
    appIcon({ ...PROVIDER_ART[id] }, 'lg'),
    h('span', { class: 'provider-text' }, h('b', {}, p.label), h('span', { class: 'muted' }, t(`prov.${id}`))),
    badge && h('span', { class: 'badge' }, badge),
    pickMark());
}

const PLAN = { max: 'Claude Max', pro: 'Claude Pro', team: 'Claude Team', enterprise: 'Claude Enterprise' };
const HELPER_FILE = 'morning-brief-helper.sh';

// One self-contained script carrying the helper files packaged with the extension, so users need no copy of the repo.
async function downloadHelper() {
  const read = async name => (await fetch(api.runtime.getURL(`host/${name}`))).text();
  const put = async name => {
    const body = await read(name);
    return `cat > "$D/${name}" <<'MORNING_BRIEF_EOF'\n${body.endsWith('\n') ? body : `${body}\n`}MORNING_BRIEF_EOF\n`;
  };
  const files = (await Promise.all(['host.mjs', 'guard.mjs', 'install.sh'].map(put))).join('');
  const script = `#!/bin/sh\n# Installs the Morning Brief helper. Run: sh ${HELPER_FILE}\nset -e\nD=$(mktemp -d)\n${files}sh "$D/install.sh" ${api.runtime.id}\nrm -rf "$D"\n`;
  const url = URL.createObjectURL(new Blob([script], { type: 'text/x-sh' }));
  h('a', { href: url, download: HELPER_FILE }).click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export async function aiPanel(provider, { onReady }) {
  const s = await getSettings();
  const err = errorLine();
  const ready = async model => {
    const cur = (await getSettings()).ai;
    await saveSettings({ ai: { ...(cur?.provider === provider ? cur : {}), provider, model } });
    onReady?.();
  };
  const modelSelect = current => h('label', { class: 'field' }, h('span', {}, t('ai.model')),
    h('select', { onchange: e => ready(e.target.value) }, CLAUDE_MODELS.map(m => h('option', { value: m.id, selected: m.id === current }, t(m.label)))));
  const copy = text => h('div', { class: 'copy-line' }, h('code', {}, text),
    h('button', { type: 'button', class: 'btn ghost small', onclick: async () => { await navigator.clipboard.writeText(text); toast(t('common.copied')); } }, t('ai.cli.copy')));

  const box = h('div', { class: 'ai-panel' });
  const render = (status, model) => {
    const connected = status?.loggedIn;
    box.replaceChildren(...[
      h('p', { class: 'muted' }, t('ai.cli.claudecode')),
      !connected && h('ol', { class: 'steps-help' },
        h('li', {}, tn('ai.cli.step1', { name: h('a', { href: 'https://claude.com/claude-code', target: '_blank', rel: 'noopener' }, 'Claude Code'), login: h('code', {}, 'claude auth login') })),
        h('li', {}, t('ai.cli.step2'),
          h('div', { class: 'row' }, h('button', { type: 'button', class: 'btn ghost small', onclick: downloadHelper }, t('ai.cli.download'))),
          copy(`sh ~/Downloads/${HELPER_FILE}`)),
        h('li', {}, t('ai.cli.step3'))),
      connected
        ? h('div', { class: 'signed-in' }, h('span', { class: 'chip ok' }, icon('check'), `${t('common.connected')}${PLAN[status.plan] ? ` · ${PLAN[status.plan]}` : ''}`))
        : h('div', { class: 'row' }, h('button', { type: 'button', class: 'btn primary small', onclick: e => busy(e.currentTarget, t('common.checking'), check) }, t('ai.cli.check'))),
      connected && modelSelect(model),
      err].filter(Boolean));
  };
  const check = async () => {
    err.textContent = '';
    try {
      const status = s.demo ? (await sleep(900), DEMO_STATUS) : await helperStatus();
      if (!status.installed) throw new Error(t('ai.err.notFound', { name: 'Claude Code', more: status.message ?? '' }));
      if (!status.loggedIn) throw new Error(t('ai.err.notSignedIn', { name: 'Claude Code', login: 'claude auth login' }));
      const model = s.ai?.provider === provider && s.ai.model ? s.ai.model : CLAUDE_MODELS[0].id;
      await saveSettings({ accountApps: status.connectors ?? [] });
      render(status, model);
      await ready(model);
    } catch (e) { err.textContent = e.message; }
  };
  render(null);
  if (s.ai?.provider === provider) check();
  return box;
}

// ---------- apps ----------

const DEMO_STATUS = { installed: true, loggedIn: true, plan: 'max',
  connectors: ['Gmail', 'Google Calendar', 'Slack', 'Atlassian', 'GitHub', 'Linear'].map(name => ({ name, connected: true })) };

// The connectors on the user's Claude account: Claude reads these, so Morning Brief has no app sign-ins of its own.
export async function accountAppsPanel({ onChange }) {
  const box = h('div', { class: 'ai-panel claude-apps' });
  const err = errorLine();
  const draw = async () => {
    const s = await getSettings();
    const refresh = async () => {
      err.textContent = '';
      try {
        const status = s.demo ? (await sleep(700), DEMO_STATUS) : await helperStatus();
        await saveSettings({ accountApps: status.connectors ?? [] });
        await draw();
        onChange?.();
      } catch (e) { err.textContent = e.message; }
    };
    const apps = s.accountApps;
    box.replaceChildren(...[
      h('p', {}, h('b', {}, t('acct.reads', { account: 'Claude' })), t('acct.about', { account: 'Claude' })),
      apps.length
        ? h('div', { class: 'connectors' }, apps.map(c => h('span', { class: `connector${c.connected ? '' : ' off'}` },
          appIcon(connectorArt(c.name), 'sm', c.name), c.name, !c.connected && h('span', { class: 'muted' }, ` · ${t('acct.needsSignIn', { account: 'Claude' })}`))))
        : h('p', { class: 'muted' }, t('acct.none')),
      h('div', { class: 'row' },
        h('a', { class: 'btn primary small', href: 'https://claude.ai/settings/connectors', target: '_blank', rel: 'noopener' }, t('acct.add', { account: 'Claude' }), icon('external')),
        h('button', { type: 'button', class: 'btn ghost small', onclick: e => busy(e.currentTarget, t('common.checking'), refresh) }, t('common.refresh'))),
      err,
    ]);
  };
  await draw();
  return box;
}

// ---------- routine ----------

// 1 November 2026 is a Sunday, so day i of that week is weekday i.
export const weekday = (i, style = 'long') => new Date(2026, 10, 1 + i).toLocaleDateString(locale(), { weekday: style });

export async function routineForm() {
  const s = await getSettings();
  const save = patch => saveSettings(patch);
  const days = new Set(s.schedule.days);
  const seg = (name, options, current, onPick) => h('div', { class: 'segmented', role: 'radiogroup' },
    options.map(([value, label]) => h('button', {
      type: 'button', role: 'radio', 'aria-checked': String(value === current), class: value === current ? 'on' : '',
      onclick: e => { [...e.currentTarget.parentNode.children].forEach(b => { b.classList.toggle('on', b === e.currentTarget); b.setAttribute('aria-checked', String(b === e.currentTarget)); }); onPick(value); },
    }, label)));

  return h('div', { class: 'routine' },
    h('div', { class: 'routine-row' },
      h('label', { class: 'field' }, h('span', {}, t('rt.readyBy')),
        h('input', { type: 'time', value: s.schedule.time, onchange: async e => save({ schedule: { ...(await getSettings()).schedule, time: e.target.value } }) })),
      h('div', { class: 'field' }, h('span', {}, t('rt.on')),
        h('div', { class: 'days' }, [0, 1, 2, 3, 4, 5, 6].map(i => h('button', {
          type: 'button', class: days.has(i) ? 'on' : '', 'aria-pressed': String(days.has(i)), 'aria-label': weekday(i),
          onclick: async e => {
            days.has(i) ? days.delete(i) : days.add(i);
            e.currentTarget.classList.toggle('on', days.has(i));
            e.currentTarget.setAttribute('aria-pressed', String(days.has(i)));
            await save({ schedule: { ...(await getSettings()).schedule, days: [...days].sort() } });
          },
        }, weekday(i, 'narrow')))))),
    h('div', { class: 'field' }, h('span', {}, t('rt.when')),
      seg('open', [['tab', t('rt.tab')], ['notify', t('rt.notify')]], s.schedule.open,
        async v => save({ schedule: { ...(await getSettings()).schedule, open: v } }))),
    h('div', { class: 'field' }, h('span', {}, t('rt.length')),
      seg('length', [['short', t('rt.short')], ['standard', t('rt.standard')], ['detailed', t('rt.detailed')]], s.length, v => save({ length: v }))),
    h('label', { class: 'field' }, h('span', {}, `${t('rt.focus')} `, h('em', { class: 'muted' }, t('common.optional'))),
      h('textarea', { placeholder: t('rt.focusPlaceholder'), dir: 'auto', value: s.focus, onchange: e => save({ focus: e.target.value }) })),
    h('label', { class: 'field' }, h('span', {}, `${t('rt.city')} `, h('em', { class: 'muted' }, t('common.optional'))),
      h('input', { placeholder: t('rt.cityPlaceholder'), dir: 'auto', value: s.city, onchange: e => save({ city: e.target.value.trim() }) })));
}
