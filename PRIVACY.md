# Morning Brief privacy policy

Last updated: 9 November 2026

Morning Brief is a browser extension that writes a daily summary of your work apps. It has no server of its own. The developer never receives, stores or sees your data.

## What the extension handles

- **Your settings**: your first name, language, look, schedule, focus notes and city. They are stored in your browser's extension storage on your computer.
- **Your briefs**: the last 14 briefs, your ticked to-dos and your feedback. They are stored in the same place, on your computer.
- **Your app content**: email, calendar events, chat messages, tickets and documents. The extension never reads these itself. Claude reads them through the connectors you added to your own Claude account, using Claude Code on your computer.

## Where data goes

- **Anthropic (Claude)**: when a brief is written, the extension sends your settings and the instructions for the brief to Claude Code on your computer. Claude Code sends them to Anthropic under your own Claude account. Claude then reads your connected apps through your Claude connectors. [Anthropic's privacy policy](https://www.anthropic.com/legal/privacy) applies to that processing.
- **Open-Meteo**: if you enter a city, it is sent to Open-Meteo to look up the weather. Nothing else is sent.
- **Nowhere else**: no analytics, no advertising, no tracking, and no developer server. Your data is never sold or shared.

## Access is read-only

When Morning Brief runs Claude, it allows only connector tools that read: get, list, search, read, query, find, fetch, look up and view. Tools that could send, create, change or delete anything are blocked. The same goes for the shell, files and web access.

## Your control

- Erase everything from Settings → Privacy & data → Erase everything. Uninstalling the extension does the same.
- Remove the helper by deleting `~/.morning-brief`.
- Manage what Claude can read at [claude.ai/settings/connectors](https://claude.ai/settings/connectors).

## Use of Google user data

Morning Brief does not request access to Google APIs. If you connect Gmail or Google Calendar to Claude, that access is between you, Anthropic and Google.

## Contact

Questions: CONTACT_EMAIL
