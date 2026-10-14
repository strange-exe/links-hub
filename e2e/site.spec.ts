import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const viewports = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "mobile", width: 390, height: 844 },
];

// Load, THEN emulate, THEN reload, then prove the emulation is really active (lessons.md 2026-10-12).
async function openIn(page: Page, opts: { colorScheme?: "light" | "dark"; reducedMotion?: "reduce" | "no-preference" }) {
  await page.goto("/");
  await page.emulateMedia(opts);
  await page.reload();
  if (opts.colorScheme) {
    const dark = await page.evaluate(() => matchMedia("(prefers-color-scheme: dark)").matches);
    expect(dark, `color scheme emulation not applied (${opts.colorScheme})`).toBe(opts.colorScheme === "dark");
  }
  if (opts.reducedMotion === "reduce") {
    expect(await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches)).toBe(true);
  }
}

function collectErrors(page: Page) {
  const errors: string[] = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("requestfailed", (r) => errors.push(`failed: ${r.url()} ${r.failure()?.errorText}`));
  page.on("response", (r) => {
    if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`);
  });
  return errors;
}

const resume = (page: Page) => page.getByRole("link", { name: "View resume" });

// Entrances hold their start offset while a fresh browser's animation clock is stalled (by design: readable, a
// few px off), so measurements of final positions and transforms wait for every finite animation to finish.
const animationsDone = (page: Page) =>
  page.evaluate(() =>
    Promise.all(
      document.getAnimations()
        .filter((a) => a.effect?.getComputedTiming().iterations !== Infinity)
        .map((a) => a.finished),
    ),
  );

for (const vp of viewports)
  for (const scheme of ["light", "dark"] as const) {
    test(`home ${vp.name} ${scheme}: resume above the fold, no overflow, no errors`, async ({ page }, info) => {
      const errors = collectErrors(page);
      await page.setViewportSize(vp);
      await openIn(page, { colorScheme: scheme });
      await expect(page.getByRole("heading", { level: 1, name: "Abhinesh Gangwar" })).toBeVisible();
      await expect(resume(page)).toBeInViewport({ ratio: 1 });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
      expect(overflow).toBe(false);
      if (info.project.name === "chromium") {
        await page.screenshot({ path: `e2e/shots/home-${vp.name}-${scheme}.png`, fullPage: true, animations: "disabled" });
      }
      expect(errors).toEqual([]);
    });
  }

test("no horizontal scroll at 320 px", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto("/");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(overflow).toBe(false);
});

for (const scheme of ["light", "dark"] as const) {
  test(`a11y (axe) + hierarchy shots ${scheme}`, async ({ page }, info) => {
    await openIn(page, { colorScheme: scheme, reducedMotion: "reduce" });
    const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
    expect(axe.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
    if (info.project.name !== "chromium") return;
    for (const [name, filter] of [
      ["gray", "grayscale(1)"],
      ["blur", "blur(6px)"],
    ] as const) {
      const tag = await page.addStyleTag({ content: `html{filter:${filter}}` });
      await page.screenshot({ path: `e2e/shots/home-${scheme}-${name}.png`, animations: "disabled" });
      await tag.evaluate((el) => (el as Element).remove());
    }
  });

  test(`token contrast passes AA ${scheme}`, async ({ page }) => {
    await openIn(page, { colorScheme: scheme });
    const results = await page.evaluate(() => {
      const probe = document.createElement("span");
      document.body.append(probe);
      const rgb = (token: string) => {
        probe.style.color = `var(${token})`;
        return getComputedStyle(probe).color.match(/[\d.]+/g)!.slice(0, 3).map(Number);
      };
      const lum = (c: number[]) =>
        c.map((v) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)).reduce((a, v, i) => a + v * [0.2126, 0.7152, 0.0722][i], 0);
      const ratio = (a: string, b: string) => {
        const [x, y] = [lum(rgb(a)), lum(rgb(b))].sort((p, q) => q - p);
        return (x + 0.05) / (y + 0.05);
      };
      const pairs: [string, string, number][] = [
        ["--text", "--bg", 4.5],
        ["--text", "--surface", 4.5],
        ["--muted", "--bg", 4.5],
        ["--muted", "--surface", 4.5],
        ["--text", "--raised", 4.5],
        ["--on-cta", "--cta", 4.5], // skip link and the viewer's primary button
        ["--on-wipe", "--wipe", 4.5], // link row text on the blue hover fill
        ["--focus", "--bg", 3], // focus ring
        ["--focus", "--surface", 3],
        ["--accent", "--bg", 4.5], // signal labels and readouts
        ["--accent", "--surface", 4.5], // the "// featured project" label is accent text on a sheet
        ["--status", "--surface", 3], // availability dot (paired with text)
        ["--mark", "--surface", 3], // AG monogram, a named graphic on the identity sheet
        ["--muted", "--raised", 4.5],
      ];
      return pairs.map(([f, b, min]) => ({ pair: `${f} on ${b}`, ratio: +ratio(f, b).toFixed(2), min }));
    });
    for (const r of results) expect(r.ratio, r.pair).toBeGreaterThanOrEqual(r.min);
  });
}

// lessons.md 2026-10-12 (Setu): no console error or axe rule catches a missing favicon. Fetch and check bytes.
test("favicon and apple-touch-icon exist and match their declared format", async ({ page, request }) => {
  await page.goto("/");
  const icons = await page.$$eval('link[rel~="icon"], link[rel="apple-touch-icon"]', (els) =>
    els.map((e) => ({ rel: e.getAttribute("rel"), href: (e as HTMLLinkElement).href, type: e.getAttribute("type") })),
  );
  expect(icons.some((i) => i.rel?.split(" ").includes("icon")), "no <link rel=icon>").toBe(true);
  expect(icons.some((i) => i.rel === "apple-touch-icon"), "no apple-touch-icon").toBe(true);
  for (const icon of icons) {
    const res = await request.get(icon.href);
    expect(res.status(), icon.href).toBe(200);
    const b = await res.body();
    const isPng = b.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47]));
    const isIco = b.subarray(0, 4).equals(Buffer.from([0x00, 0x00, 0x01, 0x00]));
    const isSvg = b.subarray(0, 512).toString("utf8").includes("<svg");
    const declared = icon.type ?? "image/png";
    const ok = declared.includes("svg") ? isSvg : declared.includes("icon") ? isIco || isPng : isPng;
    expect(ok, `${icon.href}: bytes don't match ${declared}`).toBe(true);
    if (icon.rel === "apple-touch-icon") expect(isPng, "apple-touch-icon must be a PNG").toBe(true);
  }
  const og = await page.locator('meta[property="og:image"]').getAttribute("content");
  const ogRes = await request.get(new URL(og!).pathname + new URL(og!).search);
  expect(ogRes.status()).toBe(200);
});

