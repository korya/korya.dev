import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import preact from '@astrojs/preact';
import sitemap from '@astrojs/sitemap';
import { pdfRedirects } from './src/lib/pdf-targets.mjs';
import { devResumePdf } from './src/lib/dev-resume-pdf.mjs';
import { legacyPostRedirects, legacyTagRedirects } from './src/data/legacy-redirects.mjs';

const SITE = 'https://korya.dev';
const redirects = { ...legacyPostRedirects, ...legacyTagRedirects };

// Static hosts infer Content-Type from the file extension, so an extensionless
// an extensionless path is served with no type at all and renders as a blank page. Generate the
// files with a .pdf extension and redirect the clean URLs onto them.
Object.assign(redirects, pdfRedirects);

export default defineConfig({
  site: SITE,
  output: 'static',
  redirects,
  integrations: [
    mdx(),
    preact(),
    // Dev only: re-renders /resume/offline.pdf per request. In production the
    // committed copy under public/ is served as a static file.
    devResumePdf(),
    sitemap(),
  ],
  markdown: {
    shikiConfig: {
      theme: 'github-dark',
      wrap: true,
    },
  },
  vite: {
    resolve: {
      alias: {
        '@': '/src',
      },
    },
  },
});
