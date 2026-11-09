---
name: Morning Brief
description: A living pixel-art window into the hour your brief was written, then a calm page to read.
colors:
  ground: "#f3f0e8"
  raised: "#fbfaf5"
  raised-2: "#e8e3d6"
  ink: "#1d2531"
  ink-2: "#3f4856"
  muted: "#626974"
  line: "#cfc8b8"
  accent: "#2f6fae"
  accent-ink: "#245a8f"
  accent-wash: "#dce8f3"
  on-accent: "#ffffff"
  dawn-rose: "#b84a68"
  afternoon-amber: "#a8620e"
  evening-ember: "#bf4d33"
  night-indigo: "#5450c4"
  dawn-rose-dark: "#f08aa5"
  morning-sky-dark: "#7db6ee"
  afternoon-amber-dark: "#f0b65a"
  evening-ember-dark: "#ff8a6a"
  night-indigo-dark: "#a7a3ff"
  night-ground-dark: "#0e1120"
  scene-ink-light: "#16202c"
  scene-ink-dark: "#fffaf2"
  scene-chip-light: "rgb(255 255 255 / .62)"
  scene-chip-dark: "rgb(12 10 28 / .38)"
  lamp-gold: "#ffd27a"
typography:
  display:
    fontFamily: "Display, ui-serif, Georgia, serif"
    fontSize: "clamp(36px, 3.9vw, 62px)"
    fontWeight: 700
    lineHeight: 1.04
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Display, ui-serif, Georgia, serif"
    fontSize: "clamp(28px, 3.1vw, 42px)"
    fontWeight: 500
    lineHeight: 1.14
    letterSpacing: "-0.015em"
  title:
    fontFamily: "Display, ui-serif, Georgia, serif"
    fontSize: "25px"
    fontWeight: 500
    lineHeight: 1.15
    letterSpacing: "-0.01em"
  item:
    fontFamily: "Text, ui-sans-serif, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 700
    lineHeight: 1.4
  lead:
    fontFamily: "Text, ui-sans-serif, system-ui, sans-serif"
    fontSize: "19px"
    fontWeight: 400
    lineHeight: 1.65
  body:
    fontFamily: "Text, ui-sans-serif, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Text, ui-sans-serif, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: 1.2
rounded:
  pixel-step: "4px"
  pixel-step-sm: "2px"
spacing:
  gutter: "clamp(16px, 4vw, 56px)"
  row: "15px"
  section: "52px"
  column-gap: "72px"
  reading-max: "780px"
  content-max: "1320px"
  control: "40px"
  tool: "36px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.on-accent}"
    typography: "{typography.item}"
    rounded: "{rounded.pixel-step}"
    padding: "0 16px"
    height: "{spacing.control}"
  button-primary-hover:
    backgroundColor: "{colors.accent-ink}"
    textColor: "{colors.on-accent}"
  button-secondary:
    backgroundColor: "{colors.raised-2}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pixel-step}"
    padding: "0 16px"
    height: "{spacing.control}"
  button-on:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.ground}"
    rounded: "{rounded.pixel-step}"
  scene-tool:
    backgroundColor: "{colors.scene-chip-light}"
    textColor: "{colors.scene-ink-light}"
    rounded: "{rounded.pixel-step}"
    padding: "0 12px"
    height: "{spacing.tool}"
  scene-tool-dark:
    backgroundColor: "{colors.scene-chip-dark}"
    textColor: "{colors.scene-ink-dark}"
    rounded: "{rounded.pixel-step}"
  day-stub-active:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.on-accent}"
    rounded: "{rounded.pixel-step}"
    padding: "6px 8px 7px"
  chip:
    backgroundColor: "{colors.raised-2}"
    textColor: "{colors.ink-2}"
    typography: "{typography.label}"
    rounded: "{rounded.pixel-step-sm}"
    padding: "5px 10px"
  chip-warn:
    backgroundColor: "{colors.accent-wash}"
    textColor: "{colors.accent-ink}"
    rounded: "{rounded.pixel-step-sm}"
  count-badge:
    backgroundColor: "{colors.accent-wash}"
    textColor: "{colors.accent-ink}"
    rounded: "{rounded.pixel-step-sm}"
    padding: "3px 7px"
  field:
    backgroundColor: "{colors.raised}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pixel-step}"
    padding: "11px 13px"
  ask-bar:
    backgroundColor: "{colors.raised}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pixel-step}"
    padding: "6px 6px 6px 14px"
    width: "720px"
  avatar:
    backgroundColor: "{colors.accent-wash}"
    textColor: "{colors.accent-ink}"
    rounded: "{rounded.pixel-step}"
    size: "40px"
  toast:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.ground}"
    rounded: "{rounded.pixel-step}"
    padding: "10px 16px"
