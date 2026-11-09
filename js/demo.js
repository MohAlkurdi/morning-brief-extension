// Sample workspace for "Explore with sample data" and the demo recording. Nothing here leaves the browser.

const sleep = ms => new Promise(r => setTimeout(r, ms));

export const DEMO_DATA = {
  google: {
    email: [
      { from: 'Priya Natarajan <priya@northwind.io>', subject: 'Atlas 2.0 launch — pricing page sign-off needed by noon', snippet: 'Legal approved the copy. I just need your OK on the annual discount before we publish.', unread: true, important: true },
      { from: 'Daniel Okafor <daniel@lumen-capital.com>', subject: 'Q4 board deck — numbers', snippet: 'Can you send the updated retention chart before Thursday? The board wants cohort data.', unread: true, important: true },
      { from: 'Figma <no-reply@figma.com>', subject: 'Maya commented on Onboarding v3', snippet: '"Should the empty state show sample data?"', unread: false },
    ],
    calendar: [
      { title: 'Atlas 2.0 launch stand-up', start: '09:30', end: '09:45', attendees: ['Priya Natarajan', 'Leo Brandt', 'Maya Chen'] },
      { title: '1:1 with Maya', start: '11:00', end: '11:30', attendees: ['Maya Chen'] },
      { title: 'Lumen Capital — investor check-in', start: '14:00', end: '14:45', attendees: ['Daniel Okafor'] },
      { title: 'Focus: retention analysis', start: '15:30', end: '17:00' },
      { title: 'Design review: Onboarding v3 (tomorrow)', start: 'tomorrow 10:00', attendees: ['Maya Chen', 'Leo Brandt'] },
    ],
  },
  slack: {
    directToMe: [
      { channel: 'DM', from: 'Leo Brandt', text: 'Checkout fix is on staging. Can you smoke-test the EU tax path before we merge?' },
      { channel: '#launch-atlas', from: 'Priya Natarajan', text: 'Press embargo lifts Thursday 9:00 CET. We need final screenshots by Wednesday EOD.' },
    ],
    recent: [{ channel: '#support', from: 'Ana', text: '3 enterprise customers asked about SSO for Atlas this week.' }],
  },
  jira: {
    assignedToMe: [
      { key: 'ATL-412', summary: 'Approve pricing page copy', status: 'In review', priority: 'Highest', due: 'today' },
      { key: 'ATL-398', summary: 'Retention cohort chart for board deck', status: 'In progress', priority: 'High', due: 'Thursday' },
    ],
    watchedRecentlyUpdated: [{ key: 'ATL-405', summary: 'EU VAT rounding bug at checkout', status: 'Ready for QA' }],
  },
  github: {
    reviewRequests: [{ title: 'Fix EU VAT rounding in checkout', repo: 'northwind/web' }],
    assigned: [],
  },
};

