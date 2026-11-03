// The design-system artifact folder that tool/design/publish_design_system.mjs
// builds from @catch/web-ui: which system components the library carries, the
// folder each lands in, the files the build writes beside the bundle, and the
// manifest that records every file's hash and the inputs it was built from.
// Everything here is pure or reads files; the build itself lives in
// packages/web-ui/artifact/build.mjs.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {declaredSystemNames, guidelinesPath, systemComponents, systemTypesPath} from "./system_components.mjs";

export const defaultOutDir = "build/design-system";
export const registryPath = "design/components/catch.components.json";
export const manifestName = "manifest.json";
export const storybookDir = "storybook";
export const manifestFormat = 1;
export const storiesDir = "packages/web-ui/src/components";

/**
 * Committed files the folder is built from. Their hashes go in the manifest,
 * so `--check` can tell a folder built from older inputs.
 */
export const inputPaths = Object.freeze([
  "package-lock.json",
  "packages/web-ui/package.json",
  "packages/web-ui/tsconfig.json",
  "packages/web-ui/.storybook",
  "packages/web-ui/artifact",
  "packages/web-ui/src",
  "packages/web-ui-react18/package.json",
  "packages/web-config/generated",
  "packages/web-config/styles/catch-web.css",
  "packages/catch_ui/assets/fonts/OFL-Archivo.txt",
  "packages/catch_ui/assets/fonts/OFL-IBMPlexMono.txt",
  "packages/catch_ui/assets/fonts/Archivo-Roman-VF.ttf",
  "design/tokens/catch.tokens.json",
  "tool/design_tokens.mjs",
  "tool/design_tokens",
  registryPath,
  guidelinesPath,
  systemTypesPath,
  "tool/design/lib/system_components.mjs",
  "tool/design/lib/design_system_manifest.mjs",
  "tool/design/publish_design_system.mjs",
]);

/**
 * The fonts web-ui's token CSS declares, the folders the artifact's tokens.css
 * fonts come from, and the licences that travel with them.
 */
export const fontSources = Object.freeze({
  dir: "packages/web-config/generated/assets/fonts",
  tokenFontDirs: ["packages/web-config/generated/assets/fonts", "packages/catch_ui/assets/fonts"],
  licences: ["packages/catch_ui/assets/fonts/OFL-Archivo.txt", "packages/catch_ui/assets/fonts/OFL-IBMPlexMono.txt"],
});

