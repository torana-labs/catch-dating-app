import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  buildCatalogRows,
  catalogEnd,
  catalogStart,
  classPurpose,
  namingFindings,
  namingRatchetProblems,
  prunedNamingBaseline,
  renderCatalogInventory,
  replaceCatalogInventory,
  runCatalog,
} from "./generate_widget_catalog.mjs";

const file = "packages/catch_ui/lib/src/components/catch_menu.dart";
const declaration = (overrides = {}) => ({
  name: "CatchMenu", file, line: 2, classKind: "widget", visibility: "public",
  source: "/// A selectable command collection.\nclass CatchMenu extends StatelessWidget {}\n",
  ...overrides,
});
const component = (overrides = {}) => ({
  id: "catch.menu", dart: {symbol: "CatchMenu", file}, level: "L3", roleNoun: "Menu",
  summary: "Registry purpose.", governance: {conceptId: "catch.menu"},
  contract: {members: []}, ...overrides,
});

test("source discovery retains undocumented and unregistered feature Widgets", () => {
  const rows = buildCatalogRows({declarations: [
    declaration(),
    declaration({name: "FeatureRow", file: "lib/example/feature_row.dart", line: 1, source: "class FeatureRow extends StatelessWidget {}"}),
    declaration({name: "_PrivateRow", visibility: "private"}),
    declaration({name: "_MenuState", classKind: "widget-state", visibility: "private"}),
  ], components: [component()]});
  assert.equal(rows.length, 2);
  assert.equal(rows[0].purpose, "A selectable command collection.");
  assert.equal(rows[0].purposeSource, "class-doc");
  assert.equal(rows[1].purposeSource, "missing");
  assert.match(renderCatalogInventory(rows), /1 declarations have neither/u);
  assert.match(renderCatalogInventory(rows), /FeatureRow/u);
});

test("registered feature without ladder review retains source membership and registry purpose", () => {
  const feature = {name: "ChatInputBar", file: "lib/chats/chat_input_bar.dart",
    line: 1, source: "class ChatInputBar extends StatefulWidget {}"};
  const rows = buildCatalogRows({declarations: [declaration(feature)], components: [
    component({id: "catch.chat_composer", dart: {symbol: feature.name, file: feature.file},
      level: undefined, roleNoun: undefined, summary: "Conversation draft and attachment actions."}),
  ]});
  assert.equal(rows.length, 1);
  assert.equal(rows[0].name, "ChatInputBar");
  assert.equal(rows[0].level, "L5");
  assert.equal(rows[0].roleNoun, null);
  assert.equal(rows[0].purposeSource, "registry");
  assert.equal(rows[0].purpose, "Conversation draft and attachment actions.");
  assert.match(renderCatalogInventory(rows), /not a semantic conformance verdict/u);
});

test("shared identity cannot be omitted to shrink the generated inventory", () => {
  assert.throws(() => buildCatalogRows({declarations: [declaration()], components: []}), /no component-registry identity/u);
});

test("shared ladder metadata is mandatory and must agree with the source home", () => {
  for (const override of [{level: undefined}, {roleNoun: undefined}, {level: "L9"}]) {
    assert.throws(() => buildCatalogRows({declarations: [declaration()], components: [component(override)]}), /level and roleNoun are required/u);
  }
  assert.throws(() => buildCatalogRows({declarations: [declaration()], components: [component({level: "L2"})]}), /disagrees with source home L3/u);
});

test("source moves fail until the exact registry path is updated", () => {
  assert.throws(() => buildCatalogRows({
    declarations: [declaration({file: "packages/catch_ui/lib/src/patterns/catch_menu.dart"})],
    components: [component()],
  }), /registry path .* differs from source/u);
});

