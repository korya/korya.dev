import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { PDF_STAMP_PATH, PDF_SOURCES, hashFile, hashPdfSources } from '../src/lib/pdf-sources.mjs';
import { PDF_TARGET } from '../src/lib/pdf-targets.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// Not an end-to-end test, but this is the runner CI already gates on, and the artifact
// it guards is the PDF the other specs exercise.
test('the committed PDF was rendered from the current resume', async () => {
  const stamp = JSON.parse(await readFile(join(root, PDF_STAMP_PATH), 'utf-8'));
  const actual = await hashPdfSources(root);

  expect(
    actual,
    `public/resume/offline.pdf is stale: ${PDF_SOURCES.join(', ')} changed since it was ` +
      'rendered. Run `yarn pdf` and commit the result.'
  ).toBe(stamp.sha256);
});

test('the committed PDF is the one that was stamped', async () => {
  const stamp = JSON.parse(await readFile(join(root, PDF_STAMP_PATH), 'utf-8'));
  const actual = await hashFile(join(root, 'public', PDF_TARGET.output));

  // `yarn pdf` writes the PDF and the stamp together. Committing only the stamp would
  // otherwise leave a stale PDF that the source-digest check happily accepts.
  expect(
    actual,
    `public/${PDF_TARGET.output} does not match src/lib/pdf-stamp.json. Commit both ` +
      'files together, or re-run `yarn pdf`.'
  ).toBe(stamp.pdfSha256);
});
