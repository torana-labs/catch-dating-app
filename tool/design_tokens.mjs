#!/usr/bin/env node
// Generates website token CSS, website font assets and Flutter Dart constants
// from design/tokens/catch.tokens.json. --check rebuilds in memory and fails if
// a tracked output is stale.
import fs from "node:fs";
import path from "node:path";
import {pathToFileURL} from "node:url";
import StyleDictionary from "style-dictionary";
import {repoRoot} from "./lib/repo_paths.mjs";
import {
  assertTokenTree,
  fontFaces,
  styleDictionaryConfig,
  tokenPath,
} from "./design_tokens/lib/style_dictionary.config.mjs";

export async function generateTokenOutputs({root = repoRoot} = {}) {
  const document = JSON.parse(fs.readFileSync(path.join(root, tokenPath), "utf8"));
  assertTokenTree(document);
  const dictionary = new StyleDictionary(styleDictionaryConfig({document, root}));
  const files = await dictionary.formatPlatform("catch");
  return {
    files: files.map(({destination, output}) => ({destination, output})),
    fonts: fontFaces(document),
  };
}

export function staleOutputs({files, fonts}, {root = repoRoot} = {}) {
  const read = (relativePath) => {
    const absolute = path.join(root, relativePath);
    return fs.existsSync(absolute) ? fs.readFileSync(absolute) : null;
  };
  const failures = [];
  for (const {destination, output} of files) {
    const current = read(destination);
    if (current == null) failures.push(`missing ${destination}`);
    else if (!current.equals(Buffer.from(output))) failures.push(`stale ${destination}`);
  }
  for (const {source, target} of fonts) {
    const sourceBytes = read(source);
    const targetBytes = read(target);
    if (sourceBytes == null) failures.push(`missing ${source}`);
    else if (targetBytes == null) failures.push(`missing ${target}`);
    else if (!sourceBytes.equals(targetBytes)) failures.push(`stale ${target}`);
  }
  return failures;
}

export function writeOutputs({files, fonts}, {root = repoRoot} = {}) {
  const write = (relativePath, contents) => {
    const absolute = path.join(root, relativePath);
    fs.mkdirSync(path.dirname(absolute), {recursive: true});
    fs.writeFileSync(absolute, contents);
  };
  for (const {destination, output} of files) write(destination, output);
  for (const {source, target} of fonts) {
    const absolute = path.join(root, source);
    if (!fs.existsSync(absolute)) throw new Error(`Missing font source: ${source}`);
    write(target, fs.readFileSync(absolute));
  }
}

const help = `Usage: node tool/design_tokens.mjs [--check]

Generates website token CSS, website font assets, and Flutter Dart constants
from ${tokenPath}.

Options:
  --check   Rebuild in memory and fail if generated outputs are stale.
`;

async function main(args) {
  if (args.includes("--help") || args.includes("-h")) {
    process.stdout.write(help);
    return;
  }
  if (!fs.existsSync(path.join(repoRoot, tokenPath))) {
    console.error(`Missing token file: ${tokenPath}`);
    process.exitCode = 1;
    return;
  }
  const outputs = await generateTokenOutputs();
  if (args.includes("--check")) {
    const failures = staleOutputs(outputs);
    if (failures.length > 0) {
      console.error(["Design token check failed:", ...failures.map((failure) => `- ${failure}`),
        "Run: node tool/design_tokens.mjs"].join("\n"));
      process.exitCode = 1;
      return;
    }
    console.log("Design token check passed.");
    return;
  }
  writeOutputs(outputs);
  console.log(`Generated ${outputs.files.map(({destination}) => destination).join(" and ")} from ${tokenPath}.`);
}

if (process.argv[1] != null && import.meta.url === pathToFileURL(fs.realpathSync(process.argv[1])).href) {
  await main(process.argv.slice(2));
}
