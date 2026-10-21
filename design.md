# Design: links.abhinesh.codes

## Brief

- **What:** a link-in-bio hub for Abhinesh Gangwar, at `links.abhinesh.codes`.
- **Audience:** recruiters and hiring engineers first, peers second.
- **Primary job:** get a recruiter to the resume (or an email) in one tap; then GitHub, LinkedIn, the portfolio.
- **Feeling:** modern, motion-led, professional. It must read as the same brand as abhinesh.codes.
- **Constraints:** static export, mobile-first, WCAG 2.2 AA, initial JS within ~200 KB gzip.

## Theme: Precision (chosen 2026-10-21, replaces Signal)

The user asked for "a cool and modern professional design". Following the global §1E/§1G flow, three directions
were rendered live on the real content (`.claude/design/theme-options-v2.html`), each from a different set of
reference DESIGN.md files in VoltAgent/awesome-design-md:

| Option | References | Feel | Result |
|---|---|---|---|
| **1. Precision** | Linear, Vercel, Raycast | a precise developer tool | **chosen** |
| 2. Letterhead | Mercury, Claude, Stripe | warm editorial CV, serif display, ink green | not chosen |
| 3. Mission | SpaceX, x.ai, ClickHouse | launch control, uppercase condensed, signal orange | not chosen |

A full-page demo (`.claude/design/precision-demo.html`) was approved before the build.

- **Borrowed traits (no identity):** Linear's surface ladder with 1 px hairlines and no drop shadows; Vercel's
  Geist 600 with tight negative tracking and a solid ink/white primary; Raycast's keycaps and command menu.
- **Palette:** graphite (dark) or near-white (light) with one electric-blue accent, the same blue as Signal.
- **Kept from Signal (user-requested features):** the looping AG monogram, the training-network background, the
  portfolio-style travelling border on View resume, the skills strip, the QR code, the three-way colour mode,
  and Pause.
