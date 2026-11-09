import { api, today, getSettings, saveSettings, getBrief, saveBrief, briefDates } from '../js/core.js';
import { appById, connectorArt } from '../js/apps.js';
import { PROVIDERS, SECTIONS } from '../js/ai.js';
import { ask } from '../js/generate.js';
import { h, $, toast, calm, appIcon, PROVIDER_ART } from '../js/ui.js';
import { setLang, t, locale, isRtl } from '../js/i18n.js';
import { createScene, sceneStill, timeOf, weatherOf, SCENES } from '../js/scene.js';
import { pxIcon } from '../js/pixel-icons.js';

const params = new URLSearchParams(location.search);
const settings = await getSettings();
if (!settings.onboarded) location.replace('welcome.html');
api.action?.setBadgeText({ text: '' });
setLang(params.get('lang') ?? settings.lang);

// Preview any combination with ?scene=cabin&time=night&weather=rain
const preview = { scene: params.get('scene'), time: params.get('time'), weather: params.get('weather') };

let date = params.get('date') ?? today();
let brief = null;
const app = $('#app');
const hero = $('.hero');

// ---------- chrome ----------

$('.wordmark').replaceChildren(pxIcon('sun', 'mark'), h('span', {}, t('app.name')));
$('.stubs').setAttribute('aria-label', t('nav.past'));
const label = (el, icon, text, title) => { el.replaceChildren(pxIcon(icon), h('span', { class: 'label' }, text)); if (title) el.title = title; };
label($('#scene-btn'), 'scene', t('act.scene'), t('act.sceneTitle'));
label($('#copy'), 'copy', t('act.copy'), t('act.copyTitle'));
label($('#regen'), 'rewrite', t('act.rewrite'), t('act.rewriteTitle'));
label($('#settings'), 'settings', t('act.settings'));
$('#question').placeholder = t('ask.placeholder');
$('#question').setAttribute('aria-label', t('ask.label'));
$('#send').textContent = t('ask.send');
$('.ask').prepend(pxIcon('pencil', 'ask-pencil'));

// ---------- the scene ----------

const canvas = $('.scene');
const ground = () => getComputedStyle(document.body).getPropertyValue('--ground').trim();
const sceneName = () => preview.scene ?? settings.scene ?? 'room';
let look = { time: preview.time ?? timeOf(), weather: preview.weather ?? 'clear', clock: { h: new Date().getHours(), m: new Date().getMinutes() } };
document.body.dataset.time = look.time;
const scene = createScene(canvas, { scene: sceneName(), ...look, ground: ground(), seed: 11 });

function setLook(next) {
  look = { ...look, ...next };
  if (preview.time) look.time = preview.time;
  if (preview.weather) look.weather = preview.weather;
  document.body.dataset.time = look.time;
  scene.set({ scene: sceneName(), ...look, ground: ground() });
  requestAnimationFrame(() => {
    const box = $('.hello');
    const over = getComputedStyle(box).position === 'absolute';
    const yMax = over ? Math.ceil((box.offsetTop + box.offsetHeight) * canvas.height / canvas.clientHeight) : 76;
    document.body.dataset.tone = scene.tone(yMax);
  });
}
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => scene.set({ ground: ground() }, { animate: false }));

// ---------- helpers ----------

