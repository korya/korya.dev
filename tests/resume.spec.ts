import { test, expect } from './fixtures';
import { type Page } from '@playwright/test';

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
    expect(schema.mainEntity.hasOccupation).toHaveLength(5);
    // One canonical node for Dmitri across the site, referenced by every page that
    // names him as author.
    expect(schema.mainEntity['@id']).toBe('https://korya.dev/about#person');
    // Companies belong in worksFor/affiliation. sameAs is for other profiles of the
    // same person, so a company URL appearing here is the bug this guards against.
    expect(schema.mainEntity.sameAs).not.toContain('https://frontsail.ai/');
    expect(schema.mainEntity.sameAs).not.toContain('https://cosmic-lift.com/');
    expect(schema.mainEntity.sameAs).toContain('https://github.com/korya');
    expect(schema.mainEntity.worksFor.url).toBe('https://frontsail.ai/');
    // The id cosmic-lift.com publishes for itself, reused verbatim so both sites
    // describe one company.
    expect(schema.mainEntity.affiliation['@id']).toBe(
      'https://cosmic-lift.com/#organization'
    );
  });
});

test.describe('robots.txt', () => {
  test('points at llms.txt without disturbing the rules', async ({ request }) => {
    const res = await request.get('/robots.txt');
    expect(res.status()).toBe(200);
    const body = await res.text();

    expect(body).toContain('Llms: https://korya.dev/llms.txt');
    // The pointer sits among real directives; a malformed line here would silently
    // change what crawlers are allowed to fetch.
    expect(body).toContain('Sitemap: https://korya.dev/sitemap-index.xml');
    expect(body).toMatch(/User-agent: \*\s*\nAllow: \//);
  });

  test('the file it points at is actually served', async ({ request }) => {
    // A pointer to a 404 is worse than no pointer.
    const res = await request.get('/llms.txt');
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toContain('text/plain');
  });
});

test.describe('llms.txt', () => {
  const fetchBody = async (request: { get: (url: string) => Promise<{ text: () => Promise<string> }> }) =>
    (await request.get('/llms.txt')).text();

  test('carries the about prose, not just a link to it', async ({ request }) => {
    const body = await fetchBody(request);
    // The point of inlining is that a crawler never has to fetch /about.
    expect(body).toContain("I'm Dmitri. I co-founded FrontSail AI");
    expect(body).toContain('- LinkedIn: [kochelorov](https://www.linkedin.com/in/kochelorov/)');
  });

  test('carries the resume detail, not just a link to it', async ({ request }) => {
    const body = await fetchBody(request);
    expect(body).toContain('CEO & Co-founder at [FrontSail AI]');
    // Every role, so a dropped entry in ROLES fails here rather than silently
    // shrinking what an LLM knows about the career.
    for (const company of ['FrontSail AI', 'Starboard', 'Klue', 'Planitar', 'Jungo']) {
      expect(body).toContain(`, ${company} (`);
    }
    expect(body).toContain('B.Sc. Computer Software Engineering');
  });

  test('still lists every published post', async ({ request }) => {
    const body = await fetchBody(request);
    // The blog index is the original job of this file; enriching it must not
    // displace the posts.
    expect(body).toContain('## Blog Posts');
    expect(body).toContain('](https://korya.dev/posts/');
  });

  test('inlines role blurbs without leaking link markup', async ({ request }) => {
    const body = await fetchBody(request);
    // Planitar's blurb is the one built from linked Segments; flatten() must drop
    // the href, or the line reads as half-rendered markdown.
    expect(body).toContain(
      "First engineer → 20+ person R&D org behind the iGUIDE, Canada’s leading 3D virtual tour platform."
    );
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

test.describe('masthead on a phone', () => {
  // The name is the one element that has to share a line with the floated QR. When
  // it does not fit, the second line clears the float and the surname lands ~180px
  // below the given name, with the QR in the gap. Nothing about it is a layout
  // *shift* -- it renders that way and stays -- so no CLS budget catches it.
  // 320px (iPhone SE 1st gen) is deliberately absent. Fixing it needs the QR shrunk
  // to ~80px as well, which is 2.0px per module -- half the scannability bar the
  // desktop QR is held to. Trading the QR away for a 2016 device was not the deal.
  const NARROW = [360, 375, 390, 412, 430];

  for (const width of NARROW) {
    test(`the name is not split by the QR at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/resume');
      const h1 = page.locator('.masthead h1');
      const { height, lineHeight } = await h1.evaluate((el) => ({
        height: el.getBoundingClientRect().height,
        lineHeight: parseFloat(getComputedStyle(el).lineHeight),
      }));
      // Two lines of name is fine; the float clearance adds a third line's worth of
      // empty space on top, so anything past 2.5 line-boxes means it broke.
      expect(
        height,
        `name occupies ${(height / lineHeight).toFixed(1)} line-boxes at ${width}px`
      ).toBeLessThan(lineHeight * 2.5);
    });
  }

  test('the QR still sits beside the name, not below the bio', async ({ page }) => {
    // The fix must not turn into "drop the QR out of the corner": the masthead floats
    // it on purpose so the copy wraps around it.
    await page.setViewportSize({ width: 390, height: 900 });
    await page.goto('/resume');
    const qr = (await page.locator('.qr').boundingBox())!;
    const h1 = (await page.locator('.masthead h1').boundingBox())!;
    expect(await page.locator('.qr').evaluate((el) => getComputedStyle(el).float)).toBe(
      'right'
    );
    // Top-aligned with the name rather than pushed under it.
    expect(qr.y).toBeLessThan(h1.y + h1.height);
    expect(qr.x).toBeGreaterThan(h1.x);
  });

  test('the QR is scannable on desktop and documented as marginal on mobile', async ({
    page,
  }) => {
    const perModule = async () =>
      page.locator('.qr').evaluate((el) => {
        const cs = getComputedStyle(el);
        const pad = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
        return (el.getBoundingClientRect().width - pad) / 29;
      });

    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/resume');
    expect(await perModule()).toBeGreaterThanOrEqual(4);

    // Known shortfall, asserted so it cannot quietly get worse. The mobile QR renders
    // at ~3.2px per module, below the 4px the desktop one is held to, because the
    // corner it sits in is only so wide. It is also self-referential there -- it links
    // to the page you are already on -- so shrinking it further to buy layout room
    // would be trading away the little scannability it has for no reader benefit.
    await page.setViewportSize({ width: 390, height: 900 });
    await page.goto('/resume');
    expect(await perModule()).toBeGreaterThan(3);
  });
});

test.describe('PDF download tracking', () => {
  // The analyticsHits fixture blocks the collection endpoints for every test in the
  // suite and hands back what would have been sent, so these can assert the beacon
  // without a single hit reaching the real property.

  test('gtag is reachable from page scripts', async ({ page }) => {
    // Astro's define:vars wraps an inline script in an IIFE, which once trapped the
    // gtag function inside it: config still ran, so nothing looked broken, but
    // window.gtag was undefined and every custom event threw.
    for (const path of ['/resume', '/', '/about']) {
      await page.goto(path);
      expect(await page.evaluate(() => typeof (window as any).gtag), path).toBe(
        'function'
      );
    }
  });

  test('clicking the PDF link reports one download event', async ({
    page,
    analyticsHits,
  }) => {
    await page.goto('/resume', { waitUntil: 'networkidle' });
    analyticsHits.length = 0;

    await page.locator('a.download').click({ noWaitAfter: true });
    await expect
      .poll(() => analyticsHits.filter((u) => u.includes('resume_pdf_download')).length)
      .toBe(1);

    const hit = decodeURIComponent(
      analyticsHits.find((u) => u.includes('resume_pdf_download'))!
    );
    expect(hit).toContain('en=resume_pdf_download');
    expect(hit).toContain('file_name=resume-offline.pdf');
    expect(hit).toContain('link_url=/resume/offline.pdf');
  });

  test('the link still downloads rather than navigating', async ({ page }) => {
    // The event must not come at the cost of the behaviour it measures: the download
    // attribute is what names the saved file after its owner.
    await page.goto('/resume', { waitUntil: 'networkidle' });
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('a.download').click({ noWaitAfter: true }),
    ]);
    expect(download.suggestedFilename()).toContain('Resume.pdf');
  });

  test('no test in this suite leaks a hit to the real property', async ({
    page,
    analyticsHits,
  }) => {
    // The fixture is the only thing standing between a CI run and a few hundred fake
    // page_views. If it ever stops applying, this fails rather than the data quietly
    // going wrong.
    await page.goto('/resume', { waitUntil: 'networkidle' });
    await expect.poll(() => analyticsHits.length).toBeGreaterThan(0);
    for (const url of analyticsHits) {
      expect(url).toMatch(/google-analytics\.com|analytics\.google\.com/);
    }
  });
});
