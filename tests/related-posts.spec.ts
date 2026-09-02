import { test, expect } from './fixtures';

// Related posts at the foot of a post page. It renders the same PostCard the
// index and tag pages use, so an entry has to carry the full preview -- type
// icon, description, date and tags -- not just a title and a blurb.

const POST = '/posts/2026-09-02-era-of-agents-ads-to-monetize-skills-not-really/';

test.describe('related posts', () => {
  test('each entry shows the full preview, not a bare title', async ({ page }) => {
    await page.goto(POST);
    const cards = page.locator('.related .post-card');
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i++) {
      const card = cards.nth(i);
      await expect(card.locator('.post-title')).toBeVisible();
      await expect(card.locator('.post-description')).toBeVisible();
      await expect(card.locator('.post-meta time')).toBeVisible();
      // Exactly one type icon, the same rule the list pages hold to.
      const icons =
        (await card.locator('[aria-label="Video post"]').count()) +
        (await card.locator('[aria-label="Written post"]').count());
      expect(icons, `card ${i}`).toBe(1);
    }
  });

  test('tags are present and link to their hub', async ({ page }) => {
    await page.goto(POST);
    const tag = page.locator('.related .post-card .tag').first();
    await expect(tag).toBeVisible();
    await expect(tag).toHaveAttribute('href', /^\/tags\//);
  });

  test('entries sit a level below the section heading', async ({ page }) => {
    await page.goto(POST);
    // "Related posts" is an h2, so its entries must be h3 -- as h2 they would
    // read as siblings of the section rather than its contents.
    await expect(page.locator('#related-posts-title')).toHaveJSProperty(
      'tagName',
      'H2'
    );
    const titles = page.locator('.related .post-card .post-title');
    const count = await titles.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      await expect(titles.nth(i)).toHaveJSProperty('tagName', 'H3');
    }
  });

  test('the card keeps its list-page styling once nested', async ({ page }) => {
    await page.goto(POST);
    // The heading tag is emitted dynamically, so Astro could drop the scoped
    // style attribute and leave the title unstyled while still rendering text.
    const title = page.locator('.related .post-card .post-title').first();
    const listTitle = page.locator('.post-card .post-title').first();
    await page.goto('/');
    const listSize = await listTitle.evaluate((el) =>
      getComputedStyle(el).fontSize
    );
    await page.goto(POST);
    const relatedSize = await title.evaluate((el) => getComputedStyle(el).fontSize);
    expect(relatedSize).toBe(listSize);
  });

  test('no horizontal overflow on a narrow viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 800 });
    await page.goto(POST);
    const overflows = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth
    );
    expect(overflows).toBe(false);
  });
});