test("member metadata comes from the member rather than its parent component", () => {
  const memberFile = "packages/catch_ui/lib/src/primitives/catch_menu_row.dart";
  const rows = buildCatalogRows({
    declarations: [declaration({name: "CatchMenuRow", file: memberFile, source: "class CatchMenuRow extends StatelessWidget {}", line: 1})],
    components: [component({contract: {members: [{
      id: "catch.menu.row", symbol: "CatchMenuRow", file: memberFile,
      level: "L2", roleNoun: "Row", summary: "One selectable row.",
      governance: {conceptId: "catch.menu"},
    }]}})],
  });
  assert.equal(rows[0].level, "L2");
  assert.equal(rows[0].roleNoun, "Row");
  assert.equal(rows[0].purposeSource, "registry");
});

test("duplicate registry and source identities fail instead of overwriting rows", () => {
  assert.throws(() => buildCatalogRows({declarations: [], components: [component(), component()]}), /Duplicate registry identity/u);
  assert.throws(() => buildCatalogRows({declarations: [declaration(), declaration()], components: [component()]}), /Duplicate source declaration/u);
});

test("class documentation joins the first paragraph and skips declaration annotations", () => {
  assert.equal(classPurpose("/// First line\n/// continues here.\n///\n/// More detail.\n@immutable\nclass Demo {}", 6), "First line continues here.");
  assert.equal(classPurpose("/** First line\n * continues here.\n *\n * More detail.\n */\n@Deprecated('Use replacement')\nclass Demo {}", 7), "First line continues here.");
});

test("nearby field and earlier class documentation cannot become a later class purpose", () => {
  const source = "/// Earlier class.\nclass Old {\n  /// Field description.\n  final int value = 0;\n}\nclass New {}";
  assert.equal(classPurpose(source, 6), "");
  assert.equal(classPurpose("/// Field doc.\nfinal value = 0;\nclass Demo {}", 3), "");
});

test("ordering is stable and source text cannot break Markdown table structure", () => {
  const a = declaration({name: "ExampleRow", file: "lib/example/a.dart", line: 1, source: ""});
  const b = declaration({name: "ExampleScreen", file: "lib/example/b.dart", line: 1, source: ""});
  const forward = buildCatalogRows({declarations: [a, b], components: []});
  const reverse = buildCatalogRows({declarations: [b, a], components: []});
  assert.deepEqual(forward, reverse);
  const rendered = renderCatalogInventory([{...forward[0], purpose: "Contains | pipes and <tags>\nacross lines.", purposeSource: "class-doc"}]);
  assert.match(rendered, /Contains &#124; pipes and &lt;tags&gt; across lines/u);
});

test("generation preserves authored decisions and rejects malformed regions", () => {
  const original = `## Canonical Usage Decisions\nKeep this.\n${catalogStart}\nOld rows\n${catalogEnd}\nAfter.\n`;
  const inventory = renderCatalogInventory([]);
  assert.equal(replaceCatalogInventory(original, inventory), `## Canonical Usage Decisions\nKeep this.\n${inventory}\nAfter.\n`);
  for (const source of ["", catalogStart, `${catalogEnd}\n${catalogStart}`, `${original}\n${catalogStart}`]) {
    assert.throws(() => replaceCatalogInventory(source, inventory), /region|markers/u);
  }
});

test("known-bad hand edits and source changes fail the real catalog drift check", (t) => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "catch-catalog-"));
  t.after(() => fs.rmSync(repoRoot, {recursive: true, force: true}));
  const write = (file, value) => {
    const target = path.join(repoRoot, file);
    fs.mkdirSync(path.dirname(target), {recursive: true});
    fs.writeFileSync(target, value);
  };
  const source = "/// One feature row.\nclass FeatureRow extends StatelessWidget {}\n";
  write("lib/example/feature_row.dart", source);
  write("design/components/catch.components.json", JSON.stringify({components: []}));
  write("docs/widget_catalog.md", `# Catalog\n${catalogStart}\n${catalogEnd}\n`);
  assert.equal(runCatalog({repoRoot, mode: "write"}).count, 1);
  const baseline = fs.readFileSync(path.join(repoRoot, "docs/widget_catalog.md"), "utf8");
  assert.deepEqual(runCatalog({repoRoot, mode: "write"}), {count: 1, changed: false});
  assert.deepEqual(runCatalog({repoRoot}), {count: 1, changed: false});
  write("docs/widget_catalog.md", baseline.replace("One feature row.", "A fabricated purpose."));
  assert.throws(() => runCatalog({repoRoot}), /stale or hand-edited/u);
  write("docs/widget_catalog.md", baseline);
  write("lib/example/feature_row.dart", source.replace("One feature row.", "The changed contract."));
  assert.throws(() => runCatalog({repoRoot}), /stale or hand-edited/u);
  assert.equal(runCatalog({repoRoot, mode: "json"}).rows[0].purpose, "The changed contract.");
});

