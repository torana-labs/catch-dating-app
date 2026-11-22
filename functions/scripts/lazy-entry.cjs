"use strict";

// Writes the compiled entry point lib/index.js so each Function's module is
// loaded the first time its export is read, instead of every module at
// startup. Cloud Run hosts one Function per service and reads only its
// FUNCTION_TARGET export, so a cold instance loads that Function's code rather
// than every Function's. Deploy discovery and the emulator enumerate every
// export, which still loads everything, exactly as before.
//
// src/index.ts stays the source of truth. Its setup (global options, admin
// initialization) is compiled and runs first; then each export the resolver
// (functions/scripts/functionExports.cjs) lists gets a getter that requires
// its module on first read, in source order. The entry is written from the
// resolved export list rather than by patching tsc's output, so any entry
// shape the resolver rejects fails the build instead of shipping a partially
// lazy entry point.

const fs = require("node:fs");
const path = require("node:path");
const {functionExportsFromSource, readEntryText, setupSource} = require("./functionExports.cjs");

const functionsRoot = path.resolve(__dirname, "..");

/**
 * The lazy CommonJS entry for an entry source: compiled setup, then one getter
 * per export. readText(file) supplies the area entries the source stars.
 */
function lazyEntrySource(indexSource, {ts, readText} = {}) {
  const list = functionExportsFromSource(indexSource, {readText});
  const getters = list.map(({name, symbol, module}) =>
    `Object.defineProperty(exports, ${JSON.stringify(name)}, { enumerable: true, ` +
    `get: function () { return require(${JSON.stringify(`./${module}`)}).${symbol}; } });`);
  const modules = new Set(list.map(({module}) => module));
  const setup = setupSource(indexSource, {ts}).replace(/\n*$/u, "\n");
  return {source: `${setup}${getters.join("\n")}\n`, modules: modules.size, exports: getters.length};
}

function main(root = functionsRoot) {
  const entry = path.join(root, "lib", "index.js");
  if (!fs.existsSync(entry)) throw new Error("Build Functions first: lib/index.js is missing.");
  const result = lazyEntrySource(fs.readFileSync(path.join(root, "src", "index.ts"), "utf8"),
    {readText: (file) => readEntryText(root, file)});
  fs.writeFileSync(entry, result.source);
  // tsc's map describes the entry it emitted, which this replaces.
  fs.rmSync(`${entry}.map`, {force: true});
  process.stdout.write(
    `Lazy entry: ${result.exports} exports from ${result.modules} modules load on first read.\n`);
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}

module.exports = {lazyEntrySource, main};