---

# Design System: Morning Brief

## Overview

**Creative North Star: "The Window at That Hour"**

The brief opens on a living pixel-art diorama of the hour it was written: one of four places the reader chose (a desk by a window, a Riyadh rooftop, a cabin by a lake, a little town street), at one of five times of day (dawn, morning, afternoon, evening, night), under that day's weather, all drawn in code. The scene is the only picture on the page, and it sets the temperature of everything under it: the page ground, ink and accent are tinted by the same hour, light and dark. Below a Bayer-dither seam the scene melts into a quiet reading page with no cards and no glass, where Thmanyah Serif Display greets and Thmanyah Sans reads.

The world is cozy and exact at once. Every pixel is a whole pixel: the scene renders at a 144-pixel logical height and scales by an integer factor (2×, 3× or 4×, so about 432px tall on a laptop, 288px on a phone) with `image-rendering: pixelated`. The page borrows that grammar instead of decorating with it: corners are stepped in 2px pixels, icons are drawn on a 9×9 grid, rules are dotted 2px pixels, and motion moves in `steps()`. Density is low and the reading column is generous; the scene is the delight, the page is for being caught up in two minutes.

The build refuses the AI-summary defaults: no card dashboard, no cream editorial column, no frosted panels.

**Scope.** Every surface lives in this world: the brief (reading, writing, error), setup, Settings and the toolbar popup. `css/app.css` holds the shared world (fonts, hour tokens, the scene header, every control); each page adds only its own layout (`brief.css`, `welcome.css`, `settings.css`, `popup.css`). Every page opens on the reader's chosen scene through `js/page-scene.js`, and every visible string goes through `js/i18n.js` (English and Arabic, right-to-left).

**Key Characteristics:**
- A crisp code-drawn pixel diorama at the top: 4 scenes × 5 times of day × weather (clear, cloud, rain, snow).
- Page tokens tinted by the hour the brief was written, with a full light and dark set for each hour.
- A Bayer-dither seam (9 rows) melting the scene into the page ground.
- Pixel-stepped clip-path corners, 9×9 pixel icons, dotted 2px pixel rules; no border-radius, no borders.
- Display serif for greeting and headings (Zanjabeel in Arabic), a sans for reading.
- Arabic mirrors the scene; lights in the scene come on one by one as each app is read.

## Colors

The palette is a set of six hour-tinted families (morning is the default at `:root`, the other four override it on `body[data-time]`), each in light and dark, with one accent per hour. Values in the frontmatter are the morning-light defaults plus each hour's accent; the full hour × scheme matrix lives in `css/brief.css` and in `.impeccable/design.json` (`extensions.hourPalettes`).

### Primary
- **Hour Accent** (accent; morning light is Morning Sky Blue): the single accent of the page, and it changes with the hour: Dawn Rose, Morning Sky Blue, Afternoon Amber, Evening Ember, Night Indigo (light), each with a brighter twin for dark mode. It marks the active day stub, primary buttons, section icons, checked to-dos, the "now" line in the day timeline, the focus ring and the caret. Accent Ink is its text-safe deeper shade (links, counts, next meeting time); Accent Wash is its pale field (count badges, avatars, warnings, the selected scene tile, text selection).

