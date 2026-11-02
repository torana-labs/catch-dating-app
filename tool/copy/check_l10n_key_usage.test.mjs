#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {spawnSync} from "node:child_process";
import {fileURLToPath} from "node:url";
import test from "node:test";
import {createRepositorySnapshot} from "../lib/repository_snapshot.mjs";
import {scanDartSource, tokenizeDartSyntax} from "../lib/dart_source.mjs";
import {
  findL10nMemberReferences,
  scanL10nKeyUsage,
  stableJson,
  tokenizeDartIdentifiers,
} from "./check_l10n_key_usage.mjs";

const copyRoot = path.dirname(fileURLToPath(import.meta.url));
const scannerPath = path.join(copyRoot, "check_l10n_key_usage.mjs");

test("known-bad fixture reports every orphaned key", () => {
  const root = fixtureRoot("orphans");
  const result = scanFixture(root);
  const entries = Object.fromEntries(
    result.inventory.keys.map((entry) => [entry.key, entry]),
  );

  assert.equal(entries.usedKey.status, "used");
  assert.equal(entries.usedInInterpolation.status, "used");
  assert.deepEqual(entries.usedKey.usages, [
    {path: "lib/sample.dart", line: 8, column: 23},
  ]);
  assert.deepEqual(entries.usedInInterpolation.usages, [
    {path: "lib/sample.dart", line: 9, column: 39},
  ]);
  assert.equal(entries.knownOrphan.status, "orphaned");
  assert.equal(entries.stringOnly.status, "orphaned");
  assert.equal(entries.generatedOnly.status, "orphaned");
  assert.equal(entries.newOrphan.status, "orphaned");
  assert.deepEqual(
    result.excludedFiles.map(({path: filePath, reason}) => [filePath, reason]),
    [
      ["lib/l10n/generated/app_localizations.dart", "l10n-generated-directory"],
      ["lib/secondary.g.dart", "generated-suffix"],
    ],
  );

  assert.deepEqual(result.orphanedKeys, [
    "generatedOnly",
    "knownOrphan",
    "newOrphan",
    "stringOnly",
  ]);
});

test("no-orphans fixture has nothing to report", () => {
  assert.deepEqual(scanFixture(fixtureRoot("no_orphans")).orphanedKeys, []);
});

test("missing-catalog fixture reports exact handwritten getter locations", () => {
  const root = fixtureRoot("missing_catalog");
  const first = scanFixture(root);
  const second = scanFixture(root);
  const validKey = first.inventory.keys.find(
    (entry) => entry.key === "validKey",
  );

  assert.equal(first.inventory.schemaVersion, 2);
  assert.deepEqual(validKey.l10nReferences, [
    {path: "lib/sample.dart", line: 4, column: 22},
  ]);
  assert.equal(validKey.l10nReferenceCount, 1);
  assert.deepEqual(first.missingCatalogKeys, ["missingCatalogKey"]);
  assert.deepEqual(first.missingCatalogReferences, [
    {
      key: "missingCatalogKey",
      path: "lib/sample.dart",
      line: 5,
      column: 24,
    },
  ]);
  assert.equal(first.inventory.summary.catalogL10nReferences, 1);
  assert.equal(first.inventory.summary.nonMessageL10nReferences, 1);
  assert.equal(first.inventory.summary.missingCatalogKeys, 1);
  assert.equal(first.inventory.summary.missingCatalogReferences, 1);
  assert.deepEqual(first.nonMessageL10nReferences, [
    {key: "localeName", path: "lib/sample.dart", line: 7, column: 23},
  ]);
  assert.deepEqual(
    first.excludedFiles.map(({path: filePath, reason}) => [filePath, reason]),
    [["lib/secondary.g.dart", "generated-suffix"]],
  );
  assert.equal(stableJson(first.inventory), stableJson(second.inventory));
});

test("Dart lexer ignores comments and strings but scans interpolation code", () => {
  const source = [
    "// commentOnly",
    "/* outer /* nestedOnly */ blockOnly */",
    "const ordinary = 'stringOnly';",
    "const raw = r'rawOnly';",
    "final direct = context.l10n.usedKey;",
    "final nullable = l10n?.nullableKey;",
    "final interpolated = '${l10n.usedInInterpolation}';",
    "final unrelatedChain = wrap(l10n).notAL10nGetter;",
  ].join("\n");
  const identifiers = tokenizeDartIdentifiers(source).map(
    (token) => token.identifier,
  );

  assert.ok(identifiers.includes("usedKey"));
  assert.ok(identifiers.includes("usedInInterpolation"));
  for (const ignored of [
    "commentOnly",
    "nestedOnly",
    "blockOnly",
    "stringOnly",
    "rawOnly",
  ]) {
    assert.equal(identifiers.includes(ignored), false, ignored);
  }

  assert.deepEqual(
    findL10nMemberReferences(source).map(({key, operator}) => ({
      key,
      operator,
    })),
    [
      {key: "usedKey", operator: "."},
      {key: "nullableKey", operator: "?."},
      {key: "usedInInterpolation", operator: "."},
    ],
  );
});

test("inventory generation is deterministic JSON", () => {
  const root = fixtureRoot("no_orphans");
  const first = scanFixture(root).inventory;
  const second = scanFixture(root).inventory;
  assert.equal(stableJson(first), stableJson(second));
  assert.deepEqual(JSON.parse(stableJson(first)), first);

  const firstCli = runFixtureCli("no_orphans", "--check", "--json");
  const secondCli = runFixtureCli("no_orphans", "--check", "--json");
  assert.equal(firstCli.status, 0, firstCli.stderr);
  assert.equal(secondCli.status, 0, secondCli.stderr);
  assert.equal(firstCli.stdout, secondCli.stdout);
});

