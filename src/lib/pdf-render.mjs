import { PDF_TARGET } from './pdf-targets.mjs';

// Shared by the generator script and the dev integration, so a PDF rendered while
// editing matches the one that ships.

/**
 * Renders the resume to a PDF buffer using an already-launched Puppeteer page.
 *
 * Relative links are rewritten to absolute production URLs first. The PDF is rendered
 * from a throwaway localhost server, so `/` and `/resume` would otherwise be captured
 * as `http://localhost:<port>/…` link annotations: dead for anyone who opens the file
 * anywhere else. The target origin comes from the page's own canonical URL rather than
 * a second copy of the domain that could drift from astro.config.mjs.
 *
 * @param {import('puppeteer').Page} page
 * @param {string} origin  Origin serving the site, e.g. http://localhost:4179
 * @returns {Promise<{ buffer: Buffer, site: string, rewritten: number }>}
 */
export async function renderResumePdf(page, origin) {
  await page.emulateMediaType('print');
  await page.goto(new URL(PDF_TARGET.source, origin).href, { waitUntil: 'networkidle2' });

  const result = await page.evaluate(() => {
    const canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) return null;

    const site = new URL(canonical.href).origin;
    let rewritten = 0;
    for (const anchor of document.querySelectorAll('a[href^="/"]')) {
      anchor.setAttribute('href', new URL(anchor.getAttribute('href'), site).href);
      rewritten += 1;
    }
    return { site, rewritten };
  });

  if (!result) {
    throw new Error(
      `No <link rel="canonical"> on ${PDF_TARGET.source}; cannot resolve links to an ` +
        'absolute site URL, and the PDF would ship links to the render host.'
    );
  }

  return { buffer: await page.pdf(PDF_TARGET.pdf), ...result };
}
