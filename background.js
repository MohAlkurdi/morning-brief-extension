import { api, getSettings, getBrief, nextRun, isDueToday } from './js/core.js';
import { generate } from './js/generate.js';
import { t } from './js/i18n.js';

const page = name => api.runtime.getURL(`pages/${name}.html`);
const openBrief = () => api.tabs.create({ url: page('brief') });

async function schedule() {
  const s = await getSettings();
  await api.alarms.clear('brief');
  const when = s.onboarded && nextRun(s.schedule);
  if (when) api.alarms.create('brief', { when: when.getTime() });
}

async function runScheduled() {
  const s = await getSettings();
  if (!s.onboarded || !isDueToday(s.schedule) || await getBrief()) return;
  try {
    await generate({ interactive: false });
    api.action.setBadgeText({ text: '1' });
    api.action.setBadgeBackgroundColor({ color: '#e8743b' });
    if (s.schedule.open === 'tab') openBrief();
    else api.notifications?.create('ready', {
      type: 'basic', iconUrl: api.runtime.getURL('icons/icon-128.png'),
      title: t('note.readyTitle', {}, s.lang), message: t('note.readyBody', {}, s.lang),
    });
  } catch {
    // The brief page shows the error and a reconnect button; bring the user there.
    api.notifications?.create('failed', {
      type: 'basic', iconUrl: api.runtime.getURL('icons/icon-128.png'),
      title: t('note.failTitle', {}, s.lang), message: t('note.failBody', {}, s.lang),
    });
  }
}

api.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === 'install') api.tabs.create({ url: page('welcome') });
  schedule();
});
api.runtime.onStartup.addListener(() => { schedule(); runScheduled(); });
api.alarms.onAlarm.addListener(() => { schedule(); runScheduled(); });
api.storage.onChanged.addListener(changes => {
  if (changes.settings && JSON.stringify(changes.settings.oldValue?.schedule) !== JSON.stringify(changes.settings.newValue?.schedule)) schedule();
  if (changes.settings && !changes.settings.oldValue?.onboarded && changes.settings.newValue?.onboarded) schedule();
});
api.notifications?.onClicked.addListener(id => { api.notifications.clear(id); openBrief(); });

api.runtime.onMessage.addListener((msg, sender, reply) => {
  if (msg.type !== 'generate') return;
  generate({ interactive: true }).then(() => reply({ ok: true }), e => reply({ ok: false, error: e.message }));
  return true;
});
