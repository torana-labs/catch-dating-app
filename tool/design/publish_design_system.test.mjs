import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {test} from "node:test";
import {bundleProblems, tokensCssForArtifact} from "../../packages/web-ui/artifact/build.mjs";
import {
  artifactCards,
  bundleAliases,
  canvasHelperNames,
  cardFolderDifferences,
  cardOf,
  compareFolders,
  contractStoryIds,
  dsBundleHeader,
  hashFolder,
  inputHashes,
  manifestHashProblems,
  previewHtml,
  staleInputs,
  systemTwins,
  tokenFontFiles,
} from "./lib/design_system_manifest.mjs";
import {systemComponents} from "./lib/system_components.mjs";

const table = {
  Button: {symbol: "CatchButton", records: ["catch.button"], readme: "Button"},
  Switch: {symbol: "CatchToggleInput", records: ["catch.toggle"], readme: "Switch"},
  Skeleton: {symbol: "CatchSkeleton", records: ["catch.skeleton"], readme: "Skeleton"},
  Spinner: {symbol: "CatchLoadingIndicator", records: ["catch.loading_indicator"], sharedReadme: "Skeleton"},
  ListRow: {symbol: "CatchIndexRow", records: ["catch.index_row"], readme: "ListRow", parts: ["DateTile"]},
  Section: {symbol: "CatchSection", records: ["catch.section"], readme: "Section", parts: ["SectionHeader"]},
  Root: {symbol: "CatchRoot", records: ["catch.root"]},
};
const components = [
  {id: "catch.button", react: {symbol: "CatchButton"}},
  {id: "catch.toggle", react: {symbol: "CheckboxControl"}},
  {id: "catch.skeleton", react: {symbol: "CatchSkeleton"}},
  {id: "catch.loading_indicator", react: {symbol: "CatchLoadingIndicator"}},
  {id: "catch.index_row", react: {symbol: "CatchIndexRow"}},
  {id: "catch.section", react: {symbol: "CatchSection"}},
  {id: "catch.root"},
];
const exports = new Set(["CatchButton", "CheckboxControl", "CatchSkeleton", "CatchLoadingIndicator", "CatchIndexRow", "CatchDateTile", "CatchSection"]);

function tempDir(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "publish-design-system-test-"));
  for (const [file, content] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(dir, file)), {recursive: true});
    fs.writeFileSync(path.join(dir, file), content);
  }
  return dir;
}

test("a card is the design source's gallery folder: shared readmes share it, components without one get their own", () => {
  assert.equal(cardOf("ChatMessage"), "Chat");
  assert.equal(cardOf("ChatComposer"), "Chat");
  assert.equal(cardOf("Spinner"), "Skeleton");
  assert.equal(cardOf("Root"), "Root");
  assert.equal(cardOf("PaneHeader"), "PaneHeader");
  assert.equal(cardOf("Button"), "Button");
  const folders = new Set(Object.keys(systemComponents).map((name) => cardOf(name)));
  assert.equal(folders.size, 49);
});

test("a twin is present only when the barrel exports the registry symbol the canvas exports", () => {
  const twins = systemTwins({components, exports, table});
  const byName = Object.fromEntries(twins.map((twin) => [twin.name, twin]));
  assert.equal(byName.Button.present, true);
  assert.equal(byName.Switch.present, false);
  assert.equal(byName.Switch.registryTwin, "CheckboxControl");
  assert.equal(byName.Root.present, false);
  assert.equal(byName.Root.registryTwin, null);
  assert.deepEqual(byName.ListRow.parts, [{name: "DateTile", symbol: "CatchDateTile"}]);
  assert.deepEqual(byName.Section.parts, [{name: "SectionHeader", symbol: null}]);
});

test("the bundle aliases each present twin and part under its system name, never over a barrel export", () => {
  const twins = systemTwins({components, exports, table});
  assert.deepEqual(bundleAliases(twins, exports), [
    ["Button", "CatchButton"],
    ["Skeleton", "CatchSkeleton"],
    ["Spinner", "CatchLoadingIndicator"],
    ["ListRow", "CatchIndexRow"],
    ["DateTile", "CatchDateTile"],
    ["Section", "CatchSection"],
  ]);
  assert.deepEqual(bundleAliases(twins, new Set([...exports, "Button"])).map(([alias]) => alias).includes("Button"), false);
});

test("a shared card takes the owning component's guideline and lists every member", () => {
  const cards = artifactCards(systemTwins({components, exports, table}), table);
  const skeleton = cards.find((card) => card.name === "Skeleton");
  assert.equal(skeleton.guideline, "catch.skeleton");
  assert.deepEqual(skeleton.members.map((member) => member.name), ["Skeleton", "Spinner"]);
  assert.equal(skeleton.group, "Status");
  assert.deepEqual(cards.map((card) => card.name), ["Button", "Switch", "Skeleton", "ListRow", "Section", "Root"]);
});

test("Contract story ids come from the Storybook index by story file", () => {
  const ids = contractStoryIds({entries: {
    a: {exportName: "Contract", id: "web-ui-catchbutton--contract", importPath: "./src/components/CatchButton.stories.tsx", type: "story"},
    b: {exportName: "Interaction", id: "web-ui-catchbutton--interaction", importPath: "./src/components/CatchButton.stories.tsx", type: "story"},
    c: {exportName: "Contract", id: "docs", importPath: "./src/components/CatchMenu.stories.tsx", type: "docs"},
  }});
  assert.deepEqual([...ids], [["CatchButton", "web-ui-catchbutton--contract"]]);
});

