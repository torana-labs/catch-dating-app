#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {spawnSync} from "node:child_process";
import {fromRepo, relativeToRepo} from "../lib/repo_paths.mjs";
import {isAppSharedWidgetSource} from "./lib/component_naming.mjs";

const JACCARD_STRONG = 0.55;
const SMALL_WIDGET_MULTISET_JACCARD = 0.75;
const SMALL_WIDGET_MAX_TOKENS = 40;
const RANKED_PAIR_COUNT = 200;
const SHINGLE_K = 2;
const SKIP_TRIVIAL_TOKENS = 8;

const args = process.argv.slice(2);
const shouldCheck = args.includes("--check");
const shouldJson = args.includes("--json");
const explicitFingerprintsPath = valueAfter("--fingerprints");
let fingerprintsPath = explicitFingerprintsPath;
let fingerprintsLabel = valueAfter("--fingerprints-label");
const outputPath = valueAfter("--out") ?? "build/reports/widget_similarity.json";
const visualPath = valueAfter("--visual");
const today = new Date().toISOString().slice(0, 10);

if (args.includes("--help") || args.includes("-h")) {
  console.log(`Usage:
  node tool/design/build_widget_similarity.mjs [--fingerprints path] [--fingerprints-label path] [--out path] [--visual path] [--check] [--json]

Builds mechanical widget similarity from explicit Phase A fingerprints, or
generates current fingerprints in a temporary directory when none are supplied.
`);
  process.exit(0);
}

let cleanupFingerprints = () => {};
if (fingerprintsPath == null) {
  const prepared = extractCurrentFingerprints();
  fingerprintsPath = prepared.path;
  fingerprintsLabel ??= "ephemeral:current-source";
  cleanupFingerprints = prepared.cleanup;
} else {
  fingerprintsLabel ??= fingerprintsPath;
}

try {
  const registry = buildRegistry();
  const absoluteOutputPath = fromRepo(outputPath);

  if (shouldCheck) {
    JSON.parse(JSON.stringify(registry));
  } else {
    fs.mkdirSync(path.dirname(absoluteOutputPath), {recursive: true});
    fs.writeFileSync(absoluteOutputPath, JSON.stringify(registry, null, 2) + "\n");
  }

  if (shouldJson) {
    console.log(JSON.stringify(registry, null, 2));
  } else {
    console.log(
      `Widget similarity: ${registry.summary.widgets} widgets, ` +
        `${registry.summary.clusters} clusters, ` +
        `${registry.summary.rankedPairs} ranked pairs, ` +
        `${registry.summary.nameFamilies} name families, ` +
        `${registry.summary.absorbCandidates} absorb candidates.`,
    );
  }
} finally {
  cleanupFingerprints();
}

function extractCurrentFingerprints() {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "catch-widget-fingerprints-"));
  const classification = path.join(tempRoot, "classification.json");
  const output = path.join(tempRoot, "fingerprints.json");
  const classificationResult = spawnSync(
    process.execPath,
    [
      "tool/design/generate_widget_classification.mjs",
      "--out",
      relativeToRepo(classification),
    ],
    {cwd: fromRepo("."), encoding: "utf8"},
  );
  if (classificationResult.status !== 0) {
    fs.rmSync(tempRoot, {recursive: true, force: true});
    throw new Error(
      `Widget classification generation failed: ${classificationResult.error?.message ?? classificationResult.stderr ?? classificationResult.stdout}`,
    );
  }
  const result = spawnSync(
    "dart",
    [
      "run",
      "tool/widget_dedupe/bin/extract_fingerprints.dart",
      "--classification",
      relativeToRepo(classification),
      "--out",
      relativeToRepo(output),
    ],
    {cwd: fromRepo("."), encoding: "utf8"},
  );
  if (result.status !== 0) {
    fs.rmSync(tempRoot, {recursive: true, force: true});
    throw new Error(
      `Widget fingerprint extraction failed: ${result.error?.message ?? result.stderr ?? result.stdout}`,
    );
  }
  return {
    path: relativeToRepo(output),
    cleanup: () => fs.rmSync(tempRoot, {recursive: true, force: true}),
  };
}

