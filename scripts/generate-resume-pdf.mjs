// Renders /resume to public/resume/offline.pdf.
//
// Run with `yarn pdf` after changing the resume; the result is committed.
//
// This deliberately does NOT run during `astro build`. The site deploys to
// DigitalOcean App Platform on a Heroku-style buildpack with no root and no apt, so
// Chrome's shared libraries (libnspr4, libnss3, …) cannot be installed and the browser
// cannot start. Generating at build time made every deploy fail. Committing the PDF
// keeps the deploy a pure static build, and it lands in public/ so the dev server
// serves it too.

import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';
import { PDF_TARGET } from '../src/lib/pdf-targets.mjs';
import { PDF_STAMP_PATH, hashFile, hashPdfSources } from '../src/lib/pdf-sources.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 4179;

const run = (cmd, args, opts = {}) =>
  new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { cwd: root, stdio: 'inherit', ...opts });
    child.on('exit', (code) =>
      code === 0 ? resolve() : reject(new Error(`${cmd} ${args.join(' ')} exited ${code}`))
    );
    child.on('error', reject);
  });

async function waitForServer(url, timeoutMs = 60_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

console.log('› building the site');
await run('yarn', ['build']);

console.log(`› serving dist/ on :${PORT}`);
const server = spawn('yarn', ['preview', '--port', String(PORT)], {
  cwd: root,
  stdio: 'ignore',
});

try {
  const origin = `http://localhost:${PORT}`;
  await waitForServer(`${origin}${PDF_TARGET.source}`);

  console.log(`› rendering ${PDF_TARGET.source}`);
  const browser = await puppeteer.launch({
    // CI runners are Ubuntu 24.04, where AppArmor blocks unprivileged user namespaces
    // and Chrome aborts with "No usable sandbox". Local runs keep the sandbox; the page
    // being rendered is our own freshly built output either way.
    args: process.env.CI ? ['--no-sandbox'] : [],
  });
  try {
    const page = await browser.newPage();
    await page.emulateMediaType('print');
    await page.goto(`${origin}${PDF_TARGET.source}`, { waitUntil: 'networkidle2' });
    const buffer = await page.pdf(PDF_TARGET.pdf);

    const out = join(root, 'public', PDF_TARGET.output);
    await mkdir(dirname(out), { recursive: true });
    await writeFile(out, buffer);
    console.log(`✔ wrote public/${PDF_TARGET.output} (${(buffer.length / 1024).toFixed(0)} KB)`);

    // Record what this PDF was rendered from, so a test can tell when it goes stale.
    const sha256 = await hashPdfSources(root);
    await writeFile(
      join(root, PDF_STAMP_PATH),
      JSON.stringify(
        { sha256, pdfSha256: await hashFile(out), renderedFrom: PDF_TARGET.source },
        null,
        2
      ) + '\n'
    );
    console.log(`✔ stamped ${PDF_STAMP_PATH} (${sha256.slice(0, 12)}…)`);
  } finally {
    await browser.close();
  }
} finally {
  server.kill();
}
