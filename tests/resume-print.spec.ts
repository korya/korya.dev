import { test, expect } from './fixtures';
import { type Page } from '@playwright/test';

// The printed resume is a deliverable in its own right, and almost none of it is
// visible from the screen view: the header is relaid out, the outcomes collapse to a
// line, collapsed bullets are forced open, and URLs are appended to every company
// link. All of that is regression-prone and none of it is covered by the screen spec.

/** Letter paper minus margins, in CSS px. */
const paper = (marginIn: number) => ({
  width: Math.round((8.5 - marginIn * 2) * 96),
  height: Math.round((11 - marginIn * 2) * 96),
});

// Chrome's default is ~0.4in. 0.75in sits on the other side of the 44rem breakpoint,
// which is exactly where the printed header used to silently change layout.
const MARGINS = [0.4, 0.55, 0.75];

async function gotoPrint(page: Page, marginIn: number) {
  const { width, height } = paper(marginIn);
  await page.setViewportSize({ width, height });
  await page.goto('/resume');
  await page.emulateMedia({ media: 'print' });
  await page.waitForTimeout(250);
  return { width, height };
}

test.describe('print layout', () => {
  test('drops the screen-only chrome', async ({ page }) => {
    await gotoPrint(page, 0.4);
    await expect(page.locator('.bar')).toBeHidden();
    await expect(page.locator('.chapters-section')).toBeHidden();
    await expect(page.locator('.more summary').first()).toBeHidden();
    // Whoever is holding the printout already has the PDF.
    await expect(page.locator('.download')).toBeHidden();
  });

  for (const margin of MARGINS) {
    test(`header layout is identical at ${margin}in margins`, async ({ page }) => {
      const { width } = await gotoPrint(page, margin);
      const box = await page.evaluate(() => {
        const r = (s: string) => {
          const b = document.querySelector(s)!.getBoundingClientRect();
          return { left: b.left, right: b.right, top: b.top };
        };
        return {
          display: getComputedStyle(document.querySelector('.masthead')!).display,
          qr: r('.qr'),
          links: r('.masthead-links'),
          copy: r('.masthead-copy'),
        };
      });
      // Paper width lands either side of the 44rem screen breakpoint depending on the
      // margin, so the print header pins its own grid rather than inheriting one.
      expect(box.display).toBe('grid');
      // QR top-right, contact block beneath it, copy filling the left column.
      expect(Math.round(box.qr.right)).toBe(width);
      expect(Math.round(box.links.right)).toBe(width);
      expect(box.qr.top).toBeLessThan(box.links.top);
      expect(box.copy.left).toBe(0);
      expect(box.copy.right).toBeLessThanOrEqual(box.qr.left);
    });
  }

  test('the outcomes strip collapses to a single line', async ({ page }) => {
    await gotoPrint(page, 0.4);
    const rows = await page.evaluate(() => {
      const tops = Array.from(document.querySelectorAll('.outcome')).map((e) =>
        Math.round(e.getBoundingClientRect().top)
      );
      return new Set(tops).size;
    });
    expect(rows).toBe(1);
    // The per-item notes are dropped on paper; the figure and label carry it.
    await expect(page.locator('.outcome-note').first()).toBeHidden();
    const height = await page
      .locator('.outcomes')
      .evaluate((e) => e.getBoundingClientRect().height);
    expect(height).toBeLessThan(60);
  });

  test('every bullet prints, including collapsed ones', async ({ page }) => {
    await gotoPrint(page, 0.4);
    // Nothing has been expanded, yet the hidden bullets must still have layout:
    // Chrome hides closed <details> via content-visibility on ::details-content, so
    // overriding the child's display alone silently prints nothing.
    const closed = page.locator('#jungo details.more');
    await expect(closed).toHaveJSProperty('open', false);

    for (const li of await page.locator('.role .bullets li').all()) {
      const h = await li.evaluate((e) => e.getBoundingClientRect().height);
      expect(h).toBeGreaterThan(0);
    }

    const planitarBullets = await page
      .locator('#planitar .bullets li')
      .evaluateAll((els) => els.filter((e) => e.getBoundingClientRect().height > 0).length);
    expect(planitarBullets).toBe(7);
  });

  test('company links show where they lead', async ({ page }) => {
    await gotoPrint(page, 0.4);
    const printed = await page.locator('.company').evaluateAll((els) =>
      els.map((e) => ({
        url: e.getAttribute('data-url'),
        after: getComputedStyle(e, '::after').content,
      }))
    );
    expect(printed.length).toBeGreaterThanOrEqual(7);
    for (const { url, after } of printed) {
      expect(url).toBeTruthy();
      // Trimmed to the typeable part, never the raw scheme-and-slash form.
      expect(url).not.toMatch(/^https?:|^www\.|\/$/);
      expect(after).toContain(url!);
    }
  });

  test('links stay visually identifiable and the appended URL is not underlined', async ({
    page,
  }) => {
    await gotoPrint(page, 0.4);
    const styles = await page.locator('.company').first().evaluate((el) => ({
      link: getComputedStyle(el).textDecorationLine,
      afterDisplay: getComputedStyle(el, '::after').display,
      afterDecoration: getComputedStyle(el, '::after').textDecorationLine,
      afterMarginLeft: parseFloat(getComputedStyle(el, '::after').marginLeft),
    }));
    // A saved PDF keeps these clickable, so they must still read as links...
    expect(styles.link).toBe('underline');
    // ...but the URL beside the name is annotation, not part of the label. An atomic
    // inline is not crossed by an ancestor's decoration.
    expect(styles.afterDisplay).toBe('inline-block');
    expect(styles.afterDecoration).toBe('none');
    // The gap must come from a margin. A leading space inside content() is
    // collapsible on an inline-block and disappears on some Chromium versions.
    expect(styles.afterMarginLeft).toBeGreaterThan(0);
  });

  test('body text prints dark enough to read on paper', async ({ page }) => {
    await gotoPrint(page, 0.4);
    const luminance = async (selector: string) => {
      const color = await page.locator(selector).first().evaluate(
        (el) => getComputedStyle(el).color
      );
      const [r, g, b] = color.match(/\d+/g)!.map(Number);
      return (r + g + b) / 3;
    };
    // Mid greys that read fine backlit go weak on paper.
    expect(await luminance('.role .bullets li')).toBeLessThan(40);
    expect(await luminance('.role-blurb')).toBeLessThan(90);
  });

  test('the QR survives the smaller print size', async ({ page }) => {
    await gotoPrint(page, 0.4);
    const qr = await page.locator('.qr').evaluate((el) => {
      const cs = getComputedStyle(el);
      const pad = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
      return {
        content: el.getBoundingClientRect().width - pad,
        rendering: cs.imageRendering,
        visible: cs.display !== 'none',
      };
    });
    expect(qr.visible).toBe(true);
    expect(qr.rendering).toBe('pixelated');
    // Paper is rasterised at printer dpi from the 560px source, so the CSS box can be
    // smaller here than on screen, but it still must not collapse.
    expect(qr.content).toBeGreaterThan(70);
  });
});