function buildRegistry() {
  const fingerprints = readJson(fromRepo(fingerprintsPath));
  const contracts =
    readJson(fromRepo("design/components/catch.components.json")).components ?? [];
  const decisions =
    readJson(fromRepo("docs/design_parity/widget_consolidation/decisions.json")).decisions ?? [];
  const decisionIndex = buildDecisionIndex(decisions);
  const contractedSymbols = collectContractedSymbols(contracts);
  const allWidgets = (fingerprints.widgets ?? [])
    .map(normalizeWidget)
    .sort(byNameFile);
  const widgetsByName = new Map(allWidgets.map((widget) => [widget.name, widget]));
  const candidateWidgets = allWidgets.filter(
    (widget) => widget.coarseTokenStreamLength >= SKIP_TRIVIAL_TOKENS,
  );
  const skippedTrivial = allWidgets
    .filter((widget) => widget.coarseTokenStreamLength < SKIP_TRIVIAL_TOKENS)
    .map((widget) => widget.name)
    .sort();
  const usageCounts = computeUsageCounts(allWidgets);
  for (const widget of allWidgets) {
    widget.usageCountRaw = usageCounts.get(widget.name) ?? 0;
    widget.usageCountNote =
      "raw word-boundary count across lib/ and widgetbook/lib/ excluding generated files and defining file; may include name collisions";
  }

  const visual = readVisualEdges(visualPath);
  const nameFamilies = buildNameFamilies(allWidgets);
  const visualPairMap = buildVisualPairMap(visual.edges);
  const exactEdges = [];
  const structuralEdges = [];
  const structuralCrossRoleEdges = [];
  const pairScores = [];

  forEachPair(candidateWidgets, (a, b) => {
    const jaccard = jaccardSets(a.shingles, b.shingles);
    const containment = containmentSets(a.shingles, b.shingles);
    const hamming = hammingHex(a.simhash128, b.simhash128);
    const smallWidgetScore =
      a.coarseTokenStreamLength < SMALL_WIDGET_MAX_TOKENS &&
      b.coarseTokenStreamLength < SMALL_WIDGET_MAX_TOKENS
        ? multisetJaccard(a.tokenMultiset, b.tokenMultiset)
        : 0;
    const structuralSignals = [];
    if (a.shapeHash === b.shapeHash || a.coarseShapeHash === b.coarseShapeHash) {
      structuralSignals.push("exact-shape");
    }
    if (jaccard >= JACCARD_STRONG) structuralSignals.push("structural");
    if (smallWidgetScore >= SMALL_WIDGET_MULTISET_JACCARD) {
      structuralSignals.push("small-widget");
    }
    const nameStems = sharedNameStems(nameFamilies, a.name, b.name);
    const visualMatch = visualPairMap.get(pairKey(a.name, b.name));
    const detectors = [];
    if (structuralSignals.length > 0) detectors.push("structural");
    if (nameStems.length > 0) detectors.push("name");
    if (visualMatch) detectors.push("visual");

    const flags = a.scope === b.scope ? [] : ["cross-role"];
    const pair = {
      a: a.name.localeCompare(b.name) <= 0 ? a.name : b.name,
      b: a.name.localeCompare(b.name) <= 0 ? b.name : a.name,
      jaccard,
      containment,
      score: Math.max(jaccard, containment),
      smallWidgetMultisetJaccard: smallWidgetScore,
      hamming,
      flags,
      detectors,
      signals: structuralSignals,
      nameStems,
      visualHamming: visualMatch?.hamming ?? null,
    };
    pairScores.push(pair);

    if (structuralSignals.length > 0) {
      if (structuralSignals.includes("exact-shape")) exactEdges.push(pair);
      if (flags.includes("cross-role")) structuralCrossRoleEdges.push(pair);
      else structuralEdges.push(pair);
    }
  });

  const pairScoresWithAbsorb = pairScores.map((pair) => ({
      ...pair,
      absorbCandidate: pairAbsorbCandidate(pair, widgetsByName, contractedSymbols),
    }));
  const rankedPairs = selectRankedPairs(pairScoresWithAbsorb, nameFamilies)
    .slice(0, RANKED_PAIR_COUNT)
    .map((pair, index) => ({
      ...rankedPairFor(pair, index + 1, widgetsByName, contractedSymbols),
      decisionRefs: decisionsForPair(pair, decisionIndex),
    }));

  const calibrationPairs = deterministicCalibrationPairs(pairScoresWithAbsorb);
  const calibration = buildCalibration(calibrationPairs);
  const calibratedStrong = Math.max(
    0,
    ...pairScoresWithAbsorb
      .filter((pair) => pair.jaccard >= JACCARD_STRONG)
      .map((pair) => pair.hamming),
  );
  const graphEdges = structuralEdges.filter((edge) => !edge.flags.includes("cross-role"));
  const components = connectedComponents(candidateWidgets, graphEdges);
  const clusterRows = components
    .filter((component) => component.length > 1)
    .map((members) =>
      enrichCluster(members, {
        contractedSymbols,
        structuralEdges: graphEdges,
        nameFamilies,
        visualEdges: visual.edges,
      }),
    )
    .sort((a, b) => b.score - a.score || a.slug.localeCompare(b.slug))
    .map((cluster, index) => ({
      id: `c${String(index + 1).padStart(3, "0")}-${cluster.slug}`,
      rank: index + 1,
      score: round(cluster.score),
      cohesion: round(cluster.cohesion),
      absorbCandidate: cluster.absorbCandidate,
      nameSignal: cluster.nameSignal,
      detectors: cluster.detectors,
      members: cluster.members.map((member) => member.name),
      paramCompatibility: {
        min: round(cluster.paramCompatibility.min),
        mean: round(cluster.paramCompatibility.mean),
      },
      structuralSignals: cluster.structuralSignals,
      visualBridges: cluster.visualBridges,
      scope: cluster.scope,
      decisionRef: decisionIndex.byMemberSet.get(memberSetKey(cluster.members.map((member) => member.name)))?.clusterId ?? null,
    }));

  const decidedClusters = clusterRows.filter((cluster) => cluster.decisionRef !== null).length;
  const decidedRankedPairs = rankedPairs.filter((pair) => pair.decisionRefs.length > 0).length;

  const groundTruthRecall = buildGroundTruthRecall({
    clusters: clusterRows,
    structuralEdges: [...structuralEdges, ...structuralCrossRoleEdges],
    rankedPairs,
    nameFamilies,
  });

  return {
    version: 2,
    updated: today,
    sourceOfTruth: {
      generator: "tool/design/build_widget_similarity.mjs",
      fingerprints: fingerprintsLabel,
      visualSignal: visual.signal,
      stream: "coarse",
      reviewEvidence:
        "Use the source decision ledger and review discussion; do not create tracked receipts.",
    },
    params: {
      jaccardStrong: JACCARD_STRONG,
      smallWidgetMultisetJaccard: SMALL_WIDGET_MULTISET_JACCARD,
      smallWidgetMaxTokens: SMALL_WIDGET_MAX_TOKENS,
      rankedPairCount: RANKED_PAIR_COUNT,
      shingleK: SHINGLE_K,
      stream: "coarse",
      simhashHammingStrong: calibratedStrong,
      visualHammingStrong: 6,
    },
    calibration,
    summary: {
      widgets: allWidgets.length,
      fingerprintFailures: (fingerprints.failures ?? []).length,
      exactClusters: countStructuralComponents(candidateWidgets, exactEdges),
      clusters: clusterRows.length,
      structuralEdges: structuralEdges.length,
      smallWidgetEdges: structuralEdges.filter((edge) =>
        edge.signals.includes("small-widget"),
      ).length,
      rankedPairs: rankedPairs.length,
      nameFamilies: nameFamilies.length,
      relatedEdges: structuralCrossRoleEdges.length,
      screenClusters: clusterRows.filter((cluster) => cluster.scope === "screen")
        .length,
      skippedTrivial: skippedTrivial.length,
      absorbCandidates: clusterRows.filter((cluster) => cluster.absorbCandidate)
        .length,
      ledgerDecisions: decisions.length,
      exactClusterDecisionCoverage: decidedClusters,
      unresolvedClusters: clusterRows.length - decidedClusters,
      rankedPairDecisionCoverage: decidedRankedPairs,
      unresolvedRankedPairs: rankedPairs.length - decidedRankedPairs,
    },
    groundTruthRecall,
    skippedTrivial,
    widgets: allWidgets.map((widget) => ({
      name: widget.name,
      file: widget.file,
      role: widget.role,
      shapeHash: widget.shapeHash,
      coarseShapeHash: widget.coarseShapeHash,
      simhash128: widget.simhash128,
      tokenStreamLength: widget.tokenStreamLength,
      coarseTokenStreamLength: widget.coarseTokenStreamLength,
      usageCountRaw: widget.usageCountRaw,
      usageCountNote: widget.usageCountNote,
      hasWidgetHelpers: widget.hasWidgetHelpers,
    })),
    clusters: clusterRows,
    rankedPairs,
    nameFamilies: nameFamilies.map((family, index) => ({
      id: `n${String(index + 1).padStart(3, "0")}-${slug(family.stem)}`,
      stem: family.stem,
      stemType: family.stemType,
      members: family.members.map((member) => member.name),
      usageSum: family.usageSum,
      scope: family.scope,
    })),
    relatedEdges: structuralCrossRoleEdges
      .sort((a, b) => b.jaccard - a.jaccard || a.a.localeCompare(b.a) || a.b.localeCompare(b.b))
      .map(formatPair),
  };
}