const field = (page: Page) => page.getByTestId("field");

test("reduced motion: nothing animates and the pause button is hidden", async ({ page }) => {
  await openIn(page, { reducedMotion: "reduce" });
  const names = await page.evaluate(() =>
    [".name .ch", ".sheet", ".links .rise", ".dot", ".ticker .run", ".trace rect"].map(
      (s) => getComputedStyle(document.querySelector(s)!).animationName,
    ),
  );
  expect(names).toEqual(["none", "none", "none", "none", "none", "none"]);
  await expect(page.locator(".mark[data-draw]")).toHaveAttribute("data-draw", "skip-motion"); // no draw loop either
  await expect(field(page)).toHaveAttribute("data-field", "still"); // the network is drawn once, not animated
  await expect(page.getByRole("button", { name: "Pause background animation" })).toBeHidden();
  await expect(resume(page)).toBeVisible();
});

test("pause button stops the network and the skills strip, and the choice persists", async ({ page }) => {
  await openIn(page, { reducedMotion: "no-preference" });
  const ticker = page.locator(".ticker .run");
  const pause = page.getByRole("button", { name: "Pause background animation" });
  await expect(pause).toHaveAttribute("aria-pressed", "false");
  await expect(field(page)).toHaveAttribute("data-field", "running", { timeout: 8_000 });
  await expect(ticker).toHaveCSS("animation-play-state", "running");
  await pause.click();
  await expect(pause).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("html")).toHaveAttribute("data-motion", "paused");
  await expect(field(page)).toHaveAttribute("data-field", "still");
  await expect(ticker).toHaveCSS("animation-play-state", "paused");
  await page.reload();
  await expect(page.getByRole("button", { name: "Pause background animation" })).toHaveAttribute("aria-pressed", "true");
  await expect(field(page)).toHaveAttribute("data-field", "still");
  await page.getByRole("button", { name: "Pause background animation" }).click();
  await expect(page.locator("html")).not.toHaveAttribute("data-motion", /.*/);
  await expect(field(page)).toHaveAttribute("data-field", "running");
});

