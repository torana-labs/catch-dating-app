"use strict";

// Prebuild preflight: a clone that never ran contract generation fails here
// with the command to run, instead of with a wall of tsc errors (#2204).
// Dependency-free on purpose: a Functions-only install lacks the root
// packages the generator needs, so this only reads the generator's list.
const fs = require("node:fs");
const path = require("node:path");

const MANIFEST = "src/shared/generated/generatedModules.json";
const REMEDY = "Generated contract modules are missing. Run " +
  "`bash tool/git/bootstrap_worktree.sh --target functions` " +
  "(or `npm run generate:contracts` from the repo root).";

/**
 * Generated modules the build needs that are absent.
 * @param {string} functionsDir The functions package directory.
 * @return {string[]} functions/-relative paths; the manifest itself when the
 *   generator never ran.
 */
function missingGeneratedModules(functionsDir) {
  const manifestPath = path.join(functionsDir, MANIFEST);
  if (!fs.existsSync(manifestPath)) return [MANIFEST];
  const {modules} = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  if (!Array.isArray(modules)) return [MANIFEST];
  return modules.filter((file) => !fs.existsSync(path.join(functionsDir, file)));
}

if (require.main === module) {
  const missing = missingGeneratedModules(path.resolve(__dirname, ".."));
  if (missing.length > 0) {
    console.error(REMEDY);
    for (const file of missing.slice(0, 10)) console.error(`- functions/${file}`);
    if (missing.length > 10) console.error(`- and ${missing.length - 10} more`);
    process.exitCode = 1;
  }
}

module.exports = {MANIFEST, REMEDY, missingGeneratedModules};
