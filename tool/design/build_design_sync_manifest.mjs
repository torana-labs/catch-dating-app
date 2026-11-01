#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {conceptMetrics} from "./component_concepts.mjs";
import {
  buildClaudeDesignHandoffRequest,
  claudeDesignReceiptState,
  validateClaudeDesignReceipt,
} from "./claude_design_handoff.mjs";
import {fromRepo, relativeToRepo} from "../lib/repo_paths.mjs";

const outputPath = fromRepo("design/sync/catch.design-sync.json");
const componentPath = fromRepo("design/components/catch.components.json");
const capabilityPath = fromRepo("design/sync/live_capabilities.json");
const figmaSnapshotPath = fromRepo("design/sync/figma_library_snapshot.json");
const claudeReceiptPath = fromRepo("design/sync/claude_design_receipt.json");

export function buildDesignSyncManifest({
  componentsDocument,
  capabilities,
  figmaSnapshot = unavailableFigmaSnapshot(),
  claudeHandoffRequest = buildClaudeDesignHandoffRequest(componentsDocument),
  claudeDesignReceipt = unavailableClaudeDesignReceipt(),
}) {
  const components = componentsDocument.components ?? [];
  const metrics = conceptMetrics(components);
  const figmaByName = groupBy(figmaSnapshot.components ?? [], (entry) => entry.name);
  const reviewSnapshotByNodeId = new Map(
    (figmaSnapshot.reviewSnapshots ?? []).map((entry) => [entry.nodeId, entry]),
  );
  const mappings = components.map((component) => buildMapping({
    component,
    capabilities,
    figmaSnapshot,
    figmaMatches: figmaByName.get(component.design?.figma?.componentName) ?? [],
    reviewSnapshotByNodeId,
  }));
  const mappingStates = countBy(mappings, (entry) => entry.figmaStatus);
  const codeConnectStates = countBy(mappings, (entry) => entry.codeConnectStatus ?? "missing");
  const sourceDigest = digest(componentsDocument);
  const claudeHandoffRequestStatus = claudeHandoffRequest?.sourceDigest === sourceDigest
    ? "current"
    : "stale";
  const claudeReceiptProblems = validateClaudeDesignReceipt(
    claudeHandoffRequest,
    claudeDesignReceipt,
  );
  const claudeReceiptStatus = claudeDesignReceiptState(
    claudeHandoffRequest,
    claudeDesignReceipt,
  );
  const spikeIds = ["catch.badge", "catch.field"];
  const spikeMappings = spikeIds.map((id) => mappings.find((entry) => entry.contractId === id));
  const spikeFigmaReady = spikeMappings.every((entry) =>
    entry?.figmaStatus === "current" &&
    entry.figmaVariableBindingCount > 0 &&
    entry.figmaReviewSnapshot !== null);
  const spikeFigmaPublished = spikeMappings.every((entry) =>
    entry?.figmaPublishStatus === "CURRENT");
  const spikeStatus = !capabilities.figma.fileKey
    ? "awaiting-figma-file-approval"
    : !spikeFigmaReady
      ? "awaiting-figma-evidence"
      : !spikeFigmaPublished
        ? "awaiting-figma-library-publication"
        : claudeReceiptStatus !== "current"
          ? "awaiting-claude-design-receipt"
          : "figma-claude-round-trip-ready";
  const liveBlockers = [];
  if (!capabilities.figma.fileKey) {
    liveBlockers.push({
      id: "figma-file-unconfigured",
      owner: "design-system-owner",
      detail: "No approved Figma file key has been captured in live_capabilities.json.",
    });
  }
  if (!spikeFigmaReady) {
    liveBlockers.push({
      id: "figma-spike-evidence-incomplete",
      owner: "design-system-owner",
      detail: "Badge and Field do not yet have current variable-bound component and review-snapshot evidence.",
    });
  }
  if (spikeFigmaReady && !spikeFigmaPublished) {
    liveBlockers.push({
      id: "figma-library-publication-incomplete",
      owner: "design-system-owner",
      detail: "Badge and Field are mapped with current review and variable evidence, but their Figma publish status is not CURRENT.",
    });
  }
  if (claudeReceiptStatus !== "current") {
    liveBlockers.push({
      id: "claude-design-receipt-incomplete",
      owner: "design-system-owner",
      detail: `The Claude Design receipt is ${claudeReceiptStatus}.`,
    });
  }
  if (capabilities.codeConnect.status !== "available") {
    liveBlockers.push({
      id: "code-connect-unavailable",
      owner: "account-owner",
      detail: `Code Connect is ${capabilities.codeConnect.status}.`,
    });
  }

  return {
    version: 4,
    updated: new Date().toISOString().slice(0, 10),
    sourceOfTruth: {
      behavior: "Contracts in design/components/catch.components.json; Flutter is the reference implementation",
      componentContracts: "design/components/catch.components.json",
      tokens: "design/tokens/catch.tokens.json",
      figmaSnapshot: "design/sync/figma_library_snapshot.json",
      figmaSnapshotImporter: "tool/design/import_figma_library_snapshot.mjs",
      claudeHandoffRequest: "node tool/design/build_design_sync_manifest.mjs --claude-handoff",
      claudeDesignReceipt: "design/sync/claude_design_receipt.json",
      liveCapabilities: "design/sync/live_capabilities.json",
      generator: "tool/design/build_design_sync_manifest.mjs",
    },
    sourceDigest,
    operationalStatus: {
      structural: "current",
      live: liveBlockers.length === 0 ? "ready" : "incomplete-external",
      liveScope: spikeIds,
      blockers: liveBlockers,
    },
    claudeDesign: {
      handoffRequestStatus: claudeHandoffRequestStatus,
      handoffRequestDigest: digest(claudeHandoffRequest),
      receiptStatus: claudeReceiptStatus,
      receiptCapturedAt: claudeDesignReceipt.capturedAt ?? null,
      receiptProposalRef: claudeDesignReceipt.proposalRef ?? null,
      receiptProblems: claudeReceiptProblems,
    },
    figmaSnapshot: {
      status: figmaSnapshot.status,
      capturedAt: figmaSnapshot.capturedAt ?? null,
      captureMethod: figmaSnapshot.source?.captureMethod ?? null,
      fileKey: figmaSnapshot.source?.fileKey ?? null,
      fileVersion: figmaSnapshot.source?.fileVersion ?? null,
      versionHistoryId: figmaSnapshot.source?.versionHistoryId ?? null,
      digest: figmaSnapshot.snapshotDigest ?? null,
      componentCount: figmaSnapshot.components?.length ?? 0,
      reviewSnapshotCount: figmaSnapshot.reviewSnapshots?.length ?? 0,
    },
    capabilities,
    metrics: {
      ...metrics,
      figmaMappingStates: mappingStates,
      figmaPropertyDriftCount: mappings.reduce((sum, entry) => sum + entry.figmaDrift.length, 0),
      figmaVariableBoundMappings: mappings.filter((entry) => entry.figmaVariableBindingCount > 0).length,
      figmaReviewSnapshotMappings: mappings.filter((entry) => entry.figmaReviewSnapshot !== null).length,
      figmaPublishedMappings: mappings.filter((entry) => entry.figmaPublishStatus === "CURRENT").length,
      codeConnectMappingStates: codeConnectStates,
      claudeAllowed: mappings.filter((entry) => entry.claudeAllowed).length,
      reactImplementationStates: countBy(
        mappings.filter((entry) => entry.reactApi !== null),
        (entry) => entry.reactApi,
      ),
      claudeDesignReceiptState: claudeReceiptStatus,
      figmaMappedConcepts: mappings.filter(
        (entry) => entry.conceptRole === "concept" && entry.figmaStatus === "current",
      ).length,
    },
    spike: {
      componentIds: spikeIds,
      purpose: "Prove code-to-Figma identity, state coverage, Claude handoff, and drift detection before scaling.",
      status: spikeStatus,
      codeConnectStatus: capabilities.codeConnect.status,
      acceptance: [
        "Figma component exists with variable-bound states",
        "a Figma MCP discovery receipt or hydrated LIBRARY_PUBLISH webhook is normalized without hand editing",
        "registry componentName resolves to exactly one captured component node",
        "Figma property definitions match the generated design projection; governed review states remain evidence unless the projection explicitly makes them variants",
        "the live gate requires Figma publish status CURRENT in addition to a current mapping",
        "Claude Design returns a current receipt for the same concept ids and supported-state digests",
        "Code Connect is mapped only when the account tier supports publication",
        "a deliberately stale or incomplete mapping fails the gate",
      ],
    },
    mappings,
  };
}

