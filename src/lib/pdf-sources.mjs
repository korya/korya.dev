import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

// The committed PDF can silently fall behind the page it was rendered from. Comparing
// the PDF itself is useless as a check: Chrome stamps a creation date into every
// render, so two runs of `yarn pdf` over identical input produce different bytes.
//
// Instead, hash the files that determine the PDF's content. `yarn pdf` records the
// digest; a test recomputes it and fails when they diverge, which happens exactly when
// the resume changed and nobody regenerated.

/** Files whose content ends up in the rendered PDF. */
export const PDF_SOURCES = [
  'src/data/resume.ts', // the words
  'src/pages/resume.astro', // the markup and the print stylesheet
  'public/resume-prod-qr-code.png', // embedded in the masthead
];

/** Where the digest recorded by `yarn pdf` lives. Outside public/, so it is not served. */
export const PDF_STAMP_PATH = 'src/lib/pdf-stamp.json';

/** Digest of a single file. */
export async function hashFile(path) {
  return createHash('sha256').update(await readFile(path)).digest('hex');
}

/** Digest of every source file, order-stable and path-sensitive. */
export async function hashPdfSources(root) {
  const hash = createHash('sha256');
  for (const rel of PDF_SOURCES) {
    hash.update(rel);
    hash.update(await readFile(join(root, rel)));
  }
  return hash.digest('hex');
}
