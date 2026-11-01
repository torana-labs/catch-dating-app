#!/usr/bin/env node
import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import fs from "node:fs";
import test from "node:test";
import {fileURLToPath} from "node:url";
import {
  buildDesignSyncManifest,
  compareFigmaProperties,
  expectedFigmaProperties,
  validateDesignSyncManifest,
} from "./build_design_sync_manifest.mjs";
import {
  buildCapturedClaudeDesignReceipt,
  buildClaudeDesignHandoffRequest,
} from "./claude_design_handoff.mjs";

const capabilities = {
  figma: {fileKey: null},
  codeConnect: {status: "blocked-plan-tier"},
};
const component = (id, figma = {}, codeConnect = {}) => ({
  id,
  dart: {symbol: id === "catch.badge" ? "CatchBadge" : "CatchField", file: `lib/${id}.dart`},
  governance: {conceptRole: "concept", conceptId: id},
  design: {
    figma: {status: "unmapped", componentName: id, componentUrl: null, ...figma},
    codeConnect: {status: "planned", template: null, ...codeConnect},
    claude: {handoffName: id, allowed: true},
  },
  contract: {props: [], states: [], members: [], tokens: []},
});

test("mappings carry each framework's implementation record", () => {
  const badge = {
    ...component("catch.badge"),
    react: {symbol: "BadgeControl", file: "packages/web-ui/src/primitives.tsx", api: "headless-control"},
  };
  const manifest = buildDesignSyncManifest({
    componentsDocument: {components: [badge, component("catch.field")]},
    capabilities,
  });
  const [badgeMapping, fieldMapping] = manifest.mappings;
  assert.equal(badgeMapping.dartSymbol, "CatchBadge");
  assert.equal(badgeMapping.reactSymbol, "BadgeControl");
  assert.equal(badgeMapping.reactFile, "packages/web-ui/src/primitives.tsx");
  assert.equal(badgeMapping.reactApi, "headless-control");
  assert.equal(fieldMapping.reactSymbol, null);
  assert.deepEqual(manifest.metrics.reactImplementationStates, {"headless-control": 1});
  assert.match(manifest.sourceOfTruth.behavior, /^Contracts in design\/components\/catch\.components\.json/u);
});

test("known-bad mapped entries without node URLs fail", () => {
  const manifest = buildDesignSyncManifest({
    componentsDocument: {components: [
      component("catch.badge", {status: "mapped", componentUrl: "https://figma.com/design/key/file"}),
      component("catch.field"),
    ]},
    capabilities,
  });
  assert.match(validateDesignSyncManifest(manifest).join("\n"), /node-specific URL/u);
});

test("live spike gate stays red when Figma and Code Connect are unavailable", () => {
  const manifest = buildDesignSyncManifest({
    componentsDocument: {components: [component("catch.badge"), component("catch.field")]},
    capabilities,
  });
  const failures = validateDesignSyncManifest(manifest, {requireLive: true}).join("\n");
  assert.match(failures, /catch\.badge: current live Figma mapping is required/u);
  assert.match(failures, /blocked by live account capability/u);
  assert.equal(manifest.operationalStatus.structural, "current");
  assert.equal(manifest.operationalStatus.live, "incomplete-external");
  assert.deepEqual(
    manifest.operationalStatus.blockers.map((blocker) => blocker.id),
    [
      "figma-file-unconfigured",
      "figma-spike-evidence-incomplete",
      "claude-design-receipt-incomplete",
      "code-connect-unavailable",
    ],
  );
});

test("snapshot names generate current mappings without hand-edited URLs", () => {
  const liveCapabilities = {
    figma: {fileKey: "file-key"},
    codeConnect: {status: "available"},
  };
  const componentsDocument = {
    components: [component("catch.badge"), component("catch.field")],
  };
  const manifest = buildDesignSyncManifest({
    componentsDocument,
    capabilities: liveCapabilities,
    figmaSnapshot: {
      status: "captured",
      source: {fileKey: "file-key"},
      components: [
        {nodeId: "1:2", name: "catch.badge", componentKey: "badge-key", propertyDefinitions: [], boundVariableCount: 0, boundVariableRefs: []},
        {nodeId: "1:3", name: "catch.field", componentKey: "field-key", propertyDefinitions: [], boundVariableCount: 0, boundVariableRefs: []},
      ],
      reviewSnapshots: [],
    },
  });
  assert.equal(manifest.metrics.figmaMappingStates.current, 2);
  assert.equal(manifest.mappings[0].figmaNodeId, "1:2");
  assert.match(manifest.mappings[0].figmaUrl, /node-id=1-2/u);
});

