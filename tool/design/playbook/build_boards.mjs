#!/usr/bin/env node
// Regenerates the Playbook canvas boards from pages/*.json.
//
//   node tool/design/playbook/build_boards.mjs [out-dir] [--pages-only]
//
// Writes <board>.dc.html and its 390px phone wrapper <board>390.dc.html for
// every page spec. Unless --pages-only is given it also copies the kit
// components, the two stylesheets and the one-off boards, so out-dir holds the
// complete flat file set the design canvas serves. The default out-dir is
// build/design/playbook-boards at the repository root, which Git ignores.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { composePage, composePhone, readPages, REPO_ROOT, ROOT, KIT_DIR, ONEOFF_DIR } from './lib/compose.mjs';

const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  console.log('Usage: node tool/design/playbook/build_boards.mjs [out-dir] [--pages-only]');
  process.exit(0);
}
const unknown = args.filter((a) => a.startsWith('--') && a !== '--pages-only');
if (unknown.length) {
  console.error(`Unknown option: ${unknown.join(' ')}`);
  process.exit(2);
}
const pagesOnly = args.includes('--pages-only');
const positional = args.filter((a) => !a.startsWith('--'));
const outDir = path.resolve(positional[0] ?? path.join(REPO_ROOT, 'build', 'design', 'playbook-boards'));

// Never write into the source pack or over these scripts.
const protectedDirs = [ROOT, path.dirname(fileURLToPath(import.meta.url))];
if (protectedDirs.some((dir) => outDir === dir || outDir.startsWith(dir + path.sep))) {
  console.error(`Refusing to write into the playbook sources: ${outDir}`);
  process.exit(2);
}

fs.mkdirSync(outDir, { recursive: true });
let written = 0;
for (const { page } of readPages()) {
  fs.writeFileSync(path.join(outDir, `${page.board}.dc.html`), composePage(page));
  fs.writeFileSync(path.join(outDir, `${page.board}390.dc.html`), composePhone(page.board, page.phone));
  written += 2;
}
if (!pagesOnly) {
  for (const dir of [KIT_DIR, ONEOFF_DIR]) {
    for (const f of fs.readdirSync(dir).sort()) {
      fs.copyFileSync(path.join(dir, f), path.join(outDir, f));
      written += 1;
    }
  }
}
console.log(`Wrote ${written} files to ${outDir}`);
