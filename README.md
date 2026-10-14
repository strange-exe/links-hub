# links.abhinesh.codes

Link hub for Abhinesh Gangwar, in the "Signal" style: graphite with a single sun-yellow signal, a live 3D neuron
network behind solid sheets, kinetic type, and a self-drawing AG monogram. It's built with Next.js and exported as
static files, so any static host can serve it.

## Features

- Resume-first layout for recruiters, then the featured project and grouped profile links (two columns on desktop)
- Custom resume viewer at `/resume/`: PDF.js renders the live PDF from abhinesh.codes, with a page counter, zoom
  (buttons and `-` `+` `0` keys), a real download, and loading and error states. PDF.js loads only on that page.
- Canvas 3D neuron network (no three.js): turning node volume with signals travelling along links; it pauses in
  hidden tabs and with the Pause control (WCAG 2.2.2), and draws one still frame under `prefers-reduced-motion`
- Motion that never hides content: letter-by-letter name, spring-settling sheets, a tilting featured card with a
  border trace, sun-yellow wipes on link rows, a magnetic View resume button styled like the portfolio's, and a
  skills strip
- Phosphor icons rendered on the server (no icon JavaScript in the browser)
- Light and dark mode that follows the system, with a saved manual override and no flash on load
- Copy-email button with success and failure feedback, and a QR code in a native `<dialog>`
- Open Graph image, favicon set, and `Person` JSON-LD with `sameAs`

## Editing content

All text and links live in [`lib/profile.ts`](lib/profile.ts). Design tokens and decisions are in [`design.md`](design.md).

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Generates `public/qr.svg`, copies the PDF.js worker and fonts to `public/pdfjs/<version>/`, then exports the site to `out/` |
| `npm run preview` | Serves `out/` at http://127.0.0.1:4173 |
| `npm run lint` / `npm run typecheck` | ESLint (Next.js core-web-vitals + TypeScript) and `tsc` |
| `npm run test:e2e` | Playwright against the built `out/` in Chromium, Firefox and WebKit (run `build` first) |
| `npm run check` | All of the above, in CI order |
| `npm run images` | Regenerates `app/apple-icon.png`, `app/favicon.ico` and `app/opengraph-image.png` |

First-time test setup: `npx playwright install chromium firefox webkit`. The suite serves `out/` on port 4174, so
it runs alongside `npm run preview` (4173); set `E2E_PORT` if 4174 is taken. GitHub Actions runs the full `check` list on every push.

## Tests

`e2e/site.spec.ts` covers:

- **Layout:** desktop 1440 and mobile 390, light and dark. The resume button sits above the fold, with no overflow (also at 320 px) and no console or network errors.
- **Accessibility:** axe (WCAG 2.2 AA) and token contrast.
- **Favicon:** the declared icons are fetched and their bytes checked.
- **Motion:** reduced motion, the pause control and its persistence.
- **Interactions:** colour-mode persistence, copy-email success and failure, QR dialog focus handling, keyboard order, the chip highlight, and the JSON-LD.

## Deploying

Deployed as a Cloudflare Workers static-assets site (no Worker script, no OpenNext). In Workers Builds:

- **Build command:** `npm run build`, not `npm run check`. This exports to `out/` and writes `out/_headers` with
  security headers, a hash-based Content Security Policy and caching rules. The Cloudflare build image has no
  Playwright browsers, so the tests run in GitHub Actions instead (`.github/workflows/ci.yml`).
- **Deploy command:** `npx wrangler deploy`. It reads `wrangler.jsonc` and uploads `out/` as static assets.

Because `wrangler.jsonc` exists, `wrangler deploy` skips its automatic framework setup. Without it, that setup
assumed a server-rendered Next.js app and failed. `out/` also works on any other static host; `_headers` is
Cloudflare/Netlify syntax.

## Stack

Next.js 16.4 (`output: "export"`), React 19.3, TypeScript 5.9, Playwright 1.64.
