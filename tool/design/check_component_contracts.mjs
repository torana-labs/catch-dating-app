#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import {isComponentSourcePath} from "./lib/component_source_path.mjs";
import {fromRepo, repoRoot} from "../lib/repo_paths.mjs";
import {
  componentAbsorptionProblems,
  componentAliasProblems,
  componentTierProblems,
  conceptMetrics,
  conceptQualifiers,
  conceptRoles,
  conceptTopologyProblems,
  isPlannedWithoutDart,
  roleNounRedirectProblems,
} from "./component_concepts.mjs";
import {declaredSystemNames, systemBlockProblems, systemTypesPath} from "./lib/system_components.mjs";

import {checkHostSectionComposition} from './check_host_section_composition.mjs';

const registryPath = fromRepo("design/components/catch.components.json");
const tokenPath = fromRepo("design/tokens/catch.tokens.json");
const schemaPath = fromRepo("design/components/catch.components.schema.json");
const decisionsPath = fromRepo("docs/design_parity/widget_consolidation/decisions.json");
const patternFamiliesPath = fromRepo("docs/design_parity/widget_consolidation/pattern_families.json");

const registry = readJson(registryPath);
const tokens = readJson(tokenPath);
const schema = readJson(schemaPath);
const decisionIds = new Set((readJson(decisionsPath).decisions ?? []).map((entry) => entry.clusterId));
const patternFamilyIds = new Set((readJson(patternFamiliesPath).families ?? []).map((entry) => entry.id));
const tokenRefs = collectTokenRefs(tokens);
const failures = [];

validateRoot(registry);
validateSchema(registry);
validateComponents(registry.components ?? []);
failures.push(...conceptTopologyProblems(registry.components ?? []));
failures.push(...componentTierProblems(registry.components ?? []));
failures.push(...componentAliasProblems(registry.components ?? []));
failures.push(...componentAbsorptionProblems(registry.components ?? []));
failures.push(...systemBlockProblems({
  components: registry.components ?? [],
  declaredNames: declaredSystemNames(fs.readFileSync(fromRepo(systemTypesPath), "utf8")),
}));
failures.push(...roleNounRedirectProblems(registry.roleNounRedirects));
failures.push(...checkHostSectionComposition(repoRoot));

if (failures.length > 0) {
  console.error("Component contract check failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

const metrics = conceptMetrics(registry.components);
console.log(
  `Component contract check passed (${metrics.contractCount} contracts, ${metrics.conceptCount} concepts, ${metrics.memberCount} members, ${metrics.unclassifiedCount} unclassified).`,
);

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    console.error(`Failed to parse ${path.relative(repoRoot, file)}: ${error.message}`);
    process.exit(1);
  }
}

function collectTokenRefs(document) {
  const refs = new Set();

  function walk(node, parts) {
    if (!node || typeof node !== "object" || Array.isArray(node)) return;
    if (Object.prototype.hasOwnProperty.call(node, "$value") && parts.length > 0) {
      refs.add(parts.join("."));
    }
    for (const [key, value] of Object.entries(node)) {
      if (key.startsWith("$")) continue;
      walk(value, [...parts, key]);
    }
  }

  walk(document, []);
  return refs;
}

function validateSchema(value) {
  const ajv = new Ajv2020({allErrors: true, strict: false});
  const validate = ajv.compile(schema);
  if (validate(value)) return;
  for (const error of validate.errors ?? []) {
    failures.push(`schema ${error.instancePath || "/"}: ${error.message}`);
  }
}

function validateRoot(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    failures.push("registry root must be an object");
    return;
  }
  if (value.version !== 4) failures.push("registry.version must be 4");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value.updated ?? "")) {
    failures.push("registry.updated must be YYYY-MM-DD");
  }
  if (!Array.isArray(value.components) || value.components.length === 0) {
    failures.push("registry.components must be a non-empty array");
  }
}

