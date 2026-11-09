import { getSettings, saveSettings } from '../js/core.js';
import { connectorArt } from '../js/apps.js';
import { PROVIDERS } from '../js/ai.js';
import { h, $, appIcon, providerCard, aiPanel, routineForm, accountAppsPanel, PROVIDER_ART, icon, weekday } from '../js/ui.js';
import { setLang, t, LANGS } from '../js/i18n.js';
import { SCENES, sceneStill, timeOf } from '../js/scene.js';
import { mountScene } from '../js/page-scene.js';
import { pxIcon } from '../js/pixel-icons.js';

if (new URLSearchParams(location.search).has('demo')) await saveSettings({ demo: true });
const start = await getSettings();
setLang(start.lang);
document.title = t('app.name');

const time = timeOf();
let current = 0;

// ---------- the scene ----------

$('.wordmark').replaceChildren(pxIcon('sun', 'mark'), h('span', {}, t('app.name')));
const scene = mountScene($('.scene'), { scene: start.scene, time, hello: $('.hello') });
const greet = name => { $('.greeting').textContent = name ? t(`hello.${time}`, { name }) : t(`hello.${time}.anon`); scene.retone(); };
greet(start.name);
$('.when').textContent = t('ob.setting');
$('#back').textContent = t('common.back');
$('.demo-banner').textContent = t('ob.demo');

const describeDays = days => days.join() === '1,2,3,4,5' ? t('days.weekdays') : days.length === 7 ? t('days.every') : days.map(d => weekday(d, 'short')).join(document.dir === 'rtl' ? '، ' : ', ');

const seg = (options, current, onPick) => h('div', { class: 'segmented', role: 'radiogroup' }, options.map(([value, label]) => h('button', {
  type: 'button', role: 'radio', 'aria-checked': String(value === current), class: value === current ? 'on' : '', lang: value === 'ar' ? 'ar' : null,
  onclick: e => { [...e.currentTarget.parentNode.children].forEach(b => { b.classList.toggle('on', b === e.currentTarget); b.setAttribute('aria-checked', String(b === e.currentTarget)); }); onPick(value); },
}, label)));

