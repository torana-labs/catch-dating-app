import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {fileURLToPath} from "node:url";

import {
  exportedFiles,
  legacyFiles,
  maskDart,
  newRootFindings,
  newRootFiles,
  publicDeclarations,
  registryLegacyMembers,
  scanLibrary,
  scanRepository,
} from "./check_library_shims.mjs";

const barrel = "packages/catch_ui/lib/catch_ui.dart";
const reader = (files) => (file) => {
  if (!(file in files)) throw new Error(`missing ${file}`);
  return files[file];
};
const library = (sources) => reader({
  [barrel]: Object.keys(sources).map((name) => `export 'src/${name}';`).join("\n"),
  ...Object.fromEntries(Object.entries(sources).map(([name, source]) =>
    [`packages/catch_ui/lib/src/${name}`, source])),
});
const shimNames = (sources) => scanLibrary(library(sources)).shims.map((symbol) => symbol.name);

test("comments and strings cannot read as code, and offsets hold", () => {
  const source = [
    "// CatchOld",
    "const a = 'CatchOld'; /* CatchOld /* nested */ */",
    "final b = r'\\'; final c = CatchOld;",
    "final d = '''",
    "CatchOld",
    "''';",
  ].join("\n");
  const masked = maskDart(source);
  assert.equal(masked.length, source.length);
  assert.equal(masked.split("\n").length, source.split("\n").length);
  assert.equal([...masked.matchAll(/CatchOld/gu)].length, 1);
});

test("every shape of a shim is counted", () => {
  const shapes = {
    "alias.dart": "@Deprecated('Use CatchNew')\ntypedef CatchAlias = CatchNew;",
    "subclass.dart": "@Deprecated('Use CatchNew')\nclass CatchSub extends CatchNew {\n  const CatchSub();\n}",
    "wrapper.dart": "@Deprecated('Use CatchNew')\nclass CatchWrap extends StatelessWidget {\n  const CatchWrap({super.key});\n  @override\n  Widget build(BuildContext context) => const CatchNew();\n}",
    "function.dart": "@Deprecated('Use catchNewGap')\ndouble catchOldGap() => catchNewGap();\ndouble catchNewGap() => 1;",
    "getter.dart": "@Deprecated('Use catchNewGap')\ndouble get catchOldGetter => catchNewGap();",
    "variable.dart": "@Deprecated('Use CatchNew')\nconst catchOldValue = CatchNew();",
    "new.dart": "class CatchNew {\n  const CatchNew();\n}",
  };
  assert.deepEqual(shimNames(shapes).sort(), [
    "CatchAlias", "CatchSub", "CatchWrap", "catchOldGap", "catchOldGetter", "catchOldValue",
  ].sort());
});

test("a deprecated constructor or member that delegates is a shim named for its owner", () => {
  const names = shimNames({"a.dart": `class CatchRow {
  const CatchRow({this.value = 0});
  @Deprecated('Use CatchRow')
  const CatchRow.legacy() : this(value: 1);
  @Deprecated('Use CatchRow')
  factory CatchRow.made() = CatchRow;
  @Deprecated('Use CatchRow')
  static CatchRow build() => const CatchRow();
  final int value;
}`});
  assert.deepEqual(names.sort(), ["CatchRow.build", "CatchRow.legacy", "CatchRow.made"]);
});

test("what is not a public, exported, delegating @Deprecated symbol is not counted", () => {
  const scan = scanLibrary(library({
    "a.dart": "class CatchNew {}\n/// @Deprecated('prose')\nclass CatchKept extends CatchNew {}\n" +
      "@Deprecated('Private')\nclass _CatchHidden extends CatchNew {}\n" +
      "class CatchHolder {\n  const CatchHolder({@Deprecated('a parameter') this.old});\n  final Object? old;\n}\n" +
      "@Deprecated('Names nothing')\nconst catchPlainNumber = 1;",
  }));
  assert.deepEqual(scan.shims, []);
  assert.deepEqual(scan.deprecated.map((symbol) => symbol.name), ["catchPlainNumber"]);
});

const legacyRegistry = {components: [
  {id: "catch.surface", dart: {symbol: "CatchSurface", file: "packages/catch_ui/lib/src/new.dart"},
    contract: {members: [
      {id: "catch.surface.legacy", symbol: "CatchLegacySurface", file: "packages/catch_ui/lib/src/legacy.dart",
        governance: {conceptRole: "member", qualifier: "legacy"}},
      {id: "catch.surface.card", symbol: "CatchCardSurface", governance: {conceptRole: "member", qualifier: "variant"}},
    ]}},
  {id: "catch.count", dart: {symbol: "CatchCountText", file: "packages/catch_ui/lib/src/count.dart"},
    governance: {conceptRole: "member", qualifier: "legacy"}},
]};