### Neutral
- **Ground** (ground): the page itself, warm paper tinted by the hour (pinkish at dawn, sand in the afternoon, cool lilac-grey at night; near-black tinted navy, plum or umber in dark mode). The scene's dither seam melts into exactly this color.
- **Raised** (raised): surfaces that float or take input: the Ask bar, its answer panel, the scene menu, text fields.
- **Raised Deep** (raised-2): quiet fills: secondary buttons, chips, due tags, app-read pills while writing.
- **Ink** (ink), **Ink Soft** (ink-2), **Muted** (muted): headings and item titles; summaries and details; bylines, sources, past events and placeholders.
- **Line** (line): the dotted pixel rules between rows and the field outline.

### Scene inks
- **Scene Ink Light / Dark** (scene-ink-light, scene-ink-dark): text and icons laid over the sky. The engine samples the brightness of the scene's quiet corner behind the greeting and sets `data-tone` to light or dark; the greeting, date line, wordmark and toolbar follow it.
- **Scene Chip Light / Dark** (scene-chip-light, scene-chip-dark): the translucent pixel-cornered fill behind toolbar buttons and day stubs over the sky. Translucent fill only; never blurred.
- **Lamp Gold** (lamp-gold): the wordmark's sun on a dark-toned sky, and the warmest bulb of the string lights; one of the four to-do burst colors.

### Scene palettes
The dioramas carry their own fixed per-hour palettes in `js/scene.js` (sky gradient stops, sun or moon, cloud, far-ridge, ground and ambient tint per time of day), greyed toward rain or snow by weather. They are art, not UI tokens: do not lift scene colors into page components, and do not add UI tokens to the scene.

### Named Rules
**The Same Hour Rule.** The page and the scene always show the same hour. Set `data-time` from the time the brief was written (or now, while writing), never from a fixed theme, and let ground, ink and accent swap together.

**The One Accent Rule.** Each hour has exactly one accent and its ink and wash. No second hue enters page UI; app colors appear only inside app icons, where they are data.

## Typography

**Display Font:** Display, an alias for Thmanyah Serif Display (500, 700) on Latin ranges and Zanjabeel (500, 700) on Arabic ranges, split by `unicode-range` (fallback ui-serif, Georgia, serif)
**Body Font:** Text, an alias for Thmanyah Sans (400, 500, 700) for both scripts (fallback ui-sans-serif, system-ui, sans-serif)

**Character:** A warm, high-contrast display serif that greets like a storybook title over the scene, paired with a plain, sturdy sans that reads fast. In Arabic, Zanjabeel takes the greeting and headings while Thmanyah Sans keeps reading, so both scripts share one hierarchy.

### Hierarchy
- **Display** (Display 700, clamp(36px, 3.9vw, 62px), line-height 1.04, -0.02em): the greeting for the hour over the scene; slightly smaller while the brief is being written. Below 900px it leaves the scene and sits on the ground at clamp(34px, 8.5vw, 52px).
- **Headline** (Display 500, clamp(28px, 3.1vw, 42px), 1.14, -0.015em): the brief's one headline, directly under the dither seam.
- **Title** (Display 500, 25px, 1.15, -0.01em): section heads. Also Display 500 at 22px for the feedback question and 18px for the question echoed in the Ask answer; the wordmark is Display 700 19px; day-stub dates are Display 700 17px.
- **Item** (Text 700, 17px, 1.4): titles of items, times in the day timeline, people's names (16.5px).
- **Lead** (Text 400, 19px, 1.65, max 64ch): the summary under the headline; 17.5px on phones.
- **Body** (Text 400, 16px, 1.6): base text; item details at 15.5px/1.6 in ink-2, max 68ch.
- **Label** (Text 500, 12.5–15px): bylines, sources, chips, due tags, toolbar labels, field labels (14px), step and panel copy (14.5px), settings links (15px), counts (700). Sentence case, no tracking, never uppercase.

Numbers use tabular figures. Arabic uses Gregorian dates and Western digits so they match the times the AI writes.

### Licensing
The Thmanyah licence forbids distributing the font files in a way users can extract them, and an extension bundles them in `fonts/`. Shipping requires permission from Thmanyah (ask@thmanyah.com). Zanjabeel's licence has not been reviewed. Until both are cleared, treat the type as provisional for release, not for design.

