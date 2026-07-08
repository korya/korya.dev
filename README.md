This repo hosts my blog, published at https://korya.dev/

## Blog Engine

The blog is a statically generated [Astro](https://astro.build/) site (with MDX, an RSS feed, and a sitemap). It's hosted on [Netlify](https://app.netlify.com/sites/korya-dev/overview).

Previously I used [tailwind-nextjs-starter-blog](https://github.com/timlrx/tailwind-nextjs-starter-blog) and later [Hugo](https://gohugo.io/), but both ended up steering my attention from the content to the look and feel. Astro keeps it simple and lets me focus on writing.

## Local Development

```sh
yarn install
yarn dev      # sync content + start the dev server
yarn build    # sync content + build to dist/
yarn preview  # preview the production build
yarn check    # type-check the project
```

Posts are authored in `content/posts/` and copied into `src/content/posts/` by `scripts/sync-content.js`, which runs automatically before `dev` and `build`. Edit posts under `content/posts/` — never `src/content/posts/`, which is generated and overwritten.

## Blog Management

Adding a post:

1. Create a new Markdown file in `content/posts/` named `YYYY-MM-DD - <title>.md`.
2. Add the frontmatter (see fields below) and start with `draft: true`.
3. Write the content.
4. Set `draft: false` to publish.

### Frontmatter

| Field         | Required | Description                                                        |
| ------------- | -------- | ------------------------------------------------------------------ |
| `title`       | yes      | Post title.                                                        |
| `date`        | yes      | Publication date (`YYYY-MM-DD`).                                   |
| `draft`       | no       | `true` hides the post from the build. Defaults to `false`.         |
| `tags`        | no       | List of tags, e.g. `['agents', 'future']`. Defaults to `[]`.       |
| `toc`         | no       | `true` shows a table of contents. Defaults to `false`.            |
| `description` | no       | Meta description for SEO / social cards.                           |
| `videoLength` | no       | `M:SS` duration for video posts; shows "N min watch" (floored) instead of read time. |

The schema is defined in `src/content/config.ts`.
