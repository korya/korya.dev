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

Video posts carry a `videoLength` frontmatter field, which makes the post render
as watch time rather than reading time, and tag `tiki-toki`, which groups the
video series.

Two skills automate the flow: `widen-vertical-video` (portrait recording → 16:9
for YouTube) and `create-video-post` (YouTube link → scaffolded post with a
cleaned transcript).

## Known issues

- Post dates render one day early in any timezone west of UTC. The date is parsed
  as UTC midnight and formatted in local time.
- Every post is emitted at two URLs, e.g. `/posts/2026-08-05-slug/` and
  `/posts/2026-08-05---slug/`. Only the single-dash form is in the sitemap.