export function validateDesignSyncManifest(manifest, {requireLive = false} = {}) {
  const problems = [];
  const ids = new Set();
  if (manifest.claudeDesign?.handoffRequestStatus !== "current") {
    problems.push("Claude Design handoff request is stale");
  }
  if ((manifest.claudeDesign?.receiptProblems ?? []).length > 0) {
    problems.push(...manifest.claudeDesign.receiptProblems);
  }
  for (const entry of manifest.mappings ?? []) {
    if (ids.has(entry.contractId)) problems.push(`${entry.contractId}: duplicate mapping`);
    ids.add(entry.contractId);
    if (
      entry.figmaDeclaredStatus === "mapped" &&
      (!entry.figmaDeclaredUrl || !nodeIdFromUrl(entry.figmaDeclaredUrl))
    ) {
      problems.push(`${entry.contractId}: mapped Figma entry requires a node-specific URL`);
    }
    if (entry.figmaStatus === "current" && (!entry.figmaUrl || !entry.figmaNodeId)) {
      problems.push(`${entry.contractId}: current Figma mapping requires a generated node URL`);
    }
    if (entry.codeConnectStatus === "mapped" && !entry.codeConnectTemplate) {
      problems.push(`${entry.contractId}: mapped Code Connect entry requires a template`);
    }
    if (!entry.contractDigest) problems.push(`${entry.contractId}: missing contract digest`);
  }
  for (const spikeId of manifest.spike?.componentIds ?? []) {
    const entry = (manifest.mappings ?? []).find((mapping) => mapping.contractId === spikeId);
    if (!entry) problems.push(`${spikeId}: missing spike mapping`);
    if (requireLive && entry?.figmaStatus !== "current") {
      problems.push(`${spikeId}: current live Figma mapping is required`);
    }
    if (requireLive && !(entry?.figmaVariableBindingCount > 0)) {
      problems.push(`${spikeId}: variable-bound Figma evidence is required`);
    }
    if (requireLive && entry?.figmaPublishStatus !== "CURRENT") {
      problems.push(`${spikeId}: published Figma component evidence is required`);
    }
    if (requireLive && !entry?.figmaReviewSnapshot) {
      problems.push(`${spikeId}: review snapshot evidence is required`);
    }
    if (
      requireLive &&
      entry?.figmaReviewSnapshot &&
      !/^[a-f0-9]{64}$/u.test(entry.figmaReviewSnapshot.sha256 ?? "")
    ) {
      problems.push(`${spikeId}: review snapshot digest is invalid`);
    }
    if (requireLive && entry?.codeConnectStatus !== "mapped") {
      problems.push(`${spikeId}: published Code Connect mapping is required`);
    }
  }
  if (requireLive && manifest.claudeDesign?.receiptStatus !== "current") {
    problems.push("current Claude Design receipt is required");
  }
  if (
    requireLive &&
    manifest.capabilities?.codeConnect?.status !== "available" &&
    (manifest.spike?.componentIds ?? []).some((id) =>
      (manifest.mappings ?? []).find((entry) => entry.contractId === id)?.codeConnectStatus !== "mapped"
    )
  ) {
    problems.push("Badge + Field Code Connect spike is blocked by live account capability");
  }
  return problems.sort();
}

