import { test, expect } from '@playwright/test';

// The resume PDF is generated at build time from the same data as the page. These
// assert the artifact exists, is reachable at its clean URL, and carries the properties
// that make a PDF useful rather than merely present.

const OUTPUTS = [
  { name: 'chrome print', clean: '/resume/offline', file: '/resume/offline.pdf' },
];

for (const { name, clean, file } of OUTPUTS) {
  test.describe(name, () => {
    test('is served as a real PDF', async ({ request }) => {
      const res = await request.get(file);
      expect(res.status()).toBe(200);
      // Static hosts infer the type from the extension. An extensionless path serves
      // with no Content-Type at all and renders as a blank page.
      expect(res.headers()['content-type']).toContain('application/pdf');
      const body = await res.body();
      expect(body.subarray(0, 5).toString()).toBe('%PDF-');
    });

    test('the clean URL redirects to the file', async ({ request }) => {
      // Not page.goto(): Chromium downloads a PDF rather than navigating to it, so the
      // navigation aborts. The redirect is a static meta-refresh page, so assert that.
      const res = await request.get(clean);
      expect(res.status()).toBe(200);
      const html = await res.text();
      expect(html).toContain(`url=${file}`);
      expect(html).toContain(`href="${file}"`);
    });

    test('fits two pages and keeps links clickable', async ({ request }) => {
      const body = (await (await request.get(file)).body()).toString('latin1');

      const pages = (body.match(/\/Type\s*\/Page[^s]/g) ?? []).length;
      expect(pages).toBeGreaterThan(0);
      expect(pages).toBeLessThanOrEqual(2);

      // A PDF nobody can click is a worse artifact than the web page it came from.
      expect(body).toContain('/Link');
      for (const url of ['https://frontsail.ai/', 'https://goiguide.com/']) {
        expect(body).toContain(url);
      }
    });
  });
}
