# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Anyone who starts their workday in a browser, technical or not: people whose work is spread across email, calendar, chat and work trackers (Gmail, Google Calendar, Outlook, Slack, Teams, Jira, GitHub, Linear, Notion). They open the brief once, at the start of the day, in a browser tab. Setup must not assume they have used a terminal.

## Product Purpose

Morning Brief is a browser extension (Chrome, Firefox, Safari) that writes one daily summary of everything that happened since you last looked, and what today holds. Success: the person is caught up in a couple of minutes and knows what to do first, without opening each app.

## Positioning

There is no Morning Brief server. The brief is written by the AI plan the person already pays for (Claude through Claude Code, ChatGPT through Codex or Sign in with ChatGPT), or their own API key. With Claude Code or Codex, the AI reads the apps already connected to the person's Claude or ChatGPT account, read-only, so there are no per-app sign-ins.

## Operating Context

- Opened from the toolbar popup, a notification, or automatically in a new tab at a scheduled time on chosen weekdays.
- Generation takes roughly 20 to 70 seconds while the AI reads apps; progress is shown live (which app is being read).
- The brief is kept for 14 days; past briefs are browsable.
- Readers check off to-dos, ask follow-up questions in an Ask bar, leave guidance for tomorrow, and rate the brief.

## Capabilities and Constraints

- Brief sections: headline and summary, Push your work forward, Top to-dos, New updates, Your day (calendar timeline), Important people, Looking ahead (with a guidance field). Weather is optional.
- Surfaces: welcome/onboarding, brief page (including generating and error states), settings, toolbar popup.
- Sample workspace mode simulates sign-ins and data for a tour.
- Extension pages only: no remote code, no external fonts or scripts unless bundled. Must work in Chrome, Firefox and Safari, light and dark.
- Claude Code / Codex helper still needs a one-time terminal install; the UI must make this as gentle as possible.

## Brand Commitments

Name: Morning Brief. No visual element is binding; the user explicitly said nothing visual is sacred, and asked that it never look like a generic AI app.

## Evidence on Hand

Real briefs generated from real accounts (screenshots in `demo/`). No users, testimonials or metrics exist; do not invent them.

## Product Principles

1. Caught up in two minutes: reading speed beats decoration.
2. Your AI, your data: never imply a server or a company sees the data.
3. Read-only and calm: the product never sends, edits or deletes; the design should feel equally safe.
4. Approachable for non-technical people: plain words, no jargon in the main path.

## Accessibility & Inclusion

Respect prefers-reduced-motion and color-scheme. Keyboard reachable throughout.
