#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {fromRepo} from "../lib/repo_paths.mjs";
import {collisionKeyFor} from "./component_concepts.mjs";
import {featureWidgetNamingIssues, isAppSharedWidgetSource} from "./lib/component_naming.mjs";
import {
  buildLineStarts,
  collectClassDeclarations,
  collectWidgetClasses,
  collectWidgetStateClasses,
  resolveWidgetTypeNames,
} from "./lib/new_widget_inventory_declarations.mjs";
import {
  isGeneratedProductionWidgetDartPath,
  productionWidgetGlobs,
  productionWidgetRoots,
} from "./lib/production_widget_roots.mjs";

const DEFAULT_OUTPUT = "build/reports/widget_classification.json";

export function buildWidgetClassification({
  repoRoot = fromRepo("."),
  updated = new Date().toISOString().slice(0, 10),
} = {}) {
  const contractsPath = path.join(repoRoot, "design/components/catch.components.json");
  const widgetbookPath = path.join(repoRoot, "widgetbook/lib/main.directories.g.dart");
  const contracts = readJson(contractsPath).components ?? [];
  const contractsBySymbol = buildContractSymbolMap(contracts);
  const widgetbookNames = readWidgetbookNames(widgetbookPath);
  const widgets = collectProductionWidgetClassificationDeclarations({repoRoot})
    .map((declaration) => classifyDeclaration(
      declaration,
      {contractsBySymbol, widgetbookNames},
    ));

  widgets.sort((a, b) => a.file.localeCompare(b.file) || a.name.localeCompare(b.name));
  return {
    version: 2,
    updated,
    sourceOfTruth: {
      scope:
        `On-demand inventory for production Flutter widget and widget-state classes under ${productionWidgetGlobs.join(", ")}. Widgetbook/test scaffolds are intentionally out of scope.`,
      canonicalContracts:
        "design/components/catch.components.json owns canonical global component contracts and governance metadata.",
      catalog:
        "widgetbook/lib/main.directories.g.dart is the generated review-surface inventory used to determine catalog coverage.",
      privateHelperPolicy:
        "Private helper widgets are not an allowed destination. Private widget classes must be promoted, merged into a canonical public widget, or inlined/deleted.",
      generator: "tool/design/generate_widget_classification.mjs",
    },
    summary: summarize(widgets, widgetbookNames),
    widgets,
  };
}

export function collectProductionWidgetClassificationDeclarations({
  repoRoot = fromRepo("."),
} = {}) {
  const sources = [];
  for (const root of productionWidgetRoots) {
    for (const filePath of listDartFiles(path.join(repoRoot, root))) {
      const file = path.relative(repoRoot, filePath).split(path.sep).join("/");
      if (isGeneratedProductionWidgetDartPath(file)) continue;
      const source = fs.readFileSync(filePath, "utf8");
      sources.push({file, source, imports: collectImports(source)});
    }
  }
  return collectWidgetClassificationDeclarations(sources);
}

