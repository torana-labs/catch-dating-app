import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {fromRepo} from "../lib/repo_paths.mjs";
import {lockedVersion, serializeCodepoints, updateCatalogText, vendorIconFont} from "./vendor_icon_font.mjs";

const catalogRelative = "design/tokens/catch.icons.json";
const codepointsRelative = "packages/catch_ui/assets/fonts/lucide/codepoints.json";

function temporaryRepo({fontSource = true} = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "catch-vendor-icon-font-"));
  const catalog = {
    $schema: "./catch.icons.schema.json",
    version: 1,
    updated: "2026-10-24",
    family: {
      id: "lucide",
      name: "Lucide",
      version: "1.61.0",
      license: "ISC",
      homepage: "https://lucide.dev",
      strokeWidth: 2,
      flutter: {
        fontFamily: "Lucide",
        fontPackage: "catch_ui",
        fontAsset: "assets/fonts/lucide/lucide.ttf",
        fontSha256: "0".repeat(64),
        codepoints: codepointsRelative,
        ...(fontSource
          ? {fontSource: {package: "lucide-static", font: "font/lucide.ttf", codepoints: "font/codepoints.json"}}
          : {}),
      },
      react: {package: "lucide-react"},
    },
    groups: {},
    roles: {},
  };
  fs.mkdirSync(path.join(root, "design/tokens"), {recursive: true});
  fs.writeFileSync(path.join(root, catalogRelative), `${JSON.stringify(catalog, null, 2)}\n`);
  fs.writeFileSync(
    path.join(root, "package-lock.json"),
    JSON.stringify({packages: {"node_modules/lucide-react": {version: "1.62.0"}}}),
  );
  fs.mkdirSync(path.join(root, "packages/catch_ui/assets/fonts/lucide"), {recursive: true});
  fs.writeFileSync(path.join(root, "packages/catch_ui/assets/fonts/lucide/lucide.ttf"), "old font");
  fs.writeFileSync(path.join(root, codepointsRelative), "{\n\"old\":1\n}\n");
  return root;
}

const newFont = Buffer.from("new font bytes");
const newFontSha256 = crypto.createHash("sha256").update(newFont).digest("hex");

function fakePack(expectedSpec, specs = []) {
  return (spec) => {
    specs.push(spec);
    assert.equal(spec, expectedSpec);
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "catch-fake-pack-"));
    fs.mkdirSync(path.join(directory, "font"));
    fs.writeFileSync(path.join(directory, "font/lucide.ttf"), newFont);
    fs.writeFileSync(
      path.join(directory, "font/codepoints.json"),
      JSON.stringify({"zoom-in": 57782, "a-arrow-down": 58757, activity: 57400, badValue: "x"}),
    );
    return directory;
  };
}

test("codepoints are written sorted, one glyph per line, in the vendored file's own format", () => {
  assert.equal(serializeCodepoints({b: 2, a: 1, skipped: "x"}), "{\n\"a\":1,\n\"b\":2\n}\n");
  const vendored = fs.readFileSync(fromRepo(codepointsRelative), "utf8");
  assert.equal(serializeCodepoints(JSON.parse(vendored)), vendored);
});

test("the default version is the one package-lock.json resolves for the React package", () => {
  assert.equal(lockedVersion({packages: {"node_modules/lucide-react": {version: "1.62.0"}}}, "lucide-react"), "1.62.0");
  assert.throws(() => lockedVersion({packages: {}}, "lucide-react"), /does not resolve lucide-react/u);
});