export const DEMO_BRIEF = {
  headline: 'Launch week: two sign-offs stand between Atlas 2.0 and Thursday.',
  summary: 'Priya needs your pricing approval by noon, and Leo is waiting on you to test the EU checkout fix before it merges. Your afternoon is the investor check-in with Daniel, who will ask for the retention numbers you have not sent yet.',
  pushForward: [
    { title: 'Turn the SSO requests into a launch-week story', detail: 'Three enterprise customers asked about SSO in #support this week. A one-line roadmap mention in Thursday\'s announcement could convert that interest while attention is high.', source: 'slack', link: '' },
    { title: 'Use your 15:30 focus block for the board chart', detail: 'Daniel asked for cohort retention before Thursday and ATL-398 is still in progress. Finishing it today means you walk into the board meeting with nothing outstanding.', source: 'jira', link: '' },
  ],
  todos: [
    { title: 'Approve the Atlas 2.0 pricing page', detail: 'Legal has signed off; Priya only needs your OK on the annual discount.', source: 'google', link: '', priority: 'high', due: 'today 12:00' },
    { title: 'Smoke-test the EU tax path on staging', detail: 'Leo\'s fix for the VAT rounding bug (ATL-405) is waiting on you before it merges. The PR is also in your review queue.', source: 'slack', link: '', priority: 'high', due: 'before stand-up' },
    { title: 'Send Daniel the retention chart', detail: 'He wants cohort data for the Q4 board deck.', source: 'google', link: '', priority: 'normal', due: 'Thursday' },
    { title: 'Answer Maya on the empty state', detail: 'She asked in Figma whether Onboarding v3 should show sample data.', source: 'google', link: '', priority: 'normal', due: '' },
  ],
  updates: [
    { title: 'Press embargo set for Thursday 09:00 CET', detail: 'Final screenshots are due Wednesday end of day, per Priya in #launch-atlas.', source: 'slack', link: '' },
    { title: 'Checkout VAT bug is ready for QA', detail: 'ATL-405 moved to Ready for QA overnight; the matching PR is in northwind/web.', source: 'jira', link: '' },
    { title: 'Enterprise demand for SSO', detail: 'Support logged three separate enterprise asks this week.', source: 'slack', link: '' },
  ],
  day: [
    { title: 'Atlas 2.0 launch stand-up', detail: 'Bring your pricing decision and the staging test result. Both unblock the team.', source: 'google', link: '', start: '09:30', end: '09:45', where: 'Google Meet' },
    { title: '1:1 with Maya', detail: 'Good moment to settle the Onboarding v3 empty-state question before tomorrow\'s design review.', source: 'google', link: '', start: '11:00', end: '11:30', where: '' },
    { title: 'Investor check-in · Lumen Capital', detail: 'Daniel will likely ask about retention. Have the cohort numbers ready even if the chart isn\'t final.', source: 'google', link: '', start: '14:00', end: '14:45', where: 'Zoom' },
    { title: 'Focus: retention analysis', detail: 'Protected time to finish ATL-398.', source: 'google', link: '', start: '15:30', end: '17:00', where: '' },
  ],
  people: [
    { title: 'Daniel Okafor', detail: 'Partner at Lumen Capital and your board observer. Waiting on the retention chart he asked for by email.', source: 'google', link: '', meeting: 'Investor check-in · 14:00' },
    { title: 'Maya Chen', detail: 'Leads design on Onboarding v3. Has an open question for you in Figma and presents at tomorrow\'s review.', source: 'google', link: '', meeting: '1:1 · 11:00' },
    { title: 'Priya Natarajan', detail: 'Running the Atlas 2.0 launch. Blocked on your pricing approval.', source: 'slack', link: '', meeting: 'Launch stand-up · 09:30' },
  ],
  lookingAhead: [
    { title: 'Design review: Onboarding v3 at 10:00', detail: 'Maya and Leo. Decide the empty-state question today so the review can focus on flow.', source: 'google', link: '' },
    { title: 'Launch screenshots due Wednesday', detail: 'One day before the embargo lifts. Worth checking they show the new pricing.', source: 'slack', link: '' },
  ],
};

