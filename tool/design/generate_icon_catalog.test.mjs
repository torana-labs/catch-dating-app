import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import test from "node:test";

import {activityRoleName, buildIconOutputs, pascalCase} from "./generate_icon_catalog.mjs";

const family = (overrides = {}) => ({
  codepoints: {"arrow-left": 0xe048, "sport-shoe": 0xe700, "share-2": 0xe100, share: 0xe101},
  fontSha256: "a".repeat(64),
  reactVersion: "1.55.0",
  lockVersion: "1.55.0",
  reactExports: new Set(["ArrowLeft", "SportShoe", "Share2", "Share"]),
  ...overrides,
});

const catalog = (roles = {}) => ({
  family: {
    name: "Lucide",
    version: "1.55.0",
    flutter: {fontFamily: "Lucide", fontPackage: "catch_ui", fontAsset: "lucide.ttf", fontSha256: "a".repeat(64)},
    react: {package: "lucide-react"},
  },
  groups: {ui: "Interface roles.", activity: "Activity roles.", playbook: "Playbook marks."},
  roles: {
    back: {group: "ui", glyph: "arrow-left", mirrorInRtl: true, description: "Go back."},
    activityRunning: {group: "activity", activityKind: "running", glyph: "sport-shoe", description: "Running."},
    ...roles,
  },
});

const build = (overrides = {}) => buildIconOutputs({
  catalog: catalog(),
  legacy: null,
  activityKinds: ["running"],
  family: family(),
  ...overrides,
});

test("the real catalog resolves in the font and in lucide-react, and CatchIcons is current", () => {
  const result = spawnSync(process.execPath, ["tool/design/generate_icon_catalog.mjs", "--check"], {
    cwd: process.cwd(),
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /roles resolve in both frameworks and CatchIcons is current/u);
});

test("a valid catalog renders role getters over const glyphs in the vendored font", () => {
  const {errors, outputs} = build();
  assert.deepEqual(errors, []);
  assert.match(outputs.dart, /static IconData get back => const IconData\(\n {4}0xe048,\n {4}fontFamily: _fontFamily,/u);
  assert.match(outputs.dart, /matchTextDirection: true/u);
  assert.match(outputs.dart, /static IconData get activityRunning => const IconData\(/u);
  assert.match(outputs.dart, /static const String _fontPackage = 'catch_ui';/u);
});

test("a glyph missing from the vendored font fails", () => {
  const {errors} = build({catalog: catalog({search: {group: "ui", glyph: "search", description: "Search."}}),
    family: family({reactExports: new Set(["ArrowLeft", "SportShoe", "Search"])})});
  assert.ok(errors.some((error) => /glyph 'search' is not in the vendored Lucide font/u.test(error)), errors.join("\n"));
});

test("a glyph lucide-react does not export fails", () => {
  const {errors} = build({family: family({reactExports: new Set(["ArrowLeft"])})});
  assert.ok(errors.some((error) => /lucide-react exports no 'SportShoe'/u.test(error)), errors.join("\n"));
});

test("Flutter and React must draw the same family version", () => {
  const installed = build({family: family({reactVersion: "1.60.0"})}).errors;
  assert.ok(installed.some((error) => /must draw the same version/u.test(error)), installed.join("\n"));
  const locked = build({family: family({lockVersion: "1.40.0"})}).errors;
  assert.ok(locked.some((error) => /package-lock.json resolves lucide-react 1.40.0/u.test(error)), locked.join("\n"));
});

test("a re-vendored font without a catalog update fails", () => {
  const {errors} = build({family: family({fontSha256: "b".repeat(64)})});
  assert.ok(errors.some((error) => /sha256 .* does not match family.flutter.fontSha256/u.test(error)), errors.join("\n"));
});

test("every activity kind needs exactly one correctly named role", () => {
  const missing = build({activityKinds: ["running", "dinner"]}).errors;
  assert.ok(missing.includes("activityKind 'dinner' has no activity role."), missing.join("\n"));

  const unknown = build({activityKinds: []}).errors;
  assert.ok(unknown.some((error) => /names no activityKind/u.test(error)), unknown.join("\n"));

  const renamed = catalog({
    jogging: {group: "activity", activityKind: "running", glyph: "sport-shoe", description: "Running."},
  });
  delete renamed.roles.activityRunning;
  const misnamed = build({catalog: renamed});
  assert.ok(misnamed.errors.some((error) => /must be named 'activityRunning'/u.test(error)), misnamed.errors.join("\n"));
});

test("platform glyphs render a platform method beside the role", () => {
  const {errors, outputs} = build({catalog: catalog({
    share: {group: "ui", glyph: "share-2", platformGlyphs: {ios: "share"}, description: "Share."},
  })});
  assert.deepEqual(errors, []);
  assert.match(outputs.dart, /static IconData platformShare\(\{TargetPlatform\? platform\}\)/u);
  assert.match(outputs.dart, /TargetPlatform\.iOS => _shareIos,/u);
  assert.match(outputs.dart, /show TargetPlatform, defaultTargetPlatform;/u);
});

test("legacy aliases must target a role and must not shadow one", () => {
  const ok = build({legacy: {aliases: {arrowBackRounded: "back"}}});
  assert.deepEqual(ok.errors, []);
  assert.match(ok.outputs.dart, /static IconData get arrowBackRounded => back;/u);

  const bad = build({legacy: {aliases: {back: "back", chevronLeft: "previous"}}}).errors;
  assert.ok(bad.includes("Legacy alias 'back' shadows a role of the same name."), bad.join("\n"));
  assert.ok(bad.includes("Legacy alias 'chevronLeft' targets unknown role 'previous'."), bad.join("\n"));
});

test("reserved words cannot name a role", () => {
  const {errors} = build({catalog: catalog({switch: {group: "ui", glyph: "arrow-left", description: "Toggle."}})});
  assert.ok(errors.includes("Role 'switch' is a Dart reserved word."), errors.join("\n"));
});

test("names convert the way Lucide and the catalog spell them", () => {
  assert.equal(pascalCase("trash-2"), "Trash2");
  assert.equal(pascalCase("circle-check"), "CircleCheck");
  assert.equal(activityRoleName("strengthTraining"), "activityStrengthTraining");
});