test("shared tokenizer preserves l10n APIs and UTF-16 offsets through nested interpolation", () => {
  const source = [
    "// 😀 l10n.commentOnly",
    "final message = '''😀 ${ {'value': \"${l10n?.nestedKey}\"} }''';",
    "/* nested /* l10n.hidden */ comment */ final direct = l10n.directKey;",
    "final raw = r'${l10n.rawOnly}';",
    String.raw`final escaped = '\${l10n.escapedOnly}';`,
  ].join("\r\n");
  const expected = ["nestedKey", "directKey"].map((key) => ({
    key, offset: source.indexOf(key),
    receiverOffset: source.lastIndexOf("l10n", source.indexOf(key)),
    operator: key === "nestedKey" ? "?." : ".",
  }));
  assert.deepEqual(findL10nMemberReferences(source), expected);
  assert.deepEqual(tokenizeDartIdentifiers(source), tokenizeDartSyntax(source)
    .filter((token) => token.kind === "identifier")
    .map(({identifier, offset}) => ({identifier, offset})));
  assert.deepEqual(scanDartSource(source).tokens, tokenizeDartSyntax(source));
  for (const {identifier, offset} of tokenizeDartIdentifiers(source))
    assert.equal(source.slice(offset, offset + identifier.length), identifier);
});

test("CLI fails on any orphan and passes when there are none", () => {
  const failing = runFixtureCli("orphans", "--check");
  assert.equal(failing.status, 1, failing.stderr);
  assert.match(failing.stderr, /Orphaned Flutter ARB keys:/u);
  for (const key of ["generatedOnly", "knownOrphan", "newOrphan", "stringOnly"]) {
    assert.match(failing.stderr, new RegExp(`- ${key}`, "u"));
  }

  const passing = runFixtureCli("no_orphans", "--check");
  assert.equal(passing.status, 0, passing.stderr);
  assert.match(passing.stdout, /0 orphaned/u);
});

test("CLI always fails missing catalog getters with exact locations", () => {
  for (const args of [[], ["--check"]]) {
    const result = runFixtureCli("missing_catalog", ...args);
    assert.equal(result.status, 1, result.stderr);
    assert.match(
      result.stderr,
      /lib\/sample\.dart:5:24 l10n\.missingCatalogKey/u,
    );
    assert.match(result.stderr, /always fail/u);
    assert.doesNotMatch(result.stderr, /commentOnly|stringOnly|generatedOnly/u);
  }
});

test("JSON review records missing getters but exits unsuccessfully", () => {
  const result = runFixtureCli("missing_catalog", "--check", "--json");
  assert.equal(result.status, 1, result.stderr);
  const inventory = JSON.parse(result.stdout).inventory;
  assert.deepEqual(inventory.missingCatalogKeys, ["missingCatalogKey"]);
  assert.deepEqual(inventory.missingCatalogReferences, [
    {
      key: "missingCatalogKey",
      path: "lib/sample.dart",
      line: 5,
      column: 24,
    },
  ]);
});

test("CLI JSON is reviewable and matches the live scan", () => {
  const root = fixtureRoot("no_orphans");
  const review = runCli(["--repo-root", root, "--check", "--json"]);
  assert.equal(review.status, 0, review.stderr);
  assert.equal(
    stableJson(JSON.parse(review.stdout).inventory),
    stableJson(scanFixture(root).inventory),
  );
});

test("retired tracked inventory and legacy CLI modes stay absent", () => {
  const snapshot = createRepositorySnapshot();
  assert.equal(
    snapshot.exists("docs/audit_registry/l10n_key_usage.json"),
    false,
  );
  for (const flag of ["--check-inventory", "--write-inventory", "--inventory", "--write-baseline", "--baseline"]) {
    const result = runFixtureCli("no_orphans", flag);
    assert.equal(result.status, 64, `${flag}: ${result.stderr}`);
    assert.match(result.stderr, /Unknown argument/u);
  }
});

test("CLI help exposes only live evidence modes", () => {
  const result = runCli(["--help"]);
  assert.equal(result.status, 0, result.stderr);
  for (const supported of [
    "--check",
    "--json",
    "--repo-root <path>",
    "--check --json > build/ci/l10n-key-usage.json",
  ]) {
    assert.ok(result.stdout.includes(supported), supported);
  }
  assert.doesNotMatch(
    result.stdout,
    /--check-inventory|--write-inventory|--inventory <path>|--write-baseline|--baseline <path>|docs\/audit_registry\/l10n_key_usage\.json/u,
  );
});

function fixtureRoot(name) {
  return path.join(copyRoot, "fixtures", "l10n_key_usage", name);
}

function scanFixture(root) {
  return scanL10nKeyUsage({
    repoRoot: root,
    arbPath: path.join(root, "lib", "l10n", "app_en.arb"),
    sourceRoot: path.join(root, "lib"),
  });
}

function runFixtureCli(name, ...args) {
  return runCli(["--repo-root", fixtureRoot(name), ...args]);
}

function runCli(args) {
  return spawnSync(process.execPath, [scannerPath, ...args], {
    encoding: "utf8",
  });
}