/** The files under fonts/ an artifact tokens.css loads. */
export function tokenFontFiles(tokensCss) {
  return [...new Set([...tokensCss.matchAll(/url\("fonts\/([^"/]+)"\)/gu)].map((match) => match[1]))];
}

/** The artifact's files the repo has no source for; the live artifact keeps its own. */
export const notBuilt = Object.freeze([
  {path: "README.md", reason: "The system-wide guidance (content, colour, type, blocks) has no repo source yet; the live artifact keeps its copy."},
]);

/** The gallery group of each card, as the design source's previews declare them. */
export const cardGroups = Object.freeze({
  Root: "Foundations", Surface: "Foundations", Text: "Foundations", Icon: "Foundations",
  Button: "Actions", IconButton: "Actions", Chip: "Actions",
  Field: "Inputs", Switch: "Inputs", Check: "Inputs", ChoiceCard: "Inputs", Segmented: "Inputs",
  Stepper: "Inputs", Rating: "Inputs", Calendar: "Inputs", Slider: "Inputs",
  Badge: "Status", Marker: "Status", Meter: "Status", Skeleton: "Status", BarChart: "Status",
  Avatar: "People",
  Image: "Media",
  ListRow: "Lists", Section: "Lists", MetaRow: "Lists", Stat: "Lists", Notice: "Lists",
  EmptyState: "Lists", Accordion: "Lists", Rail: "Lists", Table: "Lists",
  TopBar: "Bars", PaneHeader: "Bars", Navigation: "Bars", Dock: "Bars",
  EventCard: "Cards", OrganiserCard: "Cards", Ticket: "Cards",
  Sheet: "Overlays", Dialog: "Overlays", Toast: "Overlays", Menu: "Overlays", Chat: "Overlays", MapPreview: "Overlays",
  Stack: "Layout", AppShell: "Layout", ScreenBody: "Layout", PaneLayout: "Layout",
});
const defaultCardHeight = 760;

export function sha256(content) {
  return crypto.createHash("sha256").update(content).digest("hex");
}

/**
 * The artifact folder a system component's guideline and preview sit in: the
 * design source's gallery card. ChatMessage and ChatComposer share `Chat`, and
 * Spinner sits in the Skeleton card; a component the design source gives no
 * card of its own (Root, PaneHeader) gets one under its own name.
 */
export function cardOf(name, table = systemComponents) {
  const entry = table[name];
  return entry.readme ?? entry.sharedReadme ?? name;
}

/**
 * Each system component and what web-ui carries for it. A twin is present
 * when the barrel exports the registry symbol the canvas also exports
 * (`Catch.CatchButton`); `registryTwin` names a different export the
 * registry's react record points at, which the bundle does not alias.
 */
export function systemTwins({exports, components, table = systemComponents}) {
  const byId = new Map(components.map((component) => [component.id, component]));
  return Object.entries(table).map(([name, entry]) => {
    const present = exports.has(entry.symbol);
    const registryTwin = present ? null : entry.records
      .map((id) => byId.get(id)?.react?.symbol)
      .find((symbol) => symbol && symbol !== entry.symbol && exports.has(symbol)) ?? null;
    const parts = (entry.parts ?? []).map((part) => ({
      name: part,
      symbol: exports.has(`Catch${part}`) ? `Catch${part}` : null,
    }));
    return {name, symbol: entry.symbol, present, registryTwin, guideline: entry.records[0], card: cardOf(name, table), parts};
  });
}

/** `[alias, symbol]` pairs the bundle adds so `Catch.Button` is `Catch.CatchButton`. */
export function bundleAliases(twins, exports) {
  const aliases = [];
  for (const twin of twins) {
    if (twin.present && twin.name !== twin.symbol && !exports.has(twin.name)) aliases.push([twin.name, twin.symbol]);
    for (const part of twin.parts) {
      if (part.symbol && !exports.has(part.name)) aliases.push([part.name, part.symbol]);
    }
  }
  return aliases;
}

/**
 * The gallery cards in registry-table order. A card's README is the guideline
 * of the component that owns the card (whose `readme` names it), else of its
 * only member.
 */
export function artifactCards(twins, table = systemComponents) {
  const cards = new Map();
  for (const twin of twins) {
    if (!cards.has(twin.card)) {
      cards.set(twin.card, {name: twin.card, group: cardGroups[twin.card] ?? null, members: [], guideline: twin.guideline});
    }
    const card = cards.get(twin.card);
    card.members.push(twin);
    if (table[twin.name].readme === twin.card) card.guideline = twin.guideline;
  }
  return [...cards.values()];
}

/**
 * What the build makes of the registry and the barrel: each system twin, the
 * gallery cards with the members whose `Contract` story becomes the preview,
 * the bundle's aliases and the cards the bundle header lists.
 */
export function artifactPlan({root, exports, table = systemComponents}) {
  const {components} = JSON.parse(fs.readFileSync(path.join(root, registryPath), "utf8"));
  const twins = systemTwins({components, exports, table});
  const contracts = contractStorySymbols(path.join(root, storiesDir));
  const cards = artifactCards(twins, table).map((card) => ({
    ...card,
    contractSymbols: card.members.filter((member) => member.present && contracts.has(member.symbol)).map((member) => member.symbol),
  }));
  return {
    aliases: bundleAliases(twins, exports),
    cardNames: cards.filter((card) => card.contractSymbols.length > 0).map((card) => card.name),
    cards,
    twins,
  };
}

/** The story id of each symbol's `Contract` story in a built Storybook index. */
export function contractStoryIds(storybookIndex) {
  const ids = new Map();
  for (const entry of Object.values(storybookIndex.entries ?? {})) {
    if (entry.type !== "story" || entry.exportName !== "Contract") continue;
    const symbol = /\/([^/]+)\.stories\.tsx?$/u.exec(entry.importPath ?? "")?.[1];
    if (symbol) ids.set(symbol, entry.id);
  }
  return ids;
}

/** `Contract` stories named in source, before Storybook has built an index. */
export function contractStorySymbols(dir) {
  const symbols = new Set();
  if (!fs.existsSync(dir)) return symbols;
  for (const file of fs.readdirSync(dir)) {
    const match = /^(.+)\.stories\.tsx?$/u.exec(file);
    if (match && /^export const Contract\b/mu.test(fs.readFileSync(path.join(dir, file), "utf8"))) symbols.add(match[1]);
  }
  return symbols;
}

/** The bundle header the design-system artifact reads its gallery from, as ds/build.mjs writes it. */
export function dsBundleHeader(cardNames) {
  return `/* @ds-bundle: ${JSON.stringify({format: 4, namespace: "Catch", components: cardNames.map((name) => ({name}))})} */\n`;
}

const escapeHtml = (text) => text.replace(/[&<>"]/gu, (char) => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;"})[char]);

/**
 * A card's preview: the `Contract` story of each member with one, from the
 * published Storybook build, each frame sized to its story.
 */
export function previewHtml(card, stories) {
  const frames = stories.map(({symbol, id}) => [
    stories.length > 1 ? `<p class="label">${escapeHtml(symbol)}</p>` : "",
    `<iframe src="../../${storybookDir}/iframe.html?id=${encodeURIComponent(id)}&amp;viewMode=story" title="${escapeHtml(`${symbol} · Contract`)}"></iframe>`,
  ].join("")).join("\n");
  return `<!-- @dsCard${card.group ? ` group="${card.group}"` : ""} height=${defaultCardHeight} -->
<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><title>${escapeHtml(card.name)}</title>
<style>
  html, body { margin: 0; }
  iframe { display: block; width: 100%; height: ${defaultCardHeight}px; border: 0; }
  .label { margin: 16px 20px 0; font: 600 13px/1.4 system-ui, sans-serif; color: #544f47; }
</style></head>
<body>
<!-- Generated by tool/design/publish_design_system.mjs from @catch/web-ui's Contract stories. -->
${frames}
<script>
for (const frame of document.querySelectorAll("iframe")) {
  frame.addEventListener("load", () => {
    try {
      const page = frame.contentDocument.documentElement;
      const fit = () => { frame.style.height = page.scrollHeight + "px"; };
      fit();
      new ResizeObserver(fit).observe(page);
    } catch {}
  });
}
</script>
</body>
</html>
`;
}

/** The artifact's design-system.json, in the shape the design source keeps. */
export function designSystemJson({builtAt, builtBy, gitSha, webUiVersion}) {
  return `${JSON.stringify({
    v: 3,
    layout: "files",
    createdOnFiles: {v: 1, at: "2026-10-28T16:44:40Z"},
    title: "Catch",
    namespace: "Catch",
    libraries: [{name: "react", version: "18"}, {name: "react-dom", version: "18"}],
    sections: {},
    groups: [],
    assetGroups: {},
    blobs: {},
    docs: {readme: "project/README.md", sections: []},
    lastChange: {
      by: builtBy,
      at: builtAt,
      via: "tool/design/publish_design_system.mjs",
      note: `Built from @catch/web-ui ${webUiVersion} at ${gitSha}`,
    },
  }, null, 1)}\n`;
}

/** Non-component exports the canvas's types declare (hooks, tokens, icon maps). */
export function canvasHelperNames(systemTypesSource) {
  const components = declaredSystemNames(systemTypesSource);
  const names = [];
  for (const match of systemTypesSource.matchAll(/^export declare (?:function|const) ([A-Za-z_$][\w$]*)/gmu)) {
    if (!components.has(match[1]) && !names.includes(match[1])) names.push(match[1]);
  }
  return names;
}

/** Every file under a folder, relative and sorted, with its sha256. */
export function hashFolder(dir, {skip = new Set()} = {}) {
  const files = {};
  const walk = (relative) => {
    for (const entry of fs.readdirSync(path.join(dir, relative), {withFileTypes: true}).sort((a, b) => a.name.localeCompare(b.name))) {
      const child = relative ? `${relative}/${entry.name}` : entry.name;
      if (skip.has(child)) continue;
      if (entry.isDirectory()) walk(child);
      else if (entry.isFile()) files[child] = sha256(fs.readFileSync(path.join(dir, child)));
    }
  };
  walk("");
  return Object.fromEntries(Object.entries(files).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
}

/** The hash of each input file, and one hash over all of them. */
export function inputHashes(root, files) {
  const hashed = {};
  for (const file of [...files].sort()) {
    const absolute = path.join(root, file);
    if (fs.existsSync(absolute) && fs.statSync(absolute).isFile()) hashed[file] = sha256(fs.readFileSync(absolute));
  }
  return {sha256: sha256(Object.entries(hashed).map(([file, hash]) => `${hash}  ${file}\n`).join("")), files: hashed};
}

export function buildManifest({builtFrom, cards, twins, helpers, tokens, files}) {
  return {
    format: manifestFormat,
    builtFrom,
    tokens,
    components: {
      present: twins.filter((twin) => twin.present).map(({name, symbol, card}) => ({name, symbol, card})),
      missing: twins.filter((twin) => !twin.present).map(({name, symbol, registryTwin}) => ({name, symbol, ...(registryTwin ? {registryTwin} : {})})),
      missingParts: twins.flatMap((twin) => twin.parts.filter((part) => !part.symbol).map((part) => ({name: part.name, of: twin.name}))),
      withoutContractStory: twins.filter((twin) => twin.present && !cards.some((card) => card.stories.some((story) => story.symbol === twin.symbol)))
        .map(({name, symbol}) => ({name, symbol})),
      missingHelpers: helpers,
    },
    cards: cards.map(({name, group, guideline, stories}) => ({name, group, guideline, previews: stories.map(({symbol, id}) => ({symbol, story: id}))})),
    notBuilt,
    files,
  };
}

/** Files whose hash in the manifest is not the file on disk. */
export function manifestHashProblems(dir, manifest) {
  const actual = hashFolder(dir, {skip: new Set([manifestName])});
  const problems = [];
  for (const [file, hash] of Object.entries(manifest.files ?? {})) {
    if (!(file in actual)) problems.push(`${file}: listed in the manifest but missing`);
    else if (actual[file] !== hash) problems.push(`${file}: does not match its manifest hash`);
  }
  for (const file of Object.keys(actual)) {
    if (!(file in (manifest.files ?? {}))) problems.push(`${file}: not listed in the manifest`);
  }
  return problems;
}

/** Inputs that changed, appeared or went since a manifest was built. */
export function staleInputs(recorded, current) {
  const changes = [];
  for (const [file, hash] of Object.entries(current.files)) {
    if (!(file in recorded.files)) changes.push(`added ${file}`);
    else if (recorded.files[file] !== hash) changes.push(`changed ${file}`);
  }
  for (const file of Object.keys(recorded.files)) {
    if (!(file in current.files)) changes.push(`removed ${file}`);
  }
  return changes;
}

/** How two artifact folders differ, file by file. */
export function compareFolders(ours, theirs) {
  const result = {same: [], differ: [], onlyOurs: [], onlyTheirs: []};
  for (const [file, hash] of Object.entries(ours)) {
    if (!(file in theirs)) result.onlyOurs.push(file);
    else if (theirs[file] === hash) result.same.push(file);
    else result.differ.push(file);
  }
  for (const file of Object.keys(theirs)) {
    if (!(file in ours)) result.onlyTheirs.push(file);
  }
  return result;
}

/** The component card folders only one side has. */
export function cardFolderDifferences(ours, theirs) {
  const folders = (files) => new Set(Object.keys(files)
    .map((file) => /^components\/([^/]+)\//u.exec(file)?.[1])
    .filter(Boolean));
  const a = folders(ours);
  const b = folders(theirs);
  return {onlyOurs: [...a].filter((name) => !b.has(name)).sort(), onlyTheirs: [...b].filter((name) => !a.has(name)).sort()};
}
