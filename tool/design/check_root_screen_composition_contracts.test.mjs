import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {checkRootScreenCompositionContracts} from "./check_root_screen_composition_contracts.mjs";

test("accepts a registered adaptive shell branch", () => {
  const root = fixtureRoot({
    ownerSource:
      "SafeArea(bottom: false, child: CustomScrollView(slivers: [CatchScrollTerminalGap.sliver()]));",
  });
  const result = checkRootScreenCompositionContracts({root});
  assert.deepEqual(result.findings, []);
});

test("rejects the superseded parallel tabbed-root API", () => {
  const root = fixtureRoot({
    ownerSource: `
      SafeArea(
        bottom: false,
        child: CustomScrollView(
          slivers: [
            CatchScrollTerminalGap.sliver(),
            SliverToBoxAdapter(child: CatchTabbedScreenScaffold()),
          ],
        ),
      );
    `,
  });
  const result = checkRootScreenCompositionContracts({root});
  assert.ok(
    result.findings.some(
      (finding) => finding.code === "legacy-root-layout-symbol",
    ),
  );
});

test("accepts lifecycle-owned StatefulShellBranch key member access", () => {
  const root = fixtureRoot({
    ownerSource:
      "SafeArea(bottom: false, child: CustomScrollView(slivers: [CatchScrollTerminalGap.sliver()]));",
    routerBranchKey: "keys.home",
  });
  const result = checkRootScreenCompositionContracts({root});
  assert.deepEqual(result.findings, []);
});

test("flags a shell that bypasses the shared adaptive scaffold", () => {
  const root = fixtureRoot({
    ownerSource:
      "SafeArea(bottom: false, child: CustomScrollView(slivers: [CatchScrollTerminalGap.sliver()]));",
    shellSource: "return Scaffold(body: navigationShell);",
  });
  const result = checkRootScreenCompositionContracts({root});
  assert.ok(
    result.findings.some(
      (finding) =>
        finding.code === "missing-required-text" &&
        finding.path === "lib/routing/shell/app_shell.dart" &&
        finding.message.includes("AdaptiveTabScaffold"),
    ),
  );
});

test("flags a new StatefulShellBranch until it is registered", () => {
  const root = fixtureRoot({
    ownerSource:
      "SafeArea(bottom: false, child: CustomScrollView(slivers: [CatchScrollTerminalGap.sliver()]));",
    extraRouterSource: `
      StatefulShellBranch(
        navigatorKey: _newShellKey,
        routes: [],
      ),
    `,
  });
  const result = checkRootScreenCompositionContracts({root});
  assert.ok(
    result.findings.some(
      (finding) =>
        finding.code === "unregistered-branch" &&
        finding.message.includes("_newShellKey"),
    ),
  );
});

test("flags a raw SliverFillRemaining empty state in presentation code", () => {
  const root = fixtureRoot({
    ownerSource:
      "SafeArea(bottom: false, child: CustomScrollView(slivers: [CatchScrollTerminalGap.sliver()]));",
    stateSource: `
      SliverFillRemaining(
        child: CatchEmptyState(title: "Nothing here"),
      );
    `,
  });
  const result = checkRootScreenCompositionContracts({root});
  assert.ok(
    result.findings.some(
      (finding) =>
        finding.code === "raw-sliver-state-viewport" &&
        finding.path === "lib/example/presentation/example_screen.dart",
    ),
  );
});

test("Host shell requires both aligned headers and the adaptive scaffold", () => {
  const production = JSON.parse(fs.readFileSync(new URL(
    "./root_screen_composition_contracts.json", import.meta.url), "utf8"));
  const shell = production.shells.find((entry) =>
    entry.path === "lib/routing/shell/host_app_shell.dart");
  const root = fixtureRoot({ownerSource: ""});
  const manifestPath = path.join(root, "tool/design/root_screen_composition_contracts.json");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  manifest.shells = [shell];
  fs.writeFileSync(manifestPath, JSON.stringify(manifest));
  const source = fs.readFileSync(new URL(
    "../../lib/routing/shell/host_app_shell.dart", import.meta.url), "utf8");
  write(root, shell.path, source);
  assert.deepEqual(checkRootScreenCompositionContracts({root}).findings, []);
  for (const marker of ["return CatchWorkspaceHeaderLayout(", "child: AdaptiveTabScaffold("]) {
    write(root, shell.path, source.replace(marker, "removed("));
    assert.ok(checkRootScreenCompositionContracts({root}).findings.some((finding) =>
      finding.code === "missing-required-text" && finding.message.includes(marker)));
  }
});

for (const symbol of ["CatchNavigationViewport", "CatchWorkspacePane", "HostTaskWorkspace"]) {
  test(`rejects ${symbol} in Host feature code`, () => {
    const root = fixtureRoot({ownerSource: ""});
    write(root, "lib/hosts/presentation/example.dart", `${symbol}(child: Text('Bypass'));`);
    assert.ok(checkRootScreenCompositionContracts({root}).findings.some((finding) =>
      finding.code === "host-workspace-bypass"));
  });
}

test("accepts the directory contract and rejects a removed required owner", () => {
  const root = fixtureRoot({ownerSource: ""});
  const file = "lib/hosts/presentation/example.dart";
  write(root, file, "HostNavigationWorkspace(spec: HostDirectoryWorkspace(index: list, selection: null, detailBuilder: detail, unselected: empty));");
  const manifestPath = path.join(root, "tool/design/root_screen_composition_contracts.json");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  manifest.workspaceOwners = [{path: file, requires: [{text: "HostDirectoryWorkspace("}]}];
  fs.writeFileSync(manifestPath, JSON.stringify(manifest));
  assert.deepEqual(checkRootScreenCompositionContracts({root}).findings, []);
  write(root, file, "LegacyDirectory()");
  assert.ok(checkRootScreenCompositionContracts({root}).findings.some((finding) => finding.code === "missing-required-text"));
});

function fixtureRoot({
  ownerSource,
  shellSource = "return AdaptiveTabScaffold(body: navigationShell);",
  extraRouterSource = "",
  stateSource,
  routerBranchKey = "_homeShellKey",
}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "catch-tab-root-"));
  write(
    root,
    "lib/routing/go_router.dart",
    `
      StatefulShellBranch(
        navigatorKey: ${routerBranchKey},
        routes: [GoRoute(name: Routes.home.name)],
      ),
      ${extraRouterSource}
    `,
  );
  write(root, "lib/routing/shell/app_shell.dart", shellSource);
  write(root, "lib/home/home_screen.dart", ownerSource);
  if (stateSource != null) {
    write(root, "lib/example/presentation/example_screen.dart", stateSource);
  }
  write(
    root,
    "tool/design/root_screen_composition_contracts.json",
    JSON.stringify({
      schemaVersion: 3,
      logicalName: "fixture",
      routerPath: "lib/routing/go_router.dart",
      shells: [
        {
          path: "lib/routing/shell/app_shell.dart",
          requires: [{text: "AdaptiveTabScaffold", minimumOccurrences: 1}],
        },
      ],
      branches: [
        {
          branchKey: routerBranchKey,
          routeName: "Routes.home.name",
        },
      ],
    }),
  );
  return root;
}

function write(root, relativePath, contents) {
  const absolutePath = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(absolutePath), {recursive: true});
  fs.writeFileSync(absolutePath, contents);
}
