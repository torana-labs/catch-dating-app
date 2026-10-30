import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  scanRailContracts,
  scanSourceForRailContracts,
} from "./check_rail_contracts.mjs";

test("flags old rail chrome zeroing in production code", () => {
  const result = scanSourceForRailContracts({
    relativePath: "lib/dashboard/presentation/widgets/dashboard_full.dart",
    source: `
      Widget build(context) => OrganizerAvatarRail(
        clubs: clubs,
        showDivider: false,
        headerPadding: EdgeInsets.zero,
        listPadding: EdgeInsets.zero,
      );
    `,
  });

  assert.equal(result.findings.length, 1);
  assert.equal(result.findings[0].level, "high");
});

test("allows embedded rail defaults", () => {
  const result = scanSourceForRailContracts({
    relativePath: "lib/dashboard/presentation/widgets/dashboard_full.dart",
    source: "Widget build(context) => OrganizerAvatarRail(clubs: clubs);",
  });

  assert.equal(result.findings.length, 0);
});

test("allows full-bleed rail opt-in", () => {
  const result = scanSourceForRailContracts({
    relativePath: "lib/explore/presentation/widgets/explore_body.dart",
    source:
      "Widget build(context) => OrganizerAvatarRail(clubs: clubs, fullBleed: true);",
  });

  assert.equal(result.findings.length, 0);
  assert.equal(result.inventory.fullBleedOptIns, 1);
});

test("reports redundant showDivider false without failing high", () => {
  const result = scanSourceForRailContracts({
    relativePath: "lib/dashboard/presentation/widgets/recommendations.dart",
    source: `
      Widget build(context) => CatchSection.horizontal(
        title: 'Recommended',
        itemCount: 2,
        itemBuilder: itemBuilder,
        showDivider: false,
      );
    `,
  });

  assert.equal(result.findings.length, 1);
  assert.equal(result.findings[0].level, "medium");
});

test("ignores canonical rail implementations", () => {
  const result = scanSourceForRailContracts({
    relativePath: "lib/organizers/presentation/discovery/widgets/organizer_avatar_rail.dart",
    source: `
      Widget build(context) => CatchSection.horizontal(
        title: 'Your clubs',
        fullBleed: fullBleed,
        showDivider: showDivider,
        headerPadding: headerPadding,
        listPadding: listPadding,
        itemCount: clubs.length,
        itemBuilder: itemBuilder,
      );
    `,
  });

  assert.equal(result.findings.length, 0);
});

test("scanRailContracts covers app and shared-package production sources", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "catch-rail-contracts-"));
  writeFile(
    root,
    "packages/catch_ui/lib/src/components/neighbor.dart",
    "Widget build(context) => CatchSection.horizontal(headerPadding: EdgeInsets.zero);",
  );
  writeFile(
    root,
    "lib/dashboard/presentation/widgets/dashboard_full.dart",
    `
      Widget build(context) => OrganizerAvatarRail(
        clubs: clubs,
        showDivider: false,
        headerPadding: EdgeInsets.zero,
      );
    `,
  );
  writeFile(
    root,
    "widgetbook/lib/organizers/catalog/discovery.dart",
    `
      Widget build(context) => OrganizerAvatarRail(
        clubs: clubs,
        showDivider: false,
        headerPadding: EdgeInsets.zero,
      );
    `,
  );

  const result = scanRailContracts({root});

  assert.equal(result.counts.high, 2);
  assert.equal(result.findings[0].path, "lib/dashboard/presentation/widgets/dashboard_full.dart");
  assert.equal(result.findings[1].path, "packages/catch_ui/lib/src/components/neighbor.dart");
});

test("only the exact extracted rail owner retains its exemption", () => {
  const source = "Widget build(context) => CatchSection.horizontal(headerPadding: EdgeInsets.zero);";
  const owner = scanSourceForRailContracts({
    relativePath: "packages/catch_ui/lib/src/components/catch_section.dart",
    source,
  });
  assert.equal(owner.findings.length, 0);
  for (const relativePath of [
    "packages/catch_ui/lib/src/components/neighbor.dart",
    "lib/core/widgets/catch_horizontal_rail.dart",
  ]) {
    const result = scanSourceForRailContracts({relativePath, source});
    assert.equal(result.findings.length, 1, relativePath);
    assert.equal(result.findings[0].rule, "RAIL-CONTRACT-001");
  }
});

function writeFile(root, relativePath, source) {
  const file = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(file), {recursive: true});
  fs.writeFileSync(file, source);
}

test("horizontal named recipe cannot escape the chrome scanner", () => {
  const result = scanSourceForRailContracts({
    relativePath: "lib/explore/presentation/widgets/explore_recommendations_section.dart",
    source: "Widget build(context) => CatchSection . horizontal(headerPadding: EdgeInsets.zero);",
  });
  assert.equal(result.inventory.railCalls, 1);
  assert.equal(result.findings[0].rule, "RAIL-CONTRACT-001");
  const otherRecipe = scanSourceForRailContracts({
    relativePath: "lib/explore/presentation/widgets/explore_recommendations_section.dart",
    source: "Widget build(context) => CatchSection.plain(padding: EdgeInsets.zero, child: Text('x'));",
  });
  assert.equal(otherRecipe.inventory.railCalls, 0);
});