test("hero content is fully visible immediately: entrances move, never fade or clip", async ({ page }) => {
  // Regression: a cold browser start stalled the animation clock 1-3 s, and opacity-0 entrances left the page
  // blank. Every entrance may only move: no opacity in any keyframes, and the name's letters are never masked.
  await openIn(page, { reducedMotion: "no-preference" });
  for (const sel of [".name", ".role", ".status", ".cta"]) {
    expect(await page.locator(sel).evaluate((el) => getComputedStyle(el).opacity), sel).toBe("1");
  }
  const fades = await page.evaluate(() =>
    document.getAnimations()
      .filter((a) => (a.effect as KeyframeEffect).getKeyframes().some((k) => "opacity" in k))
      .map((a) => (a as CSSAnimation).animationName),
  );
  expect(fades.filter((n) => n !== "ping")).toEqual([]); // only the status dot's decorative ping ring fades
  expect(await page.locator(".name .line").first().evaluate((el) => getComputedStyle(el).overflow)).toBe("visible");
});

// Records whether the monogram's loop class was ever added, from the first moment of each load.
async function watchDraw(page: Page, stallClock = false) {
  await page.addInitScript((stall) => {
    const w = window as unknown as { __drew: boolean };
    w.__drew = false;
    // Cold-start stall. On the prototype: after a reload WebKit swaps in a new document.timeline object after init
    // scripts run, so an override on the instance was silently lost there.
    if (stall) Object.defineProperty(DocumentTimeline.prototype, "currentTime", { get: () => 0, configurable: true });
    new MutationObserver((records) => {
      if (records.some((r) => (r.target as Element).classList?.contains("looping"))) w.__drew = true;
    }).observe(document, { subtree: true, attributes: true, attributeFilter: ["class"] });
  }, stallClock);
}
const drew = (page: Page) => page.evaluate(() => (window as unknown as { __drew: boolean }).__drew);
// Wait on the component's recorded decision, never on time or frame counts: headless Chromium can go 800 ms+
// without a frame, and WebKit can run several frames before hydration, so timed waits passed vacuously.
const markEl = (page: Page) => page.locator(".mark[data-draw]");
const strokes = (page: Page) =>
  page.locator(".mark .strokes path").evaluateAll((ps) =>
    ps.map((p) => ({ anim: getComputedStyle(p).animationName, dash: getComputedStyle(p).strokeDasharray })),
  );
const STATIC = [{ anim: "none", dash: "none" }, { anim: "none", dash: "none" }];
// Seeks every loop animation to time t (ms) and returns each stroke's dash offset there.
const offsetsAt = (page: Page, t: number) =>
  page.evaluate((t) => {
    const paths = [...document.querySelectorAll(".mark .strokes path")];
    for (const a of document.getAnimations()) {
      if ((a as CSSAnimation).animationName !== "ag-loop") continue;
      a.pause();
      a.currentTime = t;
    }
    return paths.map((p) => parseFloat(getComputedStyle(p).strokeDashoffset));
  }, t);

