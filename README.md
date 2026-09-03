This repo hosts my blog, published at https://korya.dev/

## Blog Engine

The blog is a statically generated [Astro](https://astro.build/) site (with MDX, an RSS feed, and a sitemap).

Previously I used [tailwind-nextjs-starter-blog](https://github.com/timlrx/tailwind-nextjs-starter-blog) and later [Hugo](https://gohugo.io/), but both ended up steering my attention from the content to the look and feel. Astro keeps it simple and lets me focus on writing.

## Local Development

```sh
yarn install
yarn dev      # sync content + start the dev server
yarn build    # sync content + build to dist/
yarn preview  # preview the production build
yarn test     # end-to-end tests (Playwright) against the production build
yarn pdf      # regenerate the resume PDF (see below)
```

### The resume PDF

`/resume/offline.pdf` is a committed file under `public/`, rendered from `/resume` by
`yarn pdf`. **Run it after changing the resume and commit the result**, otherwise the
downloadable copy drifts from the page.

It is not generated during `astro build` on purpose. The site deploys on a buildpack
with no root access, so Chrome's shared libraries cannot be installed there and a
build-time render fails the whole deploy.

Posts are authored in `content/posts/` and copied into `src/content/posts/` by `scripts/sync-content.js`, which runs automatically before `dev` and `build`. Edit posts under `content/posts/` — never `src/content/posts/`, which is generated and overwritten.

## Deployment

The site is hosted as a static app on [DigitalOcean](https://www.digitalocean.com/products/app-platform). The build runs `yarn build` and publishes the generated `dist/` directory.

Sitemap `lastmod` values come from the latest Git commit among each page's
content, metadata, links, and referenced assets. In the DigitalOcean static
component, define this build-time environment variable so the build is pinned
to the exact deployed revision even when App Platform does not expose `.git`:

```text
SOURCE_COMMIT=${_self.COMMIT_HASH}
```

The build recovers a shallow checkout when possible and otherwise reads the
public repository history into a temporary bare clone. It fails rather than
publishing checkout-time or build-time dates when the requested commit history
is unavailable.

## Blog Management

Adding a post:

1. Create a new Markdown file in `content/posts/` named `YYYY-MM-DD-<title>.md` (single dashes only — the filename becomes the URL slug, so avoid spaces and `---`).
2. Add the frontmatter (see fields below) and start with `draft: true`.
3. Write a `description` — a concise 1–2 sentence summary. **Every post must have one**: it appears on the post and listing pages, and feeds the SEO meta description, social cards, `JsonLd`, and `llms.txt`.
4. Add a content-specific `image`, or structured `videos` metadata for a video post. Assets live under `public/images/posts/<slug>/`.
5. Write the content. Video posts also need two to five `takeaways` and matching YouTube iframes.
6. Set `draft: false` to publish.

### Frontmatter

| Field         | Required | Description                                                        |
| ------------- | -------- | ------------------------------------------------------------------ |
| `title`       | yes      | Post title.                                                        |
| `date`        | yes      | Publication date (`YYYY-MM-DD`).                                   |
| `draft`       | no       | `true` hides the post from the build. Defaults to `false`.         |
| `tags`        | no       | List of tags, e.g. `['agents', 'future']`. Defaults to `[]`.       |
| `toc`         | no       | `true` shows a table of contents. Defaults to `false`.            |
| `description` | **yes**  | 1–2 sentence visible summary. Feeds metadata, cards, `JsonLd`, and `llms.txt`. |
| `image`       | text posts | Local social image: `src`, descriptive `alt`, `width`, and `height`. |
| `takeaways`   | video posts | Two to five concise, standalone points rendered above the transcript. |
| `videos`      | video posts | Ordered video records: YouTube ID, title, description, ISO upload timestamp/duration, and local thumbnail metadata. The first video supplies watch time and the primary social image. |

The schema is defined in `src/content/config.ts`.

### Redirects in production

Astro emits noindex meta-refresh pages for redirects in this static build. Those
are useful fallbacks, but they are not HTTP redirects on DigitalOcean App
Platform. The production app's ingress configuration must mirror the explicit
historical mappings in `src/data/legacy-redirects.mjs`, redirect `www.korya.dev`
and the default `*.ondigitalocean.app` hostname to the apex domain, and redirect
both `/resume/offline` forms to the PDF. After changing ingress rules, run:

```sh
yarn test:production-indexing
```

The smoke check expects permanent `301` or `308` responses and exact `Location`
headers. The active app spec is not committed here; export it from the account
that owns korya.dev before introducing `.do/app.yaml`.