function validateComponents(components) {
  const ids = new Set();
  const idPattern = /^catch\.[a-z0-9_.-]+$/;
  const validStatuses = new Set(["active", "planned", "deprecated"]);
  const validKinds = new Set(["primitive", "composite", "pattern", "screen-contract"]);
  const validFigmaStatuses = new Set(["unmapped", "mapped", "planned"]);
  const validCodeConnectStatuses = new Set(["planned", "mapped", "not-applicable"]);
  const memberIds = new Set();
  const memberSymbols = new Set();
  const conceptPrimaries = new Map();

  for (const component of components) {
    const label = component?.id ?? "<missing id>";

    if (!idPattern.test(label)) {
      failures.push(`${label}: id must match catch.<name>`);
      continue;
    }
    if (ids.has(label)) failures.push(`${label}: duplicate id`);
    ids.add(label);

    if (!validStatuses.has(component.status)) {
      failures.push(`${label}: invalid status '${component.status}'`);
    }
    if (!validKinds.has(component.kind)) {
      failures.push(`${label}: invalid kind '${component.kind}'`);
    }

    validateDart(component, label);

    const figma = component.design?.figma;
    if (!validFigmaStatuses.has(figma?.status)) {
      failures.push(`${label}: invalid figma status '${figma?.status}'`);
    }
    if (figma?.status === "mapped" && !figma.componentUrl) {
      failures.push(`${label}: mapped figma component requires componentUrl`);
    }

    const codeConnect = component.design?.codeConnect;
    if (!validCodeConnectStatuses.has(codeConnect?.status)) {
      failures.push(`${label}: invalid Code Connect status '${codeConnect?.status}'`);
    }
    if (codeConnect?.status === "mapped" && !codeConnect.template) {
      failures.push(`${label}: mapped Code Connect component requires template`);
    }

    validateContract(component.contract, component, label, {memberIds, memberSymbols});
    validateGovernance(component.governance, component, label);
    validateConceptGovernance(component.governance, component, label, {conceptPrimaries});
    validateHandoff(component.handoff, label, ids, components);
  }

  for (const component of components) {
    const governance = component.governance;
    if (governance?.conceptRole === "member") {
      if (!conceptPrimaries.has(governance.parentConceptId)) {
        failures.push(`${component.id}: missing primary concept '${governance.parentConceptId}'`);
      }
    }
  }
}

function validateDart(component, label) {
  if (isPlannedWithoutDart(component)) return;
  const dart = component.dart;
  if (!dart?.file || !dart?.symbol) {
    failures.push(`${label}: dart.file and dart.symbol are required`);
    return;
  }
  const file = fromRepo(dart.file);
  if (!fs.existsSync(file)) {
    failures.push(`${label}: dart.file does not exist: ${dart.file}`);
    return;
  }
  const source = readDartLibrarySource(file);
  if (!new RegExp(`\\b${escapeRegExp(dart.symbol)}\\b`).test(source)) {
    failures.push(`${label}: dart.symbol '${dart.symbol}' not found in ${dart.file}`);
  }
}

function readDartLibrarySource(file, visited = new Set()) {
  const resolved = path.resolve(file);
  if (visited.has(resolved)) return "";
  visited.add(resolved);

  const source = fs.readFileSync(resolved, "utf8");
  const parts = [...source.matchAll(/^\s*part\s+'([^']+)'\s*;/gmu)].map(
    (match) => path.resolve(path.dirname(resolved), match[1]),
  );
  return [
    source,
    ...parts
      .filter((part) => fs.existsSync(part))
      .map((part) => readDartLibrarySource(part, visited)),
  ].join("\n");
}

function validateContract(contract, component, label, {memberIds, memberSymbols}) {
  if (!contract || typeof contract !== "object") {
    failures.push(`${label}: contract is required`);
    return;
  }
  validateProps(contract.props, label);
  validateUniqueArray(contract.states, `${label}: contract.states`);
  validateUniqueArray(contract.tokens, `${label}: contract.tokens`);
  validateUniqueArray(contract.dartRoles, `${label}: contract.dartRoles`);
  validateUniqueArray(contract.goldens, `${label}: contract.goldens`);

  for (const token of contract.tokens ?? []) {
    if (!tokenRefs.has(token)) {
      failures.push(`${label}: unknown DTCG token reference '${token}'`);
    }
  }

  validateContractMembers(contract.members ?? [], component, label, {
    memberIds,
    memberSymbols,
  });
}

