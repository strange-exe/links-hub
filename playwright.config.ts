import { defineConfig, devices } from "@playwright/test";

// Not 4173: that is `npm run preview`, and with a preview open the suite refused to start ("already used").
const PORT = Number(process.env.E2E_PORT ?? 4174);

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  // Three engines at one worker per core starved Firefox's software compositor on an 8-thread laptop
  // (GFX "RenderCompositorSWGL failed" timeouts); each engine alone passed. With the pdf.js viewer added, four
  // workers still produced Firefox protocol errors on context close, so three.
  workers: 3,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  use: { baseURL: `http://127.0.0.1:${PORT}`, trace: "retain-on-failure" },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    // Firefox runs its tests within a file one at a time: with all three engines in parallel, Firefox's automation
    // layer crashed on context close ("_maybeDontRestoreTabs"), while Firefox alone passed 91/91 (2026-10-12).
    { name: "firefox", use: { ...devices["Desktop Firefox"] }, fullyParallel: false },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
  // Tests run against the real static export, not the dev server.
  webServer: {
    command: "node scripts/serve-out.mjs",
    url: `http://127.0.0.1:${PORT}`,
    env: { PORT: String(PORT) },
    reuseExistingServer: false,
    timeout: 30_000,
  },
});