function buildDecisionIndex(decisions) {
  const byMemberSet = new Map();
  const bySymbol = new Map();
  for (const decision of decisions) {
    const names = [...new Set((decision.members ?? []).map((member) => member.name))].sort();
    if (names.length > 0) byMemberSet.set(memberSetKey(names), decision);
    for (const name of names) {
      const entries = bySymbol.get(name) ?? [];
      entries.push(decision);
      bySymbol.set(name, entries);
    }
  }
  return {byMemberSet, bySymbol};
}

function decisionsForPair(pair, index) {
  const left = index.bySymbol.get(pair.a) ?? [];
  return left
    .filter((decision) => (decision.members ?? []).some((member) => member.name === pair.b))
    .map((decision) => decision.clusterId)
    .sort();
}

function memberSetKey(names) {
  return [...new Set(names)].sort().join("\u001f");
}

function normalizeWidget(widget) {
  const tokenMultiset = new Map(
    Object.entries(widget.tokenMultiset ?? {}).map(([token, count]) => [
      token,
      Number(count),
    ]),
  );
  return {
    ...widget,
    scope: widget.role === "screen" ? "screen" : "widget",
    coarseShapeHash: widget.coarseShapeHash ?? widget.shapeHash,
    coarseTokenStreamLength:
      widget.coarseTokenStreamLength ?? widget.tokenStreamLength ?? 0,
    shingles: new Set(widget.shingles ?? []),
    tokenMultiset,
    paramNames: new Set(
      (widget.constructorParams ?? []).map((param) => param.name).filter(Boolean),
    ),
  };
}

