# links.abhinesh.codes

Link hub for Abhinesh Gangwar, in the "Aurora Glass" style: a violet aurora with a sun-yellow glint on midnight black,
glass panels, and a self-drawing AG monogram. It's built with Next.js and exported as static files, so any static host
can serve it.

## Features

- Resume-first layout for recruiters, then the featured project and grouped profile links (two columns on desktop)
- Custom resume viewer at `/resume/`: PDF.js renders the live PDF from abhinesh.codes, with a page counter, zoom
  (buttons and `-` `+` `0` keys), a real download, and loading and error states. PDF.js loads only on that page.
- CSS-only animated aurora with film grain, a pause control (WCAG 2.2.2), and a static frame under `prefers-reduced-motion`
- Glass panels with gradient hairline borders and a cursor spotlight (fine pointers only)
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

First-time test setup: `npx playwright install chromium firefox webkit`.

## Tests

`e2e/site.spec.ts` covers:

- **Layout:** desktop 1440 and mobile 390, light and dark. The resume button sits above the fold, with no overflow (also at 320 px) and no console or network errors.
- **Accessibility:** axe (WCAG 2.2 AA) and token contrast.
- **Favicon:** the declared icons are fetched and their bytes checked.
- **Motion:** reduced motion, the pause control and its persistence.
- **Interactions:** colour-mode persistence, copy-email success and failure, QR dialog focus handling, keyboard order, the chip highlight, and the JSON-LD.

## Deploying

`npm run build` writes a self-contained static site to `out/`. Upload that folder to any static host and point
`links.abhinesh.codes` at it.

## Stack

Next.js 16.4 (`output: "export"`), React 19.3, TypeScript 5.9, Playwright 1.64.