test("the registry's legacy members are read from records and contract members alike", () => {
  assert.deepEqual(registryLegacyMembers(legacyRegistry), [
    {id: "catch.count", name: "CatchCountText", file: "packages/catch_ui/lib/src/count.dart"},
    {id: "catch.surface.legacy", name: "CatchLegacySurface", file: "packages/catch_ui/lib/src/legacy.dart"},
  ]);
  assert.deepEqual(registryLegacyMembers(null), []);
});

test("legacy members count beside the shims, and an unexported one is flagged", () => {
  const scan = scanLibrary(library({
    "new.dart": "class CatchSurface {}",
    "legacy.dart": "class CatchLegacySurface {}",
  }), registryLegacyMembers(legacyRegistry));
  assert.deepEqual(scan.shims.map((symbol) => symbol.name), ["CatchCountText", "CatchLegacySurface"]);
  assert.deepEqual(scan.legacy.filter((member) => !member.exported).map((member) => member.name), ["CatchCountText"]);
  assert.deepEqual(scan.deprecated, []);
});

test("a new-root file may neither name nor import a legacy member", () => {
  const legacy = registryLegacyMembers(legacyRegistry);
  const found = (source) => newRootFindings(source, [], legacy).map((finding) => finding.text);
  assert.deepEqual(found(`${"import 'package:catch_ui/catch_ui.dart';"}\nconst a = CatchLegacySurface();`),
    ["uses legacy CatchLegacySurface (catch.surface.legacy)"]);
  assert.deepEqual(found("import 'package:catch_ui/src/legacy.dart';\nconst a = 1;"),
    ["imports legacy CatchLegacySurface (catch.surface.legacy)"]);
  assert.deepEqual(found("import 'package:catch_ui/catch_ui.dart';\n// CatchLegacySurface\nconst a = CatchSurface();"), []);
});

test("the export surface follows the barrel, its show and hide, nested exports and parts", () => {
  const files = {
    [barrel]: "export 'src/a.dart' show CatchShown;\nexport 'src/b.dart' hide CatchHiddenB;\nexport 'src/c.dart';\nexport 'package:other/other.dart';",
    "packages/catch_ui/lib/src/a.dart": "class CatchNew {}\nclass CatchShown {}\n@Deprecated('x')\nclass CatchHiddenA extends CatchNew {}",
    "packages/catch_ui/lib/src/b.dart": "class CatchB {}\n@Deprecated('x')\nclass CatchHiddenB extends CatchB {}",
    "packages/catch_ui/lib/src/c.dart": "export 'nested/d.dart';\npart 'c_part.dart';",
    "packages/catch_ui/lib/src/nested/d.dart": "class CatchD {}\n@Deprecated('x')\nclass CatchOldD extends CatchD {}",
    "packages/catch_ui/lib/src/c_part.dart": "part of 'c.dart';\n@Deprecated('x')\nclass CatchOldPart extends CatchD {}",
  };
  assert.equal(exportedFiles(reader(files)).has("packages/catch_ui/lib/src/nested/d.dart"), true);
  assert.deepEqual(scanLibrary(reader(files)).shims.map((symbol) => symbol.name).sort(),
    ["CatchOldD", "CatchOldPart"]);
});

test("declarations survive generics, named parameters, const collections and enums", () => {
  const names = publicDeclarations(`
const catchTable = <String, int>{'a': 1};
final catchFirst = {'a': 1}.keys.first;
Map<String, List<int>> catchLookup({int a = 0}) { return {}; }
enum CatchTone { day, night; const CatchTone(); }
extension CatchExtras on String {}
extension on int {}
typedef CatchBuilder<T> = T Function();
abstract final class CatchAbstract {}
mixin CatchMixin {}
class CatchPlain<T extends Object> extends Object {}
`).map((symbol) => symbol.name);
  assert.deepEqual(names, ["catchTable", "catchFirst", "catchLookup", "CatchTone", "CatchExtras",
    "CatchBuilder", "CatchAbstract", "CatchMixin", "CatchPlain"]);
});

const deprecated = scanLibrary(library({
  "a.dart": `class CatchNew {
  const CatchNew();
  @Deprecated('Use CatchNew')
  const CatchNew.legacy() : this();
  @Deprecated('Use something')
  int get oldGetter => 1;
}
@Deprecated('Use CatchNew')
typedef CatchOld = CatchNew;
@Deprecated('Use CatchNew')
const catchOldValue = 1;`,
})).deprecated;
const importing = "import 'package:catch_ui/catch_ui.dart';\n";
const uses = (source) => newRootFindings(source, deprecated).map((finding) => finding.text.split(" (")[0]);

