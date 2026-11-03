#!/usr/bin/env node
// Builds @catch/web-ui for the design-system artifact, the way
// catch-design-source/ds/build.mjs builds the canvas's bundle, so the canvas
// can swap one for the other:
//
// - bundle.js: one classic script that sets window.Catch and takes React and
//   ReactDOM from the page (the canvas supplies React 18), minified for es2019,
//   with the @ds-bundle header the artifact reads its gallery from. Every
//   barrel export keeps its name, and each system component web-ui carries is
//   also exported under its system name (Catch.Button is Catch.CatchButton).
// - bundle.css: web-config's token CSS (fonts from ../fonts/), then every CSS
//   module with stable `<File>_<class>` names.
// - index.d.ts: the barrel's declarations in one file.
//
// `npm --workspace @catch/web-ui run build` writes them to build/web-ui;
// tool/design/publish_design_system.mjs builds the whole artifact folder.
import {spawnSync} from "node:child_process";
import fs from "node:fs";
import {createRequire} from "node:module";
import os from "node:os";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {parseArgs} from "node:util";
import {reactDir, reactDomDir} from "@catch/web-ui-react18";
import esbuild from "esbuild";
import {JSDOM, VirtualConsole} from "jsdom";
import {artifactPlan, dsBundleHeader} from "../../../tool/design/lib/design_system_manifest.mjs";

const require = createRequire(import.meta.url);
export const packageDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(packageDir, "../..");
const barrel = path.join(packageDir, "src/index.ts");
const cssModuleTypes = path.join(packageDir, "src/css-modules.d.ts");
export const tokensCssPath = path.join(repoRoot, "packages/web-config/generated/catch-tokens.css");
const external = ["react", "react-dom", "react/*", "react-dom/*"];

/** The barrel's runtime exports. */
export async function barrelExports() {
  const result = await esbuild.build({
    bundle: true, entryPoints: [barrel], external, format: "esm", logLevel: "silent", metafile: true, outdir: "out", write: false,
  });
  return new Set(Object.values(result.metafile.outputs).find((output) => output.entryPoint)?.exports ?? []);
}

// React from the page, as ds/build.mjs takes it: the canvas loads React 18 as
// globals, and the automatic JSX runtime becomes React.createElement. esbuild
// runs filters as Go regular expressions, which take no flags.
const reactImport = new RegExp("^react(?:-dom)?(?:/.*)?$");
const anyPath = new RegExp(".*");
const reactGlobals = {
  name: "react-globals",
  setup(build) {
    build.onResolve({filter: reactImport}, (args) => ({namespace: "react-global", path: args.path}));
    build.onLoad({filter: anyPath, namespace: "react-global"}, (args) => ({
      contents: args.path.startsWith("react-dom") ? "module.exports = window.ReactDOM;"
        : /^react\/jsx(?:-dev)?-runtime$/u.test(args.path)
          ? "const R = window.React; const jsx = (t, p, k) => R.createElement(t, k === undefined ? p : {...p, key: k}); module.exports = {jsx, jsxs: jsx, jsxDEV: jsx, Fragment: R.Fragment};"
          : "module.exports = window.React;",
      loader: "js",
    }));
  },
};

function writeEntry(dir, aliases) {
  const entry = path.join(dir, "entry.ts");
  const lines = [
    `/// <reference path=${JSON.stringify(cssModuleTypes)} />`,
    `export * from ${JSON.stringify(barrel.replace(/\.ts$/u, ""))};`,
  ];
  if (aliases.length > 0) {
    lines.push(`export {${aliases.map(([alias, symbol]) => `${symbol} as ${alias}`).join(", ")}} from ${JSON.stringify(barrel.replace(/\.ts$/u, ""))};`);
  }
  fs.writeFileSync(entry, `${lines.join("\n")}\n`);
  return entry;
}

/** The token CSS with its font URLs pointing at the artifact's fonts/ folder. */
export function tokensCssForArtifact(source) {
  return source.replaceAll("url(\"./assets/fonts/", "url(\"../fonts/");
}

/**
 * Writes bundle.js, bundle.css and index.d.ts into `outDir`. `aliases` are
 * `[systemName, symbol]` pairs; `cards` names the gallery cards in order.
 */