function buildMapping({
  component,
  capabilities,
  figmaSnapshot,
  figmaMatches,
  reviewSnapshotByNodeId,
}) {
  const expectedProperties = expectedFigmaProperties(component);
  const propertyProjection = component.design?.figma?.propertyProjection;
  const declaredUrl = component.design?.figma?.componentUrl ?? null;
  const declaredNodeId = nodeIdFromUrl(declaredUrl);
  let figmaStatus = "missing";
  let figmaNode = null;
  let figmaDrift = [];
  if (figmaMatches.length === 1) {
    figmaNode = figmaMatches[0];
    figmaDrift = compareFigmaProperties(expectedProperties, figmaNode.propertyDefinitions ?? []);
    if (
      capabilities.figma.fileKey &&
      figmaSnapshot.source?.fileKey !== capabilities.figma.fileKey
    ) {
      figmaDrift.push(
        `snapshot file ${figmaSnapshot.source?.fileKey ?? "missing"} does not match configured file ${capabilities.figma.fileKey}`,
      );
    }
    figmaStatus = figmaDrift.length === 0 ? "current" : "stale";
  } else if (figmaMatches.length > 1) {
    figmaStatus = "stale";
    figmaDrift.push(`${figmaMatches.length} Figma nodes share component name ${component.design?.figma?.componentName}`);
  } else if (declaredNodeId || component.design?.figma?.status === "mapped") {
    figmaStatus = "stale";
    figmaDrift.push("declared mapping has no captured Figma component evidence");
  }
  const fileKey = figmaSnapshot.source?.fileKey ?? capabilities.figma.fileKey;
  const generatedUrl = figmaNode && fileKey
    ? `https://www.figma.com/design/${fileKey}/Catch-Design-System?node-id=${figmaNode.nodeId.replace(/:/gu, "-")}`
    : null;
  return {
    contractId: component.id,
    conceptRole: component.governance?.conceptRole,
    conceptId: component.governance?.conceptId ?? null,
    dartSymbol: component.dart?.symbol,
    dartFile: component.dart?.file,
    reactSymbol: component.react?.symbol ?? null,
    reactFile: component.react?.file ?? null,
    reactApi: component.react?.api ?? null,
    figmaName: component.design?.figma?.componentName,
    figmaPropertyProjectionMode: propertyProjection?.mode ?? "inferred",
    figmaReviewStatePolicy: propertyProjection?.reviewStates ?? "variant",
    figmaPropertySources: Object.fromEntries(
      (propertyProjection?.properties ?? [])
        .map((property) => [property.name, [...(property.sourceProps ?? [])]])
        .sort(([a], [b]) => a.localeCompare(b)),
    ),
    figmaDeclaredStatus: component.design?.figma?.status ?? "missing",
    figmaDeclaredUrl: declaredUrl,
    figmaStatus,
    figmaUrl: generatedUrl ?? declaredUrl,
    figmaNodeId: figmaNode?.nodeId ?? declaredNodeId,
    figmaComponentKey: figmaNode?.componentKey ?? null,
    figmaPublishStatus: figmaNode?.publishStatus ?? null,
    figmaSnapshotCaptureMethod: figmaSnapshot.source?.captureMethod ?? null,
    figmaVariableBindingCount: figmaNode?.boundVariableCount ?? 0,
    figmaVariableBindingDigest: figmaNode
      ? digest({
        refs: figmaNode.boundVariableRefs ?? [],
        ids: figmaNode.boundVariableIds ?? [],
        count: figmaNode.boundVariableCount ?? 0,
      })
      : null,
    figmaReviewSnapshot: figmaNode
      ? reviewSnapshotByNodeId.get(figmaNode.nodeId) ?? null
      : null,
    figmaExpectedPropertyCount: expectedProperties.length,
    figmaExpectedPropertyDigest: digest(expectedProperties),
    figmaActualPropertyCount: figmaNode?.propertyDefinitions?.length ?? 0,
    figmaActualPropertyDigest: figmaNode
      ? digest(figmaNode.propertyDefinitions ?? [])
      : null,
    figmaDrift: [...new Set(figmaDrift)].sort(),
    codeConnectStatus: component.design?.codeConnect?.status,
    codeConnectTemplate: component.design?.codeConnect?.template ?? null,
    claudeHandoffName: component.design?.claude?.handoffName,
    claudeAllowed: component.design?.claude?.allowed === true,
    contractDigest: digest(contractFingerprint(component)),
  };
}

