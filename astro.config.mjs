import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import preact from '@astrojs/preact';
import sitemap from '@astrojs/sitemap';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const SITE = 'https://korya.dev';
const __dirname = dirname(fileURLToPath(import.meta.url));

// Map each published post's URL to its frontmatter date, so the sitemap can
// emit an accurate per-post <lastmod> instead of a uniform build timestamp.
const postDates = new Map();
const postsDir = join(__dirname, 'content', 'posts');
for (const file of readdirSync(postsDir)) {
  if (!file.endsWith('.md')) continue;
  const raw = readFileSync(join(postsDir, file), 'utf-8');
  if (/^draft:\s*true\s*$/m.test(raw)) continue; // drafts aren't in the sitemap
  const date = raw.match(/^date:\s*(\d{4}-\d{2}-\d{2})/m)?.[1];
  if (!date) continue;
  const slug = file.replace(/\.md$/, '').replace(/ /g, '-');
  postDates.set(`${SITE}/posts/${slug}/`, new Date(date));
}

// Non-post pages (home, about, tags) have no single content date; fall back to
// the build date for those.
const buildDate = new Date();

export default defineConfig({
  site: SITE,
  output: 'static',
  integrations: [
    mdx(),
    preact(),
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