### Named Rules
**The Arabic Breath Rule.** Arabic display text gets room, not tracking: letter-spacing 0, greeting line-height 1.3, headline 1.45, and headings step up to weight 700.

**The Greeting Speaks, The Page Reads Rule.** Display is for the voice of the page (greeting, headline, section heads, the feedback question). Everything a reader scans, including item titles, is Text.

## Layout

A full-bleed scene header, then a single centered reading page (content max 1320px, gutters clamp(16px, 4vw, 56px)). The toolbar (wordmark, the last seven days as stubs, then Scene / Copy / Rewrite / Settings) floats over the top of the sky; the greeting and date line sit in the scene's quiet corner, the start side (left in English, right in Arabic), within about half the width. The headline starts under the seam, in a lead block of max 780px.

Below the lead, two columns at 1.55fr / 1fr with a 72px gap: Push your work forward, Top to-dos and New updates on the main side; Your day, Important people and Looking ahead on the aside. Sections are separated by 52px of air (44px on phones), rows by 15px padding and a dotted rule. The feedback footer is centered, 520px wide, 84px below. The Ask bar is fixed at the bottom center, 720px wide, so the page keeps 120px of bottom padding.

Responsive behavior:
- **≤1000px:** the two columns stack.
- **≤900px:** the greeting leaves the scene and sits on the ground below it in page ink.
- **≤720px:** the day stubs move out of the toolbar to above the greeting, toolbar labels collapse to icons (labels kept for screen readers), the scene menu spans the width, and the scene scales at 2× (about 288px tall).

**The Quiet Corner Rule.** Each wide scene keeps its busy art to the end side and leaves the start side's sky calm for the greeting. Put nothing in that corner but the greeting and its date line.

## Elevation & Depth

The page is flat. Depth lives in the scene (parallax layers that drift a few pixels with the pointer, banded light glows, 1px sprite outlines) and in tonal steps on the page: ground, then raised for anything that floats or takes input, then raised-2 for quiet fills. There are no borders and no blurred glass.

### Shadow Vocabulary
- **Pixel drop** (`text-shadow: 0 3px 0 var(--scene-shadow)` on the greeting, `0 2px 0` on the wordmark, `0 1px 0` on the date line): a hard, unblurred one-step shadow under text on a dark-toned sky, the way pixel-art titles stay legible. Transparent on a light-toned sky.
- **Pixel ledge** (`filter: drop-shadow(0 3px 0 rgb(0 0 0 / .14))` on the scene menu; `.12` on the Ask bar): a hard 3px step under the two layers that float over content. `drop-shadow` is required because clip-path would cut a `box-shadow`.

### Named Rules
**The Hard Step Rule.** Shadows are whole-pixel steps with zero blur and a vertical offset only. If it looks soft, it doesn't belong to this world.

## Shapes

Nothing is rounded and nothing is outlined with a border. Corners are cut in pixel steps with `clip-path` polygons: **pixel-step** (two 2px steps, 4px deep; buttons, toolbar tools, day stubs, fields, the Ask bar, menus, avatars, toasts, to-do boxes) and **pixel-step-sm** (one 2px step; chips, counts, due tags, app icons, scene thumbnails). The `rounded` tokens in the frontmatter are these step depths, not radii. Because clip-path clips outlines and shadows, focus and field strokes are drawn as `inset` box-shadows inside the shape.

Rules between rows are dotted pixel lines: 2px squares every 6px in line color (`linear-gradient(90deg, var(--line) 0 2px, transparent 2px 6px)` at 6px × 2px). The "now" marker in the day timeline is the same grammar in accent, 4px dashes every 6px.

Icons are drawn on a 9×9 grid of whole cells and rendered as crisp SVG rects (`shape-rendering: crispEdges`), in currentColor: mail, calendar, hash, ticket, doc, branch, ring, sun, moon, spark, one per brief section, and the actions (check, close, copy, rewrite, settings, scene, pencil). Render them at a whole multiple of the grid: 9px inside app icons, 18px for section and list icons.