function collectContractedSymbols(components) {
  const symbols = new Set();
  for (const component of components) {
    if (component.dart?.symbol) symbols.add(component.dart.symbol);
    for (const member of component.contract?.members ?? []) {
      if (member.symbol) symbols.add(member.symbol);
    }
  }
  return symbols;
}

function computeUsageCounts(widgets) {
  const sources = [];
  for (const root of ["lib", "widgetbook/lib"]) {
    for (const file of listFiles(fromRepo(root), ".dart")) {
      const relative = relativeToRepo(file);
      if (relative.endsWith(".g.dart")) continue;
      sources.push({file: relative, source: fs.readFileSync(file, "utf8")});
    }
  }
  const counts = new Map();
  for (const widget of widgets) {
    const regex = new RegExp(`\\b${escapeRegExp(widget.name)}\\b`, "gu");
    let count = 0;
    for (const source of sources) {
      if (source.file === widget.file) continue;
      count += [...source.source.matchAll(regex)].length;
    }
    counts.set(widget.name, count);
  }
  return counts;
}

function buildNameFamilies(widgets) {
  const candidates = new Map();
  for (const widget of widgets) {
    const parts = camelParts(widget.name).filter((part) => part !== "Catch");
    const stems = [];
    if (parts.length >= 2) {
      stems.push({stem: parts.slice(-2).join(""), stemType: "final-two"});
    }
    if (parts.length >= 3) {
      stems.push({
        stem: `${parts[0]}${parts.at(-1)}`,
        stemType: "outer",
      });
    }
    for (const {stem, stemType} of stems) {
      const key = `${stemType}:${stem}`;
      const bucket = candidates.get(key) ?? {stem, stemType, members: []};
      bucket.members.push(widget);
      candidates.set(key, bucket);
    }
  }

  const uniqueByMembers = new Map();
  for (const family of candidates.values()) {
    const members = family.members.sort(byNameFile);
    if (members.length < 2) continue;
    const memberKey = members.map((member) => member.name).join("|");
    const existing = uniqueByMembers.get(memberKey);
    if (
      existing &&
      family.stemType !== "final-two" &&
      existing.stemType === "final-two"
    ) {
      continue;
    }
    uniqueByMembers.set(memberKey, {
      ...family,
      members,
      usageSum: members.reduce((sum, member) => sum + member.usageCountRaw, 0),
      scope: members.every((member) => member.scope === members[0].scope)
        ? members[0].scope
        : "mixed",
    });
  }

  return [...uniqueByMembers.values()].sort(
    (a, b) =>
      b.members.length - a.members.length ||
      b.usageSum - a.usageSum ||
      a.stem.localeCompare(b.stem) ||
      a.stemType.localeCompare(b.stemType),
  );
}