export function collectWidgetClassificationDeclarations(sources) {
  const prepared = sources.map((entry) => ({
    ...entry,
    imports: entry.imports ?? collectImports(entry.source),
    lineStarts: buildLineStarts(entry.source),
  }));
  const widgetTypeNames = resolveWidgetTypeNames(
    prepared.flatMap(({source, lineStarts}) =>
      collectClassDeclarations(source, lineStarts),
    ),
  );

  return prepared.flatMap(({file, source, imports, lineStarts}) => [
    ...collectWidgetClasses(source, lineStarts, widgetTypeNames).map(
      (declaration) => ({
        ...declaration,
        file,
        imports,
        source,
        classKind: "widget",
      }),
    ),
    ...collectWidgetStateClasses(source, lineStarts).map((declaration) => ({
      ...declaration,
      file,
      imports,
      source,
      classKind: "widget-state",
    })),
  ]);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function listDartFiles(root) {
  if (!fs.existsSync(root)) return [];
  const results = [];
  for (const entry of fs.readdirSync(root, {withFileTypes: true})) {
    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      results.push(...listDartFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith(".dart")) {
      results.push(fullPath);
    }
  }
  return results;
}

function readWidgetbookNames(widgetbookPath) {
  if (!fs.existsSync(widgetbookPath)) return new Set();
  const source = fs.readFileSync(widgetbookPath, "utf8");
  const names = new Set();
  for (const match of source.matchAll(/WidgetbookComponent\(\s*name: '([^']+)'/gu)) {
    const name = match[1];
    names.add(name);
    names.add(name.replace(/<.*>$/u, ""));
  }
  return names;
}

function buildContractSymbolMap(components) {
  const map = new Map();
  for (const component of components) {
    if (component.dart?.symbol) {
      map.set(component.dart.symbol, {
        id: component.id,
        parentId: component.id,
        symbol: component.dart.symbol,
        component,
        member: null,
        governance: component.governance,
      });
    }
    for (const member of component.contract?.members ?? []) {
      map.set(member.symbol, {
        id: member.id,
        parentId: component.id,
        symbol: member.symbol,
        component,
        member,
        governance: member.governance,
      });
    }
  }
  return map;
}

function collectImports(source) {
  return [...source.matchAll(/^import\s+['"]([^'"]+)['"]/gmu)].map(
    (match) => match[1],
  );
}

function classifyDeclaration(entry, {contractsBySymbol, widgetbookNames}) {
  const contract = contractsBySymbol.get(entry.name);
  const visibility = entry.name.startsWith("_") ? "private" : "public";
  const role = roleFor(entry, contract);
  const catalogStatus = catalogStatusFor(entry, contract, visibility, widgetbookNames);
  const flags = flagsFor(entry, role, contract, catalogStatus, visibility);
  const decision = decisionFor(entry, contract, catalogStatus, visibility, flags);
  const governance = governanceFor(entry, role);
  const concept = conceptFor(entry, contract, role);

  return {
    name: entry.name,
    file: entry.file,
    classKind: entry.classKind,
    baseClass: entry.baseClass,
    visibility,
    role,
    canonicalFamily: contract?.parentId ?? canonicalFamilyFor(entry, role),
    publicApi: entry.classKind === "widget" && visibility === "public",
    catalogStatus,
    contractId: contract?.id ?? null,
    conceptRole: concept.conceptRole,
    conceptId: concept.conceptId,
    parentConceptId: concept.parentConceptId,
    qualifier: concept.qualifier,
    collisionKey: concept.conceptRole === null
      ? null
      : collisionKeyFor({
          conceptRole: concept.conceptRole,
          conceptId: concept.conceptId,
          symbol: entry.name,
        }),
    decisionRef: concept.decisionRef,
    allowedDependencyLevel: governance.allowedDependencyLevel,
    stateOwnership: governance.stateOwnership,
    asyncOwnership: governance.asyncOwnership,
    layoutOwnership: governance.layoutOwnership,
    actionOwnership: governance.actionOwnership,
    decision,
    remediationOptions: remediationOptionsFor(decision, entry, flags),
    flags,
  };
}

function conceptFor(entry, contract, role) {
  if (entry.classKind === "widget-state") {
    return {
      conceptRole: null,
      conceptId: null,
      parentConceptId: null,
      qualifier: null,
      decisionRef: null,
    };
  }
  if (contract) {
    const value = contract.governance ?? {};
    return {
      conceptRole: value.conceptRole ?? "unclassified",
      conceptId: value.conceptId ?? null,
      parentConceptId: value.parentConceptId ?? null,
      qualifier: value.qualifier ?? null,
      decisionRef: value.decisionRef ?? null,
    };
  }
  return {
    conceptRole: role === "screen" ? "screen" : "composition",
    conceptId: null,
    parentConceptId: null,
    qualifier: null,
    decisionRef: role === "screen"
      ? "generated-rule:screen-boundary"
      : "generated-rule:uncontracted-composition",
  };
}

function roleFor(entry, contract) {
  if (entry.classKind === "widget-state") return "widget-state";
  if (contract?.component?.governance?.role === "atom") return "atom";
  if (contract?.component?.governance?.role === "composition") return "composition";
  if (contract?.component?.governance?.role === "pattern") return "pattern";
  if (isScreen(entry.name, entry.file)) return "screen";
  if (isAtom(entry.name, entry.file)) return "atom";
  if (isComposition(entry.name, entry.file)) return "composition";
  if (entry.file.includes("/presentation/widgets/") || entry.file.includes("/presentation/")) {
    return "feature-adapter";
  }
  return "feature-adapter";
}

function isScreen(name, file) {
  return (
    /(?:Screen|Page|Route|App)$/.test(name) ||
    file.includes("/presentation/") && !file.includes("/widgets/") && /screen\.dart$/.test(file)
  );
}

function isAtom(name, file) {
  return (
    isAppSharedWidgetSource(file) &&
    /(?:Badge|Button|Chip|Field|Avatar|Icon|Toggle|Slider|Pill|Dot|Input|Image|Label|Kicker|Ring)$/.test(name)
  );
}

function isComposition(name, file) {
  return (
    isAppSharedWidgetSource(file) ||
    /(?:Section|Rail|List|Grid|Dock|TopBar|BottomSheet|Sheet|Dialog|Card|Menu|Header|Footer|Stepper|TabBar|Scaffold|Body|Shell|Layout|Tile|Row|Panel)$/.test(name)
  );
}

function catalogStatusFor(entry, contract, visibility, widgetbookNames) {
  if (contract) return "contracted";
  if (entry.classKind === "widget-state") return "not-applicable";
  if (widgetbookNames.has(entry.name)) return "cataloged";
  if (visibility === "private") return "uncataloged";
  if (isScreen(entry.name, entry.file)) return widgetbookNames.has(entry.name) ? "cataloged" : "route-covered";
  return "uncataloged";
}

function flagsFor(entry, role, contract, catalogStatus, visibility) {
  const flags = featureWidgetNamingIssues({...entry, visibility});
  const imports = entry.imports.join("\n");
  if (visibility === "private" && entry.classKind === "widget") {
    flags.push("private-widget-publicization-required");
  }
  if (entry.classKind === "widget" && visibility === "public" && catalogStatus === "uncataloged") {
    flags.push("public-widget-missing-widgetbook");
  }
  if (role === "atom" || role === "composition" || role === "pattern") {
    if (/flutter_riverpod|hooks_riverpod|riverpod/iu.test(imports)) {
      flags.push("primitive-imports-provider-layer");
    }
    if (/go_router/iu.test(imports)) {
      flags.push("primitive-imports-routing-layer");
    }
    if (/\/data\/|repository|Repository/iu.test(imports)) {
      flags.push("primitive-imports-data-layer");
    }
  }
  if (!contract && isAppSharedWidgetSource(entry.file) && entry.classKind === "widget") {
    flags.push("core-widget-without-contract");
  }
  return flags.sort();
}

function decisionFor(entry, contract, catalogStatus, visibility, flags) {
  if (entry.classKind === "widget-state") return "keep-widget-state";
  if (contract) return "keep-canonical-contract";
  if (visibility === "private") return "review-promote-or-inline";
  if (flags.includes("core-widget-without-contract")) return "review-promote-or-consolidate";
  if (catalogStatus === "cataloged" || catalogStatus === "route-covered") {
    return "keep-public-cataloged";
  }
  if (isScreen(entry.name, entry.file)) return "review-screen-boundary";
  return "review-catalog-coverage";
}

function governanceFor(entry, role) {
  if (role === "widget-state") {
    return {
      allowedDependencyLevel: "owning-widget-state",
      stateOwnership: "owning-widget-state",
      asyncOwnership: "owning-widget-state",
      layoutOwnership: "owning-widget-state",
      actionOwnership: "owning-widget-state",
    };
  }
  if (role === "screen") {
    return {
      allowedDependencyLevel: "route-boundary",
      stateOwnership: "screen-owned",
      asyncOwnership: "screen-owned",
      layoutOwnership: "page-safe-area-sliver",
      actionOwnership: "navigation-and-controller-calls",
    };
  }
  if (role === "atom") {
    return {
      allowedDependencyLevel: "tokens-and-primitives",
      stateOwnership: "local-ui-only",
      asyncOwnership: "none",
      layoutOwnership: "internal-only",
      actionOwnership: "callbacks-only",
    };
  }
  if (role === "composition" || role === "pattern") {
    return {
      allowedDependencyLevel: "primitives-and-slots",
      stateOwnership: "slot-state-only",
      asyncOwnership: "none",
      layoutOwnership: "slot-layout",
      actionOwnership: "callbacks-only",
    };
  }
  return {
    allowedDependencyLevel: "feature-display-models",
    stateOwnership: "feature-display-state",
    asyncOwnership: "display-state-only",
    layoutOwnership: "feature-section-layout",
    actionOwnership: "feature-callbacks",
  };
}

function remediationOptionsFor(decision, entry, flags) {
  if (entry.classKind === "widget-state") {
    return ["moveStateToController", "routeThroughScreenState"];
  }
  if (decision === "keep-canonical-contract") return ["keepPublicCataloged", "mergeIntoCanonical"];
  if (decision === "keep-public-cataloged") return ["keepPublicCataloged", "mergeIntoCanonical"];
  if (decision === "review-screen-boundary") {
    return ["keepPublicCataloged", "routeThroughScreenState", "mergeIntoCanonical"];
  }
  if (flags.includes("private-widget-publicization-required")) {
    return ["promoteToPublicCatalog", "mergeIntoCanonical", "inlineDelete"];
  }
  return ["promoteToCanonicalContract", "promoteToPublicCatalog", "mergeIntoCanonical", "inlineDelete"];
}

function canonicalFamilyFor(entry, role) {
  if (role === "widget-state") {
    return `state.${slug(targetWidgetName(entry.baseClass) ?? entry.name)}`;
  }
  if (role === "screen") return `screen.${slug(entry.name)}`;
  if (role === "atom" || role === "composition" || role === "pattern") {
    return `catch.${slug(entry.name.replace(/^Catch/u, ""))}`;
  }
  const feature = entry.file.split("/")[1] ?? "app";
  return `feature.${slug(feature)}.${slug(entry.name)}`;
}

function targetWidgetName(baseClass) {
  return baseClass.match(/<([^>]+)>/u)?.[1]?.replace(/^_+/, "") ?? null;
}

function slug(value) {
  return value
    .replace(/^_+/, "")
    .replace(/([a-z0-9])([A-Z])/gu, "$1_$2")
    .replace(/[^A-Za-z0-9]+/gu, "_")
    .replace(/^_+|_+$/gu, "")
    .toLowerCase();
}

function summarize(rows, widgetbookNames) {
  const publicWidgets = rows.filter(
    (row) => row.classKind === "widget" && row.visibility === "public",
  );
  const collisions = collisionGroups(publicWidgets);
  return {
    total: rows.length,
    widgetClasses: rows.filter((row) => row.classKind === "widget").length,
    stateClasses: rows.filter((row) => row.classKind === "widget-state").length,
    publicClasses: rows.filter((row) => row.visibility === "public").length,
    privateClasses: rows.filter((row) => row.visibility === "private").length,
    byRole: countBy(rows, "role"),
    byDecision: countBy(rows, "decision"),
    byCatalogStatus: countBy(rows, "catalogStatus"),
    conceptCount: new Set(
      publicWidgets
        .filter((row) => row.conceptRole === "concept")
        .map((row) => row.conceptId),
    ).size,
    memberClassCount: publicWidgets.filter((row) => row.conceptRole === "member").length,
    compositionClassCount: publicWidgets.filter((row) => row.conceptRole === "composition").length,
    screenClassCount: publicWidgets.filter((row) => row.conceptRole === "screen").length,
    unclassifiedCount: publicWidgets.filter((row) => row.conceptRole === "unclassified").length,
    byConceptRole: countBy(publicWidgets, "conceptRole"),
    collisionGroupCount: collisions.length,
    collisions,
    widgetbookCoverage: {
      conceptPrimaries: publicWidgets.filter((row) => row.conceptRole === "concept").length,
      conceptPrimariesCataloged: publicWidgets.filter(
        (row) => row.conceptRole === "concept" && widgetbookNames.has(row.name),
      ).length,
      memberClasses: publicWidgets.filter((row) => row.conceptRole === "member").length,
      memberClassesCataloged: publicWidgets.filter(
        (row) => row.conceptRole === "member" && widgetbookNames.has(row.name),
      ).length,
      compositionsCataloged: publicWidgets.filter(
        (row) => row.conceptRole === "composition" && widgetbookNames.has(row.name),
      ).length,
      screensCataloged: publicWidgets.filter(
        (row) => row.conceptRole === "screen" && widgetbookNames.has(row.name),
      ).length,
    },
  };
}

function collisionGroups(rows) {
  const groups = new Map();
  for (const row of rows) {
    if (!row.collisionKey) continue;
    const values = groups.get(row.collisionKey) ?? [];
    values.push(row.name);
    groups.set(row.collisionKey, values);
  }
  return [...groups.entries()]
    .map(([key, names]) => ({key, names: [...new Set(names)].sort()}))
    .filter((entry) => entry.names.length > 1)
    .sort((a, b) => a.key.localeCompare(b.key));
}

function countBy(rows, field) {
  return Object.fromEntries(
    [...rows.reduce((map, row) => map.set(row[field], (map.get(row[field]) ?? 0) + 1), new Map())]
      .sort(([a], [b]) => a.localeCompare(b)),
  );
}

function parseArgs(argv) {
  const valueAfter = (flag) => {
    const index = argv.indexOf(flag);
    if (index === -1) return null;
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) throw new Error(`${flag} requires a value`);
    return value;
  };
  return {
    check: argv.includes("--check"),
    json: argv.includes("--json"),
    help: argv.includes("--help") || argv.includes("-h"),
    output: valueAfter("--out"),
    repoRoot: path.resolve(valueAfter("--repo-root") ?? fromRepo(".")),
  };
}

function runCli(argv) {
  const args = parseArgs(argv);
  if (args.help) {
    console.log(`Usage:
  node tool/design/generate_widget_classification.mjs [--check] [--json]
    [--repo-root <path>] [--out <path>]

Builds the current widget classification from Dart, component contracts, and
Widgetbook. Check/JSON modes are read-only; explicit generation writes an
ignored build report unless --out is supplied.`);
    return;
  }
  const registry = buildWidgetClassification({repoRoot: args.repoRoot});
  if (!args.check && !args.json) {
    const outputPath = path.resolve(args.repoRoot, args.output ?? DEFAULT_OUTPUT);
    fs.mkdirSync(path.dirname(outputPath), {recursive: true});
    fs.writeFileSync(outputPath, `${JSON.stringify(registry, null, 2)}\n`);
    console.log(
      `Wrote ${path.relative(args.repoRoot, outputPath)} (${registry.widgets.length} entries).`,
    );
    return;
  }
  if (args.json) process.stdout.write(`${JSON.stringify(registry, null, 2)}\n`);
  else console.log(`Widget classification source is valid (${registry.widgets.length} entries).`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    runCli(process.argv.slice(2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
