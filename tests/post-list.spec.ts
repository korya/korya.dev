import { test, expect } from '@playwright/test';

// The post list on / and /tags/<tag>. The icon marks each entry as video or text,
// and it is the only signal of that in the list, so it is covered as content
// rather than decoration.

// Bare, so they can be used both page-wide and scoped inside a single card.
const VIDEO_ICON = '[aria-label="Video post"]';
const WRITTEN_ICON = '[aria-label="Written post"]';
const VIDEO = `.post-card ${VIDEO_ICON}`;
const WRITTEN = `.post-card ${WRITTEN_ICON}`;

test.describe('post type icons', () => {
  test('every card carries exactly one type icon', async ({ page }) => {
    await page.goto('/');
    const cards = await page.locator('.post-card').count();
    expect(cards).toBeGreaterThan(0);
    expect(await page.locator(VIDEO).count()).toBeGreaterThan(0);
    expect(await page.locator(WRITTEN).count()).toBeGreaterThan(0);
    // No card is unmarked, and none carries both.
    expect(
      (await page.locator(VIDEO).count()) + (await page.locator(WRITTEN).count())
    ).toBe(cards);
  });

  test('the video icon tracks videoLength, not the tag', async ({ page }) => {
    await page.goto('/');
    // "Setting up a Mac in 2026" has no videoLength, so it must read as written
    // even though it sits among the video posts.
    const written = page.locator('.post-card', {
      has: page.locator('.post-title', { hasText: 'Setting up a Mac in 2026' }),
    });
    await expect(written.locator(WRITTEN_ICON)).toHaveCount(1);

    const video = page.locator('.post-card', {
      has: page.locator('.post-title', { hasText: 'LLMs Enabled Big Brother' }),
    });
    await expect(video.locator(VIDEO_ICON)).toHaveCount(1);
  });

  test('clicking the icon opens the post', async ({ page }) => {
    await page.goto('/');
    const card = page.locator('.post-card').first();
    const href = await card.locator('.post-link').getAttribute('href');
    await card.locator('.post-icon').click();
    await expect(page).toHaveURL(new RegExp(`${href}/?$`));
  });

  test('the icon and title are one link, not two to the same post', async ({ page }) => {
    await page.goto('/');
    const card = page.locator('.post-card').first();
    // A second link on the icon would have a screen reader announce the post twice.
    await expect(card.locator('a[href^="/posts/"]')).toHaveCount(1);
    await expect(card.locator('.post-link .post-icon')).toHaveCount(1);
  });

  test('the icon is exposed to assistive tech, not hidden as decoration', async ({
    page,
  }) => {
    await page.goto('/');
    // role="img" plus a label: an aria-hidden icon would leave a screen reader
    // unable to tell a video post from a written one.
    await expect(page.locator(VIDEO).first()).toHaveAttribute('role', 'img');
  });

  test('tag pages get the same treatment', async ({ page }) => {
    await page.goto('/tags/privacy');
    const cards = await page.locator('.post-card').count();
    expect(cards).toBeGreaterThan(0);
    expect(
      (await page.locator(VIDEO).count()) + (await page.locator(WRITTEN).count())
    ).toBe(cards);
  });

  test('the icon shares the title row and lines up with it', async ({ page }) => {
    await page.goto('/');
    const card = page.locator('.post-card').first();
    const icon = await card.locator('.post-icon').boundingBox();
    const title = await card.locator('.post-title').boundingBox();
    // Icon sits left of the title, vertically centred on its first line.
    expect(icon!.x + icon!.width).toBeLessThanOrEqual(title!.x);
    const iconMid = icon!.y + icon!.height / 2;
    const firstLineMid = title!.y + Math.min(title!.height, 28) / 2;
    expect(Math.abs(iconMid - firstLineMid)).toBeLessThan(4);
  });

  test('a wrapped title stays aligned with its own meta row', async ({ page }) => {
    // The point of the grid: column two holds both, so a two-line title does not
    // drop the date back under the icon.
    await page.setViewportSize({ width: 390, height: 800 });
    await page.goto('/');
    const card = page.locator('.post-card').first();
    const title = await card.locator('.post-title').boundingBox();
    const meta = await card.locator('.post-meta').boundingBox();
    expect(Math.abs(title!.x - meta!.x)).toBeLessThan(1);
  });

  test('no horizontal overflow once the icon column is added', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 800 });
    await page.goto('/');
    const overflows = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth
    );
    expect(overflows).toBe(false);
  });
});
