import { test, expect } from '@playwright/test';
import { formatPostDate, serializePostDate } from '../src/lib/dates';

test.describe('post calendar dates', () => {
  const date = new Date('2026-09-02');

  test('formats the authored day rather than the local day before it', () => {
    expect(formatPostDate(date)).toBe('September 2, 2026');
  });

  test('serializes a stable date-only value for plain-text feeds', () => {
    expect(serializePostDate(date)).toBe('2026-09-02');
  });
});