test("monogram loops: both letters draw together, hold fully drawn, erase, repeat", async ({ page }) => {
  await watchDraw(page);
  await openIn(page, { reducedMotion: "no-preference" });
  await expect(markEl(page)).toHaveAttribute("data-draw", "looping", { timeout: 8_000 });
  expect(await strokes(page)).toEqual([{ anim: "ag-loop", dash: "140px" }, { anim: "ag-loop", dash: "160px" }]);
  const timing = await page.evaluate(() =>
    document.getAnimations().filter((a) => (a as CSSAnimation).animationName === "ag-loop")
      .map((a) => a.effect!.getComputedTiming().iterations),
  );
  expect(timing).toEqual([Infinity, Infinity]);
  expect(await offsetsAt(page, 150)).toEqual([140, 160]); // start: hidden
  expect(await offsetsAt(page, 150 + 3_000)).toEqual([0, 0]); // hold: fully drawn
  expect(await offsetsAt(page, 150 + 6_800)).toEqual([-140, -160]); // after the erase: hidden
  expect(await offsetsAt(page, 150 + 7_000 + 3_000)).toEqual([0, 0]); // second cycle: drawn again
});

test("monogram stays fully drawn when the animation clock is stalled (cold start)", async ({ page }) => {
  await watchDraw(page, true);
  await openIn(page, { reducedMotion: "no-preference" });
  await expect(markEl(page)).toHaveAttribute("data-draw", "skip-clock", { timeout: 8_000 });
  expect(await drew(page)).toBe(false);
  expect(await strokes(page)).toEqual(STATIC);
});

test("pause control stops the monogram loop fully drawn, and resuming restarts it", async ({ page }) => {
  await openIn(page, { reducedMotion: "no-preference" });
  await expect(markEl(page)).toHaveAttribute("data-draw", "looping", { timeout: 8_000 });
  const pause = page.getByRole("button", { name: "Pause background animation" });
  await pause.click();
  expect(await strokes(page)).toEqual(STATIC);
  await page.reload(); // paused from the first frame
  await expect(page.locator("html")).toHaveAttribute("data-motion", "paused");
  await expect(markEl(page)).toHaveAttribute("data-draw", "looping", { timeout: 8_000 });
  expect(await strokes(page)).toEqual(STATIC);
  await page.getByRole("button", { name: "Pause background animation" }).click();
  expect((await strokes(page)).map((s) => s.anim)).toEqual(["ag-loop", "ag-loop"]);
});

test("desktop: identity and content sit side by side, resume above the fold", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  const id = (await page.locator(".identity").boundingBox())!;
  const content = (await page.locator(".content").boundingBox())!;
  expect(content.x).toBeGreaterThan(id.x + id.width);
  await expect(resume(page)).toBeInViewport({ ratio: 1 });
  await expect(page.getByRole("link", { name: /GitHub/ })).toBeInViewport();
});

test("every profile link shows its name and handle, monogram has a name", async ({ page }) => {
  await page.goto("/");
  const links = page.locator("#links a.link");
  await expect(links).toHaveCount(6);
  await expect(page.getByRole("link", { name: /LeetCode/ })).toHaveAttribute("href", "https://leetcode.com/u/Abhinesh-exe/");
  for (const link of await links.all()) {
    await expect(link.locator(".lname")).not.toBeEmpty();
    await expect(link.locator(".handle")).not.toBeEmpty();
  }
  await expect(page.getByRole("img", { name: "AG monogram" })).toBeVisible();
});