const day0 = d => new Date(`${d}T12:00`);
const safeLink = url => (/^https?:\/\//.test(url ?? '') ? url : null);
const auto = { dir: 'auto' };
const title = item => safeLink(item.link)
  ? h('a', { class: 'item-title', href: item.link, target: '_blank', rel: 'noopener', ...auto }, item.title)
  : h('span', { class: 'item-title', ...auto }, item.title);
const detail = text => text && h('p', { class: 'detail', ...auto }, text);
const source = id => {
  const a = appById(id);
  return a && h('span', { class: 'src' }, appIcon(a), a.name);
};
const minutes = s => { const [hh, mm] = (s ?? '').split(':').map(Number); return Number.isFinite(hh) ? hh * 60 + (mm || 0) : null; };
const initials = name => name.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
const longDate = d => day0(d).toLocaleDateString(locale(), { weekday: 'long', month: 'long', day: 'numeric' });
const clockTime = d => d.toLocaleTimeString(locale(), { hour: '2-digit', minute: '2-digit' });

function hello(time) {
  const name = settings.name?.trim();
  return name ? t(`hello.${time}`, { name }) : t(`hello.${time}.anon`);
}

function whenLine(d, w) {
  const parts = [longDate(d)];
  if (w) parts.push(t('weather.in', { temp: `\u2066${Math.round(w.now)}${w.unit}\u2069`, label: t(w.label).toLowerCase(), place: w.place }));
  return parts.join(' · ');
}

function setHello(big, small) {
  $('.greeting').textContent = big;
  $('.when').textContent = small ?? '';
}

// ---------- reading ----------

function section(key, body, extra) {
  const items = brief.sections[key] ?? [];
  return h('section', { class: `sec sec-${key}`, id: key, 'aria-labelledby': `${key}-h` },
    h('div', { class: 'sec-head' },
      pxIcon(key, 'sec-icon'),
      h('h2', { id: `${key}-h` }, t(`sec.${key}`)),
      items.length > 1 && h('span', { class: 'count num' }, `${items.length}`)),
    items.length ? body(items) : h('p', { class: 'empty' }, t('empty')),
    extra);
}

function lead() {
  const s = brief.sections;
  const readFrom = (brief.connectors ?? []).map(n => ({ ...connectorArt(n), name: n }));
  const n = readFrom.length;
  return h('section', { class: 'lead-block' },
    h('h1', { class: 'headline', ...auto }, s.headline),
    h('p', { class: 'summary', ...auto }, s.summary),
    h('p', { class: 'byline' },
      h('span', { class: 'stack' }, readFrom.map(a => appIcon(a, 'xs', a.name))),
      t('byline', { ai: PROVIDERS[brief.provider]?.label ?? 'AI', time: clockTime(new Date(brief.createdAt)), apps: n === 1 ? t('byline.apps.one') : t('byline.apps.many', { n }) })));
}

const forward = items => h('ul', { class: 'forward' }, items.map(it =>
  h('li', {}, pxIcon('spark', 'bullet'), h('div', {}, title(it), detail(it.detail), source(it.source)))));

function burst(box) {
  if (calm()) return;
  const r = box.getBoundingClientRect();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2, d = 16 + (i % 2) * 8;
    const p = h('i', { class: 'spark-bit', style: `left:${r.left + r.width / 2}px;top:${r.top + r.height / 2}px;background:${['#ffd27a', '#ff9f8f', '#9fe3c4', '#a9c8ff'][i % 4]}` });
    document.body.append(p);
    p.animate([{ transform: 'translate(-50%,-50%) scale(1)', opacity: 1 }, { transform: `translate(calc(-50% + ${Math.cos(a) * d}px), calc(-50% + ${Math.sin(a) * d}px)) scale(.4)`, opacity: 0 }],
      { duration: 520, easing: 'steps(6, end)' }).finished.then(() => p.remove());
  }
}

const todos = items => h('ul', { class: 'todos' }, items.map((it, i) => {
  const li = h('li', { class: `todo${it.priority === 'high' ? ' high' : ''}${brief.done[i] ? ' done' : ''}` },
    h('label', { class: 'tick' },
      h('input', {
        type: 'checkbox', checked: !!brief.done[i], 'aria-label': t('todo.done', { title: it.title }),
        onchange: async e => {
          brief.done[i] = e.target.checked;
          li.classList.toggle('done', e.target.checked);
          if (e.target.checked) burst(e.target.parentElement);
          await saveBrief(brief);
        },
      }),
      h('span', { class: 'box', 'aria-hidden': 'true' }, pxIcon('check'))),
    h('div', {}, title(it), detail(it.detail),
      h('div', { class: 'meta' },
        (it.due || it.priority === 'high') && h('span', { class: 'due', ...auto }, it.due || t('todo.important')),
        source(it.source))));
  return li;
}));

const updates = items => h('ul', { class: 'updates' }, items.map(it => {
  const a = appById(it.source);
  return h('li', {}, a ? appIcon(a, 'sm') : h('span', { class: 'app-icon sm blank' }), h('div', {}, title(it), detail(it.detail)));
}));

function hours(items) {
  const isToday = brief.date === today();
  const clock = new Date();
  const now = clock.getHours() * 60 + clock.getMinutes();
  const sorted = [...items].sort((a, b) => (minutes(a.start) ?? 0) - (minutes(b.start) ?? 0));
  const nextIdx = isToday ? sorted.findIndex(it => (minutes(it.end) ?? minutes(it.start)) > now) : -1;
  const list = h('ol', { class: 'hours' });
  sorted.forEach((it, i) => {
    if (i === nextIdx && minutes(it.start) > now) list.append(h('li', { class: 'now' }, pxIcon(look.time === 'night' ? 'moon' : 'sun'), h('b', {}, t('day.now')), h('span', { class: 'num' }, clockTime(clock))));
    const past = isToday && (nextIdx === -1 || i < nextIdx);
    list.append(h('li', { class: `slot${past ? ' past' : ''}${i === nextIdx ? ' next' : ''}` },
      h('time', { class: 'num' }, it.start || t('day.allDay'), it.end && h('small', {}, it.end)),
      h('div', {}, title(it), detail(it.detail), it.where && h('p', { class: 'where' }, h('bdi', {}, it.where)))));
  });
  return list;
}

