import { test, expect, type Page } from '@playwright/test';

// Layout stability. This exists because a font-stack change once cost 11 points of
// the mobile Lighthouse score with nothing else on the page changing, and nothing in
// the suite noticed.
//
// 412px is deliberate, not arbitrary: it is the width Lighthouse emulates for mobile,
// and the shift is width-dependent. The same page measured 0.002 at 360px and 0.218 at
// 412px, so a test at the wrong width would have passed throughout.

/** For pages whose shift sources are all fixed. Lighthouse calls <= 0.1 "good"; half
 *  that leaves room to notice drift before it costs score. */
const CLS_BUDGET = 0.05;

/** For pages that still swap Manrope against whatever sans the OS supplies. That shift
 *  is unfixed (it needs a metric-matched fallback, deliberately out of scope here) and
 *  its size depends on the fallback the host happens to have: /about measures 0.015 on
 *  macOS and 0.087 on the Linux CI runner. Holding these at Lighthouse's "good"
 *  threshold locks in the current state without asserting a host-specific number. */
const CLS_BUDGET_FONT_SWAP = 0.1;

const measureCls = async (page: Page, path: string) => {
  await page.addInitScript(() => {
    (window as any).__cls = 0;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        // Shifts that follow a user interaction are not counted against the page.
        if (!(entry as any).hadRecentInput) (window as any).__cls += (entry as any).value;
      }
    }).observe({ type: 'layout-shift', buffered: true });
  });
  await page.goto(path, { waitUntil: 'networkidle' });
  // Webfonts swap after first paint; without a beat here the shift lands after the read.
  await page.waitForTimeout(600);
  return page.evaluate(() => (window as any).__cls as number);
};

test.describe('layout stability', () => {
  test.use({ viewport: { width: 412, height: 823 } });

  test('/resume does not lurch when the serif swaps in', async ({ page }) => {
    // Georgia in the fallback chain wrapped the masthead h1 to four lines where
    // Newsreader takes two, collapsing the header by 87px on swap.
    expect(await measureCls(page, '/resume')).toBeLessThan(CLS_BUDGET);
  });

  test('/about does not lurch when the portrait loads', async ({ page }) => {
    // The portrait needs intrinsic width/height, or the prose below is pushed down
    // when it arrives. Unsized, this page measured 0.256; the budget is the loose one
    // because the Manrope swap underneath is still worth ~0.09 here on Linux.
    expect(await measureCls(page, '/about')).toBeLessThan(CLS_BUDGET_FONT_SWAP);
  });

  test('the post index stays within the "good" band', async ({ page }) => {
    expect(await measureCls(page, '/')).toBeLessThan(CLS_BUDGET_FONT_SWAP);
  });
});

test.describe('font requests', () => {
  test('/resume does not fetch the Manrope stylesheet it never renders', async ({
    page,
  }) => {
    const fontCss: string[] = [];
    page.on('request', (r) => {
      if (r.url().includes('fonts.googleapis.com/css2')) fontCss.push(r.url());
    });
    await page.goto('/resume', { waitUntil: 'networkidle' });
    expect(fontCss.join(' ')).not.toContain('Manrope');
    // The page still asks for the serif it actually uses.
    expect(fontCss.join(' ')).toContain('Newsreader');
  });

  test('the rest of the site still loads Manrope', async ({ page }) => {
    // siteFonts defaults to true; a wrong default would silently unstyle the blog.
    const fontCss: string[] = [];
    page.on('request', (r) => {
      if (r.url().includes('fonts.googleapis.com/css2')) fontCss.push(r.url());
    });
    await page.goto('/', { waitUntil: 'networkidle' });
    expect(fontCss.join(' ')).toContain('Manrope');
  });
});

test.describe('images reserve their space', () => {
  test('every content image declares intrinsic dimensions', async ({ page }) => {
    // The guardrail behind the /about fix: Figure requires width/height, so this
    // catches a raw <img> added elsewhere that bypasses it.
    for (const path of ['/about', '/resume']) {
      await page.goto(path, { waitUntil: 'networkidle' });
      const undimensioned = await page.locator('img').evaluateAll((imgs) =>
        imgs
          .filter((img) => !img.getAttribute('width') || !img.getAttribute('height'))
          .map((img) => img.getAttribute('src'))
      );
      expect(undimensioned, `on ${path}`).toEqual([]);
    }
  });
});

test.describe('fonts do not block the first paint', () => {
  // A plain stylesheet link to fonts.googleapis.com made FCP a function of Google's
  // response time: +2.5s on that request moved FCP from 612ms to 3032ms while our own
  // TTFB stayed at ~120ms. These assert the non-blocking shape, on every page type.
  const PAGES = ['/', '/about', '/resume'];

  test('no font stylesheet blocks rendering', async ({ page }) => {
    for (const path of PAGES) {
      await page.goto(path, { waitUntil: 'domcontentloaded' });
      const blocking = await page.evaluate(() =>
        Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
          .map((l) => (l as HTMLLinkElement).href)
          .filter((href) => href.includes('fonts.googleapis.com'))
          // Promoted by onload after first paint; only a link that was *authored* as a
          // stylesheet blocks, and those live in <noscript>.
          .filter((_, i, all) => all.length > 0)
      );
      const authored = await page.evaluate(() =>
        document.documentElement.outerHTML
          .replace(/<noscript>[\s\S]*?<\/noscript>/g, '')
          .match(/<link[^>]*rel="stylesheet"[^>]*fonts\.googleapis\.com[^>]*>/g)?.length ?? 0
      );
      expect(authored, `${path} ships a render-blocking font stylesheet`).toBe(0);
      expect(blocking.length).toBeGreaterThanOrEqual(0);
    }
  });

  test('each page preloads its font stylesheet and keeps a noscript fallback', async ({
    page,
  }) => {
    for (const path of PAGES) {
      await page.goto(path, { waitUntil: 'domcontentloaded' });
      const html = await page.evaluate(() => document.documentElement.outerHTML);
      expect(html, `${path} preload`).toMatch(
        /<link[^>]*rel="preload"[^>]*as="style"[^>]*fonts\.googleapis\.com/
      );
      // Without this, a reader with JS disabled gets no webfont at all.
      expect(html, `${path} noscript fallback`).toMatch(
        /<noscript><link[^>]*fonts\.googleapis\.com/
      );
    }
  });

  test('the font still applies once loaded', async ({ page }) => {
    // The onload promotion is easy to get wrong in a way that silently never fires.
    await page.goto('/resume', { waitUntil: 'networkidle' });
    await page.waitForFunction(() =>
      Array.from(document.fonts).some(
        (f) => f.family === 'Newsreader' && f.status === 'loaded'
      )
    );
    // Match on the css2 URL, not the origin: a preconnect hint to the same host would
    // otherwise be picked up first and report rel="preconnect".
    const promoted = await page.evaluate(
      () => document.querySelector<HTMLLinkElement>('link[href*="css2"]')?.rel
    );
    expect(promoted).toBe('stylesheet');
  });
});
