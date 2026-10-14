# Design: links.abhinesh.codes

## Brief

- **What:** a link-in-bio hub for Abhinesh Gangwar, at `links.abhinesh.codes`.
- **Audience:** recruiters and hiring engineers first, peers second.
- **Primary job:** get a recruiter to the resume (or an email) in one tap; then GitHub, LinkedIn, the portfolio.
- **Feeling:** modern, motion-led, professional. It must read as the same brand as abhinesh.codes.
- **Constraints:** static export, mobile-first, WCAG 2.2 AA, initial JS within ~200 KB gzip.

## Theme: Signal (chosen 2026-10-15, replaces Aurora Glass)

The user called Aurora Glass "AI sloppy" (purple glow, glass, gradient hairlines, pills, icon tiles) and asked for a
redesign with modern motion. Three static themes (Mono Terminal, Ink and Paper, Swiss Signal) were rejected for
"a modern motion styled design"; of three motion previews (Kinetic Type, Signal Field, Paper Motion) the user chose
a **mix of all three on Signal Field's palette**, then asked for a 3D "neuron linkage" background, a View resume
button styled like the portfolio's Download Resume button, and ideas from professional sites.

- **Palette:** graphite + one sun-yellow signal (the yellow carries over from the earlier brand). Flat surfaces,
  no gradients, glow, glass or blur.
- **Background:** a 3D neuron network on a canvas (`components/Field.tsx`): nodes in a slowly turning volume,
  linked to neighbours, with yellow signals travelling along the links; it turns slightly toward the pointer.
- **Surfaces:** solid sheets (`--surface`) with a 1 px border and a soft shadow; every piece of text sits on a
  sheet or on the solid page colour, never on the network.
- **Monogram:** the AG strokes in cyan (`--mark`, the portfolio's `#06b6d4`; user's request 2026-10-15, to make
  the loop stand out), no tile, on the 7 s draw/hold/erase loop. Cyan is used nowhere else.
- **Type:** Geist for display and body, JetBrains Mono for labels, handles, status and every button (as on the portfolio).
- **Yellow is the only other colour:** network signals, the View resume border glint, the link-row hover wipe, the
  status dot, the featured-card trace and labels in dark mode (`#8a5a00` ink in light mode for text-safe contrast).

**Inspiration (2026-10-15):** brittanychiang.com (sticky identity column while content scrolls), rauno.me
(indented statement lines, one bold flat signal colour), leerob.com and emilkowal.ski (restraint: short copy,
motion mostly on interaction).

## Reading order

1. Monogram, name (second line indented, muted), role, availability status
2. **View resume** (portfolio-style outline button with a travelling yellow border; opens `/resume/`) + Email (plain outline)
3. Featured project sheet
4. Link groups: Work, then Elsewhere
5. Tools: copy email, QR code, colour mode, pause motion (a quiet toolbar of borderless buttons)
6. Skills strip across the bottom (from the portfolio's About section and Revlens AI's stack)

The **≥ 1024 px** layout is two columns: a sticky identity sheet on the left with the toolbar at the bottom of
that column, content on the right, the skills strip full width below. Below that, it's a single column.
On a 390 × 844 phone, the resume button sits in the first viewport.

## Tokens

