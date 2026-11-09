import { api, today, getSettings, getBrief } from '../js/core.js';
import { appById } from '../js/apps.js';
import { h, $, appIcon, icon } from '../js/ui.js';
import { setLang, t } from '../js/i18n.js';
import { timeOf, weatherOf } from '../js/scene.js';
import { mountScene } from '../js/page-scene.js';
import { pxIcon } from '../js/pixel-icons.js';

const s = await getSettings();
setLang(s.lang);
const brief = s.onboarded && await getBrief();
const { progress } = await api.storage.local.get('progress');
const open = page => { api.tabs.create({ url: api.runtime.getURL(`pages/${page}`) }); window.close(); };

// The scene shows the hour the brief was written, or now if there isn't one yet.
const time = brief ? timeOf(new Date(brief.createdAt)) : timeOf();
mountScene($('.scene'), { scene: s.scene, time, weather: weatherOf(brief?.weather?.icon), maxScale: 2 });
$('.wordmark').replaceChildren(pxIcon('sun', 'mark'), h('span', {}, t('app.name')));
if (s.onboarded) $('.tools').append(h('button', { type: 'button', class: 'tool', title: t('pop.settings'), 'aria-label': t('pop.settings'), onclick: () => open('settings.html') }, icon('settings')));

const hello = s.name ? t(`hello.${time}`, { name: s.name }) : t(`hello.${time}.anon`);
const pop = $('#pop');

if (!s.onboarded) {
  pop.append(
    h('p', { class: 'p-greet' }, t('pop.welcome')),
    h('p', { class: 'p-sub' }, t('pop.welcomeLead')),
    h('div', { class: 'p-actions' }, h('button', { type: 'button', class: 'btn primary', onclick: () => open('welcome.html') }, t('pop.setup'))));
} else if (!brief) {
  const running = progress?.running && progress.date === today();
  pop.append(
    h('p', { class: 'p-greet' }, hello),
    h('p', { class: 'p-sub' }, running ? h('span', { class: 'p-writing' }, h('span', { class: 'dots', 'aria-hidden': 'true' }, h('i'), h('i'), h('i')), t('pop.writing')) : t('pop.blank')),
    h('div', { class: 'p-actions' }, h('button', { type: 'button', class: 'btn primary', onclick: () => open('brief.html') }, running ? t('pop.watch') : t('pop.writeNow'))));
} else {
  const sec = brief.sections;
  const now = new Date().getHours() * 60 + new Date().getMinutes();
  const mins = x => { const [a, b] = (x ?? '').split(':').map(Number); return a * 60 + (b || 0); };
  const next = [...sec.day].sort((a, b) => mins(a.start) - mins(b.start)).find(m => m.start && mins(m.end || m.start) > now);
  const left = sec.todos.filter((_, i) => !brief.done[i]).length;
  const todos = sec.todos.map((x, i) => ({ ...x, i })).filter(x => !brief.done[x.i]).slice(0, 3);
  pop.append(...[
    h('p', { class: 'p-greet' }, hello),
    h('p', { class: 'p-head', dir: 'auto' }, sec.headline),
    next && h('h2', { class: 'p-label' }, t('pop.next')),
    next && h('div', { class: 'p-next' }, h('time', { class: 'num' }, next.start), h('span', {}, h('b', { dir: 'auto' }, next.title), next.where && h('span', { class: 'muted' }, h('bdi', {}, next.where)))),
    todos.length > 0 && h('h2', { class: 'p-label' }, t('pop.todo'), h('span', { class: 'num' }, t('pop.left', { n: left }))),
    todos.length > 0 && h('ul', { class: 'p-list' }, todos.map(x => {
      const a = appById(x.source);
      return h('li', {}, a ? appIcon(a, 'xs') : h('span', { class: 'app-icon xs blank' }), h('span', { dir: 'auto' }, x.title));
    })),
    h('div', { class: 'p-actions' }, h('button', { type: 'button', class: 'btn primary', onclick: () => open('brief.html') }, t('pop.open'))),
  ].filter(Boolean));
}