function validateContractMembers(members, component, label, {memberIds, memberSymbols}) {
  if (!Array.isArray(members)) {
    failures.push(`${label}: contract.members must be an array when present`);
    return;
  }

  for (const member of members) {
    const memberLabel = `${label}.members.${member?.symbol ?? "<missing symbol>"}`;
    const sourcePath = member?.file ?? component.dart?.file;
    const sourceFile = sourcePath ? fromRepo(sourcePath) : null;
    const source = sourceFile && fs.existsSync(sourceFile)
      ? readDartLibrarySource(sourceFile)
      : "";
    if (!member?.id || !member.id.startsWith(`${label}.`)) {
      failures.push(`${memberLabel}: member id must be nested under ${label}`);
    }
    if (sourcePath && !isComponentSourcePath(sourcePath)) {
      failures.push(`${memberLabel}: member file must be under lib/**.dart, packages/catch_ui/lib/**.dart or packages/platform/lib/**.dart`);
    }
    if (sourcePath && !fs.existsSync(fromRepo(sourcePath))) {
      failures.push(`${memberLabel}: member file does not exist: ${sourcePath}`);
    }
    if (member.id && memberIds.has(member.id)) {
      failures.push(`${memberLabel}: duplicate contract member id ${member.id}`);
    }
    if (member.id) memberIds.add(member.id);
    if (!member?.symbol || member.symbol.startsWith("_")) {
      failures.push(`${memberLabel}: member symbol must be public`);
    }
    if (member.symbol === component.dart?.symbol) {
      failures.push(`${memberLabel}: primary dart.symbol should not be repeated as a member`);
    }
    if (member.symbol && memberSymbols.has(member.symbol)) {
      failures.push(`${memberLabel}: duplicate contract member symbol ${member.symbol}`);
    }
    if (member.symbol) memberSymbols.add(member.symbol);
    if (member.symbol && !new RegExp(`\\b${escapeRegExp(member.symbol)}\\b`).test(source)) {
      failures.push(`${memberLabel}: member symbol not found in ${sourcePath}`);
    }
    if (!member.summary || typeof member.summary !== "string") {
      failures.push(`${memberLabel}: member summary is required`);
    }
    validateUniqueArray(member.states, `${memberLabel}: states`);
    validateMemberConceptGovernance(member.governance, component, memberLabel);
  }
}

function validateConceptGovernance(governance, component, label, {conceptPrimaries}) {
  const role = governance?.conceptRole;
  if (!conceptRoles.has(role)) {
    failures.push(`${label}: invalid governance.conceptRole '${role}'`);
    return;
  }
  if (role === "concept") {
    if (governance.conceptId !== component.id) {
      failures.push(`${label}: concept governance.conceptId must equal component id`);
    }
    if (governance.parentConceptId || governance.qualifier) {
      failures.push(`${label}: primary concepts cannot declare parentConceptId or qualifier`);
    }
    if (conceptPrimaries.has(governance.conceptId)) {
      failures.push(`${label}: duplicate primary for concept '${governance.conceptId}'`);
    }
    conceptPrimaries.set(governance.conceptId, label);
    return;
  }
  if (role === "member") {
    if (!governance.conceptId || governance.conceptId !== governance.parentConceptId) {
      failures.push(`${label}: members require matching conceptId and parentConceptId`);
    }
    if (!conceptQualifiers.has(governance.qualifier)) {
      failures.push(`${label}: members require a valid qualifier`);
    }
  } else if (governance.conceptId || governance.parentConceptId || governance.qualifier) {
    failures.push(`${label}: ${role} entries cannot claim concept identity`);
  }
  if (!governance.decisionRef) failures.push(`${label}: ${role} entries require decisionRef`);
  else validateDecisionRef(governance.decisionRef, label);
}