// The same morning, written in Arabic, for the Arabic interface.
export const DEMO_BRIEF_AR = {
  headline: 'أسبوع الإطلاق: موافقتان فقط تفصلان Atlas 2.0 عن يوم الخميس.',
  summary: 'بريا تنتظر موافقتك على الأسعار قبل الظهر، وليو ينتظرك لاختبار إصلاح الدفع الأوروبي قبل دمجه. وبعد الظهر لقاؤك مع دانيال من المستثمرين، وسيسأل عن أرقام الاحتفاظ بالعملاء التي لم ترسلها بعد.',
  pushForward: [
    { title: 'حوّل طلبات SSO إلى قصة لأسبوع الإطلاق', detail: 'سأل ثلاثة عملاء من الشركات عن SSO في قناة الدعم هذا الأسبوع. سطر واحد عن خارطة الطريق في إعلان الخميس قد يحوّل هذا الاهتمام إلى صفقات.', source: 'slack', link: '' },
    { title: 'استثمر وقت التركيز عند 15:30 في رسم مجلس الإدارة', detail: 'طلب دانيال بيانات الاحتفاظ قبل الخميس، والمهمة ATL-398 ما زالت قيد العمل. إنهاؤها اليوم يعني أن تدخل الاجتماع دون أي شيء معلّق.', source: 'jira', link: '' },
  ],
  todos: [
    { title: 'وافق على صفحة أسعار Atlas 2.0', detail: 'وافق القسم القانوني على النص؛ بريا تحتاج موافقتك على الخصم السنوي فقط.', source: 'google', link: '', priority: 'high', due: 'اليوم 12:00' },
    { title: 'اختبر مسار الضريبة الأوروبية على بيئة التجربة', detail: 'إصلاح ليو لخطأ تقريب الضريبة (ATL-405) ينتظرك قبل الدمج، وطلب الدمج في قائمة مراجعتك أيضًا.', source: 'slack', link: '', priority: 'high', due: 'قبل الاجتماع الصباحي' },
    { title: 'أرسل لدانيال رسم الاحتفاظ بالعملاء', detail: 'يريد بيانات الشرائح لعرض مجلس الإدارة للربع الرابع.', source: 'google', link: '', priority: 'normal', due: 'الخميس' },
    { title: 'أجب مايا عن الحالة الفارغة', detail: 'سألت في Figma إن كان يجب أن تعرض شاشة البداية بيانات تجريبية.', source: 'google', link: '', priority: 'normal', due: '' },
  ],
  updates: [
    { title: 'رفع الحظر الإعلامي الخميس 09:00 بتوقيت وسط أوروبا', detail: 'الصور النهائية مطلوبة مساء الأربعاء، حسب بريا في قناة الإطلاق.', source: 'slack', link: '' },
    { title: 'خطأ ضريبة الدفع جاهز للاختبار', detail: 'انتقلت ATL-405 إلى مرحلة الاختبار خلال الليل، وطلب الدمج المرتبط في northwind/web.', source: 'jira', link: '' },
    { title: 'طلب متزايد على SSO من الشركات', detail: 'سجّل الدعم ثلاثة طلبات منفصلة هذا الأسبوع.', source: 'slack', link: '' },
  ],
  day: [
    { title: 'الاجتماع الصباحي لإطلاق Atlas 2.0', detail: 'أحضر قرارك بشأن الأسعار ونتيجة الاختبار؛ كلاهما يفكّ عُقدة الفريق.', source: 'google', link: '', start: '09:30', end: '09:45', where: 'Google Meet' },
    { title: 'لقاء فردي مع مايا', detail: 'فرصة جيدة لحسم سؤال الحالة الفارغة قبل مراجعة التصميم غدًا.', source: 'google', link: '', start: '11:00', end: '11:30', where: '' },
    { title: 'لقاء المستثمرين · Lumen Capital', detail: 'سيسأل دانيال غالبًا عن الاحتفاظ بالعملاء. جهّز الأرقام حتى لو لم يكتمل الرسم.', source: 'google', link: '', start: '14:00', end: '14:45', where: 'Zoom' },
    { title: 'وقت تركيز: تحليل الاحتفاظ', detail: 'وقت محجوز لإنهاء ATL-398.', source: 'google', link: '', start: '15:30', end: '17:00', where: '' },
  ],
  people: [
    { title: 'دانيال أوكافور', detail: 'شريك في Lumen Capital ومراقب في مجلس إدارتك. ينتظر رسم الاحتفاظ الذي طلبه بالبريد.', source: 'google', link: '', meeting: 'لقاء المستثمرين · 14:00' },
    { title: 'مايا تشين', detail: 'تقود تصميم شاشة البداية v3، ولديها سؤال مفتوح لك في Figma، وتعرض في مراجعة الغد.', source: 'google', link: '', meeting: 'لقاء فردي · 11:00' },
    { title: 'بريا ناتاراجان', detail: 'تدير إطلاق Atlas 2.0، وتنتظر موافقتك على الأسعار.', source: 'slack', link: '', meeting: 'الاجتماع الصباحي · 09:30' },
  ],
  lookingAhead: [
    { title: 'مراجعة تصميم شاشة البداية v3 الساعة 10:00', detail: 'مع مايا وليو. احسم سؤال الحالة الفارغة اليوم لتركّز المراجعة على التدفق.', source: 'google', link: '' },
    { title: 'صور الإطلاق مطلوبة الأربعاء', detail: 'قبل رفع الحظر بيوم. تأكد أنها تُظهر الأسعار الجديدة.', source: 'slack', link: '' },
  ],
};