test("skills strip: read once as a list, moving copies hidden from assistive tech", async ({ page }) => {
  await page.goto("/");
  const list = page.getByRole("list", { name: "Skills" });
  await expect(list.getByRole("listitem")).toHaveCount(8);
  await expect(list).toContainText("Applied NLP");
  await expect(page.locator('.ticker ul[aria-hidden="true"]')).toHaveCount(3);
});

test("network background starts with a running clock and stays still when the clock is stalled", async ({ page }) => {
  await openIn(page, { reducedMotion: "no-preference" });
  await expect(field(page)).toHaveAttribute("aria-hidden", "true");
  await expect(field(page)).toHaveAttribute("data-field", "running", { timeout: 8_000 });
  // Cold start: with the document timeline stuck at 0 the network never starts its loop (one still frame).
  await page.addInitScript(() =>
    Object.defineProperty(DocumentTimeline.prototype, "currentTime", { get: () => 0, configurable: true }),
  );
  await page.reload();
  await expect(page.locator(".mark[data-draw]")).toHaveAttribute("data-draw", "skip-clock", { timeout: 8_000 });
  await expect(field(page)).toHaveAttribute("data-field", "still");
});

test("colour mode toggle overrides the system and persists", async ({ page }) => {
  await openIn(page, { colorScheme: "light" });
  const group = page.getByRole("group", { name: "Colour mode" });
  await expect(group.getByRole("button", { name: "System" })).toHaveAttribute("aria-pressed", "true");
  await group.getByRole("button", { name: "Dark" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.locator("body")).toHaveCSS("background-color", "rgb(11, 11, 12)");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.getByRole("group", { name: "Colour mode" }).getByRole("button", { name: "Dark" })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("group", { name: "Colour mode" }).getByRole("button", { name: "System" }).click();
  await expect(page.locator("body")).toHaveCSS("background-color", "rgb(244, 244, 242)");
});

test("copy email: success message", async ({ page, context }, info) => {
  test.skip(info.project.name !== "chromium", "clipboard permissions are Chromium-only in Playwright");
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/");
  await page.getByRole("button", { name: "Copy email" }).click();
  await expect(page.getByRole("status")).toHaveText("Copied work.abhinesh@gmail.com");
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("work.abhinesh@gmail.com");
});

test("copy email: failure shows the address instead", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", { value: { writeText: () => Promise.reject(new Error("denied")) } });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Copy email" }).click();
  await expect(page.getByRole("status")).toHaveText("Couldn't copy. The address is work.abhinesh@gmail.com");
});

