import { test, expect, type Page } from '@playwright/test';

// Screen behaviour for /resume. The print rules live in resume-print.spec.ts.

const setTheme = (page: Page, theme: 'light' | 'dark') =>
  page.evaluate((t) => {
    localStorage.setItem('theme', t);
    document.documentElement.setAttribute('data-theme', t);
  }, theme);

/** True when anything paints past the viewport's right edge. */
const hasOverflow = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);

test.describe('resume page builds', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/resume');
  });

  test('renders the masthead', async ({ page }) => {
    await expect(page).toHaveTitle(/Resume/);
    await expect(page.locator('.masthead h1')).toHaveText('Dmitri Kochelorov');
    await expect(page.locator('.role-now')).toContainText('CEO & Co-founder');
    await expect(page.locator('.role-now')).toContainText('FrontSail AI');
    await expect(page.locator('.bio')).toContainText('Whoever ships a feature');
  });

  test('renders every section', async ({ page }) => {
    await expect(page.locator('.outcome')).toHaveCount(4);
    await expect(page.locator('.chapter')).toHaveCount(5);
    await expect(page.locator('.role')).toHaveCount(5);
    await expect(page.locator('.alongside')).toBeVisible();
    await expect(page.locator('.what-col')).toHaveCount(2);
    await expect(page.locator('.education')).toBeVisible();
  });

  test('roles appear newest first and carry their dates', async ({ page }) => {
    // .role-title is reused by the education heading, so scope to work entries.
    const titles = await page.locator('.role .role-title').allInnerTexts();
    expect(titles.map((t) => t.split(',')[0])).toEqual([
      'CEO & Co-founder',
      'Founding Software Engineer',
      'Staff Software Engineer',
      'Technical R&D Director',
      'Embedded Software Engineer',
    ]);
    await expect(page.locator('#frontsail .role-meta')).toHaveText('Nov 2025 to now');
  });

  test('every company link points somewhere real', async ({ page }) => {
    const hrefs = await page.locator('.company').evaluateAll((els) =>
      els.map((e) => (e as HTMLAnchorElement).href)
    );
    expect(hrefs.length).toBeGreaterThanOrEqual(7);
    for (const href of hrefs) {
      expect(href).toMatch(/^https:\/\//);
      // Placeholder and localhost URLs must never reach a company link.
      expect(href).not.toContain('example.com');
      expect(href).not.toContain('localhost');
    }
  });

  test('offers the PDF for download', async ({ page }) => {
    const link = page.locator('.download');
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('href', '/resume/offline.pdf');
    // Without the download attribute the browser saves the route's filename, leaving
    // the reader with "offline.pdf" on their disk.
    await expect(link).toHaveAttribute('download', /Resume\.pdf$/);
    await expect(link).toHaveAttribute('download', /Dmitri Kochelorov/);
  });

  test('no stale contact details or em dashes in the copy', async ({ page }) => {
    const text = await page.locator('body').innerText();
    expect(text).not.toContain('271102');
    expect(text).not.toContain('497-3222');
    // The copy was deliberately written without em or en dashes.
    expect(text).not.toMatch(/[—–]/);
  });

  test('exposes Person structured data', async ({ page }) => {
    const raw = await page
      .locator('script[type="application/ld+json"]')
      .first()
      .innerText();
    const schema = JSON.parse(raw);
    expect(schema['@type']).toBe('ProfilePage');
    expect(schema.mainEntity.jobTitle).toContain('CEO & Co-founder');
    expect(schema.mainEntity.sameAs).toContain('https://frontsail.ai/');
    expect(schema.mainEntity.hasOccupation).toHaveLength(5);
  });
});

test.describe('work entries expand', () => {
  test('lead bullets show before any interaction', async ({ page }) => {
    await page.goto('/resume');
    // Two visible bullets per role without expanding anything (Klue leads with one).
    await expect(page.locator('#frontsail > .bullets > li')).toHaveCount(2);
    await expect(page.locator('#klue > .bullets > li')).toHaveCount(1);
    await expect(page.locator('#frontsail > .bullets > li').first()).toBeVisible();
  });

  test('the more toggle reveals the rest and swaps its label', async ({ page }) => {
    await page.goto('/resume');
    const details = page.locator('#planitar details.more');
    const hidden = page.locator('#planitar details.more .bullets li').first();

    await expect(hidden).toBeHidden();
    await expect(page.locator('#planitar .hint-more')).toBeVisible();

    await page.locator('#planitar details.more summary').click();

    await expect(details).toHaveJSProperty('open', true);
    await expect(hidden).toBeVisible();
    await expect(page.locator('#planitar .hint-less')).toBeVisible();
    await expect(page.locator('#planitar .hint-more')).toBeHidden();
  });

  test('a deep link opens the entry it targets', async ({ page }) => {
    await page.goto('/resume#planitar');
    await expect(page.locator('#planitar details.more')).toHaveJSProperty('open', true);
    // ...and the sticky bar must not be covering it.
    const clear = await page.evaluate(() => {
      const role = document.getElementById('planitar')!.getBoundingClientRect();
      const bar = document.querySelector('.bar')!.getBoundingClientRect();
      return role.top >= bar.bottom;
    });
    expect(clear).toBe(true);
  });

  test('chapter links jump to a matching role', async ({ page }) => {
    await page.goto('/resume');
    const targets = await page
      .locator('.chapter')
      .evaluateAll((els) => els.map((e) => (e as HTMLAnchorElement).hash));
    for (const hash of targets) {
      await expect(page.locator(`.role${hash}`)).toHaveCount(1);
    }
  });
});

