// One-off asset generator (run with `npm run images`, then commit the outputs):
//   app/apple-icon.png        180x180 home-screen icon
//   app/favicon.ico           32x32 RGBA PNG wrapped in an ICO container (for browsers that ask for /favicon.ico)
//   app/opengraph-image.png   1200x630 link-preview card
//   .claude/design/icon-strip.png  favicon legibility check at 16/20/32/64 px on light and dark strips
import { chromium } from "@playwright/test";
import { mkdir, readFile, writeFile } from "node:fs/promises";

const iconSvg = await readFile(new URL("../app/icon.svg", import.meta.url), "utf8");
const toData = (svg) => `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
const iconData = toData(iconSvg);

const browser = await chromium.launch();
const page = await browser.newPage();

async function renderIcon(size, src, transparent) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<html><body style="margin:0;background:${transparent ? "transparent" : "#050505"}">
    <img src="${src}" width="${size}" height="${size}" style="display:block"></body></html>`);
  // omitBackground keeps an alpha channel (RGBA), which ICO decoders require.
  return page.screenshot({ type: "png", omitBackground: transparent });
}

// iOS applies its own corner mask, so the home-screen icon is a full-bleed square.
const squareSvg = iconSvg.replace('rx="30"', 'rx="0"');
if (squareSvg === iconSvg) throw new Error("icon.svg tile radius changed: update the apple-icon square replace");
await writeFile(new URL("../app/apple-icon.png", import.meta.url), await renderIcon(180, toData(squareSvg), false));

// ICO with one embedded RGBA PNG image (supported by every current browser).
const png32 = await renderIcon(32, iconData, true);
const header = Buffer.alloc(22);
header.writeUInt16LE(0, 0); // reserved
header.writeUInt16LE(1, 2); // type: icon
header.writeUInt16LE(1, 4); // image count
header.writeUInt8(32, 6); // width
header.writeUInt8(32, 7); // height
header.writeUInt8(0, 8); // palette
header.writeUInt8(0, 9); // reserved
header.writeUInt16LE(1, 10); // colour planes
header.writeUInt16LE(32, 12); // bits per pixel
header.writeUInt32LE(png32.length, 14); // image size
header.writeUInt32LE(22, 18); // image offset
await writeFile(new URL("../app/favicon.ico", import.meta.url), Buffer.concat([header, png32]));

// Open Graph card: aurora on near-black, glass monogram tile, name, status.
await page.setViewportSize({ width: 1200, height: 630 });
await page.setContent(`<!doctype html><html><head>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;800&family=JetBrains+Mono:wght@500&display=swap" rel="stylesheet">
<style>
  body{margin:0;width:1200px;height:630px;background:#06050d;color:#f5f3ff;font-family:'Plus Jakarta Sans',sans-serif;overflow:hidden;position:relative}
  .a{position:absolute;border-radius:50%}
  .a1{width:900px;height:900px;left:-380px;top:-460px;background:radial-gradient(circle,rgba(124,58,237,.6),transparent 62%)}
  .a2{width:900px;height:900px;right:-420px;top:-120px;background:radial-gradient(circle,rgba(79,70,229,.45),transparent 62%)}
  .a3{width:520px;height:520px;left:520px;bottom:-380px;background:radial-gradient(circle,rgba(250,204,21,.35),transparent 62%)}
  .wrap{position:absolute;left:96px;top:0;bottom:0;display:flex;flex-direction:column;justify-content:center}
  .tile{width:150px;height:125px;margin-bottom:36px}
  h1{font-size:88px;line-height:1;margin:0 0 18px;font-weight:800;letter-spacing:-.045em}
  p{margin:0;color:#a9a3c2;font-size:30px}
  .pill{display:inline-flex;gap:14px;align-items:center;align-self:flex-start;margin-top:30px;padding:12px 22px;border:1px solid rgba(250,204,21,.4);border-radius:999px;
    font:500 24px 'JetBrains Mono',monospace;background:rgba(250,204,21,.08)}
  .dot{width:14px;height:14px;border-radius:50%;background:#facc15}
  .url{position:absolute;right:64px;bottom:52px;font:500 24px 'JetBrains Mono',monospace;color:#a9a3c2}
</style></head><body>
<div class="a a1"></div><div class="a a2"></div><div class="a a3"></div>
<div class="wrap">
  <svg class="tile" viewBox="0 0 120 100"><defs><linearGradient id="s" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f5f3ff"/><stop offset=".45" stop-color="#a78bfa"/><stop offset=".8" stop-color="#7c3aed"/><stop offset="1" stop-color="#facc15"/></linearGradient></defs>
    <rect x="1" y="1" width="118" height="98" rx="30" fill="rgba(15,13,26,.75)" stroke="rgba(245,243,255,.16)"/>
    <g fill="none" stroke="url(#s)" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"><path d="M14 78 L30 24 H38 L54 78 M21 60 H47"/><path d="M99.2 35.9 A25 25 0 1 0 105 52 H87"/></g></svg>
  <h1>Abhinesh Gangwar</h1>
  <p>B.Tech CSE (AI &amp; ML) at Graphic Era. Building AI tools.</p>
  <div class="pill"><span class="dot"></span>Open to SWE or ML internships</div>
</div>
<div class="url">links.abhinesh.codes</div>
</body></html>`);
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(300);
await writeFile(new URL("../app/opengraph-image.png", import.meta.url), await page.screenshot({ type: "png" }));

// Legibility strip for the favicon review.
await page.setViewportSize({ width: 360, height: 160 });
const row = (bg) => `<div style="display:flex;gap:24px;align-items:center;padding:16px;background:${bg}">
  ${[16, 20, 32, 64].map((s) => `<img src="${iconData}" width="${s}" height="${s}">`).join("")}</div>`;
await page.setContent(`<body style="margin:0">${row("#ffffff")}${row("#202124")}</body>`);
await mkdir(new URL("../.claude/design/", import.meta.url), { recursive: true });
await writeFile(new URL("../.claude/design/icon-strip.png", import.meta.url), await page.screenshot({ type: "png" }));

await browser.close();
console.log("apple-icon.png, favicon.ico, opengraph-image.png written");
