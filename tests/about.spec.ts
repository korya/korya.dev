import { test, expect } from './fixtures';

// /about is where a reader lands to find out who Dmitri is, so it carries the
// canonical Person node. The prose is covered by resume.spec.ts through /llms.txt,
// which mirrors this page by hand.

const PERSON_ID = 'https://korya.dev/about#person';
const COSMIC_LIFT_ID = 'https://cosmic-lift.com/#organization';

test.describe('about page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/about');
  });

  test('names Cosmic Lift in the prose and offers it as a contact route', async ({
    page,
  }) => {
    // Two links on purpose: the paragraph is for the reader forming an impression,
    // the contact entry is for the one who has already decided.
    const prose = page.locator('article.about p a[href="https://cosmic-lift.com/"]');
    await expect(prose).toHaveText('Cosmic Lift');
    await expect(prose).toHaveAttribute('rel', /noopener/);

    const contact = page.locator('article.about li', { hasText: 'Consulting:' });
    await expect(contact.locator('a')).toHaveAttribute(
      'href',
      'https://cosmic-lift.com/'
    );
    await expect(contact.locator('a')).toHaveText('Cosmic Lift');
  });

  test('exposes the canonical Person node', async ({ page }) => {
    const raw = await page
      .locator('script[type="application/ld+json"]')
      .first()
      .innerText();
    const schema = JSON.parse(raw);
    expect(schema['@type']).toBe('ProfilePage');

    // The same id /resume uses. Two pages describing one person, not two people.
    expect(schema.mainEntity['@id']).toBe(PERSON_ID);

    // Reusing the id cosmic-lift.com publishes for itself is what lets the two
    // sites' graphs join; a plain url would leave two lookalike companies.
    expect(schema.mainEntity.affiliation['@id']).toBe(COSMIC_LIFT_ID);
    expect(schema.mainEntity.affiliation.url).toBe('https://cosmic-lift.com/');

    // sameAs carries profiles of this same person, never the companies.
    expect(schema.mainEntity.sameAs).toContain('https://github.com/korya');
    expect(schema.mainEntity.sameAs).not.toContain('https://cosmic-lift.com/');
    expect(schema.mainEntity.worksFor.url).toBe('https://frontsail.ai/');
  });

  test('posts point at the same Person node', async ({ page }) => {
    // Without a shared id, every post would introduce a fresh lookalike author.
    await page.goto('/');
    const href = await page
      .locator('a[href^="/posts/"]')
      .first()
      .getAttribute('href');
    await page.goto(href!);
    const raw = await page
      .locator('script[type="application/ld+json"]')
      .first()
      .innerText();
    const schema = JSON.parse(raw);
    expect(schema['@type']).toBe('BlogPosting');
    expect(schema.author['@id']).toBe(PERSON_ID);
    expect(schema.publisher['@id']).toBe(PERSON_ID);
  });
});