test("a preview embeds each member's Contract story from the published Storybook", () => {
  const html = previewHtml({group: "Status", name: "Skeleton"}, [
    {id: "web-ui-catchskeleton--contract", symbol: "CatchSkeleton"},
    {id: "web-ui-catchloadingindicator--contract", symbol: "CatchLoadingIndicator"},
  ]);
  assert.match(html, /^<!-- @dsCard group="Status" height=760 -->\n<!doctype html>/u);
  assert.match(html, /src="\.\.\/\.\.\/storybook\/iframe\.html\?id=web-ui-catchskeleton--contract&amp;viewMode=story"/u);
  assert.match(html, /<p class="label">CatchLoadingIndicator<\/p>/u);
});

test("the bundle header names the gallery cards as ds/build.mjs writes it", () => {
  assert.equal(dsBundleHeader(["Button", "Skeleton"]), "/* @ds-bundle: {\"format\":4,\"namespace\":\"Catch\",\"components\":[{\"name\":\"Button\"},{\"name\":\"Skeleton\"}]} */\n");
});

test("canvas helpers are the declared exports that are not components", () => {
  const source = "export declare function useCatch(): void;\nexport declare const tokens: {};\nexport declare function Button(): void;\nexport declare function GroundProvider(): void;\n";
  assert.deepEqual(canvasHelperNames(source), ["useCatch", "tokens", "GroundProvider"]);
});

test("the artifact's tokens.css names the fonts it loads from fonts/", () => {
  const css = "@font-face { src: url(\"fonts/Archivo-Roman-VF.ttf\") format(\"truetype\"); }\n@font-face { src: url(\"fonts/Archivo-Roman-VF.ttf\"); }\n";
  assert.deepEqual(tokenFontFiles(css), ["Archivo-Roman-VF.ttf"]);
});

test("token CSS points its fonts at the artifact's fonts folder", () => {
  assert.equal(tokensCssForArtifact("src: url(\"./assets/fonts/A.woff2\")"), "src: url(\"../fonts/A.woff2\")");
});

test("a manifest's hashes must be its files, and nothing else may sit beside them", () => {
  const dir = tempDir({"a.txt": "a", "components/b.txt": "b"});
  const manifest = {files: hashFolder(dir)};
  assert.deepEqual(Object.keys(manifest.files), ["a.txt", "components/b.txt"]);
  assert.deepEqual(manifestHashProblems(dir, manifest), []);
  fs.writeFileSync(path.join(dir, "a.txt"), "changed");
  fs.writeFileSync(path.join(dir, "extra.txt"), "x");
  fs.rmSync(path.join(dir, "components/b.txt"));
  assert.deepEqual(manifestHashProblems(dir, manifest), [
    "a.txt: does not match its manifest hash",
    "components/b.txt: listed in the manifest but missing",
    "extra.txt: not listed in the manifest",
  ]);
});

test("a folder built from older inputs names what changed", () => {
  const dir = tempDir({"src/a.ts": "a", "src/b.ts": "b"});
  const recorded = inputHashes(dir, ["src/a.ts", "src/b.ts"]);
  assert.deepEqual(staleInputs(recorded, inputHashes(dir, ["src/b.ts", "src/a.ts"])), []);
  fs.writeFileSync(path.join(dir, "src/a.ts"), "changed");
  fs.writeFileSync(path.join(dir, "src/c.ts"), "c");
  assert.deepEqual(staleInputs(recorded, inputHashes(dir, ["src/a.ts", "src/c.ts"])), ["changed src/a.ts", "added src/c.ts", "removed src/b.ts"]);
});

test("--compare sorts files into identical, different and one-sided, and names one-sided card folders", () => {
  const ours = {"components/Button/README.md": "1", "components/Root/README.md": "2", "tokens.css": "3"};
  const theirs = {"components/Button/README.md": "9", "components/Cover/preview.html": "4", "tokens.css": "3"};
  assert.deepEqual(compareFolders(ours, theirs), {
    differ: ["components/Button/README.md"],
    onlyOurs: ["components/Root/README.md"],
    onlyTheirs: ["components/Cover/preview.html"],
    same: ["tokens.css"],
  });
  assert.deepEqual(cardFolderDifferences(ours, theirs), {onlyOurs: ["Root"], onlyTheirs: ["Cover"]});
});

test("the bundle check loads the bundle after React 18 globals, as the canvas does", () => {
  const bundle = "var Catch = (() => { const CatchButton = (props) => React.createElement(\"button\", null, props.label); return {CatchButton, Button: CatchButton, Badge: () => null, CatchBadge: () => null}; })();";
  assert.deepEqual(bundleProblems(bundle, [["Button", "CatchButton"]]), []);
  assert.deepEqual(bundleProblems(bundle, [["Badge", "CatchBadge"], ["Chip", "CatchChip"]]), [
    "Catch.Badge is not Catch.CatchBadge",
    "Catch.CatchChip is missing",
  ]);
  assert.deepEqual(bundleProblems("var Other = {};", []), ["bundle.js does not define window.Catch"]);
  assert.match(bundleProblems("var Catch = {CatchButton: () => { throw new Error(\"boom\"); }};", [])[0], /failed on React 18: boom/u);
});
