import { defineConfig, devices } from "@playwright/test";

const PORT = 4173;

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  // Three engines at one worker per core starved Firefox's software compositor on an 8-thread laptop
  // (GFX "RenderCompositorSWGL failed" timeouts); each engine alone passed. Four workers keeps runs stable.
  workers: 4,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  use: { baseURL: `http://127.0.0.1:${PORT}`, trace: "retain-on-failure" },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
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