test("QR dialog opens, traps focus natively and closes with Escape", async ({ page, request }) => {
  await page.goto("/");
  const trigger = page.getByRole("button", { name: "Show QR code" });
  // Keyboard path: Safari/WebKit never focuses a button on mouse click, so focus-return is a keyboard concern.
  await trigger.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog", { name: "Scan to open this page" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Close" })).toBeFocused();
  await expect(dialog.getByRole("img", { name: "QR code for https://links.abhinesh.codes" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
  const qr = await request.get("/qr.svg");
  expect(qr.status()).toBe(200);
  expect((await qr.text()).startsWith("<svg")).toBe(true);
});

test("keyboard: skip link first, then reaches every link", async ({ page }, info) => {
  // Playwright WebKit follows Safari's default: Tab skips links (a user setting turns it on). Probed with
  // Tab, Alt+Tab, Meta+Tab and Control+Tab on 2026-10-12: none reach links, so link order is checked elsewhere.
  test.skip(info.project.name === "webkit", "Safari's default Tab order skips links");
  const tab = "Tab";
  await page.goto("/");
  await page.keyboard.press(tab);
  const skip = page.getByRole("link", { name: "Skip to links" });
  await expect(skip).toBeFocused();
  await expect(skip).toBeInViewport();
  const links = await page.locator("main a[href]").count();
  const seen = new Set<string>();
  for (let i = 0; i < 30; i++) {
    await page.keyboard.press(tab);
    const href = await page.evaluate(() => (document.activeElement as HTMLAnchorElement | null)?.getAttribute("href"));
    if (href) seen.add(href);
  }
  expect(seen.size).toBeGreaterThanOrEqual(links - 1);
});

test("View resume's travelling border runs, pauses, and stops for reduced motion", async ({ page }) => {
  await openIn(page, { reducedMotion: "no-preference" });
  const ring = (prop: "animationName" | "animationPlayState") =>
    page.locator(".cta").evaluate((el, p) => getComputedStyle(el, "::before")[p], prop);
  expect(await ring("animationName")).toBe("orbit");
  // Matches the portfolio's Download Resume button: mono label with a file icon.
  expect(await page.locator(".cta").evaluate((el) => getComputedStyle(el).fontFamily)).toMatch(/JetBrains Mono/);
  await expect(page.locator(".cta svg")).toHaveCount(1);
  // Regression: the ring once painted over the button fill (isolation + negative z-index). The fill must be its
  // own layer above the ring, so the label always sits on a solid colour.
  const layers = await page.locator(".cta").evaluate((el) => ({
    ring: getComputedStyle(el, "::before").zIndex,
    fill: getComputedStyle(el, "::after").zIndex,
    fillColor: getComputedStyle(el, "::after").backgroundColor,
  }));
  expect(Number(layers.ring)).toBeLessThan(Number(layers.fill));
  expect(layers.fillColor).not.toBe("rgba(0, 0, 0, 0)");
  await page.getByRole("button", { name: "Pause background animation" }).click();
  await expect.poll(() => ring("animationPlayState")).toBe("paused");
  await page.getByRole("button", { name: "Pause background animation" }).click(); // leave motion on for later tests
  await openIn(page, { reducedMotion: "reduce" });
  expect(await ring("animationName")).toBe("none");
});

test("status: real text immediately, dot hidden from assistive tech", async ({ page }) => {
  await openIn(page, { reducedMotion: "no-preference" });
  const status = page.locator(".status");
  await expect(status).toHaveText("Open to SWE or ML internships");
  await expect(status.locator(".dot")).toHaveAttribute("aria-hidden", "true");
});

test("link rows: blue wipe on hover and on keyboard focus, text stays readable on it", async ({ page }) => {
  await openIn(page, { colorScheme: "dark", reducedMotion: "no-preference" });
  const link = page.getByRole("link", { name: /GitHub/ });
  const wipe = () => link.evaluate((el) => getComputedStyle(el, "::before").transform);
  expect(await wipe()).toMatch(/^matrix\(0, /); // scaleX(0) at rest
  await link.hover();
  await expect.poll(wipe).toBe("matrix(1, 0, 0, 1, 0, 0)");
  await expect(link).toHaveCSS("color", "rgb(11, 11, 12)"); // --on-wipe on the blue fill
});

test("View resume leans toward a nearby pointer and Pause turns that off", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openIn(page, { colorScheme: "dark", reducedMotion: "no-preference" });
  await animationsDone(page);
  const cta = page.locator(".cta");
  const box = (await cta.boundingBox())!;
  await page.mouse.move(box.x + box.width + 20, box.y + box.height / 2 + 10);
  await page.mouse.move(box.x + box.width + 25, box.y + box.height / 2 + 12);
  await expect.poll(() => cta.evaluate((el) => (el as HTMLElement).style.getPropertyValue("--mx"))).toMatch(/^[1-8](\.\d)?px$/);
  await expect.poll(() => cta.evaluate((el) => getComputedStyle(el).transform)).not.toBe("none");
  await page.getByRole("button", { name: "Pause background animation" }).click();
  await page.mouse.move(box.x + box.width + 20, box.y + box.height / 2 + 10);
  await expect.poll(() => cta.evaluate((el) => getComputedStyle(el).transform)).toBe("none");
});

test("type uses one scale: at most six distinct font sizes on the page", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  const sizes = await page.evaluate(() => {
    const set = new Set<string>();
    for (const el of document.querySelectorAll("body *")) {
      const own = [...el.childNodes].some((n) => n.nodeType === Node.TEXT_NODE && n.textContent!.trim());
      if (own && el.getClientRects().length) set.add(getComputedStyle(el).fontSize);
    }
    return [...set].map(parseFloat).sort((a, b) => a - b);
  });
  expect(sizes.length, `sizes: ${sizes.join(", ")}`).toBeLessThanOrEqual(6);
  for (const s of sizes) expect([12, 14, 16, 18, 22, 72], `unexpected ${s}px`).toContain(s);
});