test("a new-root file that uses a deprecated symbol is reported at its line", () => {
  const [finding] = newRootFindings(`${importing}\nconst a = CatchOld();`, deprecated);
  assert.equal(finding.line, 3);
  assert.match(finding.text, /uses deprecated CatchOld \(packages\/catch_ui\/lib\/src\/a\.dart:9\)/u);
  assert.deepEqual(uses(`${importing}const a = catchOldValue;`), ["uses deprecated catchOldValue"]);
  assert.deepEqual(uses(`${importing}const a = CatchNew.legacy();`), ["uses deprecated CatchNew.legacy"]);
  assert.deepEqual(uses("import 'package:catch_ui/catch_ui.dart' as ui;\nconst a = ui.CatchOld();"),
    ["uses deprecated CatchOld"]);
  assert.deepEqual(uses("import 'package:catch_ui/src/a.dart';\nconst a = CatchOld();"),
    ["uses deprecated CatchOld"]);
});

test("a name only in a comment or string, a similar name, or a file without the import is clean", () => {
  assert.deepEqual(uses(`${importing}// CatchOld\nconst a = 'CatchOld';\nconst b = CatchOldest();\nconst c = MyCatchOld();`), []);
  assert.deepEqual(uses(`${importing}const a = CatchNew();\nconst b = CatchNew.other();`), []);
  assert.deepEqual(uses("class CatchOld {}\nconst a = CatchOld();"), []);
});

test("a new-root file cannot silence the analyzer's checks, even the one that reports ignores", () => {
  for (const [comment, code] of [
    ["// ignore: deprecated_member_use", "deprecated_member_use"],
    ["// ignore_for_file: deprecated_member_use_from_same_package", "deprecated_member_use_from_same_package"],
    ["// ignore_for_file: catch_ui_lints/catch_no_allow_debt", "catch_ui_lints"],
    ["// ignore: CATCH_NO_RAW_COLOR", "CATCH_NO_RAW_COLOR"],
    ["// ignore: unused_import, catch_ui_lints/catch_arch_provider_free_boundary -- a reason", "catch_ui_lints"],
  ]) {
    assert.deepEqual(uses(`${comment}\nconst a = 1;`), [`silences ${code}`]);
  }
  assert.deepEqual(uses("// ignore: unused_import\nconst a = 1;"), []);
  assert.deepEqual(uses("// catch_no_raw_color is what this avoids\nconst a = 1;"), []);
});

test("the legacy list is read from the one place it is written", () => {
  const scope = fs.readFileSync(new URL("../../packages/catch_ui_lints/lib/src/migration_scope.dart", import.meta.url), "utf8");
  assert.deepEqual([...legacyFiles(scope)].sort(), [
    "lib/pages/celebration/celebration_screen.dart",
    "lib/pages/startup/splash_screen.dart",
  ]);
  assert.throws(() => legacyFiles("const other = 1;"), /newRootLegacyFiles not found/u);
});

function seedRepository(files) {
  // A real path: macOS links its temp folder, and the CLI compares its own path.
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "catch-library-shims-")));
  const write = (file, text) => {
    fs.mkdirSync(path.dirname(path.join(root, file)), {recursive: true});
    fs.writeFileSync(path.join(root, file), text);
  };
  write(barrel, "export 'src/a.dart';");
  write("packages/catch_ui/lib/src/a.dart", "class CatchNew {}\n@Deprecated('Use CatchNew')\ntypedef CatchOld = CatchNew;");
  write("packages/catch_ui_lints/lib/src/migration_scope.dart", "const newRootLegacyFiles = <String>{\n  'lib/pages/listed/listed_screen.dart',\n};");
  write("lib/pages/listed/listed_screen.dart", "");
  for (const [file, text] of Object.entries(files)) write(file, text);
  return root;
}

test("a legacy member under the new roots fails the scan, and so does an unexported one", (t) => {
  const root = seedRepository({
    "design/components/catch.components.json": JSON.stringify(legacyRegistry),
    "packages/catch_ui/lib/src/legacy.dart": "class CatchLegacySurface {}",
    "apps/host/lib/today/today_body.dart": `${importing}const a = CatchLegacySurface();`,
  });
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  fs.writeFileSync(path.join(root, barrel), "export 'src/a.dart';\nexport 'src/legacy.dart';");
  const scan = scanRepository(root);
  assert.deepEqual(scan.violations.map((violation) => violation.text),
    ["uses legacy CatchLegacySurface (catch.surface.legacy)"]);
  assert.deepEqual(scan.unexportedLegacy.map((member) => member.id), ["catch.count"]);
  assert.equal(scan.shims.length, 3);
});