const people = items => h('ul', { class: 'people' }, items.map(it =>
  h('li', {},
    h('span', { class: 'avatar', 'aria-hidden': 'true' }, initials(it.title)),
    h('div', {}, h('b', auto, it.title), it.meeting && h('p', { class: 'meeting', ...auto }, it.meeting), detail(it.detail)))));

const ahead = items => h('ul', { class: 'ahead' }, items.map(it => h('li', {}, title(it), detail(it.detail))));

function guide() {
  const area = h('textarea', {
    id: 'guidance', value: settings.guidance, placeholder: t('guide.placeholder'), rows: 2, dir: 'auto',
    onchange: async e => { settings.guidance = e.target.value.trim(); await saveSettings({ guidance: settings.guidance }); toast(t('guide.saved')); },
  });
  return h('div', { class: 'guide' }, h('label', { for: 'guidance' }, pxIcon('pencil'), t('guide.label')), area);
}

function feedback() {
  const note = h('textarea', { placeholder: t('fb.placeholder'), value: brief.feedback?.note ?? '', hidden: !brief.feedback, rows: 2, dir: 'auto',
    onchange: async e => { brief.feedback = { ...brief.feedback, note: e.target.value.trim() }; await saveBrief(brief); toast(t('fb.thanks')); } });
  const vote = (value, text) => h('button', {
    type: 'button', class: `btn${brief.feedback?.useful === value ? ' on' : ''}`, 'aria-pressed': String(brief.feedback?.useful === value),
    onclick: async e => {
      const picked = e.currentTarget;
      brief.feedback = { ...brief.feedback, useful: value };
      await saveBrief(brief);
      picked.parentElement.querySelectorAll('.btn').forEach(b => { b.classList.toggle('on', b === picked); b.setAttribute('aria-pressed', String(b === picked)); });
      note.hidden = false;
      if (!value) note.focus(); else toast(t('fb.glad'));
    },
  }, text);
  return h('footer', { class: 'feedback' }, h('p', {}, t('fb.question')), h('div', { class: 'votes' }, vote(true, t('fb.yes')), vote(false, t('fb.no'))), note);
}

function renderBrief() {
  const time = timeOf(new Date(brief.createdAt));
  const made = new Date(brief.createdAt);
  document.title = `${t('app.name')} · ${longDate(brief.date)}`;
  delete app.dataset.view;
  delete document.body.dataset.view;
  setLook({ time, weather: weatherOf(brief.weather?.icon), clock: { h: made.getHours(), m: made.getMinutes() } });
  scene.resting();
  setHello(hello(preview.time ?? time), whenLine(brief.date, brief.weather));
  app.replaceChildren(lead(),
    h('div', { class: 'cols' },
      h('div', { class: 'main-col' }, section('pushForward', forward), section('todos', todos), section('updates', updates)),
      h('aside', { class: 'side-col' }, section('day', hours), section('people', people), section('lookingAhead', ahead, brief.date === today() && guide()))),
    feedback());
  $('.ask-wrap').hidden = false;
}

// ---------- writing: the scene lights up as each app is read ----------

let read = new Set();

function workingStep(s) {
  const a = appById(s.id);
  const art = a ?? (s.id === 'weather' ? { color: '#4a7fb5', mark: 'sun' } : PROVIDER_ART.claudecode);
  return h('li', { class: 'step' },
    appIcon(art, 'sm'),
    h('div', { class: 'step-text' }, h('span', { class: 'step-label' }), h('span', { class: 'step-note' }), h('div', { class: 'read' })),
    h('span', { class: 'mark' }));
}

