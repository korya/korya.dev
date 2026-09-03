import { test, expect } from './fixtures';
import { createRouteDependencyMap } from '../scripts/sitemap-lastmod.mjs';

const VIDEO_POST_WITH_FOLLOWUP =
  '/posts/2026-08-13-era-of-agents-agent-skills-are-the-apps/';

async function blogPostingSchema(page: import('@playwright/test').Page) {
  const scripts = await page.locator('script[type="application/ld+json"]').allInnerTexts();
  return scripts.map((raw) => JSON.parse(raw)).find((schema) => schema['@type'] === 'BlogPosting');
}

test.describe('social and structured metadata', () => {
  test('uses the canonical URL and a fully described social image', async ({ page }) => {
    await page.goto('/posts/2024-01-13-setup-macbook/');

    const canonical = 'https://korya.dev/posts/2024-01-13-setup-macbook/';
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', canonical);
    await expect(page.locator('meta[property="og:url"]')).toHaveAttribute('content', canonical);
    await expect(page.locator('meta[name="twitter:url"]')).toHaveAttribute('content', canonical);
    await expect(page.locator('meta[property="og:site_name"]')).toHaveAttribute(
      'content',
      'Tech Scrolls'
    );

    const image = page.locator('meta[property="og:image"]');
    await expect(image).toHaveAttribute(
      'content',
      'https://korya.dev/images/posts/2024-01-13-setup-macbook/social.jpg'
    );
    await expect(page.locator('meta[property="og:image:width"]')).toHaveAttribute(
      'content',
      '1200'
    );
    await expect(page.locator('meta[property="og:image:height"]')).toHaveAttribute(
      'content',
      '630'
    );
    await expect(page.locator('meta[property="og:image:alt"]')).not.toHaveAttribute(
      'content',
      ''
    );
    await expect(page.locator('meta[name="twitter:image:alt"]')).not.toHaveAttribute(
      'content',
      ''
    );
  });

  test('models every embedded video and its visible answer-ready content', async ({ page }) => {
    await page.goto('/');
    const videoPosts = await page
      .locator('.post-card[data-type="video"] .post-link')
      .evaluateAll((links) => links.map((link) => (link as HTMLAnchorElement).getAttribute('href')!));

    // The per-post loop below is the real assertion: it pins each post's schema to
    // the iframes it actually renders. This bound only guards against the selector
    // silently matching nothing — don't turn it back into a headcount, or every new
    // video post breaks the suite.
    expect(videoPosts.length).toBeGreaterThanOrEqual(10);
    let videoObjects = 0;

    for (const href of videoPosts) {
      await page.goto(href);
      const schema = await blogPostingSchema(page);
      expect(schema, href).toBeTruthy();
      expect(schema.image?.[0], href).toMatch(/^https:\/\/korya\.dev\/images\/posts\//);

      const videos = schema.video ?? [];
      const iframeIds = await page
        .locator('iframe[src*="youtube-nocookie.com/embed/"]')
        .evaluateAll((iframes) =>
          iframes.map((iframe) =>
            new URL((iframe as HTMLIFrameElement).src).pathname.split('/').pop()
          )
        );
      const schemaIds = videos.map((video: { embedUrl: string }) =>
        new URL(video.embedUrl).pathname.split('/').pop()
      );
      expect(schemaIds, href).toEqual(iframeIds);

      for (const video of videos) {
        expect(video.name, href).toBeTruthy();
        expect(video.description, href).toBeTruthy();
        expect(video.thumbnailUrl?.[0], href).toMatch(/^https:\/\/korya\.dev\/images\/posts\//);
        expect(video.uploadDate, href).toMatch(/^\d{4}-\d{2}-\d{2}T/);
        expect(video.duration, href).toMatch(/^PT(?=.*\d)[\dHMS]+$/);
      }

      // Scoped to the header: related-post cards reuse .post-description, so a
      // bare selector matches them too and this asserts nothing about the post.
      await expect(page.locator('.post-header .post-description')).toBeVisible();
      expect(await page.locator('.takeaways li').count(), href).toBeGreaterThanOrEqual(2);
      videoObjects += videos.length;
    }

    expect(videoObjects).toBeGreaterThanOrEqual(videoPosts.length);
  });

  test('keeps both videos on the multi-video post', async ({ page }) => {
    await page.goto(VIDEO_POST_WITH_FOLLOWUP);
    const schema = await blogPostingSchema(page);
    expect(schema.video).toHaveLength(2);
    expect(schema.video.map((video: { name: string }) => video.name)).toEqual([
      'Era of Agents: Agent Skills Are the Apps',
      'Using Claude Code to Post-process Videos',
    ]);
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
      'content',
      /LGP3P4cr5Xo\.jpg$/
    );
  });
});

test.describe('indexing signals', () => {
  test('publishes only useful, URL-safe tag hubs', async ({ page }) => {
    await page.goto('/tags/');
    const hrefs = await page
      .locator('.tag-link')
      .evaluateAll((links) => links.map((link) => (link as HTMLAnchorElement).getAttribute('href')!));

    expect(hrefs).toContain('/tags/software-development/');
    expect(hrefs).not.toContain('/tags/software%20development/');
    expect(hrefs).not.toContain('/tags/coding-agents/');
    expect(new Set(hrefs).size).toBe(hrefs.length);

    for (const href of hrefs) {
      expect(href).toMatch(/^\/tags\/[a-z0-9-]+\/$/);
      await page.goto(href);
      expect(await page.locator('.post-card').count(), href).toBeGreaterThan(0);
      await expect(page.locator('.tag-description')).not.toHaveText('');
    }
  });

  test('keeps stale and invented URLs out of the sitemap', async ({ request }) => {
    const index = await (await request.get('/sitemap-index.xml')).text();
    const sitemapPath = new URL(index.match(/<loc>([^<]+)<\/loc>/)![1]).pathname;
    const sitemap = await (await request.get(sitemapPath)).text();

    expect(sitemap).toContain('/tags/software-development/');
    expect(sitemap).not.toContain('software%20development');
    expect(sitemap).not.toContain('coding-agents');
    expect(sitemap).not.toContain('---');
    expect(sitemap).not.toContain('<changefreq>');

    const entries = [...sitemap.matchAll(/<url>([\s\S]*?)<\/url>/g)].map((match) => match[1]);
    expect(entries.length).toBeGreaterThan(0);
    for (const entry of entries) {
      const locations = [...entry.matchAll(/<loc>([^<]+)<\/loc>/g)];
      const lastModified = [...entry.matchAll(/<lastmod>([^<]+)<\/lastmod>/g)];
      expect(locations, entry).toHaveLength(1);
      expect(lastModified, locations[0]?.[1]).toHaveLength(1);

      const timestamp = Date.parse(lastModified[0][1]);
      expect(Number.isNaN(timestamp), locations[0][1]).toBe(false);
      expect(timestamp, locations[0][1]).toBeLessThanOrEqual(Date.now() + 5 * 60 * 1000);
    }
  });

  test('tracks every post source rendered in navigation and related previews', async ({ page }) => {
    const route = '/posts/2026-09-02-era-of-agents-ads-to-monetize-skills-not-really/';
    const dependencies = createRouteDependencyMap().get(route);
    expect(dependencies).toBeTruthy();

    await page.goto(route);
    const linkedPosts = await page
      .locator('.post-nav a, .related .post-link')
      .evaluateAll((links) => links.map((link) => (link as HTMLAnchorElement).pathname));
    expect(linkedPosts.length).toBeGreaterThan(0);

    for (const pathname of linkedPosts) {
      const slug = pathname.match(/^\/posts\/([^/]+)\/$/)?.[1];
      expect(slug, pathname).toBeTruthy();
      expect(dependencies).toContain(`content/posts/${slug}.md`);
    }
  });

  test('generates fallbacks only for routes that actually existed', async ({ request }) => {
    const historical = await request.get('/posts/2024-01-13---setup-macbook/');
    expect(historical.status()).toBe(200);
    const html = await historical.text();
    expect(html).toContain('name="robots" content="noindex"');
    expect(html).toContain('/posts/2024-01-13-setup-macbook/');

    const invented = await request.get(
      '/posts/2026-08-18---era-of-agents-your-assistant-will-ask-for-allowance/'
    );
    expect(invented.status()).toBe(404);
  });

  test('uses canonical internal paths and has no broken local links', async ({ request }) => {
    const home = await (await request.get('/')).text();
    const pagePaths = new Set<string>(['/', '/about/', '/resume/', '/tags/']);

    for (const href of home.matchAll(/href="(\/posts\/[^"?#]+|\/tags\/[^"?#]+)"/g)) {
      pagePaths.add(href[1]);
    }

    const internalLinks = new Set<string>();
    for (const path of pagePaths) {
      const response = await request.get(path);
      expect(response.status(), path).toBe(200);
      const html = await response.text();

      for (const match of html.matchAll(/href="(\/[^"#]*)"/g)) {
        const href = match[1].replace(/&amp;/g, '&');
        expect(href, `${path} links to Markdown source`).not.toMatch(/\.md(?:$|[?#])/);
        if (href.startsWith('/posts/') || href.startsWith('/tags/')) {
          expect(href, `${path} uses a non-canonical content URL`).toMatch(/\/$/);
        }
        internalLinks.add(href);
      }
    }

    for (const href of internalLinks) {
      const response = await request.get(href);
      expect(response.status(), href).toBeLessThan(400);
    }
  });
});
