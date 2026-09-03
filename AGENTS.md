# Working in this repo

Astro site for korya.dev: a blog, an About page, and a resume. Posts live in
`content/posts/` and are synced into `src/content/posts/` at build time by
`scripts/sync-content.js`.

## Commands

| Task | Command |
| --- | --- |
| Dev server | `yarn dev` |
| Build | `yarn build` |
| Tests | `yarn test` (Playwright; builds and serves `dist/` first) |

`yarn test` is what CI runs. Run it before pushing.

Note: `yarn check` hits Yarn 1's built-in dependency checker, not `astro check`.
The script is `yarn run check`, and it prompts to install `@astrojs/check`, which
is not a dependency here.

## Keep llms.txt in step with About and Resume

`src/pages/llms.txt.ts` inlines the site's author information so an LLM that
fetches only `/llms.txt` — the file `robots.txt` advertises — learns who Dmitri
is without crawling further. Half of it is generated, half is copied by hand:

| Section of llms.txt | Source | On change |
| --- | --- | --- |
| Experience, Tools, How I work, Education | imports `src/data/resume.ts` | Nothing to do; it follows automatically |
| About, Contact | hardcoded `ABOUT` string in `llms.txt.ts` | **Edit it by hand to match** |
| Blog Posts | the posts collection | Nothing to do |

So: **when you change `src/pages/about.astro`, update the `ABOUT` string in
`src/pages/llms.txt.ts` to match.** Same words, minus the markup.

When you change `/resume`, check whether the edit landed in `src/data/resume.ts`
(flows through automatically) or directly in `src/pages/resume.astro` (does not —
update `llms.txt.ts` if the fact belongs there).

`tests/resume.spec.ts` covers this: it asserts the about prose and every role in
`ROLES` are present in the served `/llms.txt`. It cannot tell you the copy has
drifted, only that something is there.

## Posts

Video posts carry a `videos` frontmatter array. The first entry is the primary
video and supplies the watch time and social image; every entry must match a
YouTube iframe in the post body in the same order. Video posts also use tag
`tiki-toki`, which groups the series, and two to five visible `takeaways`.

Two skills automate the flow: `widen-vertical-video` (portrait recording → 16:9
for YouTube) and `create-video-post` (YouTube link → scaffolded post with a
cleaned transcript).

## Keep sitemap freshness dependencies complete

`scripts/sitemap-lastmod.mjs` maps every canonical page to the tracked files
that materially affect its content, metadata, or links, then uses the newest
Git commit time as that page's sitemap `lastmod`. When adding a page type or a
new shared content dependency, update that route map and its tests. Do not use
the build time as a fallback: inaccurate `lastmod` values are worse than a
failed build.

DigitalOcean must expose its exact revision through the build-time variable
`SOURCE_COMMIT=${_self.COMMIT_HASH}`. CI checks out full history; local shallow
clones are automatically deepened when the remote is available.

## Known issues

- Post dates render one day early in any timezone west of UTC. The date is parsed
  as UTC midnight and formatted in local time.
- Astro's static redirect pages return `200` on DigitalOcean. Historical URL
  moves therefore need matching App Platform ingress redirects; the generated
  pages are only noindex fallbacks.
