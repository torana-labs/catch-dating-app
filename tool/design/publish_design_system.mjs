#!/usr/bin/env node
// Builds the design-system artifact folder from @catch/web-ui and checks it.
// The reviewer uploads the folder to the design-system artifact with Claude's
// Artifact tool after a library PR merges; docs/design_system_publishing.md
// describes the loop.
//
//   --build   [--out <dir>] [--tokens-from <dir>]  build the folder (default build/design-system)
//   --check   [--out <dir>] [--tokens-from <dir>]  rebuild into a temporary folder and fail on a
//             broken build, a missing guideline, a twin the bundle does not export under both
//             names, a preview whose story the Storybook build lacks, a manifest hash that is not
//             its file, or an existing <out> folder built from inputs that have since changed
//   --compare <dir> [--out <dir>]                  list the files that differ from another artifact
//             folder, such as catch-design-source's ds/catch/project
import {execFileSync} from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {parseArgs} from "node:util";
import {barrelExports, buildComponents, buildStorybook, bundleProblems, packageDir} from "../../packages/web-ui/artifact/build.mjs";
import {repoRoot} from "../lib/repo_paths.mjs";
import {
  artifactPlan,
  buildManifest,
  canvasHelperNames,
  cardFolderDifferences,
  compareFolders,
  contractStoryIds,
  defaultOutDir,
  designSystemJson,
  fontSources,
  hashFolder,
  inputHashes,
  inputPaths,
  manifestHashProblems,
  manifestName,
  previewHtml,
  registryPath,
  sha256,
  staleInputs,
  storybookDir,
} from "./lib/design_system_manifest.mjs";
import {guidelinesPath, systemTypesPath} from "./lib/system_components.mjs";

const usage = "Usage: node tool/design/publish_design_system.mjs --build|--check|--compare <dir> [--out <dir>] [--tokens-from <dir>]";
const tokenFiles = ["tokens.json", "tokens.css"];

function git(args) {
  return execFileSync("git", args, {cwd: repoRoot, encoding: "utf8"});
}

/** Tracked and untracked, non-ignored files under the input paths. */
function inputFiles() {
  return [...new Set(git(["ls-files", "--cached", "--others", "--exclude-standard", "-z", "--", ...inputPaths]).split("\0").filter(Boolean))];
}

function builtFrom() {
  const webUi = JSON.parse(fs.readFileSync(path.join(packageDir, "package.json"), "utf8"));
  return {
    gitSha: git(["rev-parse", "HEAD"]).trim(),
    dirty: git(["status", "--porcelain", "--", ...inputPaths]).trim() !== "",
    webUiVersion: webUi.version,
    registrySha256: sha256(fs.readFileSync(path.join(repoRoot, registryPath))),
    inputs: inputHashes(repoRoot, inputFiles()),
  };
}

/** Where tokens.json and tokens.css come from: --tokens-from, else P1.1's output in <out>. */
function tokenSource(tokensFrom, outDir) {
  for (const dir of [tokensFrom, outDir].filter(Boolean)) {
    if (tokenFiles.some((file) => fs.existsSync(path.join(dir, file)))) return dir;
  }
  return null;
}

function copyInto(from, to) {
  fs.mkdirSync(path.dirname(to), {recursive: true});
  fs.copyFileSync(from, to);
}

