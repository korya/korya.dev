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

test.describe('post type filter', () => {
  const visible = (page: import('@playwright/test').Page) =>
    page.locator('.post-card:visible');

  test('narrows the list to one type and back', async ({ page }) => {
    await page.goto('/');
    const total = await visible(page).count();
    expect(total).toBeGreaterThan(0);

    await page.locator('[data-filter="video"]').click();
    const videos = await visible(page).count();
    expect(videos).toBeGreaterThan(0);
    expect(videos).toBeLessThan(total);
    // Everything left standing is actually a video.
    for (const card of await visible(page).all()) {
      await expect(card).toHaveAttribute('data-type', 'video');
    }

    await page.locator('[data-filter="text"]').click();
    for (const card of await visible(page).all()) {
      await expect(card).toHaveAttribute('data-type', 'text');
    }
    expect(await visible(page).count()).toBe(total - videos);

    await page.locator('[data-filter="all"]').click();
    expect(await visible(page).count()).toBe(total);
  });

  test('the counts on the pills match what filtering shows', async ({ page }) => {
    await page.goto('/');
    for (const type of ['video', 'text']) {
      const pill = page.locator(`[data-filter="${type}"]`);
      const claimed = Number(await pill.locator('.count').innerText());
      await pill.click();
      expect(await visible(page).count()).toBe(claimed);
    }
  });

  test('the choice survives a reload and can be shared', async ({ page }) => {
    await page.goto('/');
    await page.locator('[data-filter="video"]').click();
    expect(new URL(page.url()).search).toBe('?type=video');

    await page.reload();
    await expect(page.locator('[data-filter="video"]')).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    for (const card of await visible(page).all()) {
      await expect(card).toHaveAttribute('data-type', 'video');
    }
  });

  test('a junk type in the URL falls back to showing everything', async ({ page }) => {
    await page.goto('/');
    const total = await visible(page).count();
    await page.goto('/?type=nonsense');
    expect(await visible(page).count()).toBe(total);
    await expect(page.locator('[data-filter="all"]')).toHaveAttribute(
      'aria-pressed',
      'true'
    );
  });

  test('the rule between entries drops under the last visible one', async ({ page }) => {
    // :last-child still points at a hidden card once filtering starts, which would
    // leave a rule hanging under the final entry.
    await page.goto('/');
    await page.locator('[data-filter="text"]').click();
    const last = visible(page).last();
    const width = await last.evaluate(
      (el) => getComputedStyle(el).borderBottomWidth
    );
    expect(width).toBe('0px');
  });

  test('only one pill reads as pressed at a time', async ({ page }) => {
    await page.goto('/');
    await page.locator('[data-filter="video"]').click();
    expect(await page.locator('[aria-pressed="true"]').count()).toBe(1);
  });
});

test.describe('post type filter without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('is not rendered at all, rather than shown as a dead control', async ({
    page,
  }) => {
    await page.goto('/');
    // Filtering is client-side. Inert pills over a list that already shows
    // everything would be worse than no pills.
    await expect(page.locator('.post-filter')).toBeHidden();
    expect(await page.locator('.post-card').count()).toBeGreaterThan(0);
  });
});