export async function buildComponents({outDir, aliases = [], cards = []}) {
  fs.mkdirSync(outDir, {recursive: true});
  const work = fs.mkdtempSync(path.join(os.tmpdir(), "catch-web-ui-artifact-"));
  try {
    const entry = writeEntry(work, aliases);
    const result = await esbuild.build({
      bundle: true,
      define: {"process.env.NODE_ENV": "\"production\""},
      entryPoints: [entry],
      format: "iife",
      globalName: "Catch",
      legalComments: "none",
      logLevel: "silent",
      // CSS module classes keep their `<File>_<class>` names, which minified
      // identifiers would shorten to `.a`, `.b` on a page the canvas shares.
      minifyIdentifiers: false,
      minifySyntax: true,
      minifyWhitespace: true,
      outdir: work,
      plugins: [reactGlobals],
      target: "es2019",
      write: false,
    });
    const js = result.outputFiles.find((file) => file.path.endsWith(".js")).text
      .replace(/<\/script/giu, "<\\/script").replace(/<!--/gu, "<\\!--");
    const css = result.outputFiles.find((file) => file.path.endsWith(".css"))?.text ?? "";
    fs.writeFileSync(path.join(outDir, "bundle.js"), dsBundleHeader(cards) + js);
    fs.writeFileSync(path.join(outDir, "bundle.css"), `${tokensCssForArtifact(fs.readFileSync(tokensCssPath, "utf8"))}\n${css}`);
    fs.writeFileSync(path.join(outDir, "index.d.ts"), buildTypes(entry));
  } finally {
    fs.rmSync(work, {force: true, recursive: true});
  }
}

function buildTypes(entry) {
  const {generateDtsBundle} = require("dts-bundle-generator");
  const [types] = generateDtsBundle(
    [{filePath: entry, output: {exportReferencedTypes: false, noBanner: true}}],
    {preferredConfigPath: path.join(packageDir, "tsconfig.json")},
  );
  return `// Catch design system: types for every component, built from @catch/web-ui.\n// Flutter mirrors these names; design/components/catch.components.json records both.\n${types}`;
}

/** web-ui's static Storybook, built into `outDir`. */
export function buildStorybook(outDir) {
  const result = spawnSync("npm", ["run", "build:storybook", "--", "--output-dir", outDir], {cwd: packageDir, encoding: "utf8"});
  if (result.status !== 0) {
    throw new Error(`Storybook build failed:\n${result.stdout}\n${result.stderr}`);
  }
}

/**
 * Loads bundle.js the way the canvas does, after React 18 and ReactDOM 18 as
 * page globals, and returns its problems: no window.Catch, an alias that is not
 * its symbol, or a Button that does not render.
 */
export function bundleProblems(bundleSource, aliases) {
  // React reports render errors on the console too; they come back as problems.
  const dom = new JSDOM("<!doctype html><html><body><div id=\"root\"></div></body></html>", {
    pretendToBeVisual: true, runScripts: "outside-only", virtualConsole: new VirtualConsole(),
  });
  const {window} = dom;
  const problems = [];
  try {
    window.eval(fs.readFileSync(path.join(reactDir, "umd/react.production.min.js"), "utf8"));
    window.eval(fs.readFileSync(path.join(reactDomDir, "umd/react-dom.production.min.js"), "utf8"));
    window.eval(bundleSource);
    const catalog = window.Catch;
    if (!catalog) return ["bundle.js does not define window.Catch"];
    for (const [alias, symbol] of aliases) {
      if (catalog[symbol] == null) problems.push(`Catch.${symbol} is missing`);
      else if (catalog[alias] !== catalog[symbol]) problems.push(`Catch.${alias} is not Catch.${symbol}`);
    }
    if (catalog.CatchButton) {
      const root = window.ReactDOM.createRoot(window.document.getElementById("root"));
      window.ReactDOM.flushSync(() => root.render(window.React.createElement(catalog.CatchButton, {label: "Book", onPressed() {}})));
      if (!window.document.getElementById("root").textContent.includes("Book")) problems.push("Catch.CatchButton rendered nothing on React 18");
      root.unmount();
    }
  } catch (error) {
    problems.push(`bundle.js failed on React 18: ${error.message}`);
  } finally {
    window.close();
  }
  return problems;
}

async function runCli() {
  const {values} = parseArgs({options: {out: {type: "string"}}});
  const outDir = path.resolve(values.out ?? path.join(repoRoot, "build/web-ui"));
  const plan = artifactPlan({exports: await barrelExports(), root: repoRoot});
  await buildComponents({aliases: plan.aliases, cards: plan.cardNames, outDir});
  const problems = bundleProblems(fs.readFileSync(path.join(outDir, "bundle.js"), "utf8"), plan.aliases);
  if (problems.length > 0) {
    console.error(problems.join("\n"));
    process.exit(1);
  }
  console.log(`Built bundle.js, bundle.css and index.d.ts in ${path.relative(process.cwd(), outDir) || "."}.`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  runCli().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