const ANSWERS_AR = [
  [/دانيال|مستثمر|Lumen|مجلس/i, 'دانيال أوكافور من Lumen Capital هو لقاؤك الساعة **14:00**. طلب بالبريد **رسم الاحتفاظ بالعملاء** قبل اجتماع الخميس، وهو المهمة ATL-398 في Jira وما زالت قيد العمل. وقت التركيز عند 15:30 مناسب لإنهائها، لكن خذ الأرقام الخام معك إلى لقاء 14:00 تحسبًا.'],
  [/عاجل|أولًا|اولا|أبدأ|ابدأ|أولوية/i, 'ابدأ بالأمرين اللذين يعطّلان غيرك:\n\n1. **وافق على صفحة الأسعار**؛ بريا تحتاجها قبل 12:00 (Gmail وATL-412).\n2. **اختبر مسار الضريبة الأوروبية**؛ ليو ينتظر قبل دمج الإصلاح (Slack وGitHub).\n\nكلاهما سريع، وستحتاج نتيجتهما في اجتماع 09:30.'],
];

const ANSWERS = [
  [/daniel|investor|lumen|board/i, 'Daniel Okafor (Lumen Capital) is your 14:00 investor check-in. He emailed asking for the updated **retention cohort chart** before Thursday\'s board meeting — that\'s ATL-398 in Jira, still in progress. Your 15:30 focus block is the natural slot to finish it, but bring the raw cohort numbers to the 14:00 call in case he asks.'],
  [/urgent|first|priority|start/i, 'Start with the two things blocking other people:\n\n1. **Approve the pricing page** — Priya needs it by 12:00 (Gmail, ATL-412).\n2. **Test the EU tax path on staging** — Leo is waiting before he merges the VAT fix (Slack, GitHub).\n\nBoth are quick and you\'ll want answers for the 09:30 stand-up.'],
];

export async function demoStream({ schema, input, onDelta, lang }) {
  await sleep(600);
  const ar = lang === 'ar';
  const question = typeof input === 'string' ? input.split('QUESTION:').pop() : '';
  const text = schema ? JSON.stringify(ar ? DEMO_BRIEF_AR : DEMO_BRIEF)
    : ((ar ? ANSWERS_AR : ANSWERS).find(([re]) => re.test(question))?.[1] ?? (ar
      ? 'في مساحة العمل التجريبية، يدور اليوم حول إطلاق Atlas 2.0: موافقة على الأسعار لبريا قبل الظهر، وإصلاح الدفع من ليو للاختبار، ولقاء دانيال من المستثمرين الساعة 14:00.'
      : 'In the sample workspace, today centres on the Atlas 2.0 launch: a pricing sign-off for Priya by noon, Leo\'s checkout fix to test, and Daniel\'s investor check-in at 14:00.'));
  const step = schema ? 400 : 6;
  let out = '';
  for (let i = 0; i < text.length; i += step) {
    out = text.slice(0, i + step);
    onDelta?.(out);
    await sleep(schema ? 120 : 18);
  }
  return text;
}
