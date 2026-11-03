#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {spawnSync} from "node:child_process";
import {fileURLToPath} from "node:url";

const generatedFiles = ["app_localizations.dart", "app_localizations_en.dart"];

export function compareGeneratedFiles({expectedDir, actualDir, files = generatedFiles}) {
  const errors = [];
  for (const file of files) {
    const expectedPath = path.join(expectedDir, file);
    const actualPath = path.join(actualDir, file);
    if (!fs.existsSync(expectedPath)) {
      errors.push(`Tracked localization output is missing: ${expectedPath}`);
      continue;
    }
    if (!fs.existsSync(actualPath)) {
      errors.push(`Flutter did not generate expected localization output: ${file}`);
      continue;
    }
    if (!fs.readFileSync(expectedPath).equals(fs.readFileSync(actualPath))) {
      errors.push(`Tracked localization output is stale: ${file}`);
    }
  }
  return errors;
}

// gen-l10n formats its output for the package's language version, which pub
// takes from the SDK constraint's lower bound. Without a package config the
// formatter falls back to the newest language version, so the disposable
// project declares the package's version to match `flutter gen-l10n` in the repo.
export function languageVersion(pubspec) {
  const lines = pubspec.split("\n");
  const start = lines.findIndex((line) => /^environment:[ \t]*$/u.test(line));
  if (start >= 0) {
    for (const line of lines.slice(start + 1)) {
      if (!/^[ \t]/u.test(line)) break;
      const match = /^[ \t]+sdk:[ \t]*(?:["'][ \t]*)?(?:(?:\^|>=)[ \t]*)?(\d+)\.(\d+)\./u.exec(line);
      if (match) return `${match[1]}.${match[2]}`;
    }
  }
  throw new Error("pubspec.yaml declares no environment.sdk lower bound.");
}

export function checkFlutterL10n({
  repositoryRoot,
  runGenerator = defaultRunGenerator,
}) {
  const packageRoot = path.join(repositoryRoot, "packages", "l10n");
  const language = languageVersion(fs.readFileSync(path.join(packageRoot, "pubspec.yaml"), "utf8"));
  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), "catch-l10n-check-"));
  try {
    const arbDir = path.join(temporaryRoot, "lib");
    fs.mkdirSync(arbDir, {recursive: true});
    fs.copyFileSync(
      path.join(packageRoot, "lib", "app_en.arb"),
      path.join(arbDir, "app_en.arb"),
    );
    fs.copyFileSync(
      path.join(packageRoot, "l10n.yaml"),
      path.join(temporaryRoot, "l10n.yaml"),
    );
    fs.writeFileSync(
      path.join(temporaryRoot, "pubspec.yaml"),
      `name: catch_l10n_check\nenvironment:\n  sdk: ^${language}.0\ndependencies:\n  flutter:\n    sdk: flutter\nflutter:\n  generate: true\n`,
    );
    fs.mkdirSync(path.join(temporaryRoot, ".dart_tool"));
    fs.writeFileSync(
      path.join(temporaryRoot, ".dart_tool", "package_config.json"),
      JSON.stringify({
        configVersion: 2,
        packages: [{name: "catch_l10n_check", rootUri: "../", packageUri: "lib/", languageVersion: language}],
      }),
    );

    const generation = runGenerator({cwd: temporaryRoot});
    if (generation.status !== 0) {
      return {
        errors: [
          `flutter gen-l10n failed with status ${generation.status ?? "unknown"}.`,
          generation.error?.message,
          generation.stderr?.trim(),
        ].filter(Boolean),
        stdout: generation.stdout ?? "",
      };
    }
    return {
      errors: compareGeneratedFiles({
        expectedDir: path.join(packageRoot, "lib", "generated"),
        actualDir: path.join(arbDir, "generated"),
      }),
      stdout: generation.stdout ?? "",
    };
  } finally {
    fs.rmSync(temporaryRoot, {recursive: true, force: true});
  }
}

function defaultRunGenerator({cwd}) {
  return spawnSync("flutter", ["gen-l10n"], {
    cwd,
    encoding: "utf8",
    shell: false,
    timeout: 120_000,
    env: {
      ...process.env,
      CI: "true",
      FLUTTER_SUPPRESS_ANALYTICS: "true",
    },
  });
}

function main() {
  if (!process.argv.slice(2).includes("--check")) {
    console.error("This command is read-only and requires --check.");
    process.exit(64);
  }
  const repositoryRoot = fileURLToPath(new URL("../../../", import.meta.url));
  const result = checkFlutterL10n({repositoryRoot});
  if (result.errors.length > 0) {
    for (const error of result.errors) console.error(error);
    process.exitCode = 1;
    return;
  }
  console.log("Generated Flutter localization outputs are current.");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