const STEPS = [
  {
    async render() {
      const s = await getSettings();
      const name = h('input', {
        placeholder: t('ob.1.namePlaceholder'), value: s.name, autocomplete: 'given-name', dir: 'auto',
        oninput: e => greet(e.target.value.trim()),
        onchange: e => saveSettings({ name: e.target.value.trim() }),
        onkeydown: e => { if (e.key === 'Enter') $('#next').click(); },
      });
      const tiles = h('div', { class: 'scene-tiles' });
      const drawTiles = sel => tiles.replaceChildren(...SCENES.map(id => {
        const c = h('canvas', { 'aria-hidden': 'true' });
        sceneStill(c, { scene: id, time, width: 220 });
        if (document.dir === 'rtl') c.classList.add('flip');
        return h('button', {
          type: 'button', class: `scene-tile${id === sel ? ' selected' : ''}`, 'aria-pressed': String(id === sel),
          onclick: async () => { await saveSettings({ scene: id }); scene.set({ scene: id }); drawTiles(id); },
        }, c, h('span', {}, t(`scene.${id}`)));
      }));
      drawTiles(s.scene);
      return [
        h('h1', {}, t('ob.1.title')),
        h('p', { class: 'lead' }, t('ob.1.lead')),
        h('div', { class: 'intro' },
          h('div', {},
            h('label', { class: 'field' }, h('span', {}, t('ob.1.name')), name),
            h('div', { class: 'field' }, h('span', {}, t('ob.1.language')),
              seg(Object.entries(LANGS), s.lang, async v => {
                await saveSettings({ lang: v, name: name.value.trim() });
                location.reload();
              })),
            !s.demo && h('p', { class: 'explore' }, `${t('ob.1.looking')} `,
              h('button', { type: 'button', onclick: async () => { await saveSettings({ demo: true, name: name.value.trim() }); go(1); } }, t('ob.1.explore'), icon('forward')))),
          h('div', { class: 'field' }, h('span', {}, t('ob.1.scene')), tiles)),
      ];
    },
    ok: async () => true,
  },
  {
    async render() {
      const s = await getSettings();
      const slot = h('div');
      const cards = h('div', { class: 'providers' });
      const pick = async id => {
        await saveSettings({ ai: s.ai?.provider === id ? s.ai : null });
        cards.querySelectorAll('.provider').forEach(c => c.classList.toggle('selected', c.dataset.id === id));
        slot.replaceChildren(await aiPanel(id, { onReady: refresh }));
        refresh();
      };
      for (const id of ['claudecode']) {
        const card = providerCard(id, { selected: s.ai?.provider === id, onPick: pick, badge: t('prov.badge') });
        card.dataset.id = id;
        cards.append(card);
      }
      if (s.ai?.provider) slot.append(await aiPanel(s.ai.provider, { onReady: refresh }));
      return [h('h1', {}, t('ob.2.title')), h('p', { class: 'lead' }, t('ob.2.lead')), cards, slot];
    },
    ok: async () => !!(await getSettings()).ai?.model,
  },
  {
    async render() {
      return [
        h('h1', {}, t('ob.3.title')),
        h('p', { class: 'lead' }, t('ob.3.knows', { ai: 'Claude' })),
        await accountAppsPanel({ onChange: refresh }),
      ];
    },
    ok: async () => (await getSettings()).accountApps.some(c => c.connected),
  },
  {
    async render() {
      return [h('h1', {}, t('ob.4.title')), h('p', { class: 'lead' }, t('ob.4.lead')), await routineForm()];
    },
    ok: async () => (await getSettings()).schedule.days.length > 0,
  },
  {
    next: () => t('ob.5.go'),
    async render() {
      const s = await getSettings();
      const row = (k, ...kids) => h('div', { class: 'summary-row' }, h('span', { class: 'k' }, k), ...kids);
      return [
        h('h1', {}, s.name ? t('ob.5.title', { name: s.name }) : t('ob.5.titleAnon')),
        h('p', { class: 'lead' }, t('ob.5.lead', { time: s.schedule.time, days: describeDays(s.schedule.days) })),
        h('div', { class: 'summary' },
          row(t('ob.5.by'), appIcon(PROVIDER_ART[s.ai.provider], 'sm'), h('b', {}, PROVIDERS[s.ai.provider].label), h('span', { class: 'muted' }, s.ai.model)),
          row(t('ob.5.reads'), h('span', { class: 'stack' }, s.accountApps.filter(c => c.connected).map(c => appIcon(connectorArt(c.name), 'sm', c.name))), h('span', { class: 'muted' }, t('ob.5.yourClaude'))),
          row(t('ob.5.arrives'), h('b', { class: 'num' }, `${describeDays(s.schedule.days)} · ${s.schedule.time}`), h('span', { class: 'muted' }, s.schedule.open === 'tab' ? t('ob.5.tab') : t('ob.5.notify')))),
      ];
    },
    ok: async () => true,
    async finish() {
      await saveSettings({ onboarded: true });
      location.href = 'brief.html?first=1';
    },
  },
];

async function refresh() {
  $('#next').disabled = !(await STEPS[current].ok());
}

// Each finished step switches on more of the scene's lights; the last step lights all of them.
async function go(i) {
  const forwards = i > current;
  current = i;
  const s = await getSettings();
  const kids = (await STEPS[i].render()).filter(Boolean);
  $('.demo-banner').hidden = !s.demo;
  $('.bar-note').textContent = t('ob.step', { i: i + 1, n: STEPS.length });
  const step = $('#step');
  step.className = `step-${i + 1}`;
  step.replaceChildren(...kids);
  scene.progress(i / (STEPS.length - 1));
  if (forwards) window.scrollTo({ top: 0 });
  $('#back').style.visibility = i ? 'visible' : 'hidden';
  $('#next').textContent = STEPS[i].next?.() ?? t('common.continue');
  await refresh();
}

$('#back').addEventListener('click', () => go(current - 1));
$('#next').addEventListener('click', async () => {
  document.activeElement?.blur();
  if (current === 0) await saveSettings({ name: $('#step input').value.trim() });
  if (STEPS[current].finish) return STEPS[current].finish();
  go(current + 1);
});

go(current);
