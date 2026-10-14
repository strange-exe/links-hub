# Design: links.abhinesh.codes

## Brief

- **What:** a link-in-bio hub for Abhinesh Gangwar, at `links.abhinesh.codes`.
- **Audience:** recruiters and hiring engineers first, peers second.
- **Primary job:** get a recruiter to the resume (or an email) in one tap; then GitHub, LinkedIn, the portfolio.
- **Feeling:** modern, futuristic, professional. It must read as the same brand as abhinesh.codes.
- **Constraints:** static export, mobile-first, WCAG 2.2 AA, initial JS within ~200 KB gzip.

## Theme: Aurora Glass (chosen 2026-10-12, replaces Terminal + Orbit)

The user picked this from three redesign directions (Signal Field, Aurora Glass, Constellation) after asking for a
modern UI, an interactive background and a better monogram, and then asked for it to match the portfolio.

**Palette (2026-10-12, user's request): midnight black + electric violet + a shot of sun yellow.** This replaces
the portfolio's emerald/cyan. The portfolio continuity that remains: near-black base, JetBrains Mono labels, `//`
comment-style labels.

- **Background:** a fixed aurora of violet and indigo fields with one small sun-yellow glint low on the page, plus film grain on a fixed, non-interactive layer.
- **Surfaces:** translucent glass panels with a gradient hairline border (violet to yellow) and a violet cursor spotlight.
- **Monogram:** a flat-topped A beside a geometric G; the stroke runs white, violet, deep violet, then a yellow tip, on a glass tile. The strokes draw in on load.
- **Type:** Plus Jakarta Sans for display and body, JetBrains Mono for labels, handles and status (the portfolio's mono).
- **Yellow is rationed:** the arrow inside the resume button, the availability dot, the focus ring in dark mode, the aurora glint and the monogram tip. Nothing else.
  (A solid yellow button was tried and rejected by the user on 2026-10-12. Of three previews, Violet Core was chosen because it matches the site.)

## Reading order

1. Monogram, name, role, availability status
2. **View resume** (sun-yellow pill in dark mode, violet with a yellow arrow circle in light mode; opens `/resume/`) + Email (glass pill)
3. Featured project
4. Link groups: Work, then Elsewhere
5. Tools: copy email, QR code, colour mode, pause motion (a quiet toolbar of borderless buttons; hover brings the glass back)

The **≥ 1024 px** layout is two columns: identity and actions on the left, content on the right, with the toolbar
pinned to the bottom of the left column, level with the last link. Below that, it's a single column.
On a 390 × 844 phone, the resume button sits in the first viewport.

## Tokens

| Token | Dark | Light | Role |
|---|---|---|---|
| `--bg` | `#06050d` | `#f7f6fc` | page (midnight) |
| `--surface` | `#0f0d1a` | `#ffffff` | glass panels (rendered at ~80% over the aurora) |
| `--raised` | `#191627` | `#efecf8` | icon tiles |
| `--border` | `#262138` | `#d9d4ea` | decorative hairlines |
| `--text` | `#f5f3ff` | `#0d0a1a` | body |
| `--muted` | `#a9a3c2` | `#57516e` | secondary text |
| `--accent` | `#a78bfa` | `#6d28d9` | violet, text-safe: labels, readouts, hover, spotlight |
| `--accent-2` | `#7c3aed` | `#8b5cf6` | deep violet: aurora, gradients (decorative only) |
| `--sun` | `#facc15` | `#facc15` | aurora glint, monogram tip, hairline end (decorative) |
| `--cta` / `--on-cta` | `#6d28d9` / `#ffffff` | `#6d28d9` / `#ffffff` | primary action ("Violet Core": violet with a bevel gradient) |
| `--nub` / `--on-nub` | 14% white / `#facc15` | 14% white / `#facc15` | arrow circle inside the primary action (yellow arrow) |
| `--focus` | `#facc15` | `#6d28d9` | focus ring (yellow fails 3:1 on light, so light uses violet) |
| `--status` | `#facc15` | `#a16207` | availability dot (always with text) |

The end-to-end suite checks contrast from the built site, in both modes: text, muted, on-cta/cta, focus/bg, focus/surface,
accent/bg, accent/surface, status/surface and muted/raised.

## Resume viewer (`/resume/`)

- PDF.js 6.4 renders the live `https://abhinesh.codes/resume.pdf` (CORS `*`) into canvases inside a custom viewer.
  It's lazy-loaded on that route only: the library is ~135 KB gzip and the worker ~376 KB gzip.
- **Chrome:** industrial "telemetry" language (from the industrial-brutalist skill, applied only here): mono uppercase
  readouts, a `[ RESUME.PDF ]` bracketed title, and `PG 01 / 02`. It keeps the site's pills and glass rather than
  that skill's square corners.
- **States:** loading (skeleton pages), error (`[ ERR ]` panel with an Open the PDF link and Try again), ready.
- **Controls:** zoom out/in/fit (also the `-` `+` `0` keys), a Download button that saves a real file (blob from the loaded
  bytes), back to links, and Open the original PDF.
- **Accessibility:** canvases are `aria-hidden`; each page's extracted text sits beside it for screen readers. The page
  counter and zoom level use `output` with `aria-live`. Phone toolbar buttons are icon-only, with `aria-label`s that
  contain the visible word.

## Type, space, shape

- Scale (tokens `--fs-xs` to `--fs-display`): 12 / 14 / 16 / 18 / 22 / clamp(40-56) px. Mono text (handles,
  stack, kicker, readouts) is 12. Display weight 800 with tight tracking. A test fails if the page renders more
  than six sizes or one outside the scale.
- Space: 4 / 8 / 12 / 16 / 20 / 24 / 32 / 48 / 64 px.
- Shape rule: actions are full pills, cards use 24 px radius (a 6 px bezel shell around 18 px inner), and link rows and icon tiles use 16 / 12 px.

## Motion

- **The identity column never animates in:** the name, status and resume button are visible on the first frame.
  The right column rises 14 px over 0.7 s (50 ms stagger) with no opacity change and no blur. Why: on a cold
  browser start the animation clock stalled for 1-3 s; opacity-0 entrances left the page blank, and the later
  35%-opacity start held the featured project and every link at 35% for 2-3 s in a fresh Chromium (measured
  2026-10-14). The fill mode is `backwards`, so the finished entrance releases `transform` for the tilt.
- **Tilt (3D card, from the aceternity and 3d-web-experience skills, CSS only):** the featured card turns toward the
  pointer by up to 5 deg (perspective 1000 px) and its title, stack and links shift 2-5 px with it; the AG tile
  turns up to 8 deg. `components/Spotlight.tsx` feeds `--tx/--ty` from the same batched pointer listener. Fine
  pointers only; off under reduced motion and Pause.
- **Monogram loop (7 s):** the original draw-in, repeated. Both letters draw together over 1.6 s at one pen speed
  (dash lengths 140 and 160 in user units), hold about 3.8 s fully drawn with a sheen at 1.4 s, erase over 1 s from
  the start of each stroke, a 0.4 s beat, then redraw. The strokes are fully drawn in the HTML; the loop class is
  added only once the animation clock is running (two frames fired, `document.timeline` advanced), so a stalled
  clock shows the finished mark, never an empty tile. Reduced motion skips it; the Pause control stops it fully
  drawn (CSS, so it follows toggles both ways). `data-draw` on the SVG records the decision for tests.
- **Aurora:** one violet field drifts (transform only, about 26 s); the indigo field and the yellow glint are static.
  The grain uses no blend mode.
- **Resume button glint:** a rotating conic layer clipped to the pill (a transform animation, so it runs on the compositor).
- **Spotlight:** a fixed-size glow moved with transform, updated once per animation frame, on fine pointers only.
- **Measured** with Chromium at 4× CPU throttle, idle animation plus pointer movement: 11 fps before the
  2026-10-12 optimisation pass, about 45 fps after; about 58 fps with all decoration off.
- Hover: link rows slide 4 px, and arrows nudge up and to the right. Easing is `cubic-bezier(.32,.72,0,1)`.
- **Pause control** (WCAG 2.2.2) stops the aurora; the choice is saved. `prefers-reduced-motion` stops everything.

## Decisions log

- 2026-10-12: Theme Terminal + Orbit mix; URL `links.abhinesh.codes`.
- 2026-10-12: Redesign to Aurora Glass, matched to the portfolio palette and mono. Inter dropped (taste skill). Phosphor icons replace text glyph tiles.
  The Motion library was not added (JS budget); the backgrounds use CSS only.
- 2026-10-12: Palette changed to midnight black + electric violet + sun yellow (user). Styling kept. Resume viewer added
  (PDF.js, `/resume/`). Aceternity UI not installed (needs Tailwind + Motion; this site is plain CSS within a JS budget).
- 2026-10-12: Aceternity effects ported without their dependencies (their licence allows end products and modification,
  but not redistributing their source, so these are reimplementations, not copies):
  - **Moving Border:** on the resume button only. CSS `@property --orbit` drives a conic gradient on a 2 px ring
    (lilac in dark mode, sun yellow in light mode). It pauses with the Pause button and is off under reduced motion.
  - **Encrypted Text:** `components/ScrambleText.tsx` (no dependencies) decodes the viewer title on load. Screen
    readers get the real text at once. It was removed from the availability status when the status moved to the
    body font (proportional glyphs made the chip change width as it decoded).
- 2026-10-12: Availability status restyled as a **gradient chip**: a glass pill with the cards' violet-to-yellow
  hairline, the body font at 500, and a yellow dot with a halo and ping. The user chose it from three previews
  (live line, gradient chip, split badge) after rejecting the yellow-tinted pill and the neutral mono pill.
  - Brand board built per the brandkit skill as HTML and rendered to PNG (no image generator in this environment):
    `.claude/design/brandkit.html`/`.png`.
- 2026-10-14: Audit with the gpt-taste, high-end-visual-design, 3d-web-experience and aceternity skills. Rating:
  needs polish, not a redesign. The user picked all four quick wins: the cold-start fade fix, a quieter toolbar
  pinned level with the last link, a six-step type scale, and the pointer tilt. Not applied (they suit long
  landing pages, not a one-screen link hub): AIDA sections, bento grids, GSAP scroll effects, stock imagery,
  a floating nav, eyebrow tags, very large section padding, and a font change (the font matches the portfolio).
  Offered but not chosen: a screenshot thumbnail on the featured card.