test("current MCP mappings remain distinct from unpublished library components", () => {
  const liveCapabilities = {
    figma: {fileKey: "file-key"},
    codeConnect: {status: "blocked-plan-tier"},
  };
  const componentsDocument = {
    components: [component("catch.badge"), component("catch.field")],
  };
  const manifest = buildDesignSyncManifest({
    componentsDocument,
    capabilities: liveCapabilities,
    figmaSnapshot: {
      status: "captured",
      source: {fileKey: "file-key", captureMethod: "figma-mcp"},
      components: [
        {nodeId: "1:2", name: "catch.badge", publishStatus: "UNPUBLISHED", propertyDefinitions: [], boundVariableCount: 1, boundVariableIds: ["VariableID:brand"]},
        {nodeId: "1:3", name: "catch.field", publishStatus: "UNPUBLISHED", propertyDefinitions: [], boundVariableCount: 1, boundVariableIds: ["VariableID:surface"]},
      ],
      reviewSnapshots: [
        {nodeId: "1:2", path: "badge.png", sha256: "a".repeat(64)},
        {nodeId: "1:3", path: "field.png", sha256: "b".repeat(64)},
      ],
    },
  });
  assert.equal(manifest.metrics.figmaMappingStates.current, 2);
  assert.equal(manifest.metrics.figmaPublishedMappings, 0);
  assert.equal(manifest.spike.status, "awaiting-figma-library-publication");
  assert.equal(
    manifest.operationalStatus.blockers[0]?.id,
    "figma-library-publication-incomplete",
  );
  assert.match(
    validateDesignSyncManifest(manifest, {requireLive: true}).join("\n"),
    /catch\.badge: published Figma component evidence is required/u,
  );
});

test("known-bad Figma property drift is deterministic", () => {
  const withProps = component("catch.badge");
  withProps.contract.props = [{
    name: "tone",
    type: "enum",
    default: "neutral",
    values: ["neutral", "danger"],
  }];
  withProps.contract.states = ["resting", "active"];
  const expected = expectedFigmaProperties(withProps);
  const drift = compareFigmaProperties(expected, [{
    name: "Tone#42",
    normalizedName: "tone",
    type: "BOOLEAN",
    variantOptions: [],
  }]).join("\n");
  assert.match(drift, /tone: expected VARIANT, found BOOLEAN/u);
  assert.match(drift, /tone: variant options differ/u);
  assert.match(drift, /missing Figma property reviewState/u);
});

test("explicit Figma projection keeps review states as evidence and supports optional instance swaps", () => {
  const projected = component("catch.badge");
  projected.contract.props = [
    {name: "label", type: "string"},
    {name: "icon", type: "object"},
    {name: "tone", type: "enum", values: ["neutral", "danger"]},
  ];
  projected.contract.states = ["metadata", "functional"];
  projected.design.figma.propertyProjection = {
    mode: "explicit",
    reviewStates: "evidence",
    properties: [
      {name: "Label", type: "TEXT", defaultValue: "Badge", sourceProps: ["label"]},
      {name: "Show Icon", type: "BOOLEAN", defaultValue: false, sourceProps: ["icon"]},
      {name: "Icon", type: "INSTANCE_SWAP", defaultValue: null, sourceProps: ["icon"]},
      {
        name: "Tone",
        type: "VARIANT",
        defaultValue: "Neutral",
        variantOptions: ["Neutral", "Danger"],
        sourceProps: ["tone"],
      },
    ],
  };
  const expected = expectedFigmaProperties(projected);
  assert.equal(expected.length, 4);
  assert.equal(expected.some((property) => property.normalizedName === "review_state"), false);
  assert.equal(
    expected.find((property) => property.normalizedName === "icon")?.type,
    "INSTANCE_SWAP",
  );
  assert.equal(
    expected.find((property) => property.normalizedName === "show_icon")?.type,
    "BOOLEAN",
  );
});

test("explicit Figma projection rejects unknown source props", () => {
  const projected = component("catch.field");
  projected.design.figma.propertyProjection = {
    mode: "explicit",
    reviewStates: "evidence",
    properties: [
      {name: "Title", type: "TEXT", defaultValue: "Title", sourceProps: ["missing"]},
    ],
  };
  assert.throws(
    () => expectedFigmaProperties(projected),
    /Figma property Title references unknown source prop missing/u,
  );
});