function validateMemberConceptGovernance(governance, component, label) {
  if (!governance || !conceptRoles.has(governance.conceptRole)) {
    failures.push(`${label}: valid governance.conceptRole is required`);
    return;
  }
  const parent = component.governance;
  if (governance.conceptRole === "member") {
    if (parent.conceptRole !== "concept" && parent.conceptRole !== "member") {
      failures.push(`${label}: member cannot be nested under ${parent.conceptRole}`);
    }
    if (
      !governance.conceptId ||
      governance.conceptId !== governance.parentConceptId ||
      governance.conceptId !== parent.conceptId
    ) {
      failures.push(`${label}: member concept identity must match its owning concept`);
    }
    if (!conceptQualifiers.has(governance.qualifier)) {
      failures.push(`${label}: member qualifier is required`);
    }
  } else if (governance.conceptId || governance.parentConceptId || governance.qualifier) {
    failures.push(`${label}: ${governance.conceptRole} cannot claim concept identity`);
  }
  if (!governance.decisionRef) failures.push(`${label}: decisionRef is required`);
  else validateDecisionRef(governance.decisionRef, label);
}

function validateDecisionRef(reference, label) {
  if (reference.startsWith("pattern-family:")) {
    const id = reference.slice("pattern-family:".length);
    if (!patternFamilyIds.has(id)) failures.push(`${label}: unknown pattern family decisionRef '${reference}'`);
    return;
  }
  if (reference.startsWith("ledger:")) {
    const id = reference.slice("ledger:".length);
    if (!decisionIds.has(id)) failures.push(`${label}: unknown ledger decisionRef '${reference}'`);
    return;
  }
  if (reference.startsWith("concept-boundary:")) {
    if (!decisionIds.has(reference)) failures.push(`${label}: unknown concept-boundary decisionRef '${reference}'`);
    return;
  }
  if (/^(contract-family|contract-kind|contract-note|naming-exception):/u.test(reference)) return;
  failures.push(`${label}: unsupported decisionRef '${reference}'`);
}

function validateGovernance(governance, component, label) {
  if (!governance || typeof governance !== "object" || Array.isArray(governance)) {
    failures.push(`${label}: governance is required`);
    return;
  }

  const validRoles = new Set(["atom", "composition", "pattern", "screen_contract"]);
  const validStateOwnership = new Set([
    "none",
    "local-ui-only",
    "slot-state-only",
    "display-state-only",
    "screen-owned",
  ]);
  const validAsyncOwnership = new Set(["none", "display-state-only", "screen-owned"]);
  const validLayoutOwnership = new Set(["internal-only", "slot-layout", "screen-layout"]);
  const validActionOwnership = new Set(["none", "callbacks-only", "route-owned"]);
  const validDependencyLevels = new Set([
    "tokens-and-primitives",
    "primitives-and-slots",
    "feature-display-models",
    "route-boundary",
  ]);
  const validReviewPolicies = new Set([
    "contract-page-canonical",
    "screen-contract-canonical",
  ]);
  const roleByKind = new Map([
    ["primitive", "atom"],
    ["composite", "composition"],
    ["pattern", "pattern"],
    ["screen-contract", "screen_contract"],
  ]);

  if (!validRoles.has(governance.role)) {
    failures.push(`${label}: invalid governance.role '${governance.role}'`);
  }
  if (roleByKind.get(component.kind) !== governance.role) {
    failures.push(
      `${label}: governance.role '${governance.role}' must match kind '${component.kind}'`,
    );
  }
  if (governance.canonicalFamily !== component.id) {
    failures.push(`${label}: governance.canonicalFamily must equal component id`);
  }
  if (typeof governance.publicApi !== "boolean") {
    failures.push(`${label}: governance.publicApi must be boolean`);
  } else if (!governance.publicApi) {
    failures.push(`${label}: component contracts must remain public APIs`);
  }
  if (!validStateOwnership.has(governance.stateOwnership)) {
    failures.push(`${label}: invalid governance.stateOwnership '${governance.stateOwnership}'`);
  }
  if (!validAsyncOwnership.has(governance.asyncOwnership)) {
    failures.push(`${label}: invalid governance.asyncOwnership '${governance.asyncOwnership}'`);
  }
  if (!validLayoutOwnership.has(governance.layoutOwnership)) {
    failures.push(`${label}: invalid governance.layoutOwnership '${governance.layoutOwnership}'`);
  }
  if (!validActionOwnership.has(governance.actionOwnership)) {
    failures.push(`${label}: invalid governance.actionOwnership '${governance.actionOwnership}'`);
  }
  if (!validDependencyLevels.has(governance.allowedDependencyLevel)) {
    failures.push(
      `${label}: invalid governance.allowedDependencyLevel '${governance.allowedDependencyLevel}'`,
    );
  }
  if (!validReviewPolicies.has(governance.reviewPolicy)) {
    failures.push(`${label}: invalid governance.reviewPolicy '${governance.reviewPolicy}'`);
  }
  if (String(governance.reviewPolicy).includes("private")) {
    failures.push(`${label}: governance.reviewPolicy must not introduce private-helper paths`);
  }
  if (component.dart?.symbol?.startsWith("_")) {
    failures.push(`${label}: dart.symbol must be public; private helper contracts are forbidden`);
  }
  for (const constructor of component.dart?.constructors ?? []) {
    if (constructor.startsWith("_")) {
      failures.push(`${label}: dart.constructors must be public; private helper contracts are forbidden`);
    }
  }
  if (component.kind !== "screen-contract" && governance.allowedDependencyLevel === "route-boundary") {
    failures.push(`${label}: only screen-contract entries may use route-boundary dependencies`);
  }
  if (component.kind === "primitive" && governance.allowedDependencyLevel !== "tokens-and-primitives") {
    failures.push(`${label}: primitive contracts must use tokens-and-primitives dependencies`);
  }
  if (
    (component.kind === "composite" || component.kind === "pattern") &&
    !["tokens-and-primitives", "primitives-and-slots"].includes(governance.allowedDependencyLevel)
  ) {
    failures.push(
      `${label}: ${component.kind} contracts must stay below feature-display-model dependencies`,
    );
  }
  if (component.kind === "screen-contract") {
    if (governance.reviewPolicy !== "screen-contract-canonical") {
      failures.push(`${label}: screen-contract entries must use screen-contract-canonical review`);
    }
    if (governance.layoutOwnership !== "screen-layout") {
      failures.push(`${label}: screen-contract entries must own screen-layout`);
    }
    if (governance.actionOwnership !== "route-owned") {
      failures.push(`${label}: screen-contract entries must own route actions`);
    }
  }
}