function updateWorking(progress) {
  const steps = progress?.steps ?? [];
  const list = $('.ledger', app);
  for (const s of steps) {
    let li = list.querySelector(`[data-id="${CSS.escape(s.id)}"]`);
    if (!li) { li = workingStep(s); li.dataset.id = s.id; list.append(li); }
    if (li.dataset.state === s.state && li.dataset.note === (s.note ?? '')) continue;
    const was = li.dataset.state;
    li.dataset.state = s.state;
    li.dataset.note = s.note ?? '';
    li.className = `step ${s.state}`;
    $('.step-label', li).textContent = s.label;
    const reading = s.id === 'claude' && /^Reading (.+)/.exec(s.note ?? '');
    $('.step-note', li).textContent = s.state === 'active' && s.note && !reading ? s.note : s.state === 'error' ? (s.note || t('work.failed')) : '';
    if (s.id === 'claude') {
      const names = reading ? [reading[1]] : s.state === 'done' && s.note ? s.note.split(', ') : [];
      for (const name of names.filter(n => n && !read.has(n))) {
        read.add(name);
        $('.read', li).append(h('span', { class: 'read-app' }, appIcon(connectorArt(name), 'xs', name), name));
      }
    }
    const mark = $('.mark', li);
    if (s.state === 'active' && was !== 'active') mark.replaceChildren(h('span', { class: 'dots', 'aria-hidden': 'true' }, h('i'), h('i'), h('i')));
    else if (s.state === 'done' && was !== 'done') mark.replaceChildren(pxIcon('check'), h('span', {}, s.id === 'write' ? t('work.done') : t('work.read')));
    else if (s.state === 'error') mark.replaceChildren(pxIcon('close'));
    else if (s.state === 'pending') mark.replaceChildren();
  }
  // Each finished step turns on more lights in the scene; reading apps count most.
  const share = steps.length ? steps.reduce((n, s) => n + (s.state === 'done' || s.state === 'error' ? 1 : s.state === 'active' ? 0.35 : 0), 0) / steps.length : 0;
  const extra = Math.min(read.size * 0.04, 0.2);
  scene.progress(Math.min(1, share + extra));

  const problem = $('.problem', app);
  setHello(progress?.error ? t('work.errorTitle') : t('work.title'), progress?.error ? t('work.errorLead') : t('work.lead'));
  problem.hidden = !progress?.error;
  if (progress?.error) {
    problem.replaceChildren(h('p', auto, progress.error),
      h('div', { class: 'row' },
        h('button', { type: 'button', class: 'btn primary', onclick: start }, t('work.retry')),
        h('a', { class: 'btn', href: progress.needsSignIn ? 'settings.html#ai' : 'settings.html#apps' }, t('work.openSettings'))));
  }
}

function renderWorking(progress) {
  if (app.dataset.view !== 'working') {
    app.dataset.view = 'working';
    document.body.dataset.view = 'working';
    read = new Set();
    const now = new Date();
    setLook({ time: timeOf(now), weather: 'clear', clock: { h: now.getHours(), m: now.getMinutes() } });
    app.replaceChildren(h('section', { class: 'working' }, h('ol', { class: 'ledger' }), h('div', { class: 'problem', role: 'alert', hidden: true })));
  }
  updateWorking(progress);
  $('.ask-wrap').hidden = true;
}

async function start() {
  delete app.dataset.view;
  renderWorking({ steps: [] });
  const res = await api.runtime.sendMessage({ type: 'generate' });
  if (res && !res.ok) renderWorking((await api.storage.local.get('progress')).progress);
}

api.storage.onChanged.addListener(async (changes, area) => {
  if (area !== 'local') return;
  if (changes.progress && date === today()) {
    const p = changes.progress.newValue;
    if (p.running || p.error) renderWorking(p);
  }
  // A new or rewritten brief (to-dos and feedback keep the same createdAt, so they don't re-render).
  const fresh = changes[`brief:${date}`]?.newValue;
  if (fresh && fresh.createdAt !== brief?.createdAt) {
    brief = fresh;
    renderBrief();
    updateHistory();
  }
  if (changes.settings) {
    const s = changes.settings.newValue;
    if (s.lang !== settings.lang) location.reload();
    if (s.scene !== settings.scene) { settings.scene = s.scene; setLook({}); }
  }
});

// ---------- past briefs, copy, rewrite, scene ----------

async function updateHistory() {
  const dates = await briefDates();
  if (!dates.includes(today())) dates.push(today());
  dates.sort();
  const nav = $('.stubs');
  nav.replaceChildren(...dates.slice(-7).map(d => {
    const day = day0(d);
    return h('button', {
      type: 'button', class: `stub${d === date ? ' on' : ''}`,
      'aria-current': d === date ? 'date' : null, 'aria-label': d === today() ? `${t('nav.today')}, ${longDate(d)}` : longDate(d),
      onclick: () => d !== date && show(d, { from: date }),
    }, h('span', {}, d === today() ? t('nav.today') : day.toLocaleDateString(locale(), { weekday: 'short' })), h('b', { class: 'num' }, String(day.getDate())));
  }));
}