/** Builds the whole folder into `dir` and returns its manifest and problems. */
export async function buildFolder({dir, tokensFrom = null, existingOut = null}) {
  const problems = [];
  const exports = await barrelExports();
  const plan = artifactPlan({exports, root: repoRoot});
  const components = path.join(dir, "components");
  await buildComponents({aliases: plan.aliases, cards: plan.cardNames, outDir: components});
  buildStorybook(path.join(dir, storybookDir));

  const storyIds = contractStoryIds(JSON.parse(fs.readFileSync(path.join(dir, storybookDir, "index.json"), "utf8")));
  const cards = plan.cards.map((card) => {
    const stories = [];
    for (const symbol of card.contractSymbols) {
      if (storyIds.has(symbol)) stories.push({id: storyIds.get(symbol), symbol});
      else problems.push(`components/${card.name}/preview.html: the Storybook build has no Contract story for ${symbol}`);
    }
    return {...card, stories};
  });
  for (const card of cards) {
    const guideline = path.join(repoRoot, guidelinesPath, `${card.guideline}.md`);
    if (!fs.existsSync(guideline)) {
      problems.push(`components/${card.name}/README.md: ${guidelinesPath}/${card.guideline}.md is missing`);
      continue;
    }
    copyInto(guideline, path.join(components, card.name, "README.md"));
    if (card.stories.length > 0) fs.writeFileSync(path.join(components, card.name, "preview.html"), previewHtml(card, card.stories));
  }

  const tokensDir = tokenSource(tokensFrom, existingOut);
  if (tokensFrom && tokensDir !== tokensFrom) problems.push(`--tokens-from ${tokensFrom} has no ${tokenFiles.join(" or ")}`);
  for (const file of tokenFiles) {
    if (tokensDir && fs.existsSync(path.join(tokensDir, file))) copyInto(path.join(tokensDir, file), path.join(dir, file));
  }
  const fontsDir = path.join(repoRoot, fontSources.dir);
  for (const file of fs.readdirSync(fontsDir).sort()) copyInto(path.join(fontsDir, file), path.join(dir, "fonts", file));
  for (const licence of fontSources.licences) copyInto(path.join(repoRoot, licence), path.join(dir, "fonts", path.basename(licence)));

  const from = builtFrom();
  const head = git(["log", "-1", "--format=%an%n%cI"]).trim().split("\n");
  fs.writeFileSync(path.join(dir, "design-system.json"), designSystemJson({builtAt: head[1], builtBy: head[0], gitSha: from.gitSha, webUiVersion: from.webUiVersion}));

  const aliased = new Set(plan.aliases.map(([alias]) => alias));
  const helpers = canvasHelperNames(fs.readFileSync(path.join(repoRoot, systemTypesPath), "utf8"))
    .filter((name) => !exports.has(name) && !aliased.has(name));
  const manifest = buildManifest({
    builtFrom: from,
    cards,
    files: hashFolder(dir, {skip: new Set([manifestName])}),
    helpers,
    tokens: {
      source: tokensDir ? path.relative(repoRoot, tokensDir) || "." : null,
      files: tokenFiles.filter((file) => fs.existsSync(path.join(dir, file))),
    },
    twins: plan.twins,
  });
  fs.writeFileSync(path.join(dir, manifestName), `${JSON.stringify(manifest, null, 2)}\n`);

  problems.push(...bundleProblems(fs.readFileSync(path.join(components, "bundle.js"), "utf8"), plan.aliases));
  problems.push(...manifestHashProblems(dir, manifest));
  return {manifest, problems};
}

function summary(manifest) {
  const {components} = manifest;
  return [
    `${Object.keys(manifest.files).length} files from ${manifest.builtFrom.gitSha.slice(0, 12)}${manifest.builtFrom.dirty ? " (uncommitted inputs)" : ""}`,
    `${components.present.length} system components present, ${components.missing.length} missing, ${components.missingParts.length} parts missing`,
    `${manifest.cards.filter((card) => card.previews.length > 0).length} previews from Contract stories; ${components.withoutContractStory.length} present components have none`,
    manifest.tokens.source ? `tokens from ${manifest.tokens.source}` : "no tokens.json or tokens.css (pass --tokens-from <dir> until P1.1 writes them)",
  ];
}

async function runBuild({outDir, tokensFrom}) {
  const work = `${outDir}.building-${process.pid}`;
  fs.rmSync(work, {force: true, recursive: true});
  fs.mkdirSync(work, {recursive: true});
  try {
    const {manifest, problems} = await buildFolder({dir: work, existingOut: outDir, tokensFrom});
    if (problems.length > 0) {
      console.error(`The design-system folder has problems:\n- ${problems.join("\n- ")}`);
      return 1;
    }
    fs.rmSync(outDir, {force: true, recursive: true});
    fs.renameSync(work, outDir);
    console.log(`Built ${path.relative(repoRoot, outDir)}:\n  ${summary(manifest).join("\n  ")}`);
    return 0;
  } finally {
    fs.rmSync(work, {force: true, recursive: true});
  }
}

