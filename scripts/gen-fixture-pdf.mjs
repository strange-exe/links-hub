// Generates e2e/fixtures/resume-fixture.pdf: a two-page stand-in for the real resume, so viewer tests
// never depend on the network. Run once with `node scripts/gen-fixture-pdf.mjs` and commit the output.
import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent(`<!doctype html><html><body style="font-family:Arial,sans-serif;margin:48px">
  <h1>Fixture resume</h1><p>Test document for the links site viewer. Page one.</p>
  <div style="break-after:page"></div>
  <h1>Second page</h1><p>Fixture page two.</p>
</body></html>`);
await mkdir(new URL("../e2e/fixtures/", import.meta.url), { recursive: true });
await page.pdf({ path: fileURLToPath(new URL("../e2e/fixtures/resume-fixture.pdf", import.meta.url)), format: "A4" });
await browser.close();
console.log("e2e/fixtures/resume-fixture.pdf written");
