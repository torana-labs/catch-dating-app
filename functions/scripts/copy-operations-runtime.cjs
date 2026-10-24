'use strict';
/* eslint-disable @typescript-eslint/no-require-imports, max-len */

// Copies the Operations runtime that Functions loads at run time into
// functions/lib, preserving repository-relative paths so module-relative
// imports, policy files and contracts resolve the same way they do in the
// repository. --check verifies the copy is complete and byte-identical, and
// that no file outside the current source tree lingers in lib.

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {pathToFileURL} = require('node:url');

const root = path.resolve(__dirname, '../..');
const out = path.join(root, 'functions', 'lib');
const trees = [
  'operations/src/platform',
  'operations/src/workflows/outreach-drafting',
  'operations/src/workflows/supply-intake',
  'contracts/operations',
];
// Test fixtures never ship: captured pages and contract examples are inputs
// to tests, not to production code.
const excluded = [
  /^operations\/src\/workflows\/supply-intake\/fixtures\//u,
  /^contracts\/operations\/fixtures\//u,
];
const shipped = /\.(?:mjs|json)$/u;
const check = process.argv.includes('--check');
const digest = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');

function listFiles(base, relative) {
  const directory = path.join(base, relative);
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, {withFileTypes: true}).flatMap((entry) => {
    const child = path.posix.join(relative, entry.name);
    if (entry.isDirectory()) return listFiles(base, child);
    return entry.isFile() && shipped.test(child) && !excluded.some((pattern) => pattern.test(child)) ?
      [child] : [];
  });
}

async function main() {
  if (!fs.existsSync(path.join(out, 'index.js'))) {
    throw new Error('Compile Functions before copying the Operations runtime.');
  }
  const files = trees.flatMap((tree) => listFiles(root, tree)).sort();
  if (files.length === 0) throw new Error('No Operations runtime files were found.');
  for (const file of files) {
    const source = path.join(root, file);
    const target = path.join(out, file);
    if (!check) {
      fs.mkdirSync(path.dirname(target), {recursive: true});
      fs.copyFileSync(source, target);
    }
    if (!fs.existsSync(target) || digest(fs.readFileSync(source)) !== digest(fs.readFileSync(target))) {
      throw new Error(`Stale Operations runtime dependency: ${file}`);
    }
  }
  const expected = new Set(files);
  const lingering = trees.flatMap((tree) => listFiles(out, tree)).filter((file) => !expected.has(file));
  if (lingering.length > 0) {
    throw new Error(`Operations runtime files no longer in the source tree: ${lingering.join(', ')}`);
  }
  const [outreach, intake] = await Promise.all([
    import(pathToFileURL(path.join(out, 'operations/src/workflows/outreach-drafting/workflow.mjs')).href),
    import(pathToFileURL(path.join(out, 'operations/src/workflows/supply-intake/intake-request.mjs')).href),
  ]);
  const workflow = new outreach.OutreachDraftingWorkflow({repoRoot: out});
  workflow.contracts();
  if (workflow.workflowId !== 'outreach-drafting' || typeof intake.gatherIntakeEvidence !== 'function') {
    throw new Error('Unexpected bundled Operations workflows.');
  }
  process.stdout.write(`Operations runtime ${check ? 'fresh' : 'copied'}: ${files.length} files.\n`);
}
main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
});