test.describe('printed document', () => {
  test('fits two pages at normal margins', async ({ page }) => {
    await page.goto('/resume');
    const pdf = await page.pdf({
      format: 'Letter',
      printBackground: false,
      margin: { top: '0.4in', bottom: '0.4in', left: '0.4in', right: '0.4in' },
    });
    const pages = (pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) ?? []).length;
    expect(pages).toBeLessThanOrEqual(2);
  });

  test('keeps links clickable in the exported PDF', async ({ page }) => {
    await page.goto('/resume');
    const pdf = await page.pdf({
      format: 'Letter',
      printBackground: false,
      margin: { top: '0.4in', bottom: '0.4in', left: '0.4in', right: '0.4in' },
    });
    const raw = pdf.toString('latin1');
    // Removing the underline once made these look like plain text; the annotations
    // are what actually make a saved PDF useful, so assert on those.
    expect(raw).toContain('/Link');
    expect(raw).toContain('/URI');
    for (const url of [
      'https://frontsail.ai/',
      'https://www.starboard.biz/',
      'https://klue.com/',
      'https://goiguide.com/',
      'https://jungo.com/',
      'https://cosmic-lift.com/',
    ]) {
      expect(raw).toContain(url);
    }
  });

  test('print state is restored afterwards', async ({ page }) => {
    await page.goto('/resume');
    await page.locator('#klue details.more summary').click();
    const before = await page.locator('details.more').evaluateAll((els) =>
      els.map((e) => (e as HTMLDetailsElement).open)
    );

    // Browsers may fire beforeprint more than once for a single job; recapturing
    // mid-job would record the forced-open state as the reader's own.
    await page.evaluate(() => {
      window.dispatchEvent(new Event('beforeprint'));
      window.dispatchEvent(new Event('beforeprint'));
    });
    const during = await page.locator('details.more').evaluateAll((els) =>
      els.map((e) => (e as HTMLDetailsElement).open)
    );
    expect(during.every(Boolean)).toBe(true);

    await page.evaluate(() => window.dispatchEvent(new Event('afterprint')));
    const after = await page.locator('details.more').evaluateAll((els) =>
      els.map((e) => (e as HTMLDetailsElement).open)
    );
    expect(after).toEqual(before);
  });
});
