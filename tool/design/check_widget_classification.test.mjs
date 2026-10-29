import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import {fileURLToPath} from "node:url";

import {validateWidgetClassification} from "./check_widget_classification.mjs";
import {publicWidgetNamingProblems} from "./component_concepts.mjs";
import {featureWidgetNamingIssues} from "./lib/component_naming.mjs";
import {
  buildWidgetClassification,
  collectProductionWidgetClassificationDeclarations,
  collectWidgetClassificationDeclarations,
} from "./generate_widget_classification.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const contracts = JSON.parse(
  fs.readFileSync(path.join(repoRoot, "design/components/catch.components.json"), "utf8"),
).components ?? [];
const widgetbookNames = readWidgetbookNames();
const classification = buildWidgetClassification({
  repoRoot,
  updated: "2026-08-07",
});
const sourceDeclarations = collectProductionWidgetClassificationDeclarations({repoRoot})
  .map(({file, name, baseClass}) => ({file, name, baseClass}));

test("source-derived widget classification passes its structural and semantic contract", () => {
  assert.equal(Object.hasOwn(classification, "$schema"), false);
  assert.equal(classification.widgets.length > 0, true);
  assert.ok(classification.widgets.some((widget) =>
    widget.file === "apps/consumer/lib/consumer_platform_app.dart" &&
    widget.name === "ConsumerPlatformApp",
  ));
  assert.ok(classification.widgets.some((widget) =>
    widget.file === "apps/host/lib/host_platform_app.dart" &&
    widget.name === "HostPlatformApp",
  ));
  assert.ok(classification.widgets.some((widget) =>
    widget.file === "packages/catch_ui/lib/src/patterns/catch_tab_viewport_scope.dart" &&
    widget.name === "CatchTabViewportScope" &&
    widget.baseClass === "InheritedWidget",
  ));
  assert.ok(classification.widgets.some((widget) =>
    widget.file === "packages/catch_ui/lib/src/primitives/catch_pager_focus_viewport.dart" &&
    widget.name === "CatchPagerFocusViewport" &&
    widget.baseClass === "SingleChildRenderObjectWidget",
  ));
  assert.deepEqual(validate(classification), []);
});

test("classification reports feature naming debt without treating app bootstraps as feature UI", () => {
  // The Phase 7b.2 sweep drives the real tree to zero naming debt, so the flag
  // contract is proven on a legacy-shaped fixture, not on a surviving widget.
  assert.deepEqual(featureWidgetNamingIssues({
    file: "lib/auth/presentation/otp_page.dart",
    name: "OtpPage",
    visibility: "public",
    classKind: "widget",
  }), ["noncanonical-feature-widget-name", "noncanonical-feature-widget-file"]);
  const bootstrap = classification.widgets.find((widget) =>
    widget.file === "apps/host/lib/host_platform_app.dart" && widget.name === "HostPlatformApp");
  assert.ok(bootstrap);
  assert.equal(bootstrap.flags.some((flag) => flag.includes("feature-widget")), false);
});

test("classification discovers indirect and nontraditional Widgets across roots", () => {
  const declarations = collectWidgetClassificationDeclarations([
    {
      file: "lib/contexts/events/parts/catch_cross_root_base.dart",
      source: `
abstract class CatchCrossRootBase extends InheritedWidget {}
class CatchRenderBoundary extends SingleChildRenderObjectWidget {}
`,
    },
    {
      file: "apps/consumer/lib/cross_root_panel.dart",
      source: `
class CatchCrossRootPanelWidget extends CatchCrossRootBase {}
class CatchExactPanel extends CatchRenderBoundary {}
`,
    },
    {
      file: "apps/host/lib/cross_root_panel.dart",
      source: `
class CrossRootPanelView extends CatchCrossRootBase {}
class CatchExactPanel extends RenderObjectWidget {}
`,
    },
  ]);

  assert.deepEqual(
    declarations.map(({file, name, baseClass, classKind}) => ({
      file,
      name,
      baseClass,
      classKind,
    })),
    [
      {
        file: "lib/contexts/events/parts/catch_cross_root_base.dart",
        name: "CatchCrossRootBase",
        baseClass: "InheritedWidget",
        classKind: "widget",
      },
      {
        file: "lib/contexts/events/parts/catch_cross_root_base.dart",
        name: "CatchRenderBoundary",
        baseClass: "SingleChildRenderObjectWidget",
        classKind: "widget",
      },
      {
        file: "apps/consumer/lib/cross_root_panel.dart",
        name: "CatchCrossRootPanelWidget",
        baseClass: "CatchCrossRootBase",
        classKind: "widget",
      },
      {
        file: "apps/consumer/lib/cross_root_panel.dart",
        name: "CatchExactPanel",
        baseClass: "CatchRenderBoundary",
        classKind: "widget",
      },
      {
        file: "apps/host/lib/cross_root_panel.dart",
        name: "CrossRootPanelView",
        baseClass: "CatchCrossRootBase",
        classKind: "widget",
      },
      {
        file: "apps/host/lib/cross_root_panel.dart",
        name: "CatchExactPanel",
        baseClass: "RenderObjectWidget",
        classKind: "widget",
      },
    ],
  );

  const publicRows = declarations.map((entry) => ({
    ...entry,
    conceptRole: "composition",
    conceptId: null,
  }));
  const problems = publicWidgetNamingProblems(publicRows).join("\n");
  assert.match(problems, /duplicate public widget class CatchExactPanel/u);
  assert.match(
    problems,
    /ungoverned normalized widget collision cross_root_panel/u,
  );

  const governedRows = publicRows.map((entry) =>
    ["CatchCrossRootPanelWidget", "CrossRootPanelView"].includes(entry.name)
      ? {...entry, conceptRole: "member", conceptId: "catch.cross_root_panel"}
      : entry,
  );
  assert.doesNotMatch(
    publicWidgetNamingProblems(governedRows).join("\n"),
    /normalized widget collision cross_root_panel/u,
  );
});

