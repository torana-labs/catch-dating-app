#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import {spawnSync} from "node:child_process";
import {fileURLToPath} from "node:url";
import path from "node:path";

const root = fileURLToPath(new URL("../../", import.meta.url));
const dispositionPath = path.join(
  root,
  "widgetbook/test/support/screen_scope_dispositions.json",
);
export const classes = ["component-mount", "body-mount", "screen-scope", "prototype"];
export const dispositions = ["migrate-to-ui-capture", "keep-widgetbook"];
const sharedSource = (file) => ["lib/core/", "packages/catch_ui/lib/", "packages/catch_tokens/lib/"].some((prefix) => file.startsWith(prefix));
const simpleType = (value) => value?.replace(/<.*>/u, "");
const key = (row) => [row.file, row.builder, simpleType(row.type), row.name].join(":");
const proposalMarker = /(?:^|[\s·([])proposed(?:$|[\s)\]])/iu;
const foundationSpecimens = new Map([
  ["FoundationColorTokens", "colors"],
  ["FoundationSpacingTokens", "spacing"],
  ["FoundationShapeTokens", "shape"],
  ["FoundationTypographyTokens", "typography"],
  ["FoundationIconMediaTokens", "media"],
  ["FoundationStrokeMotionTokens", "motion"],
  ["FoundationDataPhotoTokens", "photo_data"],
  ["FoundationBrandTokens", "brand"],
].map(([type, file]) => [type, `widgetbook/lib/foundation/specimens/${file}.dart`]));

// Classification is about what a case mounts, not its folder or display name.
// The syntax inventory follows local helpers, State classes and fixture scopes
// conservatively, including callbacks. It does not execute routes or infer
// runtime provider values; that remains the capture pipeline's responsibility.
export function classify(row, routeTargets = new Set()) {
  if (!row.typeFile) return {classification: null, reason: "Unresolved annotated type"};
  if (row.typeFile.startsWith("widgetbook/")) {
    // These marker types name token specimens, not alternative product UI.
    if (foundationSpecimens.get(row.type) === row.typeFile &&
        row.productionReferences.some((ref) => ["lib/platform/theme/", "packages/catch_ui/lib/src/foundations/", "packages/catch_tokens/lib/"].some((prefix) => ref.file.startsWith(prefix)))) {
      return {classification: "component-mount", reason: "Production foundation/token specimen"};
    }
    if (!proposalMarker.test(row.name)) {
      return {classification: null, reason: "Widgetbook-defined composition lacks explicit proposed marker"};
    }
    return {classification: "prototype", reason: "Marked proposal; review disposition stays with its feature owner"};
  }
  if (!row.productionReferences.length) {
    return {classification: null, reason: "No production declarations reachable from builder"};
  }
  const route = row.productionReferences.find((ref) => routeTargets.has(ref.symbol));
  const providerFeature = row.productionReferences.find((ref) =>
    !sharedSource(ref.file) && /^Consumer(?:Stateful)?Widget$/u.test(ref.base ?? ""));
  const featureUi = row.productionReferences.find((ref) =>
    ref.ui && !sharedSource(ref.file));
  if (route || providerFeature) {
    return {classification: "screen-scope", reason: route
      ? `Mount dependency includes route target ${route.symbol}`
      : `Mount dependency includes provider-owned feature ${providerFeature.symbol}`};
  }
  if (!featureUi && sharedSource(row.typeFile)) {
    return {classification: "component-mount", reason: "Production shared component/pattern or adapter"};
  }
  if (!featureUi) {
    return {classification: null, reason: "Feature annotation has no reachable production feature UI mount"};
  }
  if (row.wrappers.length) {
    return {classification: "screen-scope", reason: `Feature mount requires ${row.wrappers.join(", ")}`};
  }
  return {classification: "body-mount", reason: "Production feature composition with local fixture inputs"};
}

