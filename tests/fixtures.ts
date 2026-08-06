import { test as base, expect } from '@playwright/test';

/**
 * Playwright serves a real production build: `playwright.config.ts` runs
 * `yarn build && yarn preview`, so every page these tests open carries the live
 * Google Analytics snippet and the live measurement ID. Left alone, a full run posts
 * a page_view per navigation to the real property -- roughly a hundred per run,
 * from CI and from anyone running `yarn test` locally. Those are indistinguishable
 * from readers, and they land in the same reports used to decide what to write next.
 *
 * So every test gets this fixture automatically and no test has to remember it.
 *
 * googletagmanager.com is deliberately NOT blocked: gtag.js has to load for the
 * snippet to behave as it does in production, and blocking it would turn "analytics
 * works" into an untestable claim. Only the collection endpoints are stopped, which
 * is the last hop before the data leaves the machine.
 */
const COLLECTORS = [
  '**://*.google-analytics.com/**',
  '**://*.analytics.google.com/**',
];

export const test = base.extend<{ analyticsHits: string[] }>({
  analyticsHits: [
    async ({ page }, use) => {
      const hits: string[] = [];
      for (const pattern of COLLECTORS) {
        await page.route(pattern, async (route) => {
          hits.push(route.request().url());
          // 204 rather than abort: a failed request can make gtag.js retry, which
          // would double-count in tests that assert how many hits a click produced.
          await route.fulfill({ status: 204, body: '' });
        });
      }
      await use(hits);
    },
    { auto: true },
  ],
});

export { expect };