test("known-bad stale Claude handoff request fails", () => {
  const componentsDocument = {
    components: [component("catch.badge"), component("catch.field")],
  };
  const manifest = buildDesignSyncManifest({
    componentsDocument,
    capabilities,
    claudeHandoffRequest: buildClaudeDesignHandoffRequest({
      components: [component("catch.badge"), component("catch.field"), component("catch.other")],
    }),
  });
  assert.match(validateDesignSyncManifest(manifest).join("\n"), /handoff request is stale/u);
});

test("the Claude handoff request prints from the contract and names files that exist", () => {
  const repoRoot = fileURLToPath(new URL("../../", import.meta.url));
  const result = spawnSync(process.execPath, ["tool/design/build_design_sync_manifest.mjs", "--claude-handoff"],
    {cwd: repoRoot, encoding: "utf8"});
  assert.equal(result.status, 0, result.stderr);
  const request = JSON.parse(result.stdout);
  const contract = JSON.parse(fs.readFileSync(`${repoRoot}/design/components/catch.components.json`, "utf8"));
  assert.deepEqual(request, buildClaudeDesignHandoffRequest(contract));
  assert.deepEqual(request.components.map((entry) => entry.contractId), ["catch.badge", "catch.field"]);
  for (const file of Object.values(request.contextFiles)) assert.ok(fs.existsSync(`${repoRoot}/${file}`), file);
});

test("known-bad Claude Design state receipt fails", () => {
  const componentsDocument = {
    components: [component("catch.badge"), component("catch.field")],
  };
  componentsDocument.components[0].contract.states = ["resting", "active"];
  const request = buildClaudeDesignHandoffRequest(componentsDocument);
  const receipt = buildCapturedClaudeDesignReceipt(request, {
    capturedAt: "2026-07-18T00:00:00Z",
    proposalRef: "claude-design://known-bad-state",
  });
  receipt.components[0].supportedStatesDigest = "stale";
  const manifest = buildDesignSyncManifest({
    componentsDocument,
    capabilities,
    claudeHandoffRequest: request,
    claudeDesignReceipt: receipt,
  });
  assert.equal(manifest.claudeDesign.receiptStatus, "stale");
  assert.match(
    validateDesignSyncManifest(manifest).join("\n"),
    /catch\.badge: Claude Design supported states are stale/u,
  );
});

test("require-live rejects missing visual proof and unpublished templates", () => {
  const liveCapabilities = {
    figma: {fileKey: "file-key"},
    codeConnect: {status: "available"},
  };
  const componentsDocument = {
    components: [component("catch.badge"), component("catch.field")],
  };
  const manifest = buildDesignSyncManifest({
    componentsDocument,
    capabilities: liveCapabilities,
    figmaSnapshot: {
      status: "captured",
      source: {fileKey: "file-key"},
      components: [
        {nodeId: "1:2", name: "catch.badge", propertyDefinitions: [], boundVariableCount: 0, boundVariableRefs: []},
        {nodeId: "1:3", name: "catch.field", propertyDefinitions: [], boundVariableCount: 0, boundVariableRefs: []},
      ],
      reviewSnapshots: [],
    },
  });
  const failures = validateDesignSyncManifest(manifest, {requireLive: true}).join("\n");
  assert.match(failures, /catch\.badge: variable-bound Figma evidence is required/u);
  assert.match(failures, /catch\.field: review snapshot evidence is required/u);
  assert.match(failures, /catch\.badge: published Code Connect mapping is required/u);
});

test("fully evidenced Badge and Field spike passes the live gate", () => {
  const liveCapabilities = {
    figma: {fileKey: "file-key"},
    codeConnect: {status: "available"},
  };
  const componentsDocument = {
    components: [
      component("catch.badge", {}, {status: "mapped", template: "design/code_connect/CatchBadge.figma.ts"}),
      component("catch.field", {}, {status: "mapped", template: "design/code_connect/CatchField.figma.ts"}),
    ],
  };
  const claudeHandoffRequest = buildClaudeDesignHandoffRequest(componentsDocument);
  const manifest = buildDesignSyncManifest({
    componentsDocument,
    capabilities: liveCapabilities,
    claudeHandoffRequest,
    claudeDesignReceipt: buildCapturedClaudeDesignReceipt(claudeHandoffRequest, {
      capturedAt: "2026-07-18T00:00:00Z",
      proposalRef: "claude-design://badge-field-spike",
    }),
    figmaSnapshot: {
      status: "captured",
      source: {fileKey: "file-key"},
      components: [
        {nodeId: "1:2", name: "catch.badge", publishStatus: "CURRENT", propertyDefinitions: [], boundVariableCount: 1, boundVariableRefs: [{nodeId: "1:4", field: "fills", variableIds: ["VariableID:brand"]}]},
        {nodeId: "1:3", name: "catch.field", publishStatus: "CURRENT", propertyDefinitions: [], boundVariableCount: 1, boundVariableRefs: [{nodeId: "1:5", field: "fills", variableIds: ["VariableID:surface"]}]},
      ],
      reviewSnapshots: [
        {nodeId: "1:2", path: "badge.png", sha256: "a".repeat(64)},
        {nodeId: "1:3", path: "field.png", sha256: "b".repeat(64)},
      ],
    },
  });
  assert.deepEqual(validateDesignSyncManifest(manifest, {requireLive: true}), []);
  assert.equal(manifest.spike.status, "figma-claude-round-trip-ready");
  assert.equal(manifest.operationalStatus.live, "ready");
});

