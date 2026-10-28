import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  checkFlutterL10n,
  compareGeneratedFiles,
  languageVersion,
} from "./lib/check_flutter_l10n_generated.mjs";

function withTempDir(callback) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "catch-l10n-test-"));
  try {
    return callback(root);
  } finally {
    fs.rmSync(root, {recursive: true, force: true});
  }
}

test("comparison reports missing and stale generated outputs", () => {
  withTempDir((root) => {
    const expectedDir = path.join(root, "expected");
    const actualDir = path.join(root, "actual");
    fs.mkdirSync(expectedDir);
    fs.mkdirSync(actualDir);
    fs.writeFileSync(path.join(expectedDir, "one.dart"), "expected");
    fs.writeFileSync(path.join(expectedDir, "two.dart"), "expected");
    fs.writeFileSync(path.join(actualDir, "one.dart"), "stale");
    assert.deepEqual(compareGeneratedFiles({
      expectedDir,
      actualDir,
      files: ["one.dart", "two.dart"],
    }), [
      "Tracked localization output is stale: one.dart",
      "Flutter did not generate expected localization output: two.dart",
    ]);
  });
});

test("checker generates only inside a disposable project and compares tracked output", () => {
  withTempDir((repositoryRoot) => {
    const sourceDir = path.join(repositoryRoot, "lib", "l10n");
    const expectedDir = path.join(sourceDir, "generated");
    fs.mkdirSync(expectedDir, {recursive: true});
    fs.writeFileSync(path.join(sourceDir, "app_en.arb"), "{}");
    fs.writeFileSync(path.join(repositoryRoot, "l10n.yaml"), "arb-dir: lib/l10n\noutput-dir: lib/l10n/generated\n");
    fs.writeFileSync(path.join(repositoryRoot, "pubspec.yaml"), "name: app\nenvironment:\n  sdk: ^3.12.0\n");
    fs.writeFileSync(path.join(expectedDir, "app_localizations.dart"), "one");
    fs.writeFileSync(path.join(expectedDir, "app_localizations_en.dart"), "two");

    let generatorCwd = null;
    let generatorPubspec = null;
    let generatorPackageConfig = null;
    const result = checkFlutterL10n({
      repositoryRoot,
      runGenerator({cwd}) {
        generatorCwd = cwd;
        generatorPubspec = fs.readFileSync(path.join(cwd, "pubspec.yaml"), "utf8");
        generatorPackageConfig = JSON.parse(fs.readFileSync(path.join(cwd, ".dart_tool", "package_config.json"), "utf8"));
        const outputDir = path.join(cwd, "lib", "l10n", "generated");
        fs.mkdirSync(outputDir, {recursive: true});
        fs.writeFileSync(path.join(outputDir, "app_localizations.dart"), "one");
        fs.writeFileSync(path.join(outputDir, "app_localizations_en.dart"), "two");
        return {status: 0, stdout: "generated", stderr: ""};
      },
    });

    assert.deepEqual(result.errors, []);
    assert.notEqual(generatorCwd, repositoryRoot);
    assert.equal(generatorCwd.startsWith(os.tmpdir()), true);
    assert.equal(fs.existsSync(generatorCwd), false);
    assert.match(generatorPubspec, /^ {2}sdk: \^3\.12\.0$/mu);
    assert.equal(generatorPackageConfig.packages[0].languageVersion, "3.12");
  });
});

test("the disposable project takes the app's language version from its SDK lower bound", () => {
  assert.equal(languageVersion("name: app\nenvironment:\n  sdk: ^3.12.0\n  flutter: '>=3.47.0'\n"), "3.12");
  assert.equal(languageVersion("name: app\nenvironment:\n  flutter: any\n  sdk: \">=3.12.1 <4.0.0\"\n"), "3.12");
  assert.throws(() => languageVersion("name: app\ndependencies:\n  sdk: flutter\n"), /no environment\.sdk/u);
});