export function expectedFigmaProperties(component) {
  const projection = component.design?.figma?.propertyProjection;
  if (projection?.mode === "explicit") {
    return explicitFigmaProperties(component, projection);
  }
  const result = [];
  for (const prop of component.contract?.props ?? []) {
    const type = figmaPropertyType(prop.type);
    if (!type) continue;
    result.push({
      name: prop.name,
      normalizedName: normalizePropertyName(prop.name),
      type,
      defaultValue: prop.default ?? null,
      variantOptions: type === "VARIANT" ? [...(prop.values ?? [])].map(String).sort() : [],
    });
  }
  if ((component.contract?.states ?? []).length > 0) {
    result.push({
      name: "reviewState",
      normalizedName: "review_state",
      type: "VARIANT",
      defaultValue: component.contract.states[0],
      variantOptions: [...component.contract.states].map(String).sort(),
    });
  }
  return result.sort((a, b) => a.normalizedName.localeCompare(b.normalizedName));
}

function explicitFigmaProperties(component, projection) {
  const result = [];
  const contractPropNames = new Set(
    (component.contract?.props ?? []).map((property) => property.name),
  );
  for (const property of projection.properties ?? []) {
    for (const sourceProp of property.sourceProps ?? []) {
      if (!contractPropNames.has(sourceProp)) {
        throw new Error(
          `${component.id}: Figma property ${property.name} references unknown source prop ${sourceProp}`,
        );
      }
    }
    if (property.type === "VARIANT" && !(property.variantOptions?.length > 0)) {
      throw new Error(`${component.id}: Figma variant ${property.name} requires variantOptions`);
    }
    if (property.type !== "VARIANT" && (property.variantOptions?.length ?? 0) > 0) {
      throw new Error(
        `${component.id}: non-variant Figma property ${property.name} cannot declare variantOptions`,
      );
    }
    result.push({
      name: property.name,
      normalizedName: normalizePropertyName(property.name),
      type: property.type,
      defaultValue: property.defaultValue ?? null,
      variantOptions: property.type === "VARIANT"
        ? [...property.variantOptions].map(String).sort()
        : [],
    });
  }
  if (projection.reviewStates === "variant" && (component.contract?.states ?? []).length > 0) {
    result.push({
      name: "reviewState",
      normalizedName: "review_state",
      type: "VARIANT",
      defaultValue: component.contract.states[0],
      variantOptions: [...component.contract.states].map(String).sort(),
    });
  }
  const normalizedNames = new Set();
  for (const property of result) {
    if (normalizedNames.has(property.normalizedName)) {
      throw new Error(
        `${component.id}: duplicate explicit Figma property namespace ${property.name}`,
      );
    }
    normalizedNames.add(property.normalizedName);
  }
  return result.sort((a, b) => a.normalizedName.localeCompare(b.normalizedName));
}