export function triage(inventory, routeTargets = new Set()) {
  const failures = [];
  const annotations = new Map();
  for (const row of inventory.cases) {
    if (annotations.has(key(row))) failures.push(`Duplicate annotation identity: ${key(row)}`);
    annotations.set(key(row), {...row, ...classify(row, routeTargets)});
  }
  const ids = new Set();
  const registeredKeys = new Set();
  const cases = inventory.generated.map((registration) => {
    const id = `${registration.path}/${registration.name}`;
    if (ids.has(id)) failures.push(`Duplicate registered id: ${id}`);
    ids.add(id);
    registeredKeys.add(key(registration));
    const annotation = annotations.get(key(registration));
    if (!annotation) failures.push(`Registration has no matching annotation: ${id}`);
    return {
      ...annotation,
      id,
      classification: annotation?.classification ?? null,
      goldenCoverageEligible: annotation?.classification != null && annotation.classification !== "prototype",
    };
  }).sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  const unregisteredAnnotations = [...annotations.values()]
    .filter((row) => !registeredKeys.has(key(row)));
  for (const row of unregisteredAnnotations) {
    // widgetbook_generator emits one case from stacked UseCase metadata.
    // Keep EVERY omitted annotation visible and classified, not a waiver list.
    if (!inventory.generated.some((other) => other.file === row.file && other.builder === row.builder)) {
      failures.push(`Annotated builder missing from generated directories: ${key(row)}`);
    }
  }
  for (const row of annotations.values()) {
    if (!row.classification) failures.push(`${key(row)}: ${row.reason}`);
  }
  if (!cases.length) failures.push("Generated corpus is empty");
  const counts = (rows) => Object.fromEntries(classes.map((name) =>
    [name, rows.filter((row) => row.classification === name).length]));
  return {
    registeredCount: cases.length,
    counts: counts(cases),
    unclassified: cases.filter((row) => !row.classification).length,
    annotationCount: inventory.cases.length,
    annotationCounts: counts([...annotations.values()]),
    unclassifiedAnnotations: [...annotations.values()].filter((row) => !row.classification).length,
    unregisteredAnnotationCount: unregisteredAnnotations.length,
    failures,
    cases,
    unregisteredAnnotations,
  };
}

export function applyScreenScopeDispositions(result, policy) {
  const failures = [...result.failures];
  const allowedSelectorKeys = new Set([
    "annotatedTypePattern",
    "annotatedTypeExcludesPattern",
  ]);
  if (policy?.schemaVersion !== 1) {
    failures.push("Screen-scope disposition policy must use schemaVersion 1");
  }
  const seenIds = new Set();
  const rules = (policy?.rules ?? []).map((rule) => {
    if (!rule.id || seenIds.has(rule.id)) {
      failures.push(`Invalid or duplicate screen-scope disposition rule id: ${rule.id ?? "(missing)"}`);
    }
    seenIds.add(rule.id);
    if (!(rule.owner ?? "").trim()) {
      failures.push(`${rule.id}: screen-scope disposition requires an owner`);
    }
    if ((rule.reason ?? "").trim().length < 40) {
      failures.push(`${rule.id}: screen-scope disposition requires a specific reason`);
    }
    if (!dispositions.includes(rule.disposition)) {
      failures.push(`${rule.id}: unknown screen-scope disposition ${rule.disposition}`);
    }
    if (rule.disposition === "migrate-to-ui-capture" &&
        (rule.replacementGate ?? "").trim().length < 20) {
      failures.push(`${rule.id}: capture migration requires a replacement gate`);
    }
    const selector = rule.selector ?? {};
    const selectorKeys = Object.keys(selector);
    if (selectorKeys.length === 0 ||
        selectorKeys.some((name) => !allowedSelectorKeys.has(name))) {
      failures.push(`${rule.id}: invalid screen-scope disposition selector`);
    }
    let include = null;
    let exclude = null;
    try {
      if (selector.annotatedTypePattern) {
        include = new RegExp(selector.annotatedTypePattern, "u");
      }
      if (selector.annotatedTypeExcludesPattern) {
        exclude = new RegExp(selector.annotatedTypeExcludesPattern, "u");
      }
    } catch (error) {
      failures.push(`${rule.id}: invalid selector regular expression: ${error.message}`);
    }
    return {
      ...rule,
      matches(row) {
        const type = simpleType(row.type);
        return (!include || include.test(type)) && (!exclude || !exclude.test(type));
      },
    };
  });

  const usage = new Map(rules.map((rule) => [rule.id, 0]));
  const cases = result.cases.map((row) => {
    if (row.classification !== "screen-scope") return row;
    const matchingRules = rules.filter((rule) => rule.matches(row));
    if (matchingRules.length !== 1) {
      failures.push(
        `${row.id}: expected exactly one screen-scope disposition; found ${matchingRules.length}`,
      );
      return {...row, screenScopeDisposition: null};
    }
    const rule = matchingRules[0];
    usage.set(rule.id, usage.get(rule.id) + 1);
    return {
      ...row,
      screenScopeDisposition: {
        ruleId: rule.id,
        owner: rule.owner,
        disposition: rule.disposition,
        reason: rule.reason,
        replacementGate: rule.replacementGate ?? null,
      },
    };
  });
  for (const [ruleId, count] of usage) {
    if (count === 0) failures.push(`${ruleId}: unused screen-scope disposition rule`);
  }
  const screenRows = cases.filter((row) => row.classification === "screen-scope");
  const dispositionCounts = Object.fromEntries(dispositions.map((name) => [
    name,
    screenRows.filter(
      (row) => row.screenScopeDisposition?.disposition === name,
    ).length,
  ]));
  return {
    ...result,
    failures,
    cases,
    screenScopeDispositionCounts: dispositionCounts,
    undispositionedScreenScopes: screenRows.filter(
      (row) => row.screenScopeDisposition == null,
    ).length,
  };
}

