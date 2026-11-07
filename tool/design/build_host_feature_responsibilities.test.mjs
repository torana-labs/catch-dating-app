import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {execFileSync} from "node:child_process";

import {
  findStaleHostFeatureOutputs,
  resolveHostFeatureGuide,
  renderHostFeatureGuide,
  readJsonPointer,
  hostFeatureExplanation,
  hostDocumentationImpact,
  parseHostDocumentationArgs,
  readDocumentationComparison,
  HostFeatureResponsibilityError,
  parseDartRoutes,
  renderHostFeatureReadme,
  validateAndResolveHostFeatureResponsibilities,
} from "./build_host_feature_responsibilities.mjs";

const ids = ["today", "events", "audience", "inbox", "organizer"];
const destinations = [
  "hostToday",
  "hostEvents",
  "hostPeople",
  "hostPeople",
  "hostOrganizer",
];
const routeIds = [
  "hostTodayScreen",
  "hostEventsScreen",
  "hostAudienceScreen",
  "hostInboxScreen",
  "hostOrganizerScreen",
];

function fixture() {
  const existing = new Set(["lib/shared.dart"]);
  const sourceByPath = new Map();
  const routes = new Map([
    [
      "hostSharedScreen",
      {id: "hostSharedScreen", path: "/host/shared", audience: "host"},
    ],
  ]);
  const features = ids.map((id, index) => {
    const symbol = `${id[0].toUpperCase()}${id.slice(1)}Screen`;
    const ownerFile = `lib/${id}.dart`;
    const dataContract = `contracts/${id}.json`;
    const testFile = `test/${id}.dart`;
    const currentRoot = index < 2 ? `lib/hosts/${id}` : `lib/legacy/${id}`;
    for (const repoPath of [ownerFile, dataContract, testFile, currentRoot]) {
      existing.add(repoPath);
    }
    sourceByPath.set(ownerFile, `class ${symbol} {}`);
    routes.set(routeIds[index], {
      id: routeIds[index],
      path: `/host/${id}`,
      audience: "host",
    });
    return {
      id,
      destination: destinations[index],
      primaryRouteId: routeIds[index],
      ownedRouteIds: [routeIds[index]],
      handoffRouteIds: ["hostSharedScreen"],
      targetRoot: `lib/hosts/${id}`,
      migrationStatus: index < 2
        ? "verticalSlice"
        : "targetDefinedLegacyImplementation",
      purpose: `${id} purpose.`,
      responsibilities: [`Own ${id}.`],
      doesNotOwn: [`Exclude non-${id}.`],
      currentRoots: [currentRoot],
      additionalCodeOwners: [
        {id: "screen", file: ownerFile, symbol, role: "Actions: open."},
      ],
      additionalDataContracts: [dataContract],
      sharedDependencies: [
        {path: "lib/shared.dart", reason: "Shared fixture dependency."},
      ],
      testFiles: [testFile],
    };
  });
  return {
    contract: {
      updated: "2026-09-01",
      features,
    },
    shellManifest: {
      primaryRoutes: ids
        .map((id, index) => ({
          destination: destinations[index],
          routeId: routeIds[index],
          path: `/host/${id}`,
          label: `${id[0].toUpperCase()}${id.slice(1)}`,
          ...(id === "audience" ? {otherIndexRouteIds: [routeIds[3]]} : {}),
        }))
        .filter((_, index) => index !== 3),
    },
    routes,
    pathExists: (repoPath) => existing.has(repoPath),
    readText: (repoPath) => sourceByPath.get(repoPath) ?? "",
  };
}

test("accepts exactly five ordered Host feature owners and renders local docs", () => {
  const input = fixture();
  const resolved = validateAndResolveHostFeatureResponsibilities(input);
  assert.deepEqual(resolved.map((feature) => feature.id), ids);
  assert.match(
    renderHostFeatureReadme({contract: input.contract, feature: resolved[0]}),
    /# Host Today[\s\S]+This feature owns[\s\S]+TodayScreen/u,
  );
});