- **Changed from the demo, on purpose:** the demo's single-letter shortcuts (R, E) were not built: they fail
  WCAG 2.1.4 (character key shortcuts need a way to turn them off). Ctrl/Cmd+K and the command menu cover both.
  Buttons stay in JetBrains Mono (the portfolio's button font) rather than the demo's Geist.

## Previous theme: Signal (2026-10-15 to 2026-10-21)

The user called Aurora Glass "AI sloppy" (purple glow, glass, gradient hairlines, pills, icon tiles) and asked for a
redesign with modern motion. Three static themes (Mono Terminal, Ink and Paper, Swiss Signal) were rejected for
"a modern motion styled design"; of three motion previews (Kinetic Type, Signal Field, Paper Motion) the user chose
a **mix of all three on Signal Field's palette**, then asked for a 3D "neuron linkage" background, a View resume
button styled like the portfolio's Download Resume button, and ideas from professional sites.

- **Palette:** graphite + one electric-blue signal (it replaced sun yellow on 2026-10-15). Flat surfaces,
  no gradients, glow, glass or blur.
- **Background:** a small neural network training, in 3D on a canvas (`components/Field.tsx`): five layers as
  columns that sway gently; a blue forward pass, a fainter backward pass, then the weights shift. It leans toward
  the pointer.
- **Surfaces:** solid sheets (`--surface`) with a 1 px border and a soft shadow; every piece of text sits on a
  sheet or on the solid page colour, never on the network.
- **Monogram:** the AG strokes in the accent blue (`--mark`), so the loop stands out against the neutral type; no
  tile, on the 7 s draw/hold/erase loop.
- **Type:** Geist for display and body, JetBrains Mono for labels, handles, status and every button (as on the portfolio).
- **Blue is the only colour:** the AG loop, network signals, the View resume border glint, the link-row hover wipe,
  the status dot, the featured-card trace and labels (`#7c9cff` on dark, `#3451d1` ink on light for text contrast).

**Inspiration (2026-10-15):** brittanychiang.com (sticky identity column while content scrolls), rauno.me
(indented statement lines, one bold flat signal colour), leerob.com and emilkowal.ski (restraint: short copy,
motion mostly on interaction).

## Reading order

1. Monogram with the availability chip, name (second line muted), role
2. Command bar (opens the command menu; Ctrl/Cmd+K anywhere)
3. **View resume** (solid fill inside the portfolio's travelling blue border; opens `/resume/`) + Email (outline)
4. Tools inside the identity sheet: copy email, QR code, colour mode, pause motion (quiet borderless buttons)
5. Featured project sheet
6. Link groups: Work, then Elsewhere (two sheets side by side from 720 px of content width)
7. Footer (fine print, the Ctrl K hint on fine pointers) and the skills strip

The **≥ 1024 px** layout is two columns: a sticky 448 px identity sheet on the left, content on the right, the
footer and skills strip full width below. Below that, it's a single column. On a 390 × 844 phone, the resume
button sits in the first viewport.

## Tokens

| Token | Dark | Light | Role |
|---|---|---|---|
| `--bg` | `#08090a` | `#fafafa` | page, under a static 16 px dot grid (`--grid`) |
| `--surface` | `#101113` | `#ffffff` | sheets, button fills |
| `--raised` | `#16171a` | `#f1f1f2` | chips, hover and selected fills |
| `--hair` | `#23252a` | `#e6e6e8` | decorative sheet edges and row dividers |
| `--border` | `#6e727b` | `#8e9196` | control boundaries (3:1 on bg and surface) |
| `--text` | `#f7f8f8` | `#171717` | body |
| `--muted` | `#8a8f98` | `#5f6368` | secondary text, second name line |
| `--accent` | `#7c9cff` | `#2f54eb` | signal, text-safe: labels, row bar, featured edge |
| `--cta` / `--on-cta` | `#f7f8f8` / `#08090a` | `#171717` / `#ffffff` | View resume fill, skip link, viewer primary |
| `--wipe` / `--on-wipe` | `#7c9cff` / `#08090a` | same | text selection, the glint on View resume's border |
| `--focus` / `--status` / `--mark` | `#7c9cff` | `#2f54eb` | focus ring, availability dot, AG monogram |
| `--dot` | `247 248 248` | `23 23 23` | RGB of the network's nodes and links |

Contrast (script, then the e2e suite on the built site): dark text/bg 18.73, muted/surface 5.81, accent/surface
7.25, CTA 18.73; light text/bg 17.18, muted/surface 6.05, accent/surface 5.85, CTA 17.93. The suite checks text,
muted, on-cta/cta, on-wipe/wipe, border/surface, border/bg, focus, accent, status, mark and muted/raised.

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
- Shape rule: sheets 12 px radius, the command bar 10 px, buttons 8 px, chips and keycaps 6/4 px. No pills, no
  drop shadows on sheets (hairlines and the surface ladder carry depth).
- Display weight is 600 (Precision), not 800.

## Motion

Every entrance only MOVES (no opacity, no masks): on a cold browser start the animation clock stalled for 1-3 s,
and fading or clipped entrances left the page blank or faint. Fill mode is `backwards`, so a finished entrance
releases `transform` for the tilt and magnet. A test fails if any entrance keyframe animates opacity.

- **Kinetic name:** each letter rises 0.32 em with a 4 deg turn, 28 ms apart; the surname line is indented and muted.
- **Sheets:** the identity and featured sheets settle with a spring (`cubic-bezier(.34,1.4,.5,1)`, 24 px, -1 deg);
  link rows rise 16 px in a 55 ms stagger.
- **Training background:** layers of 4-7-8-6-3 nodes (3-5-6-4-2 on phones), fully connected (about 120 links).
  Every 6.2 s: forward pass left to right (blue pulses sized by weight, nodes lit by activation) over 3.1 s, a beat,
  a fainter backward pass right to left, then each weight shifts by up to 12%. The camera sways +/- 0.55 rad
  instead of spinning so the columns stay readable. Links are batched into six opacity buckets (one stroke each):
  120 separate strokes halved the frame rate. Starts only once the animation clock runs; the still frame (reduced
  motion, Pause, hidden tab) shows the forward pass mid-way. `data-field` records still/running.
- **Featured sheet:** tilts toward the pointer (up to 5 deg) with its title, stack and links shifting 2-5 px; a short
  blue run travels round its 1 px edge every 6 s (a rotating conic layer behind a 1 px-inset fill).
- **View resume:** a solid fill inside the portfolio's travelling border (a blue segment round the 1 px edge every
  4 s, compositor-only), a 2 px lift on hover, and a magnetic lean (up to 8 / 6 px) toward a nearby pointer.
- **Command bar:** types a few commands ("open resume", "email abhinesh"...) every 70 ms with a blinking caret;
  decorative (aria-hidden), written to the DOM directly, and frozen while paused, hidden or under reduced motion.
  Its children ignore the pointer so a redraw can't drop a click.
- **Command menu (Ctrl/Cmd+K):** native `<dialog>` + APG combobox/listbox: 16 commands (resume, email, copy
  email, the project, six profiles, QR code, three colour modes, pause). Copy email and the QR code run through
  FooterTools (a `tools:run` event), so feedback stays in one place.
- **Link rows:** a 2 px accent bar grows on hover or keyboard focus; the name slides 4 px and the arrow nudges.
- **Monogram loop (7 s):** both letters draw together over 1.6 s at one pen speed (dash lengths 140 and 160), hold
  about 3.8 s, erase over 1 s, a 0.4 s beat, redraw. Fully drawn in the HTML; the loop class is added only once the
  clock runs. `data-draw` records the decision for tests.
- **Skills strip:** a 32 s marquee; screen readers get the list once.
- **Pause control** (WCAG 2.2.2) stops the network, the strip, the border glint, the trace, the monogram loop, the
  tilt and the magnet; the choice is saved. `prefers-reduced-motion` stops everything.
- **Measured** (Chromium, 4x CPU throttle, pointer moving, lab): about 53 fps with everything running, 60 paused
  (Aurora Glass measured about 45 the same way). With the training background: 41-47 fps.

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
- 2026-10-15: The user found the yellow and a cyan-only monogram unattractive. Of four single-accent previews on
  the real site (cyan, electric blue, emerald, monochrome) they picked **electric blue** for everything, including
  the AG loop, favicon and OG image.
- 2026-10-15: Background changed from the neuron network to an ML "doodle": of three previews (training a
  network, gradient descent on a loss landscape, k-means clusters) the user chose **training a network**.
- 2026-10-21: Redesign to **Precision** (see Theme). Removed: the blue wipe on link rows (now an accent bar), the
  hover-only SVG trace (now the conic edge), sheet drop shadows, the indented second name line. Added: the
  command bar and menu, the dot grid, link groups as sheets. The network is fainter and sits behind the content
  column on desktop.