function validateProps(props, label) {
  if (!Array.isArray(props)) {
    failures.push(`${label}: contract.props must be an array`);
    return;
  }
  const names = new Set();
  const validTypes = new Set([
    "string",
    "bool",
    "enum",
    "callback",
    "widget",
    "color",
    "number",
    "list",
    "generic-list",
    "object",
  ]);

  for (const prop of props) {
    const propLabel = `${label}.${prop?.name ?? "<missing prop>"}`;
    if (!prop?.name) failures.push(`${propLabel}: prop.name is required`);
    if (names.has(prop.name)) failures.push(`${propLabel}: duplicate prop`);
    names.add(prop.name);
    if (!validTypes.has(prop.type)) failures.push(`${propLabel}: invalid prop type '${prop.type}'`);
    if (typeof prop.required !== "boolean") {
      failures.push(`${propLabel}: prop.required must be boolean`);
    }
    if (prop.type === "enum" && (!Array.isArray(prop.values) || prop.values.length === 0)) {
      failures.push(`${propLabel}: enum prop requires non-empty values`);
    }
  }
}

function validateHandoff(handoff, label, seenIds, components) {
  if (!handoff || typeof handoff !== "object") {
    failures.push(`${label}: handoff is required`);
    return;
  }
  validateUniqueArray(handoff.allowedChildren, `${label}: handoff.allowedChildren`);
  const knownIds = new Set(components.map((component) => component.id));
  for (const child of handoff.allowedChildren ?? []) {
    if (!knownIds.has(child)) {
      failures.push(`${label}: unknown allowed child '${child}'`);
    }
  }
}

function validateUniqueArray(value, label) {
  if (!Array.isArray(value)) {
    failures.push(`${label} must be an array`);
    return;
  }
  const seen = new Set();
  for (const item of value) {
    if (seen.has(item)) failures.push(`${label} contains duplicate '${item}'`);
    seen.add(item);
  }
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