test("rejects route ownership, action-owner, and symbol drift", () => {
  const input = fixture();
  input.contract.features[1].ownedRouteIds = [routeIds[0], routeIds[1]];
  input.contract.features[2].additionalCodeOwners[0].file = "lib/missing_owner.dart";
  input.readText = () => "class WrongSymbol {}";
  assert.throws(
    () => validateAndResolveHostFeatureResponsibilities(input),
    (error) =>
      error instanceof HostFeatureResponsibilityError &&
      error.errors.some((message) => message.includes("already owned")) &&
      error.errors.some((message) => message.includes("missing_owner")) &&
      error.errors.some((message) => message.includes("symbol")),
  );
});

test("detects stale generated responsibility docs", () => {
  const outputs = [
    {path: "/tmp/today.md", content: "today\n"},
    {path: "/tmp/events.md", content: "events\n"},
  ];
  assert.deepEqual(
    findStaleHostFeatureOutputs({
      outputs,
      readCurrent: (outputPath) =>
        outputPath.endsWith("today.md") ? "today\n" : "old\n",
    }),
    ["/tmp/events.md"],
  );
});

test("parses single-line and wrapped Host route declarations", () => {
  const routes = parseDartRoutes(`enum Routes {
    hostTodayScreen('/host/today', AppRouteAudience.host),
    hostEventsScreen(
      '/host/events',
      AppRouteAudience.host,
    ),
    dashboardScreen('/', AppRouteAudience.consumer),
  }`);
  assert.deepEqual(routes.get("hostTodayScreen"), {
    id: "hostTodayScreen",
    path: "/host/today",
    audience: "host",
  });
  assert.equal(routes.get("hostEventsScreen")?.path, "/host/events");
  assert.equal(routes.get("dashboardScreen")?.audience, "consumer");
});

function guideFixture() {
  const feature = {
    id: "audience", targetRoot: "lib/hosts/audience", guide: {
      updated: "2026-09-05",
      sections: [{id: "membership", question: "Who belongs to an audience?",
        aliases: ["membership"], answer: "Membership is evaluated on the server.",
        sourcePaths: ["functions/src/membership.ts", "lib/hosts/people"],
        examples: [{path: "functions/src/membership.test.ts", testName: "rejects stale members"}]}],
      facts: [{id: "limit", label: "Maximum rules", path: "contracts/audience.json", pointer: "/maximum"}],
    },
  };
  const files = new Map([
    ["functions/src/membership.ts", "export function evaluate() {}"],
    ["lib/hosts/people", ""],
    ["functions/src/membership.test.ts", 'test("rejects stale members", () => {});'],
    ["contracts/audience.json", '{"maximum":8}'],
  ]);
  return {feature, files, pathExists: (name) => files.has(name), readText: (name) => files.get(name)};
}

test("guide schema facts are derived and a changed input invalidates generated text", () => {
  const input = guideFixture();
  const errors = [];
  const first = resolveHostFeatureGuide({...input, errors});
  assert.deepEqual(errors, []);
  assert.equal(first.facts[0].value, 8);
  const content = renderHostFeatureGuide({...input.feature, guide: first}).join("\n");
  input.files.set("contracts/audience.json", '{"maximum":4}');
  const changed = renderHostFeatureGuide({...input.feature,
    guide: resolveHostFeatureGuide({...input, errors})}).join("\n");
  assert.deepEqual(findStaleHostFeatureOutputs({
    outputs: [{path: "lib/hosts/audience/README.md", content: changed}],
    readCurrent: () => content,
  }), ["lib/hosts/audience/README.md"]);
  assert.match(changed, /Maximum rules \| `4`/u);
});

test("guide rejects missing sources, removed named examples, and broken JSON pointers", () => {
  const input = guideFixture();
  input.files.delete("functions/src/membership.ts");
  input.files.set("functions/src/membership.test.ts", 'test("different behavior", () => {});');
  input.files.set("contracts/audience.json", '{"renamedMaximum":8}');
  const errors = [];
  resolveHostFeatureGuide({...input, errors});
  assert.equal(errors.length, 3);
  assert.ok(errors.some((message) => message.includes("missing guide source")));
  assert.ok(errors.some((message) => message.includes("missing named example")));
  assert.ok(errors.some((message) => message.includes("Missing JSON pointer")));
});

