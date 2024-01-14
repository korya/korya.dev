This repo hosts my blog hosted on https://korya.dev/

Here are the setup details:
- built with https://github.com/timlrx/tailwind-nextjs-starter-blog
- hosted on Netflify: https://app.netlify.com/sites/korya-dev/overview

## Blog Engine

The original code for the blog is taken from https://github.com/timlrx/tailwind-nextjs-starter-blog. The code is stored as-is in `original-main` branch. All my personal modifications (configuration and posts) are in `master` branch.

Current version is [`f141791` from Jan 7th, 2024](https://github.com/timlrx/tailwind-nextjs-starter-blog/tree/f14179100a5dc09d0b899ce3455b062a35d306b3).

Uprading the blog:
1. Checkout `original-main`
2. Upgrade the code to the required version
3. Checkout `master`
4. Rebase it on top of the new `original-main`
5. In case of conflicts, remove the original static assets:
   ```sh
   rm -rf ./public/static/images/* ./public/static/favicons/*
   ```

## Blog Management

Adding a post:
1. Add new `mdx` file to `data/blog/` dir: `YYYY-MM-DD - <TITLE>.mdx`
2. Mark it as draft: `draft: true`
3. Finish the contents
4. Mark it as published: `draft: false`