| Token | Dark | Light | Role |
|---|---|---|---|
| `--bg` | `#0b0b0c` | `#f4f4f2` | page (graphite / bone) |
| `--surface` | `#111113` | `#ffffff` | sheets, link rows, button fills |
| `--raised` | `#18181b` | `#ecece8` | pressed/selected fills |
| `--border` | `#2a2a2e` | `#dcdcd8` | sheet and row borders |
| `--text` | `#ededed` | `#111111` | body |
| `--muted` | `#9b9b9f` | `#55555a` | secondary text, second name line |
| `--accent` | `#f5b942` | `#8a5a00` | signal, text-safe: labels, readouts, trace |
| `--cta` / `--on-cta` | `#f5b942` / `#0b0b0c` | `#111111` / `#f4f4f2` | skip link, viewer primary button |
| `--wipe` / `--on-wipe` | `#f5b942` / `#0b0b0c` | same | link-row hover fill and its text |
| `--focus` | `#f5b942` | `#8a5a00` | focus ring |
| `--status` | `#f5b942` | `#8a5a00` | availability dot (always with text) |
| `--dot` | `237 237 237` | `17 17 17` | RGB of the network's nodes and links |
| `--mark` | `#06b6d4` | `#0891b2` | AG monogram (cyan, the portfolio's accent; 7.8:1 / 3.7:1 on the sheet) |

The end-to-end suite checks contrast from the built site, in both modes: text, muted, on-cta/cta, on-wipe/wipe,
focus/bg, focus/surface, accent/bg, accent/surface, status/surface, mark/surface and muted/raised.

## Resume viewer (`/resume/`)

- PDF.js 6.4 renders the live `https://abhinesh.codes/resume.pdf` (CORS `*`) into canvases inside a custom viewer.
  It's lazy-loaded on that route only: the library is ~135 KB gzip and the worker ~376 KB gzip.
- **Chrome:** industrial "telemetry" language (from the industrial-brutalist skill, applied only here): mono uppercase
  readouts, a `[ RESUME.PDF ]` bracketed title, and `PG 01 / 02`. It uses the site's flat sheets and 8 px buttons
  rather than that skill's square corners.
- **States:** loading (skeleton pages), error (`[ ERR ]` panel with an Open the PDF link and Try again), ready.
- **Controls:** zoom out/in/fit (also the `-` `+` `0` keys), a Download button that saves a real file (blob from the loaded
  bytes), back to links, and Open the original PDF.
- **Accessibility:** canvases are `aria-hidden`; each page's extracted text sits beside it for screen readers. The page
  counter and zoom level use `output` with `aria-live`. Phone toolbar buttons are icon-only, with `aria-label`s that
  contain the visible word.

## Type, space, shape

- Scale (tokens `--fs-xs` to `--fs-display`): 12 / 14 / 16 / 18 / 22 / clamp(44-72) px. Mono text (handles,
  stack, kicker, status, buttons' labels) is 12-14. Display weight 800 with tight tracking. A test fails if the
  page renders more than six sizes or one outside the scale.
- Space: 4 / 8 / 12 / 16 / 20 / 24 / 32 / 48 / 64 px.
- Shape rule: sheets 14 px radius, link rows 10 px, buttons 6-8 px (the portfolio's button radius). No pills.

## Motion

Every entrance only MOVES (no opacity, no masks): on a cold browser start the animation clock stalled for 1-3 s,
and fading or clipped entrances left the page blank or faint. Fill mode is `backwards`, so a finished entrance
releases `transform` for the tilt and magnet. A test fails if any entrance keyframe animates opacity.

- **Kinetic name:** each letter rises 0.32 em with a 4 deg turn, 28 ms apart; the surname line is indented and muted.
- **Sheets:** the identity and featured sheets settle with a spring (`cubic-bezier(.34,1.4,.5,1)`, 24 px, -1 deg);
  link rows rise 16 px in a 55 ms stagger.
- **Network background:** about 90 nodes (56 on phones) in a turning volume (one turn about every 105 s), links
  found once (rotation keeps distances), six yellow signals hopping node to node. Starts only once the animation
  clock runs; still frame under reduced motion, Pause, or a hidden tab. `data-field` records still/running.
- **Featured sheet:** tilts toward the pointer (up to 5 deg) with its title, stack and links shifting 2-5 px; a short
  yellow run traces its border on hover or keyboard focus.
- **View resume:** the portfolio's outline button with a yellow segment travelling round the 1 px border every 4 s
  (a rotating conic layer, compositor-only), a 2 px lift on hover, and a magnetic lean (up to 8 / 6 px) toward a
  nearby pointer.
- **Link rows:** a sun-yellow wipe sweeps in from the left on hover or keyboard focus; the name slides 6 px and the
  arrow turns 45 deg.
- **Monogram loop (7 s):** both letters draw together over 1.6 s at one pen speed (dash lengths 140 and 160), hold
  about 3.8 s, erase over 1 s, a 0.4 s beat, redraw. Fully drawn in the HTML; the loop class is added only once the
  clock runs. `data-draw` records the decision for tests.
- **Skills strip:** a 32 s marquee; screen readers get the list once.
- **Pause control** (WCAG 2.2.2) stops the network, the strip, the border glint, the trace, the monogram loop, the
  tilt and the magnet; the choice is saved. `prefers-reduced-motion` stops everything.
- **Measured** (Chromium, 4x CPU throttle, pointer moving, lab): about 53 fps with everything running, 60 paused
  (Aurora Glass measured about 45 the same way).

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
- 2026-10-15: Redesign to **Signal** (see Theme). Removed: aurora and grain, glass panels and gradient hairlines,
  cursor spotlight glow, the violet bevel button, the gradient status chip, link icon tiles, the monogram's tile,
  gradient and sheen. Font changed from Plus Jakarta Sans to Geist. Favicon and OG image redrawn to match.
  "Neuron linkage" was read as a neural network of linked nodes (it echoes the portfolio's constellation).
