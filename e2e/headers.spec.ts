import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import path from "node:path";

// The preview server applies out/_headers exactly as Cloudflare does, so these run under the production CSP.
const fixture = readFileSync(path.resolve("e2e/fixtures/resume-fixture.pdf"));

async function recordViolations(page: Page) {
  await page.addInitScript(() => {
    (window as unknown as { __csp: string[] }).__csp = [];
    document.addEventListener("securitypolicyviolation", (e) =>
      (window as unknown as { __csp: string[] }).__csp.push(`${e.violatedDirective} ${e.blockedURI}`),
    );
  });
}
const violations = (page: Page) => page.evaluate(() => (window as unknown as { __csp: string[] }).__csp);

test("security headers are served on every page", async ({ request }) => {
  for (const url of ["/", "/resume/"]) {
    const res = await request.get(url);
    const h = res.headers();
    expect(h["content-security-policy"], url).toContain("default-src 'self'");
    expect(h["content-security-policy"], url).not.toContain("unsafe-eval");
    expect(h["content-security-policy"], url).toMatch(/script-src 'self'( 'sha256-[A-Za-z0-9+/=]+')+;/);
    expect(h["x-content-type-options"], url).toBe("nosniff");
    expect(h["referrer-policy"], url).toBe("strict-origin-when-cross-origin");
  }
  const asset = await request.get("/pdfjs/6.4.299/pdf.worker.min.mjs");
  expect(asset.headers()["cache-control"]).toContain("immutable");
  expect((await request.get("/_headers")).status()).toBe(404); // the rules file itself is never served
});

test("home page runs with zero CSP violations (theme toggle, copy, QR included)", async ({ page }) => {
  await recordViolations(page);
  await page.goto("/");
  await page.getByRole("group", { name: "Colour mode" }).getByRole("button", { name: "Dark" }).click();
  await page.getByRole("button", { name: "Show QR code" }).click();
  await page.keyboard.press("Escape");
  await page.reload(); // exercises the pre-paint prefs script with a saved preference
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  expect(await violations(page)).toEqual([]);
});

test("resume viewer (pdf.js + worker) runs with zero CSP violations", async ({ page }) => {
  await recordViolations(page);
  await page.route("https://abhinesh.codes/resume.pdf", (route) =>
    route.fulfill({ body: fixture, headers: { "content-type": "application/pdf", "access-control-allow-origin": "*" } }),
  );
  await page.goto("/resume/");
  await expect(page.locator(".viewer")).toHaveAttribute("data-state", "ready", { timeout: 15_000 });
  await expect(page.locator("canvas.pdf-canvas").first()).toHaveAttribute("data-rendered", "true");
  expect(await violations(page)).toEqual([]);
});

test("unknown paths get the 404 page with a 404 status", async ({ request }) => {
  const res = await request.get("/does-not-exist/");
  expect(res.status()).toBe(404);
  expect(res.headers()["content-security-policy"]).toBeTruthy();
});
