import {normalizeSymbol, reactSymbolFiles} from "../../design/component_concepts.mjs";
import {roleNouns} from "../../design/lib/component_naming.mjs";
import {isNonProductionSource} from "./react_component_graph.mjs";

// Blueprint Phase 7d: every exported React component maps to a registry
// concept, a T4 owner, or deletion. Ownership and deletion are measured from
// the reference graph; only judgments (is this export an implementation of a
// registered contract?) are recorded, in the surface registries.

const sharedLayerPattern = /^(?:website\/src\/shared\/(?:ui|site)\/|admin\/src\/shared\/ui\/|packages\/web-ui\/src\/)/u;
const surfacePrefixPattern = /^(?:Admin|Website|Marketing|Public|Shared)(?=[A-Z])/u;

/** The area a source file belongs to; shared areas pass ownership through. */
export function areaOf(file) {
  let match = file.match(/^(website|admin)\/src\/features\/([^/]+)\//u);
  if (match) return `${match[1]}:features/${match[2]}`;
  match = file.match(/^(website|admin)\/src\/(shared|app)\//u);
  if (match) return `${match[1]}:${match[2]}`;
  match = file.match(/^(website|admin)\/src\/[^/]+$/u);
  if (match) return `${match[1]}:app`;
  // The Next App Router tree (website/app) is the website's app shell too.
  match = file.match(/^(website|admin)\/app\//u);
  if (match) return `${match[1]}:app`;
  match = file.match(/^(website|admin)\/src\/([^/]+)\//u);
  if (match) return `${match[1]}:${match[2]}`;
  if (file.startsWith("packages/web-ui/")) return "web-ui";
  return file;
}

export function isPassThroughArea(area) {
  return area === "web-ui" || /:shared$/u.test(area);
}

export function isSharedLayerFile(file) {
  return sharedLayerPattern.test(file);
}

/** Registry owner values ("features/x", "app") as graph areas. */
export function ownerArea(surface, owner) {
  return `${surface}:${owner}`;
}

/**
 * Builds the inventory. `surfaceRegistries` maps a surface id ("website",
 * "admin") to its parsed registry document.
 */
export function buildReactComponentInventory({graph, registry, surfaceRegistries}) {
  const components = new Map(graph.components.map((component) => [component.id, component]));
  // Public registry names can alias one declaration; references use that declaration.
  const declarationId = (id) => components.get(id)?.declarationId ?? id;
  const consumers = new Map();
  const uses = new Map();
  for (const reference of graph.references) {
    if (isNonProductionSource(reference.file)) continue;
    push(consumers, reference.to, reference);
    if (reference.from.includes("::")) push(uses, reference.from, reference.to);
  }
  const declarationsInFile = new Map();
  for (const reference of graph.references) {
    for (const id of [reference.from, reference.to]) {
      if (id.includes("::")) push(declarationsInFile, id.split("::")[0], id);
    }
  }
  for (const component of graph.components) push(declarationsInFile, component.file, declarationId(component.id));

  const ownersOf = memoizedOwners({consumers, declarationsInFile});
  const contracts = new Map(registry.components.map((component) => [component.id, component]));
  const reactImplementations = new Map();
  const implementationsOf = new Map();
  for (const contract of registry.components) {
    const react = contract.react;
    if (!react) continue;
    for (const [symbol, file] of reactSymbolFiles(react)) {
      const id = declarationId(`${file}::${symbol}`);
      reactImplementations.set(id, contract.id);
      push(implementationsOf, contract.id, id);
    }
  }
  const entries = new Map();
  for (const [surface, document] of Object.entries(surfaceRegistries)) {
    for (const entry of document.components ?? []) {
      entries.set(`${entry.source}::${entry.exportName}`, {...entry, surface});
      if (entry.componentId) push(implementationsOf, entry.componentId, declarationId(`${entry.source}::${entry.exportName}`));
    }
  }
  const candidateIndex = conceptCandidateIndex(registry);
  const problems = [];
  const rows = [];

  for (const component of graph.components) {
    const area = areaOf(component.file);
    const owners = [...ownersOf(declarationId(component.id))].sort();
    const entry = entries.get(component.id) ?? null;
    const row = {
      id: component.id,
      surface: component.surface,
      name: component.name,
      file: component.file,
      line: component.line,
      area,
      owners,
      registryEntry: entry ? entry.id : null,
      mapping: null,
      candidates: [],
    };
    const reactConcept = reactImplementations.get(declarationId(component.id));
    if (reactConcept) {
      row.mapping = {kind: "concept", componentId: reactConcept};
    } else if (entry?.componentId) {
      row.mapping = {kind: "adapter", componentId: entry.componentId};
    } else if (owners.length === 0) {
      row.mapping = {kind: "delete", reason: "no production consumer"};
    } else if (area === "web-ui" && entry) {
      // Blueprint D18: the library draws. A component one surface renders stays
      // in @catch/web-ui as that surface's registered T4 entry.
      row.mapping = {kind: "t4", owner: owners.length === 1 ? owners[0] : `${entry.surface}:shared`};
    } else if (!isPassThroughArea(area)) {
      row.mapping = {kind: "t4", owner: area};
    } else if (owners.length === 1) {
      // A single-use shared export is debt until it is a registered T4
      // component in @catch/web-ui (D18), never moved into its feature.
      row.mapping = {kind: "t4", owner: owners[0], move: true};
    } else if (area === "web-ui") {
      problems.push(
        `${component.id}: @catch/web-ui export rendered by ${owners.join(", ")} implements no registered contract; ` +
        "add its react record to a T1/T2 contract, or register it as T4 in the registry of the one surface that renders it",
      );
    } else {
      row.mapping = {kind: "t4", owner: area};
    }

    if (isSharedLayerFile(component.file) && row.mapping?.kind !== "concept" && row.mapping?.kind !== "adapter" && owners.length > 0) {
      const used = uses.get(declarationId(component.id)) ?? [];
      const rendersImplementationOf = (contractId) =>
        used.some((target) => (implementationsOf.get(contractId) ?? []).includes(target));
      const open = new Map();
      if (owners.length > 1) {
        for (const [contractId, reason] of nameCandidates(component.name, candidateIndex)) {
          if (!rendersImplementationOf(contractId)) open.set(contractId, reason);
        }
      }
      for (const target of used) {
        const contractId = reactImplementations.get(target);
        if (contractId && !open.has(contractId)) open.set(contractId, `renders ${target.split("::")[1]}`);
      }
      const compared = new Set(entry?.comparedWith ?? []);
      row.candidates = [...open].map(([contractId, reason]) => ({contractId, reason, decided: compared.has(contractId)}));
      for (const candidate of row.candidates.filter((item) => !item.decided)) {
        problems.push(
          `${component.id}: ${candidate.reason} matches ${candidate.contractId}; record componentId ` +
          `(it implements the contract) or comparedWith with comparisonReason (it does not) in ` +
          `design/${component.surface}/components.json`,
        );
      }
    }
    if (entry) problems.push(...entryProblems({entry, row, contracts}));
    rows.push(row);
  }

  for (const [key, entry] of entries) {
    if (!components.has(key)) continue;
    if (entry.componentId && !contracts.has(entry.componentId)) {
      problems.push(`${key}: unknown componentId ${entry.componentId}`);
    }
  }
  problems.push(...crossSurfaceOverlapProblems(rows));
  return {rows: rows.sort((left, right) => compare(left.id, right.id)), problems: [...new Set(problems)].sort(), summary: summarize(rows)};
}

function entryProblems({entry, row, contracts}) {
  const problems = [];
  const label = `design/${entry.surface}/components.json:${entry.id}`;
  if (entry.componentId && entry.comparedWith) {
    problems.push(`${label}: componentId and comparedWith are exclusive; an export either implements a contract or is compared with it`);
  }
  if (entry.comparedWith) {
    if (typeof entry.comparisonReason !== "string" || entry.comparisonReason.trim().length < 20) {
      problems.push(`${label}: comparedWith needs a comparisonReason that names the differing responsibility`);
    }
    for (const contractId of entry.comparedWith) {
      if (!contracts.has(contractId)) problems.push(`${label}: comparedWith names unknown contract ${contractId}`);
      else if (!row.candidates.some((candidate) => candidate.contractId === contractId)) {
        problems.push(`${label}: comparedWith ${contractId} is not a measured candidate; remove the stale comparison`);
      }
    }
  }
  const owners = row.owners;
  if (row.area === "web-ui" && !entry.componentId) {
    const foreign = owners.filter((owner) => !owner.startsWith(`${entry.surface}:`));
    if (foreign.length > 0) {
      problems.push(`${label}: T4 component registered for ${entry.surface} is also rendered by ${foreign.join(", ")}; promote it to a T1/T2 contract`);
    }
  }
  if (entry.surface !== "admin") return problems;
  if (entry.kind === "feature-component" && row.mapping?.kind !== "adapter") {
    const expected = ownerArea("admin", entry.owner);
    if (owners.length > 0 && (owners.length !== 1 || owners[0] !== expected)) {
      problems.push(`${label}: feature-component owned by ${entry.owner} is rendered by ${owners.join(", ")}`);
    }
  }
  if (entry.kind === "shared-primitive" && owners.length === 1) {
    problems.push(`${label}: only ${owners[0]} renders ${entry.exportName}; record it as a feature-component of that owner`);
  }
  return problems;
}

// Exact-name exports in both surfaces' shared layers are one responsibility
// until the registry says otherwise.
function crossSurfaceOverlapProblems(rows) {
  const byName = new Map();
  for (const row of rows) {
    if (!isSharedLayerFile(row.file) || row.surface === "web-ui" || row.owners.length === 0) continue;
    push(byName, row.name, row);
  }
  const problems = [];
  for (const [name, group] of byName) {
    const surfaces = new Set(group.map((row) => row.surface));
    if (surfaces.size < 2) continue;
    const contractsFor = new Set(group.map((row) => row.mapping?.componentId ?? null));
    if (contractsFor.size === 1 && !contractsFor.has(null)) continue;
    problems.push(`website and admin both export ${name} (${group.map((row) => row.id).join(", ")}); point both at one contract with componentId`);
  }
  return problems;
}

function conceptCandidateIndex(registry) {
  const eligible = registry.components.filter((component) =>
    ["T1", "T2"].includes(component.tier) && ["L2", "L3", "L4"].includes(component.level));
  const byName = new Map();
  const byRoleNoun = new Map();
  for (const contract of eligible) {
    for (const name of [contract.dart?.symbol, ...(contract.aliases ?? [])]) {
      if (name) byName.set(normalizeSymbol(name), contract.id);
    }
    if (contract.roleNoun) push(byRoleNoun, contract.roleNoun, contract.id);
  }
  const redirects = registry.roleNounRedirects ?? {};
  const nouns = [...new Set([...roleNouns, ...Object.keys(redirects)])]
    .sort((left, right) => right.length - left.length);
  return {byName, byRoleNoun, redirects, nouns};
}

/** Contracts a component name could be an implementation of. */
export function nameCandidates(name, index) {
  const out = new Map();
  const stripped = name.replace(surfacePrefixPattern, "");
  for (const value of [name, stripped]) {
    const contractId = index.byName.get(normalizeSymbol(value));
    if (contractId && !out.has(contractId)) out.set(contractId, `name ${name}`);
  }
  const noun = index.nouns.find((candidate) => stripped === candidate || stripped.endsWith(candidate));
  if (noun) {
    const targets = roleNouns.includes(noun) ? [noun] : index.redirects[noun] ?? [];
    for (const target of targets) {
      for (const contractId of index.byRoleNoun.get(target) ?? []) {
        if (!out.has(contractId)) out.set(contractId, `role noun ${noun}`);
      }
    }
  }
  return out;
}

function memoizedOwners({consumers, declarationsInFile}) {
  const cache = new Map();
  const visit = (id, stack) => {
    if (cache.has(id)) return cache.get(id);
    if (stack.has(id)) return new Set();
    stack.add(id);
    const owners = new Set();
    for (const reference of consumers.get(id) ?? []) {
      const area = areaOf(reference.file);
      if (!isPassThroughArea(area)) {
        owners.add(area);
        continue;
      }
      // A shared consumer passes ownership through to its own consumers.
      const through = reference.from.includes("::")
        ? [reference.from]
        : [...new Set(declarationsInFile.get(reference.from) ?? [])];
      for (const next of through) for (const owner of visit(next, stack)) owners.add(owner);
    }
    stack.delete(id);
    if (stack.size === 0) cache.set(id, owners);
    return owners;
  };
  return (id) => visit(id, new Set());
}

function summarize(rows) {
  const summary = {};
  for (const row of rows) {
    const kind = row.mapping ? (row.mapping.move ? "t4-move" : row.mapping.kind) : "unmapped";
    summary[row.surface] ??= {};
    summary[row.surface][kind] = (summary[row.surface][kind] ?? 0) + 1;
  }
  return summary;
}

function push(map, key, value) {
  if (!map.has(key)) map.set(key, []);
  map.get(key).push(value);
}

function compare(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}