function selfTest() {
  const component = {
    file: "widgetbook/lib/primitives/sample.dart", builder: "sample",
    type: "CatchButton", name: "Default", typeFile: "packages/catch_ui/lib/src/components/catch_button.dart",
    productionReferences: [{symbol: "CatchButton", file: "packages/catch_ui/lib/src/components/catch_button.dart", base: "StatelessWidget", ui: true}],
    wrappers: [],
  };
  const body = {...component, type: "ExampleBody", typeFile: "lib/example/presentation/widgets/example_body.dart",
    productionReferences: [{symbol: "ExampleBody", file: "lib/example/presentation/widgets/example_body.dart", base: "StatelessWidget", ui: true}]};
  const prototype = {...component, typeFile: "widgetbook/lib/example/prototype.dart", name: "Option · proposed"};
  assert.equal(classify(component).classification, "component-mount");
  for (const [type, typeFile] of foundationSpecimens) {
    const specimen = {...component, type, typeFile,
      productionReferences: [{symbol: "CatchTokens", file: "packages/catch_tokens/lib/src/semantic/catch_tokens.dart"}]};
    assert.equal(classify(specimen).classification, "component-mount");
    assert.equal(classify({...specimen, productionReferences: []}).classification, null);
    assert.equal(classify({...specimen, type: "FoundationUnreviewedComposition"}).classification, null);
    assert.equal(classify({...specimen, typeFile: "widgetbook/lib/example/other.dart"}).classification, null);
    assert.equal(classify({...specimen, typeFile: "widgetbook/lib/foundation/specimens/other.dart"}).classification, null);
    assert.equal(classify({...specimen, productionReferences: body.productionReferences}).classification, null);
  }
  for (const file of ["packages/catch_ui/lib/src/foundations/example.dart", "packages/catch_tokens/lib/example.dart"]) {
    const moved = {...component, typeFile: file,
      productionReferences: [{...component.productionReferences[0], file}]};
    assert.equal(classify(moved).classification, "component-mount");
    assert.equal(classify({...body, productionReferences: [...body.productionReferences, ...moved.productionReferences]}).classification, "body-mount");
  }

  assert.equal(classify(body).classification, "body-mount");
  assert.equal(classify({...body, productionReferences: component.productionReferences}).classification, null);
  assert.equal(classify({...body, typeFile: component.typeFile}).classification, "body-mount");
  assert.equal(classify({...body, wrappers: ["ProviderScope"]}).classification, "screen-scope");
  assert.equal(classify(component, new Set(["CatchButton"])).classification, "screen-scope");
  assert.equal(classify(prototype).classification, "prototype");
  assert.equal(classify({...prototype, productionReferences: []}).classification, "prototype");
  assert.equal(classify({...prototype, name: "Option"}).classification, null);
  assert.equal(classify({...prototype, name: "Unproposed"}).classification, null);
  assert.equal(classify({...body, name: "Typed descriptor prototype"}).classification, "body-mount");
  assert.equal(classify({...component, typeFile: null}).classification, null);
  assert.equal(classify({...component, productionReferences: []}).classification, null);
  const generated = {...component, path: "Core/CatchButton"};
  const valid = triage({cases: [component], generated: [generated]});
  assert.deepEqual(valid.failures, []);
  assert.equal(valid.unclassified, 0);
  assert.equal(triage({cases: [prototype], generated: [{...prototype, path: "Proposals"}]}).cases[0].goldenCoverageEligible, false);
  assert.ok(triage({cases: [], generated: [generated]}).failures.length);
  assert.ok(triage({cases: [component], generated: []}).failures.length);
  assert.ok(triage({cases: [component], generated: [generated, generated]}).failures.length);
  const second = {...component, type: "CatchBadge"};
  const stacked = triage({cases: [component, second], generated: [generated]});
  assert.equal(stacked.unregisteredAnnotationCount, 1);
  assert.equal(stacked.annotationCounts["component-mount"], 2);
  assert.deepEqual(stacked.failures, []);
  const screen = {...body, wrappers: ["ProviderScope"]};
  const screenResult = triage({
    cases: [screen],
    generated: [{...screen, path: "Feature/ExampleBody"}],
  });
  const dispositionPolicy = {
    schemaVersion: 1,
    rules: [{
      id: "provider-fixtures",
      owner: "test-owner",
      selector: {annotatedTypeExcludesPattern: "Screen$"},
      disposition: "keep-widgetbook",
      reason: "Keep deterministic provider edge states in the component catalog.",
    }],
  };
  const dispositioned = applyScreenScopeDispositions(
    screenResult,
    dispositionPolicy,
  );
  assert.equal(dispositioned.undispositionedScreenScopes, 0);
  assert.equal(dispositioned.screenScopeDispositionCounts["keep-widgetbook"], 1);
  assert.deepEqual(dispositioned.failures, []);
  const missingDisposition = applyScreenScopeDispositions(screenResult, {
    schemaVersion: 1,
    rules: [{
      ...dispositionPolicy.rules[0],
      selector: {annotatedTypePattern: "Screen$"},
    }],
  });
  assert.ok(missingDisposition.failures.length);
  console.log("Widgetbook triage probes passed (four classes, prototype marker/exclusion, screen dispositions, missing/duplicate registrations, stacked metadata).");
}

