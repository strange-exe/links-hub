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

// Open Graph card ("Signal" theme): graphite, a faint node network on the right, plain AG stroke, two-line name,
// mono status with the blue dot.
const nodes = [[760, 90], [880, 160], [1010, 110], [1120, 210], [820, 300], [960, 280], [1090, 360], [870, 430], [1000, 470], [1150, 520], [780, 540], [930, 590]];
const links = [[0, 1], [1, 2], [2, 3], [1, 4], [1, 5], [5, 3], [5, 6], [4, 7], [7, 8], [8, 6], [6, 9], [8, 9], [7, 10], [10, 11], [8, 11], [4, 5]];
const net = links.map(([a, b]) => `<line x1="${nodes[a][0]}" y1="${nodes[a][1]}" x2="${nodes[b][0]}" y2="${nodes[b][1]}"/>`).join("")
  + nodes.map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="${i % 4 === 1 ? 5 : 3}"${i === 5 ? ' style="fill:#7c9cff"' : ""}/>`).join("");
await page.setViewportSize({ width: 1200, height: 630 });
await page.setContent(`<!doctype html><html><head>
<link href="https://fonts.googleapis.com/css2?family=Geist:wght@800&family=JetBrains+Mono:wght@500&display=swap" rel="stylesheet">
<style>
  body{margin:0;width:1200px;height:630px;background:#0b0b0c;color:#ededed;font-family:'Geist',sans-serif;overflow:hidden;position:relative}
  .net{position:absolute;inset:0}
  .net line{stroke:rgba(237,237,237,.16);stroke-width:1.5}
  .net circle{fill:rgba(237,237,237,.55)}
  .wrap{position:absolute;left:96px;top:0;bottom:0;display:flex;flex-direction:column;justify-content:center}
  .mark{width:130px;height:82px;margin-bottom:40px}
  h1{font-size:96px;line-height:.98;margin:0 0 30px;font-weight:800;letter-spacing:-.045em}
  h1 span{display:block;margin-left:.5em;color:#9b9b9f}
  .status{display:flex;gap:14px;align-items:center;font:500 24px 'JetBrains Mono',monospace}
  .dot{width:14px;height:14px;border-radius:50%;background:#7c9cff}
  .url{position:absolute;right:64px;bottom:52px;font:500 22px 'JetBrains Mono',monospace;color:#9b9b9f}
</style></head><body>
<svg class="net" viewBox="0 0 1200 630">${net}</svg>
<div class="wrap">
  <svg class="mark" viewBox="8 18 104 66"><g fill="none" stroke="#7c9cff" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"><path d="M14 78 L30 24 H38 L54 78 M21 60 H47"/><path d="M99.2 35.9 A25 25 0 1 0 105 52 H87"/></g></svg>
  <h1>Abhinesh<span>Gangwar.</span></h1>
  <div class="status"><span class="dot"></span>Open to SWE or ML internships</div>
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
