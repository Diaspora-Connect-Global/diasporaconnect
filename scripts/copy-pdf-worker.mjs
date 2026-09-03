// Copies the pdfjs-dist worker into /public so it can be served same-origin
// (avoids Turbopack worker-bundling quirks). Runs on postinstall; version stays
// in lockstep with the installed pdfjs-dist.
import { mkdirSync, copyFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const src = resolve(root, 'node_modules/pdfjs-dist/build/pdf.worker.min.mjs');
const destDir = resolve(root, 'public/pdfjs');
const dest = resolve(destDir, 'pdf.worker.min.mjs');

if (!existsSync(src)) {
  console.warn('[copy-pdf-worker] pdfjs-dist worker not found; skipping. Expected at', src);
  process.exit(0);
}
mkdirSync(destDir, { recursive: true });
copyFileSync(src, dest);
console.log('[copy-pdf-worker] copied worker →', dest);
