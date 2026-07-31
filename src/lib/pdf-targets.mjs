// Single definition of the generated resume PDF, shared by the generator script
// (scripts/generate-resume-pdf.mjs) and the redirect in astro.config.mjs.
//
// Plain .mjs so astro.config.mjs can import it without a TypeScript loader.

/** Where the PDF is rendered from, where it is written, and how. */
export const PDF_TARGET = {
  /** Page the PDF is rendered from. */
  source: '/resume',
  /**
   * Path within public/, so the committed file is copied into dist/ by a plain static
   * build. Keeps the .pdf extension because static hosts infer Content-Type from it:
   * an extensionless route is served with no type at all and renders blank.
   */
  output: 'resume/offline.pdf',
  /** Extensionless URL that redirects to the file. */
  clean: '/resume/offline',
  /** Puppeteer PDF options. */
  pdf: {
    format: 'Letter',
    printBackground: false,
    margin: { top: '0.4in', bottom: '0.4in', left: '0.4in', right: '0.4in' },
  },
};

/** Map of clean URL -> generated file, for Astro's `redirects`. */
export const pdfRedirects = {
  [PDF_TARGET.clean]: `/${PDF_TARGET.output}`,
};