function main(args) {
  if (args.includes("--self-test")) return selfTest();
  if (args.includes("--help")) {
    console.log("Usage: node tool/design/classify_widgetbook_use_cases.mjs [--json|--check|--self-test]\nRuns the existing Dart analyzer as a syntax parser. Output is on demand; nothing is written to the repository.");
    return;
  }
  if (args.some((arg) => !["--json", "--check"].includes(arg))) throw Error("Unknown argument; use --help");
  const parsed = spawnSync("dart", ["run", "widgetbook/test/support/triage_inventory.dart"], {
    cwd: root, encoding: "utf8", maxBuffer: 32 * 1024 * 1024,
  });
  if (parsed.status !== 0) throw Error(parsed.stderr || parsed.error?.message || "Dart inventory failed");
  const routes = JSON.parse(fs.readFileSync(path.join(root, "tool/ui_capture/route_inventory.json"), "utf8"));
  const targets = new Set(routes.routes.map((route) => route.presentationTarget).filter(Boolean));
  const policy = JSON.parse(fs.readFileSync(dispositionPath, "utf8"));
  const result = applyScreenScopeDispositions(
    triage(JSON.parse(parsed.stdout), targets),
    policy,
  );
  if (args.includes("--json")) console.log(JSON.stringify(result, null, 2));
  else {
    console.log(`Registered Widgetbook cases: ${result.registeredCount}`);
    for (const name of classes) console.log(`${name}: ${result.counts[name]}`);
    console.log(`Unclassified: ${result.unclassified}; unclassified annotations: ${result.unclassifiedAnnotations}`);
    for (const name of dispositions) {
      console.log(`screen-scope ${name}: ${result.screenScopeDispositionCounts[name]}`);
    }
    console.log(`Undispositioned screen-scope cases: ${result.undispositionedScreenScopes}`);
    console.log(`Annotation occurrences: ${result.annotationCount}; stacked annotations not emitted by generator: ${result.unregisteredAnnotationCount} (included in --json)`);
    for (const failure of result.failures) console.error(failure);
  }
  if (result.failures.length) process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(process.argv.slice(2)); } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