async function show(d, { from } = {}) {
  date = d;
  const url = new URL(location.href);
  url.searchParams.delete('first');
  if (d === today()) url.searchParams.delete('date'); else url.searchParams.set('date', d);
  history.replaceState(null, '', url);
  brief = await getBrief(d);
  $('.answer').hidden = true;
  if (brief) {
    if (from && document.startViewTransition && !calm()) document.startViewTransition(() => renderBrief());
    else renderBrief();
  } else if (d === today()) {
    const { progress } = await api.storage.local.get('progress');
    if (progress?.running && progress.date === today()) renderWorking(progress);
    else start();
  }
  if (from) scrollTo({ top: 0, behavior: calm() ? 'auto' : 'smooth' });
  updateHistory();
}

function asText() {
  const s = brief.sections;
  const lines = [`${t('app.name')} · ${longDate(brief.date)}`, '', s.headline, '', s.summary];
  for (const { key } of SECTIONS) {
    if (!s[key]?.length) continue;
    lines.push('', t(`sec.${key}`).toUpperCase());
    for (const it of s[key]) lines.push(`• ${[it.start, it.title].filter(Boolean).join(' ')}${it.due ? ` (${it.due})` : ''}: ${it.detail}`);
  }
  return lines.join('\n');
}

$('#copy').addEventListener('click', async () => {
  if (!brief) return;
  await navigator.clipboard.writeText(asText());
  toast(t('ask.copied'));
});
$('#regen').addEventListener('click', async () => {
  if (date !== today()) await show(today(), { from: date });
  start();
});

const menu = $('.scene-menu');
function openMenu(open) {
  menu.hidden = !open;
  $('#scene-btn').setAttribute('aria-expanded', String(open));
  if (!open) return;
  menu.replaceChildren(...SCENES.map(name => {
    const c = h('canvas', { 'aria-hidden': 'true' });
    sceneStill(c, { scene: name, time: look.time, weather: look.weather, width: 150, clock: look.clock });
    if (isRtl()) c.classList.add('flip');
    return h('button', {
      type: 'button', role: 'menuitemradio', 'aria-checked': String(name === sceneName()), class: name === sceneName() ? 'on' : '',
      onclick: async () => {
        settings.scene = name;
        preview.scene = null;
        openMenu(false);
        await saveSettings({ scene: name });
        setLook({});
        $('#scene-btn').focus();
      },
    }, c, h('span', {}, t(`scene.${name}`)));
  }));
  menu.querySelector('.on')?.focus();
}
$('#scene-btn').addEventListener('click', e => { e.stopPropagation(); openMenu(menu.hidden); });
document.addEventListener('click', e => { if (!menu.hidden && !menu.contains(e.target)) openMenu(false); });

// ---------- ask ----------

const LIST = /^\s*([-*•]|\d+\.)\s+/;
const inline = text => text.split(/\*\*(.+?)\*\*/g).map((part, i) => (i % 2 ? h('strong', {}, part) : part));

function renderAnswer(el, text) {
  const out = [];
  for (const line of text.trim().split('\n')) {
    if (!line.trim()) continue;
    if (LIST.test(line)) {
      if (out.at(-1)?.tagName !== 'UL') out.push(h('ul'));
      out.at(-1).append(h('li', auto, inline(line.replace(LIST, ''))));
    } else out.push(h('p', auto, inline(line)));
  }
  el.replaceChildren(...out);
}

$('.ask').addEventListener('submit', async e => {
  e.preventDefault();
  const input = $('#question');
  const q = input.value.trim();
  if (!q || !brief) return;
  const box = $('.answer');
  const body = h('div', { class: 'caret' });
  box.replaceChildren(h('p', { class: 'q', ...auto }, q), body);
  box.hidden = false;
  input.value = '';
  $('#send').disabled = true;
  try {
    const text = await ask(brief, q, x => renderAnswer(body, x));
    renderAnswer(body, text);
  } catch (err) {
    body.replaceChildren(h('p', { class: 'form-error' }, err.message));
  } finally {
    body.classList.remove('caret');
    $('#send').disabled = false;
  }
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { $('.answer').hidden = true; if (!menu.hidden) { openMenu(false); $('#scene-btn').focus(); } }
  if (e.key === '/' && document.activeElement === document.body && brief) { e.preventDefault(); $('#question').focus(); }
});

if (isRtl()) canvas.classList.add('flip');
const narrow = matchMedia('(max-width: 720px)');
const placeStubs = () => (narrow.matches ? $('.hello').prepend($('.stubs')) : $('.bar').insertBefore($('.stubs'), $('.tools')));
narrow.addEventListener('change', placeStubs);
placeStubs();
show(date);