test("desktop: the toolbar ends level with the last link, not under the resume button", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await animationsDone(page);
  const foot = (await page.locator(".foot").boundingBox())!;
  const links = (await page.locator("#links").boundingBox())!;
  const ctas = (await page.locator(".ctas").boundingBox())!;
  expect(Math.abs(foot.y + foot.height - (links.y + links.height))).toBeLessThanOrEqual(4);
  expect(foot.y).toBeGreaterThan(ctas.y + ctas.height + 40);
});

// Unrotated: the matrix's rotation terms are identity. perspective() alone still adds a depth term (m34), so a
// flat card is not literally an identity matrix.
const flat = (t: string) => {
  if (t === "none" || t.startsWith("matrix(")) return true;
  const m = t.slice(9, -1).split(",").map(Number); // matrix3d(...)
  return [m[0] - 1, m[1], m[2], m[4], m[5] - 1, m[6], m[8], m[9]].every((v) => Math.abs(v) < 1e-3);
};

test("featured card tilts toward the pointer, settles when it leaves, and Pause turns it off", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openIn(page, { colorScheme: "dark", reducedMotion: "no-preference" });
  const shell = page.locator(".shell");
  const transform = () => shell.evaluate((el) => getComputedStyle(el).transform);
  await animationsDone(page);
  const box = (await shell.boundingBox())!;
  expect(flat(await transform())).toBe(true);
  await page.mouse.move(box.x + 30, box.y + 20);
  await page.mouse.move(box.x + 40, box.y + 24);
  await expect.poll(() => shell.evaluate((el) => (el as HTMLElement).style.getPropertyValue("--tx"))).toMatch(/^-0\.\d+$/);
  await expect.poll(async () => flat(await transform())).toBe(false);
  await page.mouse.move(box.x + box.width / 2, box.y + box.height + 400); // off the card
  await expect.poll(async () => flat(await transform()), { timeout: 3_000 }).toBe(true);
  await page.getByRole("button", { name: "Pause background animation" }).click();
  await page.mouse.move(box.x + 30, box.y + 20);
  await page.mouse.move(box.x + 40, box.y + 24);
  await expect.poll(() => shell.evaluate((el) => (el as HTMLElement).style.getPropertyValue("--tx"))).toMatch(/^-0\.\d+$/);
  await expect.poll(transform, { timeout: 3_000 }).toBe("none"); // settles flat through its transition
});

test("content: https links, valid Person JSON-LD, decorative background hidden from AT", async ({ page }) => {
  await page.goto("/");
  const hrefs = await page.locator("a[href]").evaluateAll((as) => as.map((a) => a.getAttribute("href")!));
  for (const h of hrefs) expect(h, h).toMatch(/^(https:\/\/|mailto:|#|\/resume\/$)/);
  await expect(page.getByRole("link", { name: "View resume" })).toHaveAttribute("href", "/resume/");
  const ld = JSON.parse((await page.locator('script[type="application/ld+json"]').textContent())!);
  expect(ld["@type"]).toBe("Person");
  expect(ld.sameAs).toHaveLength(6);
  await expect(page.getByTestId("field")).toHaveAttribute("aria-hidden", "true");
});