async function runCheck({outDir, tokensFrom}) {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "catch-design-system-"));
  try {
    const dir = path.join(temp, "design-system");
    fs.mkdirSync(dir);
    const {manifest, problems} = await buildFolder({dir, existingOut: outDir, tokensFrom});
    const existing = path.join(outDir, manifestName);
    const label = path.relative(repoRoot, outDir);
    if (fs.existsSync(existing)) {
      const recorded = JSON.parse(fs.readFileSync(existing, "utf8"));
      problems.push(...manifestHashProblems(outDir, recorded).map((problem) => `${label}/${problem}`));
      const changes = staleInputs(recorded.builtFrom?.inputs ?? {files: {}}, manifest.builtFrom.inputs);
      if (changes.length > 0) {
        problems.push(`${label} was built from older inputs; rebuild it before uploading (${changes.length} changes: ${changes.slice(0, 10).join(", ")}${changes.length > 10 ? ", ..." : ""})`);
      }
    }
    if (problems.length > 0) {
      console.error(`Design-system check failed:\n- ${problems.join("\n- ")}`);
      return 1;
    }
    console.log(`Design-system folder builds cleanly${fs.existsSync(existing) ? ` and ${label} is current` : ""}:\n  ${summary(manifest).join("\n  ")}`);
    return 0;
  } finally {
    fs.rmSync(temp, {force: true, recursive: true});
  }
}

function runCompare({outDir, other}) {
  const manifestFile = path.join(outDir, manifestName);
  if (!fs.existsSync(manifestFile)) {
    console.error(`${path.relative(repoRoot, outDir)} has no ${manifestName}; build it first with --build.`);
    return 1;
  }
  if (!fs.existsSync(other) || !fs.statSync(other).isDirectory()) {
    console.error(`${other} is not a folder.`);
    return 64;
  }
  const ours = JSON.parse(fs.readFileSync(manifestFile, "utf8")).files;
  const theirs = hashFolder(other);
  const result = compareFolders(ours, theirs);
  const folders = cardFolderDifferences(ours, theirs);
  const label = path.relative(repoRoot, outDir);
  const isStorybook = (file) => file.startsWith(`${storybookDir}/`);
  const list = (files) => files.map((file) => `    ${file}`).join("\n");
  const onlyOurs = result.onlyOurs.filter((file) => !isStorybook(file));
  console.log([
    `Compared ${label} with ${other}:`,
    `  ${result.same.length} files identical`,
    `  ${result.differ.length} files differ:\n${list(result.differ)}`,
    `  ${onlyOurs.length} files only in ${label}, plus ${result.onlyOurs.length - onlyOurs.length} in ${storybookDir}/:\n${list(onlyOurs)}`,
    `  ${result.onlyTheirs.length} files only in ${other}:\n${list(result.onlyTheirs)}`,
    `  component folders only in ${label}: ${folders.onlyOurs.join(", ") || "none"}`,
    `  component folders only in ${other}: ${folders.onlyTheirs.join(", ") || "none"}`,
  ].join("\n"));
  return 0;
}

async function main(argv) {
  let values;
  try {
    ({values} = parseArgs({
      args: argv,
      options: {
        build: {type: "boolean"},
        check: {type: "boolean"},
        compare: {type: "string"},
        out: {type: "string"},
        "tokens-from": {type: "string"},
      },
    }));
  } catch (error) {
    console.error(`${error.message}\n${usage}`);
    return 64;
  }
  const modes = [values.build, values.check, values.compare !== undefined].filter(Boolean).length;
  if (modes !== 1) {
    console.error(usage);
    return 64;
  }
  const outDir = path.resolve(repoRoot, values.out ?? defaultOutDir);
  const tokensFrom = values["tokens-from"] ? path.resolve(values["tokens-from"]) : null;
  if (values.build) return runBuild({outDir, tokensFrom});
  if (values.check) return runCheck({outDir, tokensFrom});
  return runCompare({other: path.resolve(values.compare), outDir});
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = await main(process.argv.slice(2));
}