test("guide rejects ambiguous retrieval identities and repository path traversal", () => {
  const input = guideFixture();
  input.feature.guide.sections.push(structuredClone(input.feature.guide.sections[0]));
  input.feature.guide.sections[0].sourcePaths = ["lib/../../outside"];
  const errors = [];
  resolveHostFeatureGuide({...input, errors});
  assert.ok(errors.some((message) => message.includes("duplicate guide section")));
  assert.ok(errors.some((message) => message.includes("duplicate guide question")));
  assert.ok(errors.some((message) => message.includes("invalid guide path")));
});

test("JSON pointers support escaped keys and reject missing or structured facts", () => {
  assert.equal(readJsonPointer({"a/b": {"~limit": 3}}, "/a~1b/~0limit"), 3);
  assert.throws(() => readJsonPointer({a: {limit: 3}}, "/a"), /scalar/u);
  assert.throws(() => readJsonPointer({}, "/missing"), /Missing/u);
  assert.throws(() => readJsonPointer({}, "/bad~2escape"), /Invalid/u);
});

test("question retrieval returns the relevant answer without the full feature inventory", () => {
  const {feature} = guideFixture();
  const answer = hostFeatureExplanation(feature, "MEMBERSHIP");
  assert.equal(answer.guide.sections.length, 1);
  assert.deepEqual(answer.guide.facts, []);
  assert.equal(answer.document, "lib/hosts/audience/README.md");
  assert.equal(answer.codeOwners, undefined);
  assert.throws(() => hostFeatureExplanation(feature, "payouts"), /No documented question/u);
});

test("membership changes flag their answer while unrelated or prefix-collision paths do not", () => {
  const {feature} = guideFixture();
  const changedPaths = ["functions/src/membership.ts", "lib/hosts/people/new.dart"];
  const report = hostDocumentationImpact({feature, previousFeature: feature, changedPaths});
  assert.equal(report.advisory, true);
  assert.equal(report.sections[0].anchor, "lib/hosts/audience/README.md#membership");
  assert.deepEqual(report.sections[0].changedSources, changedPaths);
  assert.equal(report.sections[0].explanationChanged, false);
  assert.deepEqual(hostDocumentationImpact({feature, previousFeature: feature,
    changedPaths: ["lib/hosts/peoples/new.dart", "functions/src/unrelated.ts"]}).sections, []);
});

test("impact retains old dependency edges and removed sections without opening deleted files", () => {
  const {feature} = guideFixture();
  const previousFeature = structuredClone(feature);
  feature.guide.sections[0].sourcePaths = ["functions/src/new_membership.ts"];
  let report = hostDocumentationImpact({feature, previousFeature,
    changedPaths: ["functions/src/membership.ts"]});
  assert.deepEqual(report.sections[0].changedSources, ["functions/src/membership.ts"]);
  feature.guide.sections = [];
  report = hostDocumentationImpact({feature, previousFeature,
    changedPaths: ["functions/src/membership.ts"]});
  assert.equal(report.sections[0].status, "removed");
  assert.deepEqual(report.sections[0].changedSources, ["functions/src/membership.ts"]);
  delete feature.guide;
  assert.equal(hostDocumentationImpact({feature, previousFeature,
    changedPaths: []}).sections[0].status, "removed");
});

test("schema-only changes request reference generation without inventing prose impact", () => {
  const {feature} = guideFixture();
  const report = hostDocumentationImpact({feature, previousFeature: feature,
    changedPaths: ["contracts/audience.json"]});
  assert.deepEqual(report.sections, []);
  assert.deepEqual(report.changedReferenceSources, ["contracts/audience.json"]);
  assert.equal(report.referenceDefinitionChanged, false);
});

test("read-only CLI modes reject incomplete and incompatible arguments", () => {
  assert.throws(() => parseHostDocumentationArgs(["--affected", "audience"]), /together/u);
  assert.throws(() => parseHostDocumentationArgs(["--check", "--explain", "audience"]), /one/u);
  assert.throws(() => parseHostDocumentationArgs(["--question", "membership"]), /requires/u);
  assert.throws(() => parseHostDocumentationArgs(["--json"]), /requires/u);
  assert.throws(() => parseHostDocumentationArgs(["--explain", ""]), /empty/u);
  assert.throws(() => parseHostDocumentationArgs(["--affected", " "]), /empty/u);
  assert.equal(parseHostDocumentationArgs(["--affected", "audience", "--base", "HEAD"]).base, "HEAD");
});