test("rejects undeclared properties and invalid enum values", () => {
  const extraProperty = clone(classification);
  extraProperty.untrackedSnapshotField = true;
  assert.ok(validate(extraProperty).some((failure) => failure.startsWith("registry must contain exactly")));

  const invalidRole = clone(classification);
  invalidRole.widgets[0].role = "molecule";
  assert.ok(validate(invalidRole).some((failure) => failure.includes("role has invalid value")));

  const invalidPath = clone(classification);
  invalidPath.widgets[0].file = "widgetbook/lib/not_a_production_widget.dart";
  assert.ok(validate(invalidPath).some((failure) =>
    failure.includes("file must be a Dart source under lib/**, packages/catch_ui/lib/**, apps/consumer/lib/**, apps/host/lib/**"),
  ));

  const incompleteScope = clone(classification);
  incompleteScope.sourceOfTruth.scope =
    "Production widget classes under lib/** and apps/consumer/lib/**.";
  assert.ok(validate(incompleteScope).includes(
    "sourceOfTruth.scope must include apps/host/lib/**",
  ));
});

test("rejects duplicate remediation values and summary drift", () => {
  const duplicateRemediation = clone(classification);
  duplicateRemediation.widgets[0].remediationOptions = ["inlineDelete", "inlineDelete"];
  assert.ok(validate(duplicateRemediation).some((failure) => failure.includes("remediationOptions must be unique")));

  const summaryDrift = clone(classification);
  summaryDrift.summary.total += 1;
  assert.ok(validate(summaryDrift).includes(
    `summary.total must equal ${classification.widgets.length}`,
  ));
});

test("rejects a public widget that falls out of concept classification", () => {
  const invalid = clone(classification);
  const index = invalid.widgets.findIndex(
    (widget) => widget.classKind === "widget" && widget.visibility === "public",
  );
  assert.notEqual(index, -1, "fixture requires a current public widget");
  invalid.widgets[index].conceptRole = "unclassified";
  invalid.widgets[index].conceptId = null;
  invalid.widgets[index].parentConceptId = null;
  invalid.widgets[index].qualifier = null;

  assert.ok(validate(invalid).some((failure) =>
    failure.includes("public widget cannot remain unclassified"),
  ));
});

test("retains the private-widget remediation rule", () => {
  const privateIndex = classification.widgets.findIndex(
    (widget) => widget.classKind === "widget" && widget.visibility === "private",
  );
  assert.notEqual(privateIndex, -1, "fixture requires a current private widget");
  const invalid = clone(classification);
  invalid.widgets[privateIndex].decision = "keep-public-cataloged";
  assert.ok(validate(invalid).some((failure) =>
    failure.includes("private widget classes must be review-promote-or-inline"),
  ));
});

test("rejects missing and stale source classifications", () => {
  const missing = clone(classification);
  const removed = missing.widgets.pop();
  assert.ok(validate(missing).includes(`${removed.file}:${removed.name}: missing classification`));

  const staleSource = sourceDeclarations.slice(0, -1);
  const failures = validateWidgetClassification(classification, {
    contracts,
    widgetbookNames,
    sourceDeclarations: staleSource,
  });
  const stale = sourceDeclarations.at(-1);
  assert.ok(failures.includes(`${stale.file}:${stale.name}: stale classification`));
});

test("classification enforces the reviewed role instead of trusting a registry ID", () => {
  const changedContracts = clone(contracts);
  changedContracts.find((row) => row.id === "catch.field").roleNoun = "Input";
  const failures = validateWidgetClassification(classification, {
    contracts: changedContracts, widgetbookNames, sourceDeclarations,
  });
  assert.ok(failures.some((failure) => /catch.field: expected CatchInput, found CatchField/u.test(failure)));
});

function validate(value) {
  return validateWidgetClassification(value, {
    contracts,
    widgetbookNames,
    sourceDeclarations,
  });
}

function readWidgetbookNames() {
  const source = fs.readFileSync(
    path.join(repoRoot, "widgetbook/lib/main.directories.g.dart"),
    "utf8",
  );
  const names = new Set();
  for (const match of source.matchAll(/WidgetbookComponent\(\s*name: '([^']+)'/gu)) {
    names.add(match[1]);
    names.add(match[1].replace(/<.*>$/u, ""));
  }
  return names;
}

function clone(value) {
  return structuredClone(value);
}
