# Chrome Web Store listing

Copy each field into the developer dashboard. Upload `dist/morning-brief-<version>.zip` from `sh tools/pack.sh`.

## Store listing

**Name**: Morning Brief

**Summary** (132 characters max):
Start every day caught up. Claude reads your email, calendar, Slack and more, and writes one calm page each morning.

**Category**: Productivity → Workflow & Planning

**Language**: English. Add Arabic as a second language with the text below.

**Description (English)**:

Morning Brief writes one calm page every weekday morning, so you start the day already caught up.

Claude reads the apps you've connected to your Claude account (Gmail, Google Calendar, Slack, Jira, Confluence, GitHub, Linear, Notion and more) and writes:

• Push your work forward: ideas that connect dots across your tools
• Top to-dos: what you owe, most urgent first, tickable
• New updates: messages, email, docs and ticket changes worth knowing, merged by topic
• Your day: today's meetings, with what to prepare
• Important people: who you meet today and what they're waiting on
• Looking ahead: tomorrow, shaped by what you ask it to watch

Ask follow-up questions about your morning, look back at the last 14 briefs, and tell it what was useful so tomorrow's brief gets better.

Each brief opens on a hand-drawn pixel-art scene that follows the hour and the weather. Full English and Arabic, light and dark.

What you need
• A Claude Pro or Max plan
• Claude Code on your Mac or Linux computer
• Node.js
Setup walks you through a one-time helper install that connects the extension to Claude Code. Windows isn't supported yet.

Private by design
• No Morning Brief server, no analytics, no tracking
• Read-only: anything that could send, create or change something is blocked
• Your briefs stay on your computer

Try it first with the sample workspace, without connecting anything.

**Description (Arabic)**:

يكتب لك موجز الصباح صفحة هادئة واحدة كل صباح من أيام العمل، لتبدأ يومك وأنت مُلمّ بكل شيء.

يقرأ Claude التطبيقات التي ربطتها بحسابك في Claude (Gmail وتقويم Google وSlack وJira وConfluence وGitHub وLinear وNotion وغيرها)، ثم يكتب لك:

• خطوات تدفع عملك: أفكار تربط بين أدواتك
• أهم المهام: ما عليك إنجازه، الأكثر إلحاحًا أولًا، مع خانة لتأشيره
• آخر المستجدات: الرسائل والبريد والمستندات وتحديثات المهام التي تهمّك، مجمّعة حسب الموضوع
• يومك: اجتماعات اليوم، وما تحتاج إلى تحضيره لكل منها
• أشخاص مهمّون: من ستقابلهم اليوم، وماذا ينتظرون منك
• نظرة إلى الغد: يوم الغد، كما تطلب منه أن يتابعه

اسأله عن صباحك، وارجع إلى آخر 14 موجزًا، وأخبره بما أفادك ليتحسّن موجز الغد.

يفتح كل موجز على مشهد مرسوم بأسلوب البكسل، يتغيّر مع ساعة اليوم والطقس. بالعربية والإنجليزية كاملًا، بالوضع الفاتح والداكن.

ما تحتاج إليه
• اشتراك Claude Pro أو Max
• Claude Code على جهاز Mac أو Linux
• Node.js
يرشدك الإعداد إلى تثبيت مساعد صغير مرة واحدة يربط الإضافة بـ Claude Code. لا يدعم Windows حاليًا.

خصوصيتك أولًا
• لا خادم لموجز الصباح، ولا تحليلات، ولا تتبّع
• قراءة فقط: يُمنع كل ما قد يرسل شيئًا أو ينشئه أو يغيّره
• تبقى موجزاتك على جهازك

جرّبه أولًا بمساحة العمل التجريبية، دون ربط أي شيء.

**Screenshots** (1280×800): `store/screenshots/`.

**Small promo tile** (440×280): `store/promo-440x280.png`.

## Privacy practices

**Single purpose**:
Writes a daily summary of the user's work apps, using Claude through Claude Code on the user's computer.

**Permission justifications**:
- `storage`: saves the user's settings and their last 14 briefs on their computer.
- `alarms`: starts the brief at the time the user picks.
- `notifications`: tells the user when the brief is ready, or when it needs their attention.
- `nativeMessaging`: talks to the Morning Brief helper, which runs Claude Code on the user's computer to write the brief.
- Host `api.open-meteo.com`, `geocoding-api.open-meteo.com`: looks up the weather for the city the user enters.

**Remote code**: No. All code ships in the package.

**Data usage**. Tick:
- Personally identifiable information: the first name the user enters, used to address the brief
- Personal communications: the email, messages and calendar content Claude summarises in the brief
- Location: the city the user enters, sent to Open-Meteo for the weather

Certify all three:
- Not sold to third parties
- Not used or transferred for purposes unrelated to the single purpose
- Not used or transferred to determine creditworthiness or for lending

**Privacy policy URL**: the public address of `PRIVACY.md`.

## Distribution

- Visibility: Public
- Regions: All regions
- Price: Free
