import type { MiddlewareHandler } from 'astro';
import { PDF_TARGETS } from './lib/pdf-targets.mjs';

// astro-pdf only hooks `astro:build:done`, so the generated PDFs exist in dist/ but not
// under `astro dev` — the redirect fires and lands on a 404. Rather than leave a dead
// link in the workflow people actually use, render them on demand in dev.
//
// Dev only. In a static build these paths are real files on disk and this never runs.

const BY_OUTPUT = new Map(PDF_TARGETS.map((t) => [t.output, t]));

export const onRequest: MiddlewareHandler = async (context, next) => {
  const target = BY_OUTPUT.get(context.url.pathname);
  if (!import.meta.env.DEV || !target) return next();

  // Imported lazily so puppeteer is never pulled into a production build.
  const { default: puppeteer } = await import('puppeteer');

  const browser = await puppeteer.launch();
  try {
    const page = await browser.newPage();
    // Same origin as the incoming request, so whichever port dev is on is honoured.
    const source = new URL(target.source, context.url.origin);

    await page.emulateMediaType(target.screen ? 'screen' : 'print');
    await page.goto(source.href, { waitUntil: 'networkidle2' });

    const buffer = await page.pdf(target.pdf);
    return new Response(new Uint8Array(buffer), {
      headers: {
        'content-type': 'application/pdf',
        // Regenerated per request so an edit to the resume shows up on reload.
        'cache-control': 'no-store',
      },
    });
  } catch (error) {
    // A dev-only convenience should explain itself rather than fail opaquely.
    return new Response(
      `Failed to render ${target.output} from ${target.source}.\n\n${
        error instanceof Error ? error.stack : String(error)
      }\n\nThe production build generates this file via astro-pdf; run \`yarn build\`.`,
      { status: 500, headers: { 'content-type': 'text/plain; charset=utf-8' } }
    );
  } finally {
    await browser.close();
  }
};
