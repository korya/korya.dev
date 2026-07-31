import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import preact from '@astrojs/preact';
import sitemap from '@astrojs/sitemap';
import pdf from 'astro-pdf';
import { PDF_TARGETS, pdfRedirects } from './src/lib/pdf-targets.mjs';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const SITE = 'https://korya.dev';
const __dirname = dirname(fileURLToPath(import.meta.url));

// Map each published post's URL to its frontmatter date, so the sitemap can
// emit an accurate per-post <lastmod> instead of a uniform build timestamp.
const postDates = new Map();
// Redirects from the historical '---' slugs (produced when filenames used to
// contain ' - ' between the date and the title) to the current single-dash
// slugs, so old shared/indexed links keep working after the filename rename.
const redirects = {};
const postsDir = join(__dirname, 'content', 'posts');
for (const file of readdirSync(postsDir)) {
  if (!file.endsWith('.md')) continue;
  const raw = readFileSync(join(postsDir, file), 'utf-8');
  if (/^draft:\s*true\s*$/m.test(raw)) continue; // drafts aren't built or linked
  const date = raw.match(/^date:\s*(\d{4}-\d{2}-\d{2})/m)?.[1];
  if (!date) continue;
  const slug = file.replace(/\.md$/, '').replace(/ /g, '-');
  postDates.set(`${SITE}/posts/${slug}/`, new Date(date));
  // The old slug expanded the date/title separator to '---'.
  const oldSlug = slug.replace(/^(\d{4}-\d{2}-\d{2})-/, '$1---');
  if (oldSlug !== slug) redirects[`/posts/${oldSlug}/`] = `/posts/${slug}/`;
}

// Static hosts infer Content-Type from the file extension, so an extensionless
// an extensionless path is served with no type at all and renders as a blank page. Generate the
// files with a .pdf extension and redirect the clean URLs onto them.
Object.assign(redirects, pdfRedirects);

// Non-post pages (home, about, tags) have no single content date; fall back to
// the build date for those.
const buildDate = new Date();

export default defineConfig({
  site: SITE,
  output: 'static',
  redirects,
  integrations: [
    mdx(),
    preact(),
    // Definitions live in src/lib/pdf-targets.mjs because the dev middleware has to
    // generate the same file the same way.
    pdf({
      // GitHub's runners are Ubuntu 24.04, where AppArmor blocks unprivileged user
      // namespaces and Chrome's sandbox cannot initialise: it aborts with "No usable
      // sandbox" and the build fails. Only dropped on CI, so the sandbox stays on for
      // local builds. The page being rendered is our own freshly built output, not
      // untrusted content.
      launch: process.env.CI ? { args: ['--no-sandbox'] } : {},
      pages: Object.fromEntries(
        PDF_TARGETS.map(({ source, output, screen, pdf: pdfOptions }) => [
          source,
          {
            path: output,
            ensurePath: true,
            screen,
            pdf: pdfOptions,
          },
        ])
      ),
    }),
    sitemap({
      changefreq: 'weekly',
      lastmod: buildDate,
      serialize(item) {
        const postDate = postDates.get(item.url);
        if (postDate) item.lastmod = postDate;
        return item;
      },
    }),
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
