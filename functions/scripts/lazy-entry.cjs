"use strict";

// Rewrites the compiled entry point so each Function's module is loaded the
// first time its export is read, instead of every module at startup. Cloud Run
// hosts one Function per service and reads only its FUNCTION_TARGET export, so
// a cold instance loads that Function's code rather than every Function's.
// Deploy discovery and the emulator enumerate every export, which still loads
// everything, exactly as before.
//
// src/index.ts stays the source of truth: global options and admin
// initialization are unchanged and run first; only the relative re-export
// requires that tsc emits are deferred into their export getters. Any other
// shape fails the build rather than shipping a partially lazy entry point.

const fs = require("node:fs");
const path = require("node:path");

const entry = path.resolve(__dirname, "..", "lib", "index.js");
const relativeRequire = /^var (\w+) = require\("(\.\.?\/[^"]+)"\);$/;
const reexportGetter =
  /^Object\.defineProperty\(exports, "(\w+)", \{ enumerable: true, get: function \(\) \{ return (\w+)\.(\w+); \} \}\);$/;

function makeEntryLazy(source) {
  const lines = source.split("\n");
  const bindings = new Map();
  lines.forEach((line, index) => {
    const match = relativeRequire.exec(line);
    if (!match) return;
    if (bindings.has(match[1])) throw new Error(`Duplicate module binding ${match[1]}.`);
    bindings.set(match[1], {specifier: match[2], line: index, reads: 0});
  });
  if (bindings.size === 0) throw new Error("No relative re-exports found; is the entry already lazy?");

  const bindingUse = new RegExp(`\\b(${[...bindings.keys()].join("|")})\\b`);
  let exportsRewritten = 0;
  const output = lines.map((line, index) => {
    const required = relativeRequire.exec(line);
    // Keep the line so the entry's source map still lines up.
    if (required) return `// Loaded on first read: ${required[2]}`;
    const getter = reexportGetter.exec(line);
    if (getter) {
      const binding = bindings.get(getter[2]);
      if (!binding) throw new Error(`Export ${getter[1]} reads unknown binding ${getter[2]}.`);
      if (binding.line > index) throw new Error(`Export ${getter[1]} precedes its module.`);
      binding.reads += 1;
      exportsRewritten += 1;
      return `Object.defineProperty(exports, "${getter[1]}", { enumerable: true, ` +
        `get: function () { return require("${binding.specifier}").${getter[3]}; } });`;
    }
    const stray = bindingUse.exec(line);
    if (stray) throw new Error(`Line ${index + 1} uses ${stray[1]} outside an export getter.`);
    return line;
  });
  for (const [name, binding] of bindings) {
    if (binding.reads === 0) throw new Error(`Module ${binding.specifier} (${name}) exports nothing.`);
  }
  return {source: output.join("\n"), modules: bindings.size, exports: exportsRewritten};
}

function main() {
  const result = makeEntryLazy(fs.readFileSync(entry, "utf8"));
  fs.writeFileSync(entry, result.source);
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

module.exports = {makeEntryLazy};
