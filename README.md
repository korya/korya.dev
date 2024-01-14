This repo hosts my blog hosted on https://korya.dev/

Here are the setup details:
- built with https://github.com/timlrx/tailwind-nextjs-starter-blog
- hosted on Netflify: https://app.netlify.com/sites/korya-dev/overview

## Blog Setup

The original code for the blog is taken from https://github.com/timlrx/tailwind-nextjs-starter-blog. The code is stored as-is in `main` branch. All my personal modifications (configuration and posts) are in `personal` branch.

Current version is [`f141791` from Jan 7th, 2024](https://github.com/timlrx/tailwind-nextjs-starter-blog/tree/f14179100a5dc09d0b899ce3455b062a35d306b3).

Uprading the blog:
1. Checkout `main`
2. Upgrade the code to the required version
3. Checkout `personal`
4. Rebase it on top of the new `main`
5. In case of conflicts, remove the original static assets:
   ```sh
   rm -rf ./public/static/images/* ./public/static/favicons/*
   ```