test("the naming ratchet rejects new debt with a redirect and fixed debt still listed", () => {
  const widget = (name, file) => ({name, file, line: 1, classKind: "widget", visibility: "public", source: ""});
  const findings = namingFindings({
    declarations: [
      widget("ProfilePanel", "lib/profile/presentation/profile_panel.dart"),
      widget("ProfileSection", "lib/profile/presentation/profile_section.dart"),
    ],
    symbolDeclarations: [{file: "lib/locations/shared/map.dart", kind: "class", name: "CatchMapMarker", line: 1}],
  });
  assert.deepEqual(findings.map((entry) => entry.name), ["CatchMapMarker", "ProfilePanel"]);
  const redirects = {Panel: ["Section", "Surface"]};
  assert.deepEqual(namingRatchetProblems({findings, baseline: {allowedFindings: [findings[0]]}, redirects}), [
    "lib/profile/presentation/profile_panel.dart: ProfilePanel [noncanonical-feature-widget-file, " +
      "noncanonical-feature-widget-name] is new naming debt; Panel is spelled Section or Surface here",
  ]);
  const stale = {allowedFindings: [...findings,
    {file: "lib/old/old_thing.dart", name: "OldThing", issues: ["noncanonical-feature-widget-name"]}]};
  assert.match(namingRatchetProblems({findings, baseline: stale})[0], /OldThing .* is fixed; run node/u);
  assert.deepEqual(prunedNamingBaseline({findings, baseline: stale}).allowedFindings, findings);
  assert.deepEqual(namingRatchetProblems({findings, baseline: prunedNamingBaseline({findings, baseline: stale})}), []);
  // Moving a file carries its debt; write mode records the new path.
  const moved = {allowedFindings: [{...findings[1], file: "lib/profile/old/profile_panel.dart"}, findings[0]]};
  assert.deepEqual(namingRatchetProblems({findings, baseline: moved}), []);
  assert.equal(prunedNamingBaseline({findings, baseline: moved}).allowedFindings[0].file,
    "lib/profile/presentation/profile_panel.dart");
});

test("rendered rows index registry aliases so a search for any likely name finds the widget", () => {
  const rows = buildCatalogRows({
    declarations: [declaration()],
    components: [{id: "catch.menu", level: "L3", roleNoun: "Menu", summary: "Menu.", aliases: ["DropdownMenu", "PopupMenu"],
      dart: {symbol: "CatchMenu", file}, governance: {conceptId: "catch.menu"}}],
  });
  assert.deepEqual(rows[0].aliases, ["DropdownMenu", "PopupMenu"]);
  assert.match(renderCatalogInventory(rows), /Also called: <code>DropdownMenu<\/code>, <code>PopupMenu<\/code>\./u);
});

test("a planned record with no code adds no catalog identity, and an active one must name its source", () => {
  assert.deepEqual(buildCatalogRows({declarations: [], components: [{id: "catch.toast", status: "planned"}]}), []);
  assert.throws(() => buildCatalogRows({declarations: [], components: [{id: "catch.toast", status: "active"}]}),
    /catch\.toast: registry symbol and file are required/u);
});
