import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import path from "node:path";

// The live resume lives on abhinesh.codes; tests serve a two-page fixture instead so they never hit the network.
const PDF_URL = "https://abhinesh.codes/resume.pdf";
// Playwright runs from the project root (where playwright.config.ts lives).
const fixture = readFileSync(path.resolve("e2e/fixtures/resume-fixture.pdf"));

async function serveFixture(page: Page) {
  await page.route(PDF_URL, (route) =>
    route.fulfill({ status: 200, body: fixture, headers: { "content-type": "application/pdf", "access-control-allow-origin": "*" } }),
  );
}

function collectErrors(page: Page) {
  const errors: string[] = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("response", (r) => {
    if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`);
  });
  return errors;
}

const viewer = (page: Page) => page.locator(".viewer");

test("View resume opens the in-site viewer", async ({ page }) => {
  await serveFixture(page);
  await page.goto("/");
  await page.getByRole("link", { name: "View resume" }).click();
  await expect(page).toHaveURL(/\/resume\/$/);
  await expect(viewer(page)).toHaveAttribute("data-state", "ready");
});

test("renders every page, counts pages, exposes the text to assistive tech, no errors", async ({ page }) => {
  const errors = collectErrors(page);
  await serveFixture(page);
  await page.goto("/resume/");
  await expect(viewer(page)).toHaveAttribute("data-state", "ready");
  const canvases = page.locator("canvas.pdf-canvas");
  await expect(canvases).toHaveCount(2);
  await expect(canvases.nth(0)).toHaveAttribute("data-rendered", "true");
  await expect(canvases.nth(1)).toHaveAttribute("data-rendered", "true");
  // Real pixels, not a blank canvas: some pixel in the top half must be dark text.
  const inked = await canvases.nth(0).evaluate((c: HTMLCanvasElement) => {
    const ctx = c.getContext("2d")!;
    const { data } = ctx.getImageData(0, 0, c.width, Math.floor(c.height / 2));
    for (let i = 0; i < data.length; i += 4) if (data[i] < 100 && data[i + 3] > 200) return true;
    return false;
  });
  expect(inked).toBe(true);
  await expect(page.locator(".viewer-bar output").first()).toContainText("PG 01 / 02");
  await expect(page.locator(".pdf-page .sr-only").first()).toContainText("Fixture resume");
  expect(errors).toEqual([]);
});

test("zoom buttons and keys change the page size and readout", async ({ page }) => {
  await serveFixture(page);
  await page.goto("/resume/");
  const canvas = page.locator("canvas.pdf-canvas").first();
  await expect(canvas).toHaveAttribute("data-rendered", "true");
  const w0 = (await canvas.boundingBox())!.width;
  await page.getByRole("button", { name: "Zoom in" }).click();
  await expect(page.locator(".zoom-level")).toContainText("125%");
  await expect.poll(async () => (await canvas.boundingBox())!.width).toBeGreaterThan(w0 * 1.2);
  await page.keyboard.press("0");
  await expect(page.locator(".zoom-level")).toContainText("100%");
  for (let i = 0; i < 3; i++) await page.keyboard.press("-");
  await expect(page.locator(".zoom-level")).toContainText("50%");
  await expect(page.getByRole("button", { name: "Zoom out" })).toBeDisabled();
  // Zooming never makes the page itself scroll sideways: only the viewer region does.
  await page.getByRole("button", { name: "Fit to width" }).click();
  for (let i = 0; i < 4; i++) await page.getByRole("button", { name: "Zoom in" }).click();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(overflow).toBe(false);
});

test("Download saves the PDF with a proper file name", async ({ page }) => {
  await serveFixture(page);
  await page.goto("/resume/");
  await expect(viewer(page)).toHaveAttribute("data-state", "ready");
  const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Download resume" }).click()]);
  expect(download.suggestedFilename()).toBe("Abhinesh-Gangwar-Resume.pdf");
  const saved = readFileSync((await download.path())!);
  expect(saved.subarray(0, 5).toString()).toBe("%PDF-");
});

test("load failure shows an error with a direct link, and Try again recovers", async ({ page }) => {
  let fail = true;
  await page.route(PDF_URL, (route) =>
    fail
      ? route.abort("failed")
      : route.fulfill({ status: 200, body: fixture, headers: { "content-type": "application/pdf", "access-control-allow-origin": "*" } }),
  );
  await page.goto("/resume/");
  // Scoped: Next.js also renders its own (empty) role="alert" route announcer.
  const alert = page.locator(".viewer-error");
  await expect(alert).toHaveAttribute("role", "alert");
  await expect(alert).toContainText("COULD NOT LOAD THE PDF");
  await expect(alert.getByRole("link", { name: "Open the PDF" })).toHaveAttribute("href", PDF_URL);
  await expect(page.getByRole("button", { name: "Download resume" })).toBeDisabled();
  fail = false;
  await alert.getByRole("button", { name: "Try again" }).click();
  await expect(viewer(page)).toHaveAttribute("data-state", "ready");
});

test("back link returns to the links page", async ({ page }) => {
  await serveFixture(page);
  await page.goto("/resume/");
  await page.getByRole("link", { name: "Back to links" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Abhinesh Gangwar" })).toBeVisible();
});

for (const scheme of ["light", "dark"] as const) {
  test(`viewer a11y (axe) ${scheme}`, async ({ page }, info) => {
    await serveFixture(page);
    await page.goto("/resume/");
    await page.emulateMedia({ colorScheme: scheme, reducedMotion: "reduce" });
    await page.reload();
    expect(await page.evaluate(() => matchMedia("(prefers-color-scheme: dark)").matches)).toBe(scheme === "dark");
    await expect(viewer(page)).toHaveAttribute("data-state", "ready");
    const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
    expect(axe.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
    if (info.project.name === "chromium") {
      await page.screenshot({ path: `e2e/shots/resume-desktop-${scheme}.png`, animations: "disabled" });
    }
  });
}

test("phone: toolbar fits, every control keeps a name", async ({ page }, info) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await serveFixture(page);
  await page.goto("/resume/");
  await expect(viewer(page)).toHaveAttribute("data-state", "ready");
  // Regression: the page once rendered 0 px wide on phones (fit width never measured).
  const canvas = page.locator("canvas.pdf-canvas").first();
  await expect(canvas).toHaveAttribute("data-rendered", "true");
  expect((await canvas.boundingBox())!.width).toBeGreaterThan(300);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(overflow).toBe(false);
  for (const name of ["Back to links", "Zoom out", "Zoom in", "Fit to width", "Download resume"]) {
    await expect(page.getByRole(name === "Back to links" ? "link" : "button", { name })).toBeVisible();
  }
  if (info.project.name === "chromium") await page.screenshot({ path: "e2e/shots/resume-mobile.png", animations: "disabled" });

  // Smallest supported width: the toolbar row must still fit without sideways scrolling.
  await page.setViewportSize({ width: 320, height: 640 });
  const tight = await page.evaluate(() => {
    const bar = document.querySelector(".viewer-bar")!;
    return [...bar.querySelectorAll("*")].some((el) => el.getBoundingClientRect().right > document.documentElement.clientWidth + 0.5);
  });
  expect(tight).toBe(false);
});
