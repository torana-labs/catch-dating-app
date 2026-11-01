import crypto from "node:crypto";

export const claudeSpikeComponentIds = ["catch.badge", "catch.field"];

export function buildClaudeDesignHandoffRequest(componentsDocument) {
  const componentsById = new Map(
    (componentsDocument.components ?? []).map((component) => [component.id, component]),
  );
  const components = claudeSpikeComponentIds.map((contractId) => {
    const component = componentsById.get(contractId);
    if (!component) throw new Error(`${contractId}: missing Claude spike component`);
    const states = [...(component.contract?.states ?? [])];
    return {
      contractId,
      conceptRole: component.governance?.conceptRole,
      conceptId: component.governance?.conceptId ?? null,
      parentConceptId: component.governance?.parentConceptId ?? null,
      dartSymbol: component.dart?.symbol,
      dartFile: component.dart?.file,
      claudeHandoffName: component.design?.claude?.handoffName,
      figmaComponentName: component.design?.figma?.componentName,
      supportedStates: states,
      supportedStatesDigest: digest(states),
      propsDigest: digest(component.contract?.props ?? []),
      tokens: [...(component.contract?.tokens ?? [])].sort(),
    };
  });
  return {
    version: 1,
    generatedBy: "tool/design/build_design_sync_manifest.mjs --claude-handoff",
    sourceDigest: digest(componentsDocument),
    contextFiles: {
      components: "design/components/catch.components.json",
      tokens: "design/tokens/catch.tokens.json",
      designLanguage: "docs/design_language.md",
    },
    authority: {
      conceptIdsAndApis: "repo contract",
      tokensAndSupportedStates: "repo contract",
      reviewedGeometry: "published Figma library",
      claudeOutput: "proposal or receipt only",
      conflicts: "owner decision",
    },
    task: "Read the context files, identify the Badge and Field concepts by contract id, verify every supported state, and return the receipt contract without inventing ids, states, props, or ownership.",
    components,
    receiptContract: {
      version: 1,
      reviewer: "claude-design",
      requiredFields: [
        "sourceDigest",
        "capturedAt",
        "proposalRef",
        "components[].contractId",
        "components[].conceptId",
        "components[].supportedStatesDigest",
        "components[].acknowledged",
      ],
      rule: "Every requested component must appear exactly once and reuse the supplied digests verbatim.",
    },
  };
}

export function validateClaudeDesignReceipt(request, receipt) {
  const problems = [];
  if (receipt?.status === "unavailable") return problems;
  if (receipt?.status !== "captured") {
    return ["Claude Design receipt status must be unavailable or captured"];
  }
  if (!request?.sourceDigest || !Array.isArray(request.components)) {
    return ["Claude Design handoff request is missing"];
  }
  if (receipt.version !== 1) problems.push("Claude Design receipt version must be 1");
  if (receipt.reviewer !== "claude-design") {
    problems.push("Claude Design receipt reviewer must be claude-design");
  }
  if (receipt.sourceDigest !== request.sourceDigest) {
    problems.push("Claude Design receipt source digest is stale");
  }
  if (!receipt.capturedAt) problems.push("Claude Design receipt capturedAt is required");
  if (!receipt.proposalRef) problems.push("Claude Design receipt proposalRef is required");
  const expectedById = new Map(request.components.map((component) => [component.contractId, component]));
  const actualById = groupBy(receipt.components ?? [], (component) => component.contractId);
  for (const [contractId, expected] of expectedById) {
    const matches = actualById.get(contractId) ?? [];
    if (matches.length !== 1) {
      problems.push(`${contractId}: Claude Design receipt must contain exactly one component`);
      continue;
    }
    const actual = matches[0];
    if (actual.conceptId !== expected.conceptId) {
      problems.push(`${contractId}: Claude Design concept id differs`);
    }
    if (actual.supportedStatesDigest !== expected.supportedStatesDigest) {
      problems.push(`${contractId}: Claude Design supported states are stale`);
    }
    if (actual.acknowledged !== true) {
      problems.push(`${contractId}: Claude Design acknowledgement is required`);
    }
  }
  for (const contractId of actualById.keys()) {
    if (!expectedById.has(contractId)) {
      problems.push(`${contractId}: unrequested Claude Design receipt component`);
    }
  }
  return [...new Set(problems)].sort();
}

export function claudeDesignReceiptState(request, receipt) {
  if (receipt?.status !== "captured") return "missing";
  return validateClaudeDesignReceipt(request, receipt).length === 0 ? "current" : "stale";
}

export function buildCapturedClaudeDesignReceipt(request, {capturedAt, proposalRef = null}) {
  return {
    version: 1,
    status: "captured",
    reviewer: "claude-design",
    sourceDigest: request.sourceDigest,
    capturedAt,
    proposalRef,
    components: request.components.map((component) => ({
      contractId: component.contractId,
      conceptId: component.conceptId,
      supportedStatesDigest: component.supportedStatesDigest,
      acknowledged: true,
    })),
  };
}

export function digest(value) {
  return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
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
