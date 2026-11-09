import { api, getSettings, saveSettings, briefDates } from '../js/core.js';
import { h, $, providerCard, aiPanel, routineForm, accountAppsPanel, toast, icon } from '../js/ui.js';
import { sceneStill, SCENES, TIMES, timeOf } from '../js/scene.js';
import { setLang, t, LANGS } from '../js/i18n.js';
import { mountScene } from '../js/page-scene.js';
import { pxIcon } from '../js/pixel-icons.js';

const first = await getSettings();
setLang(first.lang);
document.title = `${t('app.name')} · ${t('set.title')}`;

$('.wordmark').replaceChildren(pxIcon('sun', 'mark'), h('span', {}, t('app.name')));
$('#back').replaceChildren(icon('back'), h('span', { class: 'label' }, t('set.back')));
$('.greeting').textContent = t('set.title');
$('.when').textContent = t('set.sub');
const scene = mountScene($('.scene'), { scene: first.scene, hello: $('.hello'), maxScale: 2 });

const main = $('#main');
const SECTIONS = [['look', 'set.look'], ['ai', 'set.ai'], ['apps', 'set.apps'], ['routine', 'set.routine'], ['data', 'set.data']];
$('.side').setAttribute('aria-label', t('set.nav'));
$('.side').replaceChildren(...SECTIONS.map(([id, key]) => h('a', { href: `#${id}` }, t(key))));

const seg = (options, current, onPick) => h('div', { class: 'segmented', role: 'radiogroup' }, options.map(([value, label]) => h('button', {
  type: 'button', role: 'radio', 'aria-checked': String(value === current), class: value === current ? 'on' : '', lang: value === 'ar' ? 'ar' : null,
  onclick: e => { [...e.currentTarget.parentNode.children].forEach(b => { b.classList.toggle('on', b === e.currentTarget); b.setAttribute('aria-checked', String(b === e.currentTarget)); }); onPick(value); },
}, label)));

const head = (id, key, lead) => [h('h2', {}, t(key)), lead && h('p', { class: 'lead' }, t(lead))];

// The picture at the top of the brief, and the language of the whole extension and of the brief itself.
async function lookSection() {
  const s = await getSettings();
  let pick = s.scene, time = timeOf();
  const tiles = h('div', { class: 'scene-tiles' });
  const draw = () => tiles.replaceChildren(...SCENES.map(name => {
    const c = h('canvas', { 'aria-hidden': 'true' });
    sceneStill(c, { scene: name, time, width: 220 });
    if (document.dir === 'rtl') c.classList.add('flip');
    return h('button', {
      type: 'button', class: `scene-tile${name === pick ? ' selected' : ''}`, 'aria-pressed': String(name === pick),
      onclick: async () => { pick = name; await saveSettings({ scene: name }); scene.set({ scene: name }); draw(); toast(t('set.sceneSaved')); },
    }, c, h('span', {}, t(`scene.${name}`)));
  }));
  draw();
  return h('section', { id: 'look' }, ...head('look', 'set.look', 'set.lookLead'),
    tiles,
    h('div', { class: 'field' }, h('span', {}, t('set.preview')),
      seg(TIMES.map(x => [x, t(`time.${x}`)]), time, v => { time = v; draw(); scene.set({ time: v }); })),
    h('div', { class: 'field' }, h('span', {}, t('set.language')),
      seg(Object.entries(LANGS), s.lang, async v => { await saveSettings({ lang: v }); location.hash = 'look'; location.reload(); })));
}

async function aiSection() {
  const s = await getSettings();
  const slot = h('div', {}, s.ai?.provider ? await aiPanel(s.ai.provider, {}) : null);
  const cards = h('div', { class: 'providers' });
  for (const id of ['claudecode']) {
    const card = providerCard(id, {
      selected: s.ai?.provider === id, badge: t('prov.badge'),
      onPick: async pid => {
        const fresh = await getSettings();
        if (fresh.ai?.provider !== pid) await saveSettings({ ai: null });
        cards.querySelectorAll('.provider').forEach(c => c.classList.toggle('selected', c.dataset.id === pid));
        slot.replaceChildren(await aiPanel(pid, { onReady: () => toast(t('common.saved')) }));
      },
    });
    card.dataset.id = id;
    cards.append(card);
  }
  return h('section', { id: 'ai' }, ...head('ai', 'set.ai', 'set.aiLead'), cards, slot);
}

async function appsSection() {
  const list = h('div', { class: 'panels' });
  list.replaceChildren(await accountAppsPanel({}));
  return h('section', { id: 'apps' }, ...head('apps', 'set.apps', 'set.appsLead'), list);
}

async function routineSection() {
  const s = await getSettings();
  return h('section', { id: 'routine' }, ...head('routine', 'set.routine', 'set.routineLead'), await routineForm(),
    h('h3', {}, t('set.ahead')),
    h('label', { class: 'field' }, h('span', {}, t('set.aheadLabel')),
      h('textarea', { value: s.guidance, placeholder: t('guide.placeholder'), dir: 'auto', onchange: e => saveSettings({ guidance: e.target.value.trim() }) })));
}

async function dataSection() {
  const s = await getSettings();
  const kept = (await briefDates()).length;
  return h('section', { id: 'data' }, ...head('data', 'set.data', 'set.dataLead'),
    h('div', { class: 'switch-row' },
      h('div', {}, h('b', {}, t('set.sample')), h('p', {}, t('set.sampleLead'))),
      h('input', { type: 'checkbox', class: 'switch', checked: s.demo, 'aria-label': t('set.sample'),
        onchange: async e => { await saveSettings({ demo: e.target.checked }); toast(e.target.checked ? t('set.sampleOn') : t('set.sampleOff')); } })),
    h('div', { class: 'switch-row' },
      h('div', {}, h('b', {}, t('set.stored')), h('p', {}, t('set.storedLead', { n: kept }))),
      h('a', { class: 'btn ghost small', href: 'brief.html' }, t('set.read'))),
    h('div', { class: 'switch-row' },
      h('div', {}, h('b', {}, t('set.erase')), h('p', {}, t('set.eraseLead'))),
      h('button', { type: 'button', class: 'btn ghost small danger', onclick: erase }, t('set.eraseBtn'))));
}

async function erase(e) {
  const b = e.currentTarget;
  if (b.dataset.armed !== '1') { b.dataset.armed = '1'; b.textContent = t('set.eraseConfirm'); return; }
  await api.storage.local.clear();
  location.href = 'welcome.html';
}

main.append(await lookSection(), await aiSection(), await appsSection(), await routineSection(), await dataSection());

const links = [...document.querySelectorAll('.side a[href^="#"]')];
const spy = new IntersectionObserver(entries => {
  for (const en of entries) if (en.isIntersecting) links.forEach(a => a.classList.toggle('on', a.hash === `#${en.target.id}`));
}, { rootMargin: '-30% 0px -60% 0px' });
main.querySelectorAll('section').forEach(sec => spy.observe(sec));
if (location.hash) document.querySelector(location.hash)?.scrollIntoView();