test("Git comparison includes deletions, staged renames, untracked additions, and both dependency versions", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "audience-doc-impact-"));
  const git = (...args) => execFileSync("git", args, {cwd: root, stdio: "pipe"});
  try {
    git("init", "--quiet");
    git("config", "user.name", "Documentation test");
    git("config", "user.email", "test@example.invalid");
    fs.mkdirSync(path.join(root, "design/features"), {recursive: true});
    fs.mkdirSync(path.join(root, "functions/src"), {recursive: true});
    const {feature} = guideFixture();
    fs.writeFileSync(path.join(root, "design/features/host_feature_responsibilities.json"),
      JSON.stringify({features: [feature]}));
    fs.writeFileSync(path.join(root, "functions/src/membership.ts"), "original");
    fs.writeFileSync(path.join(root, "functions/src/deleted.ts"), "original");
    fs.writeFileSync(path.join(root, ".gitignore"), "ignored/\n");
    git("add", ".");
    git("-c", "core.hooksPath=/dev/null", "-c", "commit.gpgsign=false", "commit", "--quiet", "-m", "fixture");
    git("mv", "functions/src/membership.ts", "functions/src/renamed.ts");
    fs.unlinkSync(path.join(root, "functions/src/deleted.ts"));
    fs.writeFileSync(path.join(root, "functions/src/added.ts"), "new");
    fs.mkdirSync(path.join(root, "ignored"));
    fs.writeFileSync(path.join(root, "ignored/cache"), "cache");
    const comparison = readDocumentationComparison("HEAD", root);
    assert.deepEqual(comparison.changedPaths, ["functions/src/added.ts", "functions/src/deleted.ts",
      "functions/src/membership.ts", "functions/src/renamed.ts"]);
    assert.equal(comparison.previousContract.features[0].guide.sections[0].id, "membership");
    assert.match(comparison.base, /^[a-f0-9]{40}$/u);
    const report = hostDocumentationImpact({feature,
      previousFeature: comparison.previousContract.features[0], changedPaths: comparison.changedPaths});
    assert.deepEqual(report.sections[0].changedSources, ["functions/src/membership.ts"]);
    assert.throws(() => readDocumentationComparison("missing-ref", root));
  } finally {
    fs.rmSync(root, {recursive: true, force: true});
  }
});

test("Audience retains answers to the recurring product questions", () => {
  const contract = JSON.parse(fs.readFileSync(new URL(
    "../../design/features/host_feature_responsibilities.json", import.meta.url), "utf8"));
  const feature = contract.features.find((item) => item.id === "audience");
  for (const question of ["overview", "people", "membership", "preview", "intake", "delivery"]) {
    const result = hostFeatureExplanation(feature, question);
    assert.ok(result.guide.sections.some((section) => section.id === question && section.answer.trim()));
  }
});

test("CI impact reporting runs with only the Node planner closure and Git history", () => {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "audience-doc-closure-")));
  const git = (...args) => execFileSync("git", args, {cwd: root, stdio: "pipe"});
  try {
    for (const folder of ["tool/design", "tool/lib", "design/features"]) {
      fs.mkdirSync(path.join(root, folder), {recursive: true});
    }
    for (const file of ["build_host_feature_responsibilities.mjs", "../lib/repo_paths.mjs"]) {
      fs.copyFileSync(new URL(file, import.meta.url), path.join(root, "tool/design", file));
    }
    const {feature} = guideFixture();
    fs.writeFileSync(path.join(root, "design/features/host_feature_responsibilities.json"),
      JSON.stringify({features: [feature]}));
    git("init", "--quiet");
    git("config", "user.name", "Documentation test");
    git("config", "user.email", "test@example.invalid");
    git("add", ".");
    git("-c", "core.hooksPath=/dev/null", "-c", "commit.gpgsign=false", "commit", "--quiet", "-m", "fixture");
    const report = JSON.parse(execFileSync(process.execPath, [
      path.join(root, "tool/design/build_host_feature_responsibilities.mjs"),
      "--affected", "audience", "--base", "HEAD", "--json",
    ], {cwd: root, encoding: "utf8"}));
    assert.equal(report.advisory, true);
    assert.deepEqual(report.sections, []);
    assert.deepEqual(report.changedReferenceSources, []);
  } finally {
    fs.rmSync(root, {recursive: true, force: true});
  }
});
