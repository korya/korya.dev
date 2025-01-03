This repo hosts my blog hosted on https://korya.dev/

Here are the setup details:
- built with https://github.com/timlrx/tailwind-nextjs-starter-blog
- hosted on Netflify: https://app.netlify.com/sites/korya-dev/overview

## Blog Engine

The blog is statically generated using [Hugo](https://gohugo.io/). The theme is https://github.com/adityatelange/hugo-PaperMod.

In the past, I used https://github.com/timlrx/tailwind-nextjs-starter-blog. But it eneded up being too fancy for my needs: steering my attention from the content to the look and feel. I've moved to a simpler solution hoping that it will help me to focus on the content.

## Blog Management

Adding a post:
1. Add new `md` file to `content/posts/` dir: `YYYY-MM-DD - <TITLE>.md` using:
   ```sh
   hugo new content posts/YYYY-MM-DD - <TITLE>.md
   ```
2. Mark it as draft: `draft: true`
3. Populate the contents
4. Mark it as published: `draft: false`