The scene itself: 144 logical pixels tall, scaled by an integer 2–4, 1px outlines around sprites, Bayer-ordered dithering for every gradient, glow and fade.

**The Whole Pixel Rule.** Every pixel shape on the page, from corner step to icon cell to rule dot, lands on whole pixels at its rendered size. No radius, no anti-aliased curve, no fractional icon cell.

## Components

### The Scene (signature)
A canvas drawn in code (`js/scene.js`) at 12 fps: sky bands with short dithered seams, sun or moon, stars, drifting clouds, birds by day, parallax ridges and the place's sprites, then weather (rain streaks or snow) over everything. It stops animating off-screen, in a hidden tab, and under reduced motion (one still frame).
- **Hours and lights:** evening and night light every window, lantern and bulb; dawn lights half. A wall clock in the desk scene shows the brief's time.
- **Lights while writing:** during generation the scene enters progress mode and each finished step, especially each app read, turns on one more light (laptop screen with a page being written, string lights, lanterns, cabin windows, shop windows), fading in through a dither over four frames with a brief flare.
- **The seam:** the bottom 9 rows dissolve into the page ground through a 4×4 Bayer pattern, recomputed when the color scheme changes.
- **Changing day or scene:** an 8×8 Bayer dither dissolve over 14 frames from the old picture to the new.
- **Arabic:** the canvas mirrors (`scaleX(-1)`), so the quiet corner follows the reading direction; parallax reverses with it.

### Scene Toolbar
- **Tools:** 36px tall, 12px side padding, Text 500 14px with a pixel icon, scene-chip fill and scene ink, pixel-step corners. Hover or open: the stronger scene-chip. Press: down 1px.
- **Day stubs:** the last seven days, a short weekday (Text 500 11px at 80% opacity) over the date (Display 700 17px), min width 46px. The current day takes the accent with on-accent ink. On phones they sit on the ground in raised-2.
- **Scene menu:** a raised panel under the Scene tool with a pixel ledge, two columns of 168px tiles; each tile is a live still of that scene at the current hour and weather (mirrored in Arabic) with its name. Selected: accent-wash with accent-ink.

### Buttons
- **Shape:** pixel-step corners, 40px tall, 16px side padding, Text 700 14.5px.
- **Primary:** accent with on-accent ink; hover deepens to accent-ink.
- **Secondary:** raised-2 with ink; hover mixes 20% ink into the fill.
- **On (pressed choice):** ink fill with ground text, as in the feedback yes/no pair.
- **Focus:** a 2px inset ring in ink (in on-accent on primary). **Press:** down 1px. **Disabled:** 50% opacity.

### Chips, Counts and Tags
- **Chip:** raised-2 fill, ink-2 text, Text 500 13px, pixel-step-sm, 5px 10px. **Warn:** accent-wash with accent-ink (an app that was skipped or needs reconnecting).
- **Count:** accent-wash, accent-ink, Text 700 13px, at the end of a section head, shown only for more than one item.
- **Due tag:** raised-2 with ink-2, Text 700 12.5px; high-priority to-dos switch it to accent-wash.

### Lists and Section Heads
Section heads are an 18px pixel icon in accent, the title in Display, and an optional count. Items are open rows separated by dotted pixel rules, never boxes: an item title in Text 700, a detail in ink-2, and a source line (app icon and name) in muted.
- **To-dos:** a 22px pixel-step box in ink-2 with a ground-colored inner square; hover turns it accent; checking fills it with accent, steps a pixel check in (`steps(3)`), strikes the title through in a 2px accent line, and fires a small burst of eight 4px squares in warm pastels.
- **Your day:** times in tabular Text 700 with the end time under them; past events go muted, the next one takes accent-ink, and a dashed accent "now" line with a sun or moon marks the present.
- **People:** a 40px pixel-step avatar of initials in accent-wash.

### App Icons
A pixel-step-sm square in the app's own color with a white 9×9 pixel mark chosen by what the app is for (mail, calendar, hash, ticket, doc, branch, ring), ringed by 2px of ground so they can overlap in a stack. Sizes 18, 24 and 26px.

