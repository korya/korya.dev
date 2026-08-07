import { test, expect } from '@playwright/test';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// This spec drives no browser, so it imports Playwright directly rather than the
// fixture -- which is also the exemption it grants below.
const here = dirname(fileURLToPath(import.meta.url));

test('every browser spec routes through the analytics-blocking fixture', () => {
  // The fixture is what keeps `yarn test` from posting a few hundred page_views to
  // the live property on every run, locally and in CI. It only applies to specs that
  // import `test` from it, so a new spec importing @playwright/test directly would
  // silently start leaking. Structural check rather than a runtime one: by the time a
  // hit escapes, it is already in the reports.
  const offenders: string[] = [];
  for (const file of readdirSync(here).filter((f) => f.endsWith('.spec.ts'))) {
    const source = readFileSync(join(here, file), 'utf-8');
    const drivesBrowser = /\{\s*page\s*[,}]|\bpage\.goto\(/.test(source);
    const usesFixture = /from '\.\/fixtures'/.test(source);
    if (drivesBrowser && !usesFixture) offenders.push(file);
  }
  expect(
    offenders,
    `these specs open pages but bypass the analytics fixture: ${offenders.join(', ')}`
  ).toEqual([]);
});
