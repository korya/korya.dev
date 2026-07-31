// Single definition of the generated PDF, shared by two consumers that would
// otherwise drift: astro.config.mjs (build-time generation via astro-pdf) and
// src/middleware.ts (on-demand generation in `astro dev`, where astro-pdf never runs
// because it only hooks astro:build:done).
//
// Plain .mjs so astro.config.mjs can import it without a TypeScript loader.

/**
 * @typedef {object} PdfTarget
 * @property {string} source   Page the PDF is rendered from.
 * @property {string} output   File written into dist/, with a .pdf extension so static
 *                             hosts serve it as application/pdf.
 * @property {string} clean    Extensionless URL that redirects to `output`.
 * @property {boolean} screen  Render under screen media instead of print.
 * @property {object} pdf      Puppeteer PDF options.
 */

/** @type {PdfTarget[]} */
export const PDF_TARGETS = [
  {
    // Chrome's own print path, driven by the print rules in src/pages/resume.astro.
    source: '/resume',
    output: '/resume/offline.pdf',
    clean: '/resume/offline',
    screen: false,
    pdf: {
      format: 'Letter',
      printBackground: false,
      margin: { top: '0.4in', bottom: '0.4in', left: '0.4in', right: '0.4in' },
    },
  },
];

/** Map of clean URL -> generated file, for Astro's `redirects`. */
export const pdfRedirects = Object.fromEntries(
  PDF_TARGETS.map(({ clean, output }) => [clean, output])
);