export function compareFigmaProperties(expected, actual) {
  const problems = [];
  const actualGroups = groupBy(actual, (entry) => entry.normalizedName ?? normalizePropertyName(entry.name));
  const expectedNames = new Set(expected.map((entry) => entry.normalizedName));
  for (const item of expected) {
    const matches = actualGroups.get(item.normalizedName) ?? [];
    if (matches.length === 0) {
      problems.push(`missing Figma property ${item.name}`);
      continue;
    }
    if (matches.length > 1) {
      problems.push(`duplicate Figma property namespace ${item.name}`);
      continue;
    }
    const candidate = matches[0];
    if (candidate.type !== item.type) {
      problems.push(`${item.name}: expected ${item.type}, found ${candidate.type}`);
    }
    if (item.type === "VARIANT") {
      const expectedOptions = item.variantOptions.map(normalizePropertyToken).sort();
      const actualOptions = (candidate.variantOptions ?? []).map(normalizePropertyToken).sort();
      if (JSON.stringify(expectedOptions) !== JSON.stringify(actualOptions)) {
        problems.push(`${item.name}: variant options differ`);
      }
    }
  }
  for (const item of actual) {
    const normalizedName = item.normalizedName ?? normalizePropertyName(item.name);
    if (!expectedNames.has(normalizedName)) {
      problems.push(`untracked Figma property ${item.name}`);
    }
  }
  return [...new Set(problems)].sort();
}

