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
5. Tools: copy email, QR code, colour mode, pause motion

The **≥ 1024 px** layout is two columns: identity and actions pinned on the left, content on the right. Below that, it's a single column.
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

- Scale: 12 / 13 / 14 / 15 / 16 / 20 / clamp(40-56) px. Display weight 800 with tight tracking.
- Space: 4 / 8 / 12 / 16 / 20 / 24 / 32 / 48 / 64 px.
- Shape rule: actions are full pills, cards use 24 px radius (a 6 px bezel shell around 18 px inner), and link rows and icon tiles use 16 / 12 px.

## Motion

- One entrance sequence: blocks rise and un-blur in a 70 ms stagger, and the monogram strokes draw in.
- The aurora drifts over 26-38 s using transform only. The spotlight follows the pointer on fine pointers only.
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
  - **Encrypted Text:** `components/ScrambleText.tsx` (no dependencies) decodes the availability status and the viewer
    title on load. Screen readers get the real text at once.
  - Brand board built per the brandkit skill as HTML and rendered to PNG (no image generator in this environment):
    `.claude/design/brandkit.html`/`.png`.