test("the scan covers both app packages and lib/pages, and no other folder", (t) => {
  const old = `${importing}const a = CatchOld();`;
  const root = seedRepository({
    "apps/host/lib/today/today_body.dart": old,
    "apps/consumer/lib/widgets/row.dart": old,
    "lib/pages/welcome/welcome_screen.dart": old,
    "lib/pages/listed/listed_screen.dart": old,
    "lib/pages/welcome/welcome.g.dart": old,
    "lib/hosts/presentation/host_screen.dart": old,
    "apps/host/test/today_test.dart": old,
  });
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  assert.deepEqual(scanRepository(root).violations.map((violation) => violation.file), [
    "apps/consumer/lib/widgets/row.dart",
    "apps/host/lib/today/today_body.dart",
    "lib/pages/welcome/welcome_screen.dart",
  ]);
  assert.equal(scanRepository(root).shims.length, 1);
  assert.equal(newRootFiles(root, new Set()).includes("lib/pages/listed/listed_screen.dart"), true);
});

function runGate(root, ...args) {
  // The CLI reads the repository it sits in, so copy it into the seeded one.
  const tool = path.join(root, "tool/design/check_library_shims.mjs");
  fs.mkdirSync(path.dirname(tool), {recursive: true});
  const here = path.dirname(fileURLToPath(import.meta.url));
  fs.copyFileSync(path.join(here, "check_library_shims.mjs"), tool);
  fs.mkdirSync(path.join(root, "tool/lib"), {recursive: true});
  for (const helper of ["flutter_source_roots.mjs", "repo_paths.mjs"]) {
    fs.copyFileSync(path.join(here, "../lib", helper), path.join(root, "tool/lib", helper));
  }
  return spawnSync(process.execPath, [tool, ...args], {encoding: "utf8"});
}

test("the count may not rise, a fall must be recorded, and --update only records a fall", (t) => {
  const baseline = "tool/design/library_shims_baseline.json";
  const root = seedRepository({[baseline]: JSON.stringify({owner: "x", shims: 1})});
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  assert.equal(runGate(root, "--check").status, 0);

  fs.writeFileSync(path.join(root, baseline), JSON.stringify({owner: "x", shims: 0}));
  const rise = runGate(root, "--check");
  assert.equal(rise.status, 1);
  assert.match(rise.stderr, /raise "shims".*by hand/u);
  assert.equal(runGate(root, "--update").status, 1);
  assert.equal(JSON.parse(fs.readFileSync(path.join(root, baseline), "utf8")).shims, 0);

  fs.writeFileSync(path.join(root, baseline), JSON.stringify({owner: "x", shims: 2}));
  const fall = runGate(root, "--check");
  assert.equal(fall.status, 1);
  assert.match(fall.stderr, /record it with --update/u);
  assert.equal(runGate(root, "--update").status, 0);
  const recorded = JSON.parse(fs.readFileSync(path.join(root, baseline), "utf8"));
  assert.deepEqual(recorded, {owner: "x", shims: 1});
  assert.equal(runGate(root, "--check").status, 0);
});

test("a listed file that is gone fails the gate until its entry leaves the list", (t) => {
  const baseline = "tool/design/library_shims_baseline.json";
  const root = seedRepository({[baseline]: JSON.stringify({owner: "x", shims: 1})});
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  fs.rmSync(path.join(root, "lib/pages/listed/listed_screen.dart"));
  const result = runGate(root, "--check");
  assert.equal(result.status, 1);
  assert.match(result.stderr, /lib\/pages\/listed\/listed_screen\.dart/u);
  assert.deepEqual(scanRepository(root).staleLegacy, ["lib/pages/listed/listed_screen.dart"]);
});

test("a use under a new root fails the gate and names the file", (t) => {
  const baseline = "tool/design/library_shims_baseline.json";
  const root = seedRepository({
    [baseline]: JSON.stringify({owner: "x", shims: 1}),
    "apps/host/lib/today/today_body.dart": `${importing}const a = CatchOld();`,
  });
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  const result = runGate(root, "--check");
  assert.equal(result.status, 1);
  assert.match(result.stderr, /apps\/host\/lib\/today\/today_body\.dart:2 uses deprecated CatchOld/u);
});