function main() {
  const check = process.argv.includes("--check");
  const requireLive = process.argv.includes("--require-live");
  const document = JSON.parse(fs.readFileSync(componentPath, "utf8"));
  if (process.argv.includes("--claude-handoff")) {
    console.log(JSON.stringify(buildClaudeDesignHandoffRequest(document), null, 2));
    return;
  }
  const capabilities = JSON.parse(fs.readFileSync(capabilityPath, "utf8"));
  const figmaSnapshot = JSON.parse(fs.readFileSync(figmaSnapshotPath, "utf8"));
  const claudeDesignReceipt = JSON.parse(fs.readFileSync(claudeReceiptPath, "utf8"));
  const manifest = buildDesignSyncManifest({
    componentsDocument: document,
    capabilities,
    figmaSnapshot,
    claudeDesignReceipt,
  });
  const problems = validateDesignSyncManifest(manifest, {requireLive});
  if (problems.length > 0) fail(problems);
  if (check) {
    if (!fs.existsSync(outputPath)) fail([`${relativeToRepo(outputPath)} is missing`]);
    const current = JSON.parse(fs.readFileSync(outputPath, "utf8"));
    const comparable = {...current, updated: manifest.updated};
    if (JSON.stringify(comparable, null, 2) !== JSON.stringify(manifest, null, 2)) {
      fail([`${relativeToRepo(outputPath)} is stale; run node tool/design/build_design_sync_manifest.mjs`]);
    }
    console.log(
      `Structural design-sync check passed; live sync ${manifest.operationalStatus.live} ` +
      `(${manifest.operationalStatus.blockers.length} blockers; ` +
      `${manifest.metrics.conceptCount} concepts; ` +
      `${manifest.metrics.figmaMappingStates.current ?? 0} current, ` +
      `${manifest.metrics.figmaMappingStates.stale ?? 0} stale, ` +
      `${manifest.metrics.figmaMappingStates.missing ?? 0} missing Figma mappings; ` +
      `Claude Design receipt ${manifest.claudeDesign.receiptStatus}).`,
    );
    return;
  }
  fs.mkdirSync(path.dirname(outputPath), {recursive: true});
  fs.writeFileSync(outputPath, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`Wrote ${relativeToRepo(outputPath)} (${manifest.mappings.length} contracts).`);
}

function contractFingerprint(component) {
  return {
    id: component.id,
    dart: component.dart,
    concept: component.governance,
    props: component.contract?.props,
    states: component.contract?.states,
    members: component.contract?.members,
    tokens: component.contract?.tokens,
  };
}

function figmaPropertyType(type) {
  if (type === "enum") return "VARIANT";
  if (type === "bool") return "BOOLEAN";
  if (type === "string" || type === "number") return "TEXT";
  return null;
}

function normalizePropertyName(value) {
  return String(value).split("#", 1)[0]
    .replace(/([a-z0-9])([A-Z])/gu, "$1_$2")
    .replace(/[^A-Za-z0-9]+/gu, "_")
    .replace(/^_+|_+$/gu, "")
    .toLowerCase();
}

function normalizePropertyToken(value) {
  return normalizePropertyName(String(value));
}

function digest(value) {
  return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function nodeIdFromUrl(value) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.searchParams.get("node-id")?.replace(/-/gu, ":") ?? null;
  } catch {
    return null;
  }
}

function groupBy(values, keyFor) {
  const result = new Map();
  for (const value of values) {
    const key = keyFor(value);
    const group = result.get(key) ?? [];
    group.push(value);
    result.set(key, group);
  }
  return result;
}

function countBy(values, keyFor) {
  const counts = {};
  for (const value of values) {
    const key = keyFor(value);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)));
}

function unavailableFigmaSnapshot() {
  return {
    status: "unavailable",
    source: {captureMethod: null, fileKey: null},
    components: [],
    reviewSnapshots: [],
  };
}

function unavailableClaudeDesignReceipt() {
  return {
    version: 1,
    status: "unavailable",
    reviewer: "claude-design",
    sourceDigest: null,
    capturedAt: null,
    proposalRef: null,
    components: [],
  };
}

function fail(problems) {
  console.error("Design sync manifest check failed:");
  for (const problem of problems) console.error(`- ${problem}`);
  process.exit(1);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