function enrichCluster(
  members,
  {contractedSymbols, structuralEdges, nameFamilies, visualEdges},
) {
  const memberSet = new Set(members.map((member) => member.name));
  const pairJaccards = [];
  const paramScores = [];
  forEachPair(members, (a, b) => {
    pairJaccards.push(jaccardSets(a.shingles, b.shingles));
    paramScores.push(jaccardSets(a.paramNames, b.paramNames));
  });
  const cohesion = mean(pairJaccards);
  const absorbCandidate = members.some(
    (member) =>
      isAppSharedWidgetSource(member.file) ||
      contractedSymbols.has(member.name) ||
      member.contractId,
  );
  const usageTotal = members.reduce((sum, member) => sum + member.usageCountRaw, 0);
  const visualBridges = visualEdges
    .filter((edge) => memberSet.has(edge.a) || memberSet.has(edge.b))
    .filter((edge) => !(memberSet.has(edge.a) && memberSet.has(edge.b)))
    .sort(
      (a, b) =>
        a.hamming - b.hamming || a.a.localeCompare(b.a) || a.b.localeCompare(b.b),
    );
  const matchingNameFamilies = nameFamilies.filter(
    (family) =>
      family.members.filter((member) => memberSet.has(member.name)).length >= 2,
  );
  const detectors = ["structural"];
  if (matchingNameFamilies.length > 0) detectors.push("name");
  if (visualBridges.length > 0) detectors.push("visual");
  const score =
    cohesion *
    (usageTotal + members.length) *
    (absorbCandidate ? 2 : 1) *
    (visualBridges.length > 0 ? 1.25 : 1) *
    detectors.length;
  const clusterEdges = structuralEdges.filter(
    (edge) => memberSet.has(edge.a) && memberSet.has(edge.b),
  );
  const structuralSignals = [...new Set(clusterEdges.flatMap((edge) => edge.signals))]
    .sort();

  return {
    slug: slugForCluster(members),
    score,
    cohesion,
    absorbCandidate,
    nameSignal: commonSuffix(members.map((member) => member.name)),
    detectors,
    members: members.sort(byNameFile),
    paramCompatibility: {
      min: paramScores.length === 0 ? 1 : Math.min(...paramScores),
      mean: mean(paramScores),
    },
    structuralSignals,
    visualBridges,
    scope: members[0].scope,
  };
}

function rankedPairFor(pair, rank, widgetsByName, contractedSymbols) {
  return {
    rank,
    ...formatPair(pair),
    absorbCandidate:
      pair.absorbCandidate ??
      pairAbsorbCandidate(pair, widgetsByName, contractedSymbols),
  };
}

