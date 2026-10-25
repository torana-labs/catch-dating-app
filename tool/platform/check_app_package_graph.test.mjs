import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  declaredPackageNamesFromPubspec,
  declaredPackageVersionsFromPubspec,
  pluginNamesFromMetadata,
  scanAppPackageGraphs,
  validateRoleGraph,
} from "./check_app_package_graph.mjs";

test("parses direct package declarations and plugin metadata", () => {
  const declaredPackages = declaredPackageNamesFromPubspec(
    "dependencies:\n  flutter:\n    sdk: flutter\n  health: ^13.3.1\ndev_dependencies:\n  test: any\n",
  );
  const pluginPackages = pluginNamesFromMetadata(
    JSON.stringify({
      plugins: {
        ios: [{name: "health"}],
        android: [{name: "razorpay_flutter"}],
      },
    }),
  );
  assert.deepEqual([...declaredPackages].sort(), ["flutter", "health"]);
  assert.deepEqual([...pluginPackages].sort(), ["health", "razorpay_flutter"]);
});

test("rejects consumer SDKs in the Host graph", () => {
  assert.deepEqual(
    validateRoleGraph({
      role: "host",
      declaredPackages: new Set(["health", "path"]),
      pluginPackages: new Set(["health"]),
    }),
    [
      "host: forbidden package 'health' is present.",
      "host: forbidden native plugin 'health' is present.",
    ],
  );
});

test("fresh checkouts validate package boundaries without generated Flutter metadata", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "catch-app-graphs-"));
  try {
    for (const [role, dependencies] of Object.entries({
      consumer: ["catch_dating_app", "health", "razorpay_flutter"],
      host: ["catch_dating_app"],
    })) {
      const projectRoot = path.join(root, "apps", role);
      fs.mkdirSync(projectRoot, {recursive: true});
      fs.writeFileSync(
        path.join(projectRoot, "pubspec.yaml"),
        [
          `name: catch_${role}_app`,
          "resolution: workspace",
          "dependencies:",
          ...dependencies.map((name) => `  ${name}: any`),
          "",
        ].join("\n"),
      );
    }

    const tokenRoot = path.join(root, "packages/catch_tokens");
    fs.mkdirSync(tokenRoot, {recursive: true});
    fs.writeFileSync(path.join(tokenRoot, "pubspec.yaml"),
      "name: catch_tokens\nresolution: workspace\ndependencies:\n  flutter:\n    sdk: flutter\n");
    const uiRoot = path.join(root, "packages/catch_ui");
    fs.mkdirSync(uiRoot, {recursive: true});
    fs.writeFileSync(path.join(uiRoot, "pubspec.yaml"),
      "name: catch_ui\nresolution: workspace\ndependencies:\n  flutter:\n    sdk: flutter\n  catch_tokens: any\n  skeletonizer: 2.1.3\n");
    const result = scanAppPackageGraphs({root});
    assert.deepEqual(result.findings, []);
    assert.equal(
      result.reports.consumer.pluginMetadataSource,
      "declared-policy-plugins",
    );
    assert.equal(result.reports.consumer.hasHealth, true);
    assert.equal(result.reports.host.hasHealth, false);
    for (const engine of ["shimmer", "skeletonizer"]) {
      fs.writeFileSync(path.join(root, "pubspec.yaml"),
        `name: catch_dating_app\nresolution: workspace\ndependencies:\n  ${engine}: any\n`);
      assert.deepEqual(scanAppPackageGraphs({root}).findings,
        [`app: loading dependency '${engine}' must stay behind catch_ui.`]);
    }
  } finally {
    fs.rmSync(root, {recursive: true, force: true});
  }
});

// The L0 package must never acquire app, provider, or other library dependencies.
test("token package rejects every dependency outside Flutter", () => {
  for (const dependency of ["catch_dating_app", "flutter_riverpod", "firebase_core", "collection"]) {
    assert.deepEqual(validateRoleGraph({
      role: "catch_tokens",
      declaredPackages: new Set(["flutter", dependency]),
      pluginPackages: new Set(),
    }), [`catch_tokens: dependency '${dependency}' is outside the Flutter-only token boundary.`]);
  }
  assert.deepEqual(validateRoleGraph({role: "catch_tokens", declaredPackages: new Set(), pluginPackages: new Set()}),
    ["catch_tokens: required package 'flutter' is absent."]);
});

test("UI package rejects app, state, backend and unrelated dependencies", () => {
  const allowed = ["flutter", "catch_tokens", "skeletonizer"];
  const declaredVersions = new Map([["skeletonizer", "2.1.3"]]);
  assert.deepEqual(validateRoleGraph({role: "catch_ui", declaredPackages: new Set(allowed), declaredVersions, pluginPackages: new Set()}), []);
  // Icon families are vendored as a font beside the role catalog, never a package.
  for (const dependency of ["catch_dating_app", "riverpod", "flutter_riverpod", "firebase_core", "collection", "shimmer",
    "phosphor_flutter", "lucide_icons_flutter"]) {
    assert.deepEqual(validateRoleGraph({role: "catch_ui", declaredPackages: new Set([...allowed, dependency]), declaredVersions, pluginPackages: new Set()}),
      [`catch_ui: dependency '${dependency}' is outside the presentation-only UI boundary.`]);
  }
});

test("UI loading requires the exact ratified Skeletonizer version", () => {
  for (const version of ["2.1.3", "'2.1.3'", '"2.1.3" # loading engine', "^2.1.3", "2.1.4", "any", ""]) {
    const source = `dependencies:\n  flutter:\n    sdk: flutter\n  catch_tokens: any\n  skeletonizer: ${version}\n`;
    const findings = validateRoleGraph({
      role: "catch_ui",
      declaredPackages: declaredPackageNamesFromPubspec(source),
      declaredVersions: declaredPackageVersionsFromPubspec(source),
      pluginPackages: new Set(),
    });
    assert.deepEqual(findings, ["2.1.3", "'2.1.3'", '"2.1.3" # loading engine'].includes(version)
      ? [] : ["catch_ui: package 'skeletonizer' must be pinned to '2.1.3'."]);
  }
});

test("app entrypoint packages cannot add a second loading engine or import it directly", () => {
  for (const role of ["consumer", "host"]) {
    const base = role === "consumer" ? ["health", "razorpay_flutter"] : [];
    for (const engine of ["shimmer", "skeletonizer"]) {
      assert.deepEqual(validateRoleGraph({
        role,
        declaredPackages: new Set([...base, engine]),
        pluginPackages: new Set(base),
      }), [`${role}: forbidden package '${engine}' is present.`]);
    }
  }
});