test.describe('theme', () => {
  test('dark mode repaints the page and persists', async ({ page }) => {
    await page.goto('/resume');
    await setTheme(page, 'light');
    await page.waitForTimeout(600); // colours transition over 0.35s
    const light = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);

    await page.locator('#theme-pill').click();
    await page.waitForTimeout(600);
    const dark = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);

    expect(light).not.toBe(dark);
    expect(await page.evaluate(() => localStorage.getItem('theme'))).toBe('dark');
    // The dark scale is near-black; guard against the light tokens leaking through.
    const [r, g, b] = dark.match(/\d+/g)!.map(Number);
    expect(r + g + b).toBeLessThan(120);
  });
});

test.describe('responsive', () => {
  for (const width of [390, 768, 1024, 1280, 1600]) {
    test(`no horizontal overflow at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/resume');
      expect(await hasOverflow(page)).toBe(false);
    });
  }

  test('the QR stays in the top-right corner on small screens', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 900 });
    await page.goto('/resume');
    const box = await page.evaluate(() => {
      const qr = document.querySelector('.qr')!.getBoundingClientRect();
      const h1 = document.querySelector('h1')!.getBoundingClientRect();
      const links = document.querySelector('.masthead-links')!.getBoundingClientRect();
      return {
        qrRight: Math.round(qr.right),
        qrTop: Math.round(qr.top),
        h1Top: Math.round(h1.top),
        viewport: window.innerWidth,
        linksWidth: Math.round(links.width),
        contentWidth: Math.round(document.querySelector('.masthead-copy')!.getBoundingClientRect().width),
      };
    });
    // Pinned to the right gutter and level with the name, not stacked below the bio.
    expect(box.viewport - box.qrRight).toBeLessThanOrEqual(30);
    expect(Math.abs(box.qrTop - box.h1Top)).toBeLessThanOrEqual(4);
    // The contact list must span the column, not shrink-wrap beside the float.
    expect(box.linksWidth).toBe(box.contentWidth);
  });

  test('hover-only content is not the only way to read the timeline', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 900 });
    await page.goto('/resume');
    // Touch devices have no hover, so every chapter's detail must render at rest.
    for (const note of await page.locator('.chapter-note').all()) {
      await expect(note).toBeVisible();
    }
  });
});

test.describe('QR code', () => {
  test('is served and rendered large enough to scan', async ({ page }) => {
    await page.goto('/resume');
    const qr = page.locator('.qr');
    await expect(qr).toBeVisible();

    const info = await qr.evaluate((el) => {
      const img = el as HTMLImageElement;
      const cs = getComputedStyle(img);
      const pad = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
      return {
        loaded: img.complete && img.naturalWidth > 0,
        naturalWidth: img.naturalWidth,
        contentWidth: img.getBoundingClientRect().width - pad,
        rendering: cs.imageRendering,
      };
    });

    expect(info.loaded).toBe(true);
    // 29 modules; below ~4px per module, downscaling blurs them badly enough that
    // decoders can resolve the damage into a different URL.
    expect(info.contentWidth / 29).toBeGreaterThanOrEqual(4);
    // Nearest-neighbour keeps module edges hard when the browser rescales.
    expect(info.rendering).toBe('pixelated');
  });

  test('stays dark-on-light in the dark theme', async ({ page }) => {
    await page.goto('/resume');
    await setTheme(page, 'dark');
    await page.waitForTimeout(600);
    // The source PNG's quiet zone is transparent, so without a light plate the dark
    // page shows through and the code stops being scannable.
    const plate = await page.locator('.qr').evaluate(
      (el) => getComputedStyle(el).backgroundColor
    );
    const [r, g, b] = plate.match(/\d+/g)!.map(Number);
    expect(r + g + b).toBeGreaterThan(600);
  });
});
