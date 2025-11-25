import { cpSync, rmSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SOURCE = join(ROOT, 'content', 'posts');
const DEST = join(ROOT, 'src', 'content', 'posts');

// Ensure parent directory exists
mkdirSync(dirname(DEST), { recursive: true });

// Clean destination
if (existsSync(DEST)) {
  rmSync(DEST, { recursive: true });
}

// Copy content
if (existsSync(SOURCE)) {
  cpSync(SOURCE, DEST, { recursive: true });
  console.log('✓ Content synced to src/content/posts/');
} else {
  console.log('⚠ No content found at', SOURCE);
  mkdirSync(DEST, { recursive: true });
}