function selectRankedPairs(pairs, nameFamilies) {
  const byKey = new Map(pairs.map((pair) => [pairKey(pair.a, pair.b), pair]));
  const selected = new Map();
  const addSelected = (pair, source) => {
    const key = pairKey(pair.a, pair.b);
    const current = selected.get(key);
    const sources = current?.sources ?? new Set();
    sources.add(source);
    selected.set(key, {pair, sources});
  };

  for (const pair of [...pairs].sort(compareRawPairScore).slice(0, RANKED_PAIR_COUNT)) {
    addSelected(pair, "top-score");
  }
  for (const family of nameFamilies) {
    const members = family.members.map((member) => member.name);
    let best = null;
    for (let i = 0; i < members.length; i += 1) {
      for (let j = i + 1; j < members.length; j += 1) {
        const pair = byKey.get(pairKey(members[i], members[j]));
        if (pair && (best == null || compareRankedPair(pair, best) < 0)) {
          best = pair;
        }
      }
    }
    if (best) addSelected(best, "name-family");
  }

  return [...selected.values()]
    .map(({pair, sources}) => ({
      ...pair,
      selectionSources: [...sources].sort(),
    }))
    .sort(compareRankedPair);
}

function compareRankedPair(a, b) {
  return (
    b.detectors.length - a.detectors.length ||
    Number(b.absorbCandidate) - Number(a.absorbCandidate) ||
    b.score - a.score ||
    b.containment - a.containment ||
    b.jaccard - a.jaccard ||
    b.smallWidgetMultisetJaccard - a.smallWidgetMultisetJaccard ||
    a.a.localeCompare(b.a) ||
    a.b.localeCompare(b.b)
  );
}

function compareRawPairScore(a, b) {
  return (
    b.score - a.score ||
    b.containment - a.containment ||
    b.jaccard - a.jaccard ||
    a.a.localeCompare(b.a) ||
    a.b.localeCompare(b.b)
  );
}

function formatPair(pair) {
  return {
    a: pair.a,
    b: pair.b,
    jaccard: round(pair.jaccard),
    containment: round(pair.containment),
    score: round(pair.score),
    smallWidgetMultisetJaccard: round(pair.smallWidgetMultisetJaccard),
    hamming: pair.hamming,
    flags: pair.flags,
    detectors: pair.detectors,
    signals: pair.signals,
    nameStems: pair.nameStems ?? [],
    visualHamming: pair.visualHamming ?? null,
    selectionSources: pair.selectionSources ?? [],
  };
}

function pairAbsorbCandidate(pair, widgetsByName, contractedSymbols) {
  const a = widgetsByName.get(pair.a);
  const b = widgetsByName.get(pair.b);
  return isAbsorbWidget(a, contractedSymbols) || isAbsorbWidget(b, contractedSymbols);
}

function isAbsorbWidget(widget, contractedSymbols) {
  return Boolean(
    widget &&
      (isAppSharedWidgetSource(widget.file) ||
        contractedSymbols.has(widget.name) ||
        widget.contractId),
  );
}

function buildVisualPairMap(edges) {
  const byPair = new Map();
  for (const edge of edges) {
    byPair.set(pairKey(edge.a, edge.b), edge);
  }
  return byPair;
}

function sharedNameStems(nameFamilies, a, b) {
  return nameFamilies
    .filter((family) => {
      const members = new Set(family.members.map((member) => member.name));
      return members.has(a) && members.has(b);
    })
    .map((family) => family.stem)
    .sort();
}

function pairKey(a, b) {
  return a.localeCompare(b) <= 0 ? `${a}|${b}` : `${b}|${a}`;
}

function connectedComponents(widgets, edges) {
  const byName = new Map(widgets.map((widget) => [widget.name, widget]));
  const parent = new Map(widgets.map((widget) => [widget.name, widget.name]));
  for (const edge of edges) union(parent, edge.a, edge.b);
  const groups = new Map();
  for (const widget of widgets) {
    const root = find(parent, widget.name);
    const bucket = groups.get(root) ?? [];
    bucket.push(byName.get(widget.name));
    groups.set(root, bucket);
  }
  return [...groups.values()];
}

function union(parent, a, b) {
  const rootA = find(parent, a);
  const rootB = find(parent, b);
  if (rootA === rootB) return;
  if (rootA.localeCompare(rootB) < 0) parent.set(rootB, rootA);
  else parent.set(rootA, rootB);
}