### Inputs / Fields
- **Style:** raised fill, pixel-step corners, a 2px inset stroke in line, Text 400 15.5px/1.55, placeholder in muted, caret in accent.
- **Focus:** the inset stroke turns accent.

### Ask Bar
Fixed at the bottom, 720px max, raised with pixel-step corners and a pixel ledge, a pencil icon, the input and a primary Ask button. Focus draws a 2px accent inset ring around the whole bar. Answers rise above it in a raised panel (max 50vh) with the question in Display and a blinking block caret while streaming. `/` focuses it; Escape closes the answer.

### Writing State
The greeting becomes the writing message, and the page shows a ledger of steps on dotted rules: an app icon, the label, and a mark at the end (three blinking 5px accent squares while active, a pixel check when done, a cross on error). Apps read by the AI pop in as small raised-2 pills (`steps(4)`). Errors appear in an accent-wash box with Retry (primary) and Open settings.

### Toast
Ink fill with ground text, pixel-step corners, Text 500 14.5px, rising 12px into place above the Ask bar (28px from the bottom on pages without one).

### Choice Tiles
Providers, apps and scenes are raised pixel boxes with a 2px inset ring in line; hover deepens the ring, the chosen one turns the ring accent. The pick mark is a 22px pixel box that fills accent with a check. Scene tiles show a still of each place at the current hour.

### Segmented, Days and Switch
Segmented choices sit in a raised-2 pixel trough; the chosen segment is raised and bold. Day buttons are 42×44 pixel boxes that fill accent when on. The switch is a stepped track with a square knob that moves in `steps(4)`.

### App Panels
Each app is a disclosure on dotted rules: its pixel mark, name and what it reads, a Connected / Not connected chip, and setup steps with accent markers inside.

## Surfaces

- **Setup** (`welcome.html`): the full scene header with a live greeting that updates as the name is typed. Step one also chooses the language and the place. Each finished step lights more of the scene; the last step lights all of it. Steps sit in an 860px column with Back / Continue on a dotted rule.
- **Settings**: a shorter scene (2× scale) with "Settings" over the sky, a sticky list of sections beside an 820px column, and the Look & language section driving the header scene live (scene, time-of-day preview).
- **Popup** (360px): a 172px slice of the scene's ground, with the wordmark and the settings button on solid raised chips so they read over busy art, then the greeting, the headline, what's next and up to three open to-dos.

## Do's and Don'ts

### Do:
- **Do** set `data-time` from the hour the brief was written and let the scene, ground, ink and accent change together, in both light and dark.
- **Do** cut every corner with the pixel-step polygons (4px or 2px) and draw focus and strokes as 2px inset rings inside them.
- **Do** separate rows with the dotted 2px pixel rule in line color, and keep items as open rows.
- **Do** draw new icons on the 9×9 grid and render them at 9px or 18px in currentColor.
- **Do** move in whole steps: `steps()` easing for pixel things (checks, pops, blinks, bursts), dither dissolves for the scene, and `cubic-bezier(.16, 1, .3, 1)` only for page-level fades and rises.
- **Do** mirror the scene in Arabic and keep the greeting in the quiet start-side corner; set Arabic display text with letter-spacing 0 and more line-height.
- **Do** honor reduced motion: one still frame of the scene, no transitions, no burst, no dissolve.
- **Do** pick greeting ink from the scene's measured tone (`data-tone`), never from the color scheme alone.

### Don't:
- **Don't** put brief content in cards, tiles or bordered boxes; no card dashboard.
- **Don't** fall back to a cream editorial column or the old tear-off-calendar look (paper pad, perforations, Archivo) on any surface.
- **Don't** use `border-radius`, borders, blurred shadows or `backdrop-filter` glass on page UI.
- **Don't** smooth the scene: no anti-aliasing, no non-integer scale, no CSS filters over the canvas.
- **Don't** introduce a second accent hue in page UI; app brand colors stay inside app icons.
- **Don't** place controls or content in the scene's quiet corner other than the greeting and date line.
- **Don't** use glyph or emoji icons, or icon fonts; use the 9×9 pixel set.