test("vendoring writes the font and codepoints and pins the version and hash in the catalog", () => {
  const root = temporaryRepo();
  const report = vendorIconFont({root, pack: fakePack("lucide-static@1.62.0"), generate: false, today: "2026-11-04"});
  assert.deepEqual(report, {
    package: "lucide-static",
    previousVersion: "1.61.0",
    version: "1.62.0",
    previousFontSha256: "0".repeat(64),
    fontSha256: newFontSha256,
    glyphs: 3,
    fontPath: "packages/catch_ui/assets/fonts/lucide/lucide.ttf",
    codepointsPath: codepointsRelative,
    changed: true,
    written: true,
  });
  assert.deepEqual(fs.readFileSync(path.join(root, "packages/catch_ui/assets/fonts/lucide/lucide.ttf")), newFont);
  assert.equal(
    fs.readFileSync(path.join(root, codepointsRelative), "utf8"),
    "{\n\"a-arrow-down\":58757,\n\"activity\":57400,\n\"zoom-in\":57782\n}\n",
  );
  const catalog = JSON.parse(fs.readFileSync(path.join(root, catalogRelative), "utf8"));
  assert.equal(catalog.family.version, "1.62.0");
  assert.equal(catalog.family.flutter.fontSha256, newFontSha256);
  assert.equal(catalog.updated, "2026-11-04");
  assert.equal(catalog.family.flutter.fontSource.package, "lucide-static");
});

test("the catalog is rewritten in place: three values change and every other byte stays", () => {
  const original = fs.readFileSync(fromRepo(catalogRelative), "utf8");
  const updated = updateCatalogText(original, {
    previousVersion: "1.61.0",
    version: "1.62.0",
    previousFontSha256: "0b98954b05aba6a770306609847f2d2194395ab225288346c7841a4a50ce2300",
    fontSha256: "f".repeat(64),
    previousUpdated: JSON.parse(original).updated,
    today: "2026-11-04",
  });
  const parsed = JSON.parse(updated);
  assert.equal(parsed.family.version, "1.62.0");
  assert.equal(parsed.family.flutter.fontSha256, "f".repeat(64));
  assert.equal(parsed.updated, "2026-11-04");
  assert.equal(parsed.version, 1);
  assert.equal(updated.length, original.length + ("1.62.0".length - "1.61.0".length) +
    (("f".repeat(64)).length - 64) + ("2026-11-04".length - JSON.parse(original).updated.length));
  assert.equal(updated.split("\n").length, original.split("\n").length);
  assert.throws(
    () => updateCatalogText(original, {
      previousVersion: "9.9.9", version: "1.62.0", previousFontSha256: "0".repeat(64),
      fontSha256: "f".repeat(64), previousUpdated: "2000-01-01", today: "2026-11-04",
    }),
    /holds "version": "9\.9\.9" 0 times/u,
  );
});

test("an explicit version wins over the lock, and a dry run writes nothing", () => {
  const root = temporaryRepo();
  const specs = [];
  const report = vendorIconFont({
    root, version: "1.63.0", pack: fakePack("lucide-static@1.63.0", specs), dryRun: true, generate: false,
  });
  assert.deepEqual(specs, ["lucide-static@1.63.0"]);
  assert.equal(report.version, "1.63.0");
  assert.equal(report.written, false);
  assert.equal(fs.readFileSync(path.join(root, "packages/catch_ui/assets/fonts/lucide/lucide.ttf"), "utf8"), "old font");
  assert.equal(JSON.parse(fs.readFileSync(path.join(root, catalogRelative), "utf8")).family.version, "1.61.0");
});

test("a catalog that names no font source cannot be vendored", () => {
  const root = temporaryRepo({fontSource: false});
  assert.throws(
    () => vendorIconFont({root, pack: fakePack("lucide-static@1.62.0"), generate: false}),
    /names no family\.flutter\.fontSource/u,
  );
});

test("the real catalog names the static package the vendored font comes from", () => {
  const catalog = JSON.parse(fs.readFileSync(fromRepo(catalogRelative), "utf8"));
  const source = catalog.family.flutter.fontSource;
  assert.match(source.package, /^(?:@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/u);
  assert.match(source.font, /\.ttf$/u);
  assert.match(source.codepoints, /\.json$/u);
});
