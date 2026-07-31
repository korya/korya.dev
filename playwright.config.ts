import { defineConfig, devices } from '@playwright/test';

// Deliberately not 4321: that is `astro dev`'s default, and reuseExistingServer
// would happily bind to a running dev server and test the wrong thing.
const PORT = 4187;

// Tests run against the real production build, not the dev server: the point is to
// catch things that only appear after `astro build` (asset hashing, files that never
// made it into dist/, scoped-CSS output).
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // 'github' annotates the PR diff; 'html' is what gets uploaded as an artifact.
  reporter: process.env.CI
    ? [['github'], ['html', { open: 'never' }]]
    : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'yarn build && yarn preview --port ' + PORT,
    url: `http://localhost:${PORT}/resume`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