function find(parent, value) {
  const current = parent.get(value);
  if (current === value) return value;
  const root = find(parent, current);
  parent.set(value, root);
  return root;
}

function countStructuralComponents(widgets, edges) {
  return connectedComponents(widgets, edges).filter((group) => group.length > 1)
    .length;
}

function deterministicCalibrationPairs(pairScores) {
  const sample = pairScores
    .map((pair) => ({pair, sampleKey: stableHash(`${pair.a}|${pair.b}`)}))
    .sort((a, b) => a.sampleKey - b.sampleKey || a.pair.a.localeCompare(b.pair.a))
    .slice(0, 2000)
    .map((entry) => entry.pair);
  const suffixPairs = pairScores.filter((pair) => sharesSuffix(pair.a, pair.b));
  const byKey = new Map();
  for (const pair of [...sample, ...suffixPairs]) {
    byKey.set(`${pair.a}|${pair.b}`, pair);
  }
  return [...byKey.values()];
}

function buildCalibration(pairs) {
  const buckets = new Map();
  for (const pair of pairs) {
    const start = Math.floor(pair.hamming / 5) * 5;
    const label = `${start}-${start + 4}`;
    const bucket = buckets.get(label) ?? [];
    bucket.push(pair.jaccard);
    buckets.set(label, bucket);
  }
  return [...buckets.entries()]
    .sort(([a], [b]) => Number(a.split("-")[0]) - Number(b.split("-")[0]))
    .map(([label, values]) => ({
      hammingBucket: label,
      pairs: values.length,
      jaccardMin: round(Math.min(...values)),
      jaccardMean: round(mean(values)),
      jaccardMax: round(Math.max(...values)),
    }));
}

function buildGroundTruthRecall({
  clusters,
  structuralEdges,
  rankedPairs,
  nameFamilies,
}) {
  const cases = [
    {
      id: "share-card-sheet-absorb",
      members: ["ChatShareCardSheet", "CatchShareCardSheet"],
      expectedDetectors: ["ranked-pair"],
    },
    {
      id: "share-card-family",
      members: ["ChatShareCard", "OrganizerShareCard", "EventShareCard"],
      expectedDetectors: ["name"],
    },
    {
      id: "loading-card-family",
      members: [
        "DashboardFocusLoadingCard",
        "HostPaymentAccountLoadingCard",
        "OrganizerDirectorySkeletonCard",
      ],
      expectedDetectors: ["name", "ranked-pair"],
    },
  ];

  return cases.map((entry) => {
    const detectors = new Set();
    const structuralMatches = structuralEdges.filter((edge) =>
      pairIntersectsMembers(edge, entry.members),
    );
    if (structuralMatches.length > 0) detectors.add("structural");
    if (structuralMatches.some((edge) => edge.signals.includes("small-widget"))) {
      detectors.add("small-widget");
    }
    if (
      clusters.some(
        (cluster) =>
          cluster.members.filter((member) => entry.members.includes(member))
            .length >= 2,
      )
    ) {
      detectors.add("structural");
    }
    const rankedMatches = rankedPairs.filter((pair) =>
      pairIntersectsMembers(pair, entry.members),
    );
    if (rankedMatches.length > 0) detectors.add("ranked-pair");
    const nameMatches = nameFamilies.filter(
      (family) =>
        family.members.filter((member) => entry.members.includes(member.name))
          .length >= 2,
    );
    if (nameMatches.length > 0) detectors.add("name");

    const detected = [...detectors].sort();
    const missingExpected = entry.expectedDetectors.filter(
      (detector) => !detectors.has(detector),
    );
    return {
      ...entry,
      detectors: detected,
      found: missingExpected.length === 0,
      missingExpected,
      examples: {
        clusters: clusters
          .filter(
            (cluster) =>
              cluster.members.filter((member) => entry.members.includes(member))
                .length >= 2,
          )
          .map((cluster) => cluster.id),
        rankedPairs: rankedMatches.slice(0, 5).map((pair) => ({
          a: pair.a,
          b: pair.b,
          rank: pair.rank,
          score: pair.score,
          containment: pair.containment,
          jaccard: pair.jaccard,
        })),
        nameFamilies: nameMatches.slice(0, 5).map((family) => family.stem),
      },
    };
  });
}