test("real Badge and Field contract projection round-trips and fails on one removed property", () => {
  const realDocument = JSON.parse(fs.readFileSync(
    new URL("../../design/components/catch.components.json", import.meta.url),
    "utf8",
  ));
  for (const item of realDocument.components) {
    if (!["catch.badge", "catch.field"].includes(item.id)) continue;
    item.design.codeConnect = {
      ...item.design.codeConnect,
      status: "mapped",
      template: `design/code_connect/${item.dart.symbol}.figma.ts`,
    };
  }
  const spikeComponents = realDocument.components
    .filter((item) => ["catch.badge", "catch.field"].includes(item.id));
  const snapshot = {
    status: "captured",
    source: {fileKey: "file-key"},
    components: spikeComponents.map((item, index) => ({
      nodeId: `1:${index + 2}`,
      name: item.design.figma.componentName,
      publishStatus: "CURRENT",
      propertyDefinitions: expectedFigmaProperties(item),
      boundVariableCount: 1,
      boundVariableRefs: [{
        nodeId: `2:${index + 2}`,
        field: "fills",
        variableIds: [`VariableID:${item.id}`],
      }],
    })),
    reviewSnapshots: spikeComponents.map((item, index) => ({
      nodeId: `1:${index + 2}`,
      path: `${item.id}.png`,
      sha256: String(index + 1).repeat(64),
    })),
  };
  const liveCapabilities = {
    figma: {fileKey: "file-key"},
    codeConnect: {status: "available"},
  };
  const claudeHandoffRequest = buildClaudeDesignHandoffRequest(realDocument);
  const claudeDesignReceipt = buildCapturedClaudeDesignReceipt(claudeHandoffRequest, {
    capturedAt: "2026-07-18T00:00:00Z",
    proposalRef: "claude-design://real-contract-round-trip",
  });
  const manifest = buildDesignSyncManifest({
    componentsDocument: realDocument,
    capabilities: liveCapabilities,
    figmaSnapshot: snapshot,
    claudeHandoffRequest,
    claudeDesignReceipt,
  });
  assert.deepEqual(validateDesignSyncManifest(manifest, {requireLive: true}), []);
  assert.equal(manifest.metrics.figmaMappingStates.current, 2);
  assert.equal(
    manifest.mappings.find((entry) => entry.contractId === "catch.badge")
      ?.figmaExpectedPropertyCount,
    5,
  );
  assert.equal(
    manifest.mappings.find((entry) => entry.contractId === "catch.field")
      ?.figmaExpectedPropertyCount,
    11,
  );
  assert.equal(
    manifest.mappings.find((entry) => entry.contractId === "catch.field")
      ?.figmaReviewStatePolicy,
    "evidence",
  );

  const knownBadSnapshot = structuredClone(snapshot);
  knownBadSnapshot.components[0].propertyDefinitions =
    knownBadSnapshot.components[0].propertyDefinitions
      .filter((property) => property.normalizedName !== "show_icon");
  const knownBad = buildDesignSyncManifest({
    componentsDocument: realDocument,
    capabilities: liveCapabilities,
    figmaSnapshot: knownBadSnapshot,
    claudeHandoffRequest,
    claudeDesignReceipt,
  });
  const badge = knownBad.mappings.find((entry) => entry.contractId === "catch.badge");
  assert.equal(badge.figmaStatus, "stale");
  assert.match(badge.figmaDrift.join("\n"), /missing Figma property Show Icon/u);
  assert.match(
    validateDesignSyncManifest(knownBad, {requireLive: true}).join("\n"),
    /catch\.badge: current live Figma mapping is required/u,
  );
});
