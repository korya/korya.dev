import { PDF_TARGET } from './pdf-targets.mjs';

// Dev-only: re-render the resume PDF on each request so it reflects the current page
// rather than whatever was last committed.
//
// This cannot be an Astro middleware. The committed copy lives at the same path under
// public/, and Vite's static-file handler answers before Astro middleware runs, so the
// middleware never fires. Registering here and unshifting puts this ahead of the static
// handler, which is the only way to shadow a real file.
//
// Production never reaches this code: `astro:server:setup` runs for `astro dev` only,
// and the static build simply copies public/ into dist/.
export function devResumePdf() {
  const route = `/${PDF_TARGET.output}`;

  return {
    name: 'dev-resume-pdf',
    hooks: {
      'astro:server:setup': ({ server, logger }) => {
        const handle = async (req, res, next) => {
          const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
          if (url.pathname !== route) return next();

          let browser;
          try {
            // Lazy: keeps puppeteer out of anything the production build touches.
            const { default: puppeteer } = await import('puppeteer');
            browser = await puppeteer.launch();
            const page = await browser.newPage();

            // Rendering a different path on this same server, so no recursion.
            await page.emulateMediaType('print');
            await page.goto(new URL(PDF_TARGET.source, url.origin).href, {
              waitUntil: 'networkidle2',
            });
            const buffer = await page.pdf(PDF_TARGET.pdf);

            res.setHeader('content-type', 'application/pdf');
            res.setHeader('cache-control', 'no-store');
            // Makes it visible which copy you are looking at; the committed file is
            // served without this header.
            res.setHeader('x-pdf-source', 'dev-render');
            res.end(Buffer.from(buffer));
          } catch (error) {
            logger.error(`could not render ${route}: ${error}`);
            res.statusCode = 500;
            res.setHeader('content-type', 'text/plain; charset=utf-8');
            res.end(
              `Failed to render ${route} from ${PDF_TARGET.source}.\n\n${
                error instanceof Error ? error.stack : String(error)
              }\n\nThe committed copy is regenerated with \`yarn pdf\`.`
            );
          } finally {
            await browser?.close();
          }
        };

        // connect() appends with .use(), which would land after Vite's static handler.
        // Unshifting is the documented-by-practice way to get in front of it.
        server.middlewares.stack.unshift({ route: '', handle });
      },
    },
  };
}