function pairIntersectsMembers(pair, members) {
  return members.includes(pair.a) && members.includes(pair.b);
}

function readVisualEdges(file) {
  if (!file) {
    return {signal: "unavailable: visual hash registry not supplied", edges: []};
  }
  const resolved = fromRepo(file);
  if (!fs.existsSync(resolved)) {
    return {signal: `unavailable: ${file} not found`, edges: []};
  }
  const parsed = readJson(resolved);
  return {signal: "available", edges: parsed.edges ?? []};
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function listFiles(root, extension) {
  if (!fs.existsSync(root)) return [];
  const files = [];
  for (const entry of fs.readdirSync(root, {withFileTypes: true})) {
    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) files.push(...listFiles(fullPath, extension));
    else if (entry.isFile() && entry.name.endsWith(extension)) files.push(fullPath);
  }
  return files;
}

function forEachPair(values, callback) {
  for (let i = 0; i < values.length; i += 1) {
    for (let j = i + 1; j < values.length; j += 1) {
      callback(values[i], values[j]);
    }
  }
}

function jaccardSets(a, b) {
  if (a.size === 0 && b.size === 0) return 1;
  let intersection = 0;
  for (const value of a) if (b.has(value)) intersection += 1;
  return intersection / (a.size + b.size - intersection);
}

function containmentSets(a, b) {
  if (a.size === 0 && b.size === 0) return 1;
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const value of a) if (b.has(value)) intersection += 1;
  return intersection / Math.min(a.size, b.size);
}

function multisetJaccard(a, b) {
  const keys = new Set([...a.keys(), ...b.keys()]);
  let intersection = 0;
  let union = 0;
  for (const key of keys) {
    const left = a.get(key) ?? 0;
    const right = b.get(key) ?? 0;
    intersection += Math.min(left, right);
    union += Math.max(left, right);
  }
  return union === 0 ? 1 : intersection / union;
}

function hammingHex(a, b) {
  let distance = 0;
  for (let index = 0; index < Math.min(a.length, b.length); index += 1) {
    distance += bitCount(parseInt(a[index], 16) ^ parseInt(b[index], 16));
  }
  return distance + Math.abs(a.length - b.length) * 4;
}

function bitCount(value) {
  let count = 0;
  while (value !== 0) {
    count += value & 1;
    value >>= 1;
  }
  return count;
}

function sharesSuffix(a, b) {
  const aParts = camelParts(a);
  const bParts = camelParts(b);
  return aParts.at(-1) === bParts.at(-1);
}

function commonSuffix(names) {
  if (names.length === 0) return null;
  const split = names.map(camelParts);
  const suffix = [];
  for (let offset = 1; ; offset += 1) {
    const value = split[0].at(-offset);
    if (!value || !split.every((parts) => parts.at(-offset) === value)) break;
    suffix.unshift(value);
  }
  return suffix.length === 0 ? null : suffix.join("");
}

function camelParts(name) {
  return name.match(/[A-Z]+(?=[A-Z][a-z]|$)|[A-Z]?[a-z0-9]+/gu) ?? [name];
}

function slugForCluster(members) {
  const suffix = commonSuffix(members.map((member) => member.name));
  const base = suffix ?? members.map((member) => member.name).sort()[0];
  return slug(base);
}

function slug(value) {
  return value
    .replace(/([a-z0-9])([A-Z])/gu, "$1-$2")
    .replace(/[^A-Za-z0-9]+/gu, "-")
    .replace(/^-+|-+$/gu, "")
    .toLowerCase();
}

function mean(values) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function round(value) {
  return Math.round(value * 10000) / 10000;
}

function byNameFile(a, b) {
  return a.name.localeCompare(b.name) || a.file.localeCompare(b.file);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

function stableHash(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function valueAfter(flag) {
  const index = args.indexOf(flag);
  if (index === -1) return null;
  const value = args[index + 1];
  if (!value || value.startsWith("--")) {
    console.error(`${flag} requires a value`);
    process.exit(64);
  }
  return value;
}
