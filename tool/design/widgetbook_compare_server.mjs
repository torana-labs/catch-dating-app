import http from "node:http";
import {spawnSync} from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {URL, fileURLToPath} from "node:url";
import {buildWidgetClassification} from "./generate_widget_classification.mjs";
import {isAppSharedWidgetSource} from "./lib/component_naming.mjs";
import {buildWidgetVariantInventory} from "./generate_widget_variant_inventory.mjs";

const repoRoot = process.cwd();
const claudeRoot =
  process.env.CLAUDE_DS_ROOT ??
  "/Users/suvratgarg/Downloads/Catch Design System (2)";
const widgetbookOrigin = process.env.WIDGETBOOK_ORIGIN ?? "http://127.0.0.1:8766";
const useWidgetbookSameOriginFrame =
  process.env.WIDGETBOOK_SAME_ORIGIN_PREVIEW_FRAME === "1";
const widgetbookBuildWebRoot =
  process.env.WIDGETBOOK_BUILD_WEB_ROOT ??
  path.join(repoRoot, "widgetbook/build/web");
const widgetbookPreviewFrameFile = "__catch_preview_frame.html";
const port = Number(process.env.PORT ?? 8765);
const host = process.env.HOST ?? "127.0.0.1";
const decisionsPath = path.join(
  repoRoot,
  "docs/design_parity/widgetbook_compare_decisions.jsonl",
);
const latestPath = path.join(
  repoRoot,
  "docs/design_parity/widgetbook_compare_decisions.latest.json",
);
const resolutionQueuePath = path.join(
  repoRoot,
  "docs/design_parity/widgetbook_compare_resolution_queue.md",
);
const patternFamiliesPath = path.join(
  repoRoot,
  "docs/design_parity/widget_consolidation/pattern_families.json",
);
const DEDUPE_REVIEW_LIMIT = 80;
const REVIEW_WORDS = ["canonical", "repair", "unify", "register", "discard"];
const FAMILY_PRIORITIES = new Set(["P0", "P1", "P2"]);
const FAMILY_STATUSES = new Set([
  "draft",
  "review",
  "approved",
  "implemented",
  "blocked",
]);
const DECIDED_FAMILY_STATUSES = new Set(["approved", "implemented"]);
const FAMILY_PREVIEW_MODES = new Set([
  "required",
  "source-only",
  "not-applicable",
]);

const candidateSectionMap = new Map([
  ["field-row-mode-consolidation", "Field System"],
  ["field-input-mode-consolidation", "Field System"],
  ["duplicate-field", "Field System"],
  ["fieldgroup-variant-consolidation", "Section System"],
  ["duplicate-field_group", "Section System"],
  ["duplicate-section_stack", "Section System"],
  ["duplicate-roster_table", "Host Roster System"],
  ["duplicate-roster_tiles", "Host Roster System"],
  ["duplicate-roster_row", "Host Roster System"],
  ["duplicate-privacy_badge", "Status Badge System"],
  ["duplicate-journey_steps", "Sequence System"],
  ["metric-rail-consolidation", "Metric System"],
  ["person-avatar-vs-person-avatar-stack", "Avatar System"],
  ["segmented-vs-optiongroup", "Selection System"],
  ["bottom-cta-vs-bottom-dock", "Bottom Chrome System"],
  ["topbar-vs-topbar-identity", "Top Bar System"],
  ["topbar-vs-club-hero-appbar", "Hero Naming Boundary"],
  ["surface-vs-panel", "Surface System"],
  ["surface-vs-softband", "Surface System"],
  ["surface-vs-callout", "Surface System"],
]);

const fromRepo = (...parts) => path.join(repoRoot, ...parts);
const fromClaude = (...parts) => path.join(claudeRoot, ...parts);
const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, "utf8"));

function widgetbookPreviewFrameUrl() {
  return `${widgetbookOrigin.replace(/\/$/u, "")}/${widgetbookPreviewFrameFile}`;
}

function slugPathCompat(parts) {
  return parts
    .join("/")
    .replaceAll(" ", "-")
    .toLowerCase()
    .replace(/^\//u, "");
}

function snakeCase(value) {
  return value
    .replace(/^Catch/u, "")
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[^A-Za-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function parseWidgetbook(source) {
  const imports = new Map();
  for (const match of source.matchAll(
    /import 'package:widgetbook_workspace\/([^']+)'[\s\S]*?as (_widgetbook_workspace_[A-Za-z0-9_]+);/gu,
  )) {
    imports.set(match[2], `widgetbook/lib/${match[1]}`);
  }

  const components = [];
  const folders = [];
  let pending = null;
  let category = "";
  let currentComponent = null;
  let currentUseCase = null;
  let collectingBuilder = false;
  let builderBuffer = "";

  const lines = source.split(/\r?\n/u);
  for (const line of lines) {
    const start = line.match(
      /^(\s*)_widgetbook\.Widgetbook(Category|Folder|Component|UseCase)\(/u,
    );
    if (start) {
      pending = { indent: start[1].length, type: start[2] };
      continue;
    }

    const nameMatch = line.match(/^\s*name: '([^']+)'/u);
    if (pending && nameMatch) {
      const name = nameMatch[1];
      if (pending.type === "Category") {
        category = name;
        folders.length = 0;
        currentComponent = null;
      } else if (pending.type === "Folder") {
        while (folders.length && folders.at(-1).indent >= pending.indent) {
          folders.pop();
        }
        folders.push({ indent: pending.indent, name });
        currentComponent = null;
      } else if (pending.type === "Component") {
        currentComponent = {
          name,
          category,
          folders: folders.map((folder) => folder.name),
          useCases: [],
        };
        components.push(currentComponent);
      } else if (pending.type === "UseCase" && currentComponent) {
        currentUseCase = { name, builder: "", sourceFile: null };
        currentComponent.useCases.push(currentUseCase);
      }
      pending = null;
      continue;
    }

    if (line.includes("builder:") && currentUseCase) {
      collectingBuilder = true;
      builderBuffer = line;
      continue;
    }

    if (collectingBuilder) {
      builderBuffer += "\n" + line;
      if (line.includes(",")) {
        const builderMatch = builderBuffer.match(
          /(_widgetbook_workspace_[A-Za-z0-9_]+)\s*\.\s*([A-Za-z0-9_]+)/u,
        );
        if (builderMatch) {
          currentUseCase.builder = builderMatch[2];
          currentUseCase.sourceFile = imports.get(builderMatch[1]) ?? null;
        }
        collectingBuilder = false;
        builderBuffer = "";
      }
    }
  }

  for (const component of components) {
    for (const useCase of component.useCases) {
      useCase.path = slugPathCompat([
        component.category,
        ...component.folders,
        component.name,
        useCase.name,
      ]);
      useCase.url = `${widgetbookOrigin}/#/?path=${encodeURIComponent(
        useCase.path,
      )}&preview`;
    }
  }

  return components;
}

function groupByName(components) {
  const byName = new Map();
  for (const component of components) {
    if (!byName.has(component.name)) byName.set(component.name, []);
    byName.get(component.name).push(component);
  }
  return byName;
}

export function hasWidgetbookReviewSource(
  name,
  widgetbookByName,
  classificationByName,
) {
  return widgetbookByName.has(name) || classificationByName.has(name);
}

function useCaseOf(component) {
  return component?.useCases?.[0] ?? null;
}

let classificationByNameCache;

function loadClassificationByName() {
  if (classificationByNameCache !== undefined) return classificationByNameCache;
  const registry = buildWidgetClassification({repoRoot});
  classificationByNameCache = new Map(
    (registry.widgets ?? []).map((row) => [row.name, row]),
  );
  return classificationByNameCache;
}

function filesFor(component, contractsByName, classificationByName) {
  const files = new Set();
  const useCase = useCaseOf(component);
  if (useCase?.sourceFile) files.add(useCase.sourceFile);
  const contract = contractsByName.get(component?.name);
  if (contract?.dart?.file) files.add(contract.dart.file);
  const classification = classificationByName.get(component?.name);
  if (classification?.file) files.add(classification.file);
  return [...files];
}

function candidatePane(component, contractsByName, classificationByName) {
  const useCase = useCaseOf(component);
  const classification = classificationByName.get(component?.name);
  return {
    component: component?.name ?? "Missing",
    location: component
      ? [component.category, ...component.folders].join(" / ")
      : "No Widgetbook listing",
    useCase: useCase?.name ?? "Missing",
    path: useCase?.path ?? "",
    url: useCase?.url ?? "",
    files: component ? filesFor(component, contractsByName, classificationByName) : [],
    source: classification?.file
      ? {
          file: classification.file,
          line: classification.line,
          role: classification.role,
          visibility: classification.visibility,
        }
      : null,
  };
}

function withWidgetbookKnobs(url, knobs) {
  if (!url || !knobs || Object.keys(knobs).length === 0) return url;
  const [originAndPath, fragment = ""] = url.split("#");
  const route = new URL(fragment || "/", "http://widgetbook.local");
  const encodedGroup =
    "{" +
    Object.entries(knobs)
      .map(
        ([key, value]) =>
          `${encodeURIComponent(key)}:${encodeURIComponent(value)}`,
      )
      .join(",") +
    "}";
  route.searchParams.set("knobs", encodedGroup);
  return `${originAndPath}#${route.pathname}?${route.searchParams.toString()}`;
}

export function loadVariantReviewCandidates() {
  return buildWidgetVariantInventory().reviewCandidates;
}

let widgetSimilarityCache;

export function loadWidgetSimilarityRegistry() {
  if (widgetSimilarityCache !== undefined) return widgetSimilarityCache;
  const build = spawnSync(
    process.execPath,
    ["tool/design/build_widget_similarity.mjs", "--check", "--json"],
    {cwd: repoRoot, encoding: "utf8", maxBuffer: 32 * 1024 * 1024},
  );
  if (build.status !== 0) {
    throw new Error(
      `Widget similarity generation failed: ${build.error?.message ?? build.stderr ?? build.stdout}`,
    );
  }
  widgetSimilarityCache = JSON.parse(build.stdout);
  return widgetSimilarityCache;
}

function loadPatternFamilyRegistry() {
  const registry = readJson(patternFamiliesPath);
  if (registry.schemaVersion !== 1) {
    throw new Error(
      `Unsupported pattern family schemaVersion: ${registry.schemaVersion}`,
    );
  }
  if (!Array.isArray(registry.families)) {
    throw new Error("Pattern family registry must contain a families array.");
  }

  const familyIds = new Set();
  for (const family of registry.families) {
    requireRegistryString(family.id, "family.id");
    if (familyIds.has(family.id)) {
      throw new Error(`Duplicate pattern family id: ${family.id}`);
    }
    familyIds.add(family.id);
    requireRegistryString(family.title, `${family.id}.title`);
    requireRegistryString(family.intent, `${family.id}.intent`);
    requireRegistryEnum(
      family.priority,
      FAMILY_PRIORITIES,
      `${family.id}.priority`,
    );
    requireRegistryEnum(
      family.status,
      FAMILY_STATUSES,
      `${family.id}.status`,
    );
    requireRegistryString(
      family.targetContract,
      `${family.id}.targetContract`,
    );
    requireRegistryString(
      family.qualityReference,
      `${family.id}.qualityReference`,
    );
    requireRegistryString(
      family.decisionSource,
      `${family.id}.decisionSource`,
    );
    if (!Array.isArray(family.acceptedVisualDelta)) {
      throw new Error(`${family.id}.acceptedVisualDelta must be an array.`);
    }
    validateRegistryReviewQuestions(family);
    if (!Array.isArray(family.members) || family.members.length === 0) {
      throw new Error(`${family.id}.members must be a non-empty array.`);
    }

    const memberSymbols = new Set();
    for (const member of family.members) {
      requireRegistryString(member.symbol, `${family.id}.member.symbol`);
      if (memberSymbols.has(member.symbol)) {
        throw new Error(
          `Duplicate member ${member.symbol} in pattern family ${family.id}.`,
        );
      }
      memberSymbols.add(member.symbol);
      requireRegistryEnum(
        member.disposition,
        new Set(REVIEW_WORDS),
        `${family.id}.${member.symbol}.disposition`,
      );
      requireRegistryEnum(
        member.preview,
        FAMILY_PREVIEW_MODES,
        `${family.id}.${member.symbol}.preview`,
      );
      requireRegistryString(
        member.rationale,
        `${family.id}.${member.symbol}.rationale`,
      );
      if (member.disposition === "unify") {
        requireRegistryString(
          member.target,
          `${family.id}.${member.symbol}.target`,
        );
      }
    }
  }
  return registry;
}

function requireRegistryString(value, field) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Pattern family ${field} must be a non-empty string.`);
  }
}

function requireRegistryEnum(value, allowed, field) {
  if (!allowed.has(value)) {
    throw new Error(
      `Pattern family ${field} must be one of: ${[...allowed].join(", ")}.`,
    );
  }
}

function validateRegistryReviewQuestions(family) {
  if (!Array.isArray(family.reviewQuestions)) {
    if (family.status === "review") {
      throw new Error(
        `Pattern family ${family.id}.reviewQuestions must be a non-empty array while in review.`,
      );
    }
    return;
  }
  if (family.status === "review" && family.reviewQuestions.length === 0) {
    throw new Error(
      `Pattern family ${family.id}.reviewQuestions must be a non-empty array while in review.`,
    );
  }
  const ids = new Set();
  for (const question of family.reviewQuestions) {
    requireRegistryString(question?.id, `${family.id}.reviewQuestion.id`);
    requireRegistryString(question?.prompt, `${family.id}.${question?.id}.prompt`);
    requireRegistryString(
      question?.recommendation,
      `${family.id}.${question?.id}.recommendation`,
    );
    if (ids.has(question.id)) {
      throw new Error(
        `Duplicate review question ${question.id} in pattern family ${family.id}.`,
      );
    }
    ids.add(question.id);
    if (!Array.isArray(question.options) || question.options.length < 2) {
      throw new Error(
        `Pattern family ${family.id}.${question.id}.options must contain at least two choices.`,
      );
    }
    for (const option of question.options) {
      requireRegistryString(option, `${family.id}.${question.id}.option`);
    }
    const hasSelectedOption = Object.hasOwn(question, "selectedOption");
    if (DECIDED_FAMILY_STATUSES.has(family.status) && !hasSelectedOption) {
      throw new Error(
        `Pattern family ${family.id}.${question.id}.selectedOption is required while ${family.status}.`,
      );
    }
    if (hasSelectedOption) {
      requireRegistryString(
        question.selectedOption,
        `${family.id}.${question.id}.selectedOption`,
      );
      if (!question.options.includes(question.selectedOption)) {
        throw new Error(
          `Pattern family ${family.id}.${question.id}.selectedOption must match a declared choice.`,
        );
      }
    }
  }
}

function sourcePaneForName(name, classificationByName, label = "Source only") {
  const classification = classificationByName.get(name);
  return {
    component: name,
    location: label,
    useCase: "No standalone Widgetbook rendering",
    path: "",
    url: "",
    files: classification?.file ? [classification.file] : [],
    source: classification?.file
      ? {
          file: classification.file,
          line: classification.line,
          role: classification.role,
          visibility: classification.visibility,
        }
      : null,
  };
}

function paneForName(name, byName, contractsByName, classificationByName) {
  const component = findFirst(byName, name);
  const classification = classificationByName.get(name);
  const pane = component
    ? candidatePane(component, contractsByName, classificationByName)
    : {
        component: name,
        location: classification?.role ?? "No Widgetbook listing parsed",
        useCase: "Missing",
        path: "",
        url: "",
        files: classification?.file ? [classification.file] : [],
      };

  if (classification?.file && !pane.files.includes(classification.file)) {
    pane.files.push(classification.file);
  }
  if (classification?.file) {
    pane.source = {
      file: classification.file,
      role: classification.role,
      visibility: classification.visibility,
      base: classification.baseClass,
    };
  }
  return pane;
}

function buildPatternFamilyCandidates({
  registry,
  pane,
  classificationByName,
}) {
  return registry.families.map((family, registryIndex) => {
    const previewPanes = family.members.map((member) => {
      const memberPane =
        member.preview === "required"
          ? pane(member.symbol)
          : sourcePaneForName(
              member.symbol,
              classificationByName,
              member.preview === "source-only"
                ? "Source-only registry member"
                : "Preview not applicable",
            );
      const previewStatus =
        member.preview === "required"
          ? memberPane.url
            ? "available"
            : "missing-required"
          : member.preview;
      return {
        ...memberPane,
        previewRequirement: member.preview,
        previewStatus,
        memberDisposition: member.disposition,
        memberTarget: member.target ?? "",
        memberRationale: member.rationale,
      };
    });

    return {
      id: family.id,
      title: family.title,
      bucket: "pattern-family",
      priority: family.priority,
      reason: family.intent,
      recommended: family.targetContract,
      tags: ["pattern-family", family.status],
      left: previewPanes[0] ?? null,
      right: previewPanes[1] ?? null,
      related: previewPanes,
      previewPanes,
      reviewDecisionOptions: REVIEW_WORDS,
      patternFamily: {
        ...family,
        registryIndex,
      },
    };
  });
}

function findFirst(byName, ...names) {
  for (const name of names) {
    const found = byName.get(name)?.[0];
    if (found) return found;
  }
  return null;
}

function findByLocation(byName, name, match) {
  return (byName.get(name) ?? []).find((component) =>
    [component.category, ...component.folders, component.name]
      .join("/")
      .toLowerCase()
      .includes(match.toLowerCase()),
  );
}

function buildDedupeCandidates({similarity, pane}) {
  if (!similarity) return [];
  const widgetsByName = new Map(
    (similarity.widgets ?? []).map((widget) => [widget.name, widget]),
  );
  const selected = new Map();

  const addCandidate = (candidate) => {
    const key = candidate.dedupeReview.memberKey;
    if (!key || selected.has(key)) return;
    const candidateMembers = new Set(
      (candidate.dedupeReview.members ?? []).map((member) => member.name),
    );
    for (const existing of selected.values()) {
      const existingMembers = new Set(
        (existing.dedupeReview.members ?? []).map((member) => member.name),
      );
      if (setContainsAll(existingMembers, candidateMembers)) return;
    }
    selected.set(key, candidate);
  };

  for (const cluster of similarity.clusters ?? []) {
    if (cluster.scope === "screen") continue;
    addCandidate(
      dedupeClusterCandidate({
        cluster,
        pane,
        widgetsByName,
        registrySummary: similarity.summary,
      }),
    );
  }

  for (const pair of similarity.rankedPairs ?? []) {
    const highSignal =
      pair.absorbCandidate ||
      pair.containment >= 0.75 ||
      (pair.detectors ?? []).length >= 2 ||
      (pair.signals ?? []).includes("exact-shape");
    if (!highSignal) continue;
    addCandidate(
      dedupePairCandidate({
        pair,
        pane,
        widgetsByName,
        source: "ranked-pair",
      }),
    );
  }

  for (const family of similarity.nameFamilies ?? []) {
    if (selected.size >= DEDUPE_REVIEW_LIMIT) break;
    if (family.scope === "screen") continue;
    if ((family.members ?? []).length < 2) continue;
    addCandidate(dedupeNameFamilyCandidate({family, pane, widgetsByName}));
  }

  for (const pair of similarity.rankedPairs ?? []) {
    if (selected.size >= DEDUPE_REVIEW_LIMIT) break;
    addCandidate(
      dedupePairCandidate({
        pair,
        pane,
        widgetsByName,
        source: "ranked-pair-fill",
      }),
    );
  }

  return [...selected.values()]
    .sort(compareDedupeCandidates)
    .slice(0, DEDUPE_REVIEW_LIMIT)
    .map((candidate, index) => ({
      ...candidate,
      dedupeReview: {
        ...candidate.dedupeReview,
        queueRank: index + 1,
      },
    }));
}

function dedupeClusterCandidate({cluster, pane, widgetsByName, registrySummary}) {
  const members = cluster.members ?? [];
  const evidence = {
    kind: "structural cluster",
    registryId: cluster.id,
    registryRank: cluster.rank,
    score: cluster.score,
    cohesion: cluster.cohesion,
    paramCompatibility: cluster.paramCompatibility,
    detectors: cluster.detectors ?? [],
    signals: cluster.structuralSignals ?? [],
    absorbCandidate: Boolean(cluster.absorbCandidate),
    nameSignal: cluster.nameSignal,
    scope: cluster.scope,
    memberKey: memberKey(members),
    selectionSource: "structural-cluster",
    registrySummary,
  };
  return dedupeCandidateFromMembers({
    id: `dedupe-cluster-${cluster.id}`,
    title: `${cluster.nameSignal ?? titleForMembers(members)} cluster`,
    evidence,
    members,
    pane,
    widgetsByName,
  });
}

function dedupePairCandidate({pair, pane, widgetsByName, source}) {
  const members = [pair.a, pair.b].filter(Boolean);
  const evidence = {
    kind: "ranked pair",
    registryId: `pair-${pair.rank}`,
    registryRank: pair.rank,
    score: pair.score,
    jaccard: pair.jaccard,
    containment: pair.containment,
    smallWidgetMultisetJaccard: pair.smallWidgetMultisetJaccard,
    hamming: pair.hamming,
    detectors: pair.detectors ?? [],
    signals: pair.signals ?? [],
    nameStems: pair.nameStems ?? [],
    flags: pair.flags ?? [],
    selectionSources: pair.selectionSources ?? [],
    absorbCandidate: Boolean(pair.absorbCandidate),
    memberKey: memberKey(members),
    selectionSource: source,
  };
  return dedupeCandidateFromMembers({
    id: `dedupe-pair-${snakeCase(members.join("-"))}`,
    title: `${members.join(" vs ")} ranked pair`,
    evidence,
    members,
    pane,
    widgetsByName,
  });
}

function dedupeNameFamilyCandidate({family, pane, widgetsByName}) {
  const members = family.members ?? [];
  const evidence = {
    kind: "name family",
    registryId: family.id,
    registryRank: Number(String(family.id ?? "").match(/^n(\d+)/u)?.[1] ?? 9999),
    stem: family.stem,
    stemType: family.stemType,
    detectors: ["name"],
    signals: [],
    usageSum: family.usageSum,
    scope: family.scope,
    absorbCandidate: members.some((member) =>
      isCanonicalLikeMember(member, widgetsByName),
    ),
    memberKey: memberKey(members),
    selectionSource: "name-family",
  };
  return dedupeCandidateFromMembers({
    id: `dedupe-family-${slug(family.stem)}-${evidence.registryRank}`,
    title: `${family.stem} name family`,
    evidence,
    members,
    pane,
    widgetsByName,
  });
}

function dedupeCandidateFromMembers({id, title, evidence, members, pane, widgetsByName}) {
  const memberEvidence = members.map((name) => {
    const widget = widgetsByName.get(name);
    return {
      name,
      file: widget?.file ?? "",
      role: widget?.role ?? "",
      usage: widget?.usageCountRaw ?? 0,
      tokens: widget?.coarseTokenStreamLength ?? widget?.tokenStreamLength ?? null,
      hasWidgetHelpers: Boolean(widget?.hasWidgetHelpers),
    };
  });
  const panes = members.map((name) => pane(name));
  const primary = canonicalMember(memberEvidence, widgetsByName);
  const suggestedActions = suggestedDedupeActions({
    evidence,
    members: memberEvidence,
    primary,
  });
  const rawDetectors = evidence.detectors ?? [];
  const detectorLabels = detectorSummary(evidence);
  const whySimilar = whyDedupeSimilar({evidence, members: memberEvidence, primary});
  const priority = dedupePriority(evidence, memberEvidence);
  const recommended = suggestedActions[0]?.label ?? "review dedupe candidate";

  return {
    id,
    title,
    bucket: "dedupe",
    priority,
    reason: whySimilar[0] ?? "The widget similarity registry flagged this family.",
    recommended,
    tags: [
      "dedupe",
      evidence.kind.replace(/\s+/gu, "-"),
      ...detectorLabels.map((label) => label.toLowerCase().replace(/\s+/gu, "-")),
      evidence.absorbCandidate ? "absorb" : null,
    ].filter(Boolean),
    left: panes[0] ?? null,
    right: panes[1] ?? null,
    related: panes,
    reviewDecisionOptions: suggestedActions.map((action) => action.label),
    dedupeReview: {
      ...evidence,
      sourceDetectors: rawDetectors,
      detectorCount: rawDetectors.length,
      detectors: detectorLabels,
      members: memberEvidence,
      primary: primary?.name ?? "",
      whySimilar,
      suggestedActions,
      memberKey: evidence.memberKey,
    },
  };
}

function detectorSummary(evidence) {
  const labels = [];
  for (const detector of evidence.detectors ?? []) {
    if (detector === "structural") labels.push("Structural");
    else if (detector === "name") labels.push("Name");
    else if (detector === "visual") labels.push("Visual");
    else labels.push(detector);
  }
  for (const signal of evidence.signals ?? []) {
    if (signal === "exact-shape") labels.push("Exact shape");
    if (signal === "small-widget") labels.push("Small widget");
  }
  return [...new Set(labels)];
}

function whyDedupeSimilar({evidence, members, primary}) {
  const notes = [];
  if ((evidence.detectors ?? []).length > 0) {
    notes.push(
      `Detected by ${detectorSummary(evidence).join(", ")} evidence in the generated similarity registry.`,
    );
  }
  if (Number.isFinite(evidence.cohesion)) {
    notes.push(`Cluster cohesion is ${percent(evidence.cohesion)} across ${members.length} members.`);
  }
  if (Number.isFinite(evidence.jaccard) || Number.isFinite(evidence.containment)) {
    const parts = [];
    if (Number.isFinite(evidence.jaccard)) parts.push(`Jaccard ${percent(evidence.jaccard)}`);
    if (Number.isFinite(evidence.containment)) {
      parts.push(`containment ${percent(evidence.containment)}`);
    }
    notes.push(parts.join(" · ") + ".");
  }
  if (Number.isFinite(evidence.smallWidgetMultisetJaccard) && evidence.smallWidgetMultisetJaccard > 0) {
    notes.push(`Small-widget token overlap is ${percent(evidence.smallWidgetMultisetJaccard)}.`);
  }
  if ((evidence.nameStems ?? []).length > 0) {
    notes.push(`Shared name stem: ${evidence.nameStems.join(", ")}.`);
  } else if (evidence.nameSignal) {
    notes.push(`Shared name signal: ${evidence.nameSignal}.`);
  } else if (evidence.stem) {
    notes.push(`Shared final-name family: ${evidence.stem}.`);
  }
  if (evidence.absorbCandidate && primary) {
    notes.push(`${primary.name} looks like the canonical side because it is core, contracted, or Catch-prefixed.`);
  }
  return notes;
}

function suggestedDedupeActions({evidence, members, primary}) {
  const actions = [];
  if (evidence.absorbCandidate && primary) {
    actions.push({
      label: `absorb into ${primary.name}`,
      description: `Make ${primary.name} the canonical implementation and migrate or delete the duplicate wrappers.`,
    });
  }
  if ((evidence.signals ?? []).includes("exact-shape")) {
    actions.push({
      label: "merge exact duplicate",
      description: "These have identical structural shape; prefer one implementation unless product semantics differ.",
    });
  }
  if ((evidence.detectors ?? []).includes("structural") || Number(evidence.containment) >= 0.75) {
    actions.push({
      label: "extract shared primitive",
      description: "Keep feature copy/state outside and move repeated chrome into a shared widget.",
    });
  }
  if ((evidence.detectors ?? []).includes("name")) {
    actions.push({
      label: "rename only",
      description: "Use this when the concepts should stay separate but the names should align with the canonical vocabulary.",
    });
  }
  actions.push(
    {
      label: "keep distinct",
      description: "Record this when visual/product semantics are different enough to keep separate implementations.",
    },
    {
      label: "visual first",
      description: "Use Widgetbook screenshots or live previews before deciding.",
    },
    {
      label: "inline or delete",
      description: "Use when a wrapper adds no reusable behavior and should not remain public.",
    },
  );
  return uniqueActions(actions);
}

function uniqueActions(actions) {
  const seen = new Set();
  return actions.filter((action) => {
    if (seen.has(action.label)) return false;
    seen.add(action.label);
    return true;
  });
}

function dedupePriority(evidence, members) {
  if (evidence.absorbCandidate) return "P0";
  if ((evidence.signals ?? []).includes("exact-shape")) return "P0";
  if ((evidence.detectors ?? []).length >= 2) return "P0";
  if (Number(evidence.registryRank) <= 40) return "P1";
  if (members.reduce((sum, member) => sum + Number(member.usage ?? 0), 0) >= 20) {
    return "P1";
  }
  return "P2";
}

function canonicalMember(members, widgetsByName) {
  return (
    members.find((member) => isCanonicalLikeMember(member.name, widgetsByName)) ??
    [...members].sort((a, b) => Number(b.usage ?? 0) - Number(a.usage ?? 0))[0] ??
    null
  );
}

function isCanonicalLikeMember(name, widgetsByName) {
  const widget = widgetsByName.get(name);
  return Boolean(
    name.startsWith("Catch") ||
      isAppSharedWidgetSource(widget?.file ?? "") ||
      widget?.file?.includes("/shared/"),
  );
}

function compareDedupeCandidates(a, b) {
  return (
    Number(b.dedupeReview.detectorCount ?? 0) -
      Number(a.dedupeReview.detectorCount ?? 0) ||
    Number(b.dedupeReview.score ?? b.dedupeReview.containment ?? 0) -
      Number(a.dedupeReview.score ?? a.dedupeReview.containment ?? 0) ||
    Number(a.dedupeReview.registryRank ?? 9999) -
      Number(b.dedupeReview.registryRank ?? 9999) ||
    priorityValue(a.priority) - priorityValue(b.priority) ||
    a.title.localeCompare(b.title)
  );
}

function priorityValue(priority) {
  return { P0: 0, P1: 1, P2: 2, P3: 3 }[priority] ?? 9;
}

function memberKey(members) {
  return [...members].sort().join("|");
}

function setContainsAll(container, values) {
  for (const value of values) {
    if (!container.has(value)) return false;
  }
  return true;
}

function titleForMembers(members) {
  if (members.length <= 3) return members.join(" / ");
  return `${members[0]} + ${members.length - 1} more`;
}

function percent(value) {
  return `${Math.round(Number(value) * 1000) / 10}%`;
}

function slug(value) {
  return String(value ?? "")
    .replace(/([a-z0-9])([A-Z])/gu, "$1-$2")
    .replace(/[^A-Za-z0-9]+/gu, "-")
    .replace(/^-+|-+$/gu, "")
    .toLowerCase();
}

function buildCandidates() {
  const manifest = readJson(fromClaude("_ds_manifest.json"));
  const contracts = readJson(
    fromRepo("design/components/catch.components.json"),
  ).components;
  const contractsByName = new Map(
    contracts.map((contract) => [contract.name, contract]),
  );
  const widgetbookSource = fs.readFileSync(
    fromRepo("widgetbook/lib/main.directories.g.dart"),
    "utf8",
  );
  const components = parseWidgetbook(widgetbookSource);
  const byName = groupByName(components);
  const classificationByName = loadClassificationByName();
  const variantReviewCandidates = loadVariantReviewCandidates();
  const similarity = loadWidgetSimilarityRegistry();
  const patternFamilyRegistry = loadPatternFamilyRegistry();

  const candidates = [];
  const pane = (name) =>
    paneForName(
      name,
      byName,
      contractsByName,
      classificationByName,
    );
  const add = ({
    id,
    title,
    bucket,
    reason,
    left,
    right,
    recommended,
    priority = "P0",
    tags = [],
  }) => {
    if (!left || !right) return;
    candidates.push({
      id,
      title,
    bucket,
    priority,
    reason,
    recommended,
    tags,
      left: candidatePane(left, contractsByName, classificationByName),
      right: candidatePane(right, contractsByName, classificationByName),
    });
  };
  const addAppGroup = ({
    id,
    title,
    reason,
    recommended,
    names,
    priority = "P0",
    tags = [],
  }) => {
    const seen = new Set();
    const related = names
      .filter((name) => {
        if (seen.has(name)) return false;
        seen.add(name);
        return hasWidgetbookReviewSource(name, byName, classificationByName);
      })
      .map((name) => pane(name));
    if (related.length < 2) return;
    candidates.push({
      id,
      title,
      bucket: "consolidate",
      priority,
      reason,
      recommended,
      tags: ["app-consolidation", ...tags],
      left: related[0],
      right: related[1],
      related,
    });
  };
  const addDecisionPreview = ({
    id,
    title,
    reason,
    recommended,
    previewNames,
    sourceOnlyNames = [],
    priority = "P0",
    tags = [],
  }) => {
    const previewPanes = previewNames.map((name) => pane(name));
    const sourceOnlyPanes = sourceOnlyNames.map((name) =>
      sourcePaneForName(name, classificationByName, "Private source widget"),
    );
    candidates.push({
      id,
      title,
      bucket: "needs-decision",
      priority,
      reason,
      recommended,
      tags: ["decision-preview", ...tags],
      left: previewPanes[0] ?? null,
      right: previewPanes[1] ?? null,
      related: [...previewPanes, ...sourceOnlyPanes],
      previewPanes,
    });
  };

  candidates.push(
    ...buildPatternFamilyCandidates({
      registry: patternFamilyRegistry,
      pane,
      classificationByName,
    }),
    ...buildDedupeCandidates({
      similarity,
      pane,
    }),
  );

  addDecisionPreview({
    id: "decision-preview-event-visual-system",
    title: "Event visual/card/media boundary",
    reason:
      "Review the event visual primitives as one set: event cards, ticket card, thumbnail/media treatment, graded image, hero backdrop, map pin, and viewport frame.",
    recommended: "catch.event_visuals / catch.event_card / catch.media",
    previewNames: [
      "EventCard",
      "EventThumbnail",
      "CatchGradedImage",
      "CatchHeroImage",
      "ActivityMapPin",
    ],
    priority: "P0",
    tags: ["events", "card", "media"],
  });
  addDecisionPreview({
    id: "decision-preview-person-row-boundary",
    title: "Person row boundary",
    reason:
      "Review whether CatchPersonRow is the canonical people-row primitive, how it relates to avatar primitives, and which list/tile use cases should compose it.",
    recommended: "catch.person_row",
    previewNames: [
      "CatchPersonRow",
      "CatchAvatar",
      "CatchAvatarRow",
    ],
    priority: "P0",
    tags: ["people", "rows", "avatar"],
  });
  addDecisionPreview({
    id: "decision-preview-chat-header-boundary",
    title: "Chat header private pieces",
    reason:
      "The private chat header chrome/title widgets do not have direct previews. Review the public chat header renderings against CatchTopBar and browse-header peers before deciding whether to promote or merge.",
    recommended: "catch.chat_header or catch.top_bar/catch.browse_header modes",
    previewNames: [
      "ChatsBrowseHeader",
      "CatchTopBar",
      "ExploreBrowseHeaderContent",
      "CatchesHubHeader",
    ],
    sourceOnlyNames: ["_ChatsHeaderChrome", "_ChatsHeaderTitle"],
    priority: "P0",
    tags: ["header", "chat", "private"],
  });

  const priorityVariantComponents = new Set([
    "CatchField",
    "CatchErrorState",
    "CatchEmptyState",
    "CatchNotice",
    "CatchSkeleton",
    "CatchPersonRow",
    "CatchSheet",
    "CatchStepper",
    "CatchKickerText",
    "CatchSearchField",
    "CatchSurface",
    "CatchTopBar",
  ]);
  const reviewContextsByComponent = new Map([
    [
      "CatchField",
      [
        {
          id: "no-chrome",
          label: "No chrome",
          note: "Bare CatchField states. This is the canonical primitive surface.",
          knobs: { "Chrome context": "No chrome" },
        },
        {
          id: "contained-section",
          label: "Contained section",
          note: "Same states inside the rounded CatchSection container.",
          knobs: { "Chrome context": "Contained section" },
        },
        {
          id: "divided-section",
          label: "Divided section",
          note: "Same states inside the hairline-delimited section context.",
          knobs: { "Chrome context": "Divided section" },
        },
        {
          id: "plain-section",
          label: "Plain section",
          note: "Same states inside the unboxed section context.",
          knobs: { "Chrome context": "Plain section" },
        },
      ],
    ],
  ]);

  for (const variantCandidate of variantReviewCandidates) {
    const componentName = variantCandidate.component;
    if (!priorityVariantComponents.has(componentName)) continue;
    const panes = (byName.get(componentName) ?? []).map((component) =>
      candidatePane(component, contractsByName, classificationByName),
    );
    if (!panes.length) continue;
    const reasons = variantCandidate.review?.reasons ?? [];
    const reviewContexts = reviewContextsByComponent.get(componentName) ?? null;
    const contextPreviewPanes =
      reviewContexts && panes[0]
        ? reviewContexts.map((context) => ({
            ...panes[0],
            component: `${panes[0].component} (${context.label})`,
            useCase: `${panes[0].useCase} / ${context.label}`,
            url: withWidgetbookKnobs(panes[0].url, context.knobs),
          }))
        : null;
    candidates.push({
      id: `variant-prune-${snakeCase(componentName)}`,
      title: `${componentName}: variant surface cleanup`,
      bucket: "variant-prune",
      priority: priorityVariantComponents.has(componentName) ? "P0" : "P1",
      reason:
        `${variantCandidate.stateCardCount} Widgetbook states across ${variantCandidate.useCaseCount} use case(s). ` +
        `Review reasons: ${reasons.join(", ") || "variant cleanup"}.`,
      recommended:
        "Prune duplicate state labels, collapse catalog-only previews into the contract surface, and keep only states that represent distinct API behavior.",
      tags: ["variant-prune", "widgetbook", "core-primitives"],
      left: panes[0],
      right: panes[1] ?? null,
      related: [...(contextPreviewPanes ?? []), ...panes],
      reviewContexts,
      variantReview: {
        stateCardCount: variantCandidate.stateCardCount,
        useCaseCount: variantCandidate.useCaseCount,
        labels: variantCandidate.labels ?? [],
        duplicateLabels: variantCandidate.review?.duplicateLabels ?? [],
        oversizedUseCases: variantCandidate.review?.oversizedUseCases ?? [],
      },
    });
  }

  if (!candidates.some((candidate) => candidate.id === "variant-prune-field")) {
    const panes = (byName.get("CatchField") ?? []).map((component) =>
      candidatePane(component, contractsByName, classificationByName),
    );
    const reviewContexts = reviewContextsByComponent.get("CatchField") ?? null;
    const contextPreviewPanes =
      reviewContexts && panes[0]
        ? reviewContexts.map((context) => ({
            ...panes[0],
            component: `${panes[0].component} (${context.label})`,
            useCase: `${panes[0].useCase} / ${context.label}`,
            url: withWidgetbookKnobs(panes[0].url, context.knobs),
          }))
        : null;
    if (panes.length) {
      candidates.push({
        id: "variant-prune-field",
        title: "CatchField: variant surface cleanup",
        bucket: "variant-prune",
        priority: "P0",
        reason:
          "Manual field-system review is still active: keep CatchField bare, remove field-owned chrome, and inspect the same states inside section chrome through the preview context control.",
        recommended:
          "Keep one bare CatchField primitive; move focused/error/container chrome to CatchSection contexts.",
        tags: ["variant-prune", "widgetbook", "core-primitives", "pinned"],
        left: panes[0],
        right: null,
        related: [...(contextPreviewPanes ?? []), ...panes],
        reviewContexts,
        variantReview: {
          stateCardCount: null,
          useCaseCount: panes.length,
          labels: [
            "read",
            "edit",
            "focused",
            "error",
            "nav",
            "toggle",
            "select",
            "value-lane",
          ],
          duplicateLabels: [],
          oversizedUseCases: [],
        },
      });
    }
  }

  for (const [name, list] of byName.entries()) {
    if (list.length < 2) continue;
    if (!contractsByName.has(name) && !name.startsWith("Catch")) continue;
    if (/Screen$/u.test(name)) continue;
    const contract = findByLocation(byName, name, "core-primitives") ?? list[0];
    const catalog =
      list.find((component) => component !== contract) ?? list.at(1);
    add({
      id: `duplicate-${snakeCase(name)}`,
      title: `${name}: catalog vs contract`,
      bucket: "unify",
      reason:
        "Same Widgetbook component name appears in more than one location. Decide which rendering is canonical or what the contract preview is missing.",
      recommended: contractsByName.has(name)
        ? contractsByName.get(name).id
        : `catch.${snakeCase(name)}`,
      left: contract,
      right: catalog,
      tags: ["duplicate", "widgetbook"],
    });
  }

  add({
    id: "topbar-vs-club-hero-appbar",
    title: "TopBar vs OrganizerHeroTopBar",
    bucket: "unify",
    reason:
      "Claude names this concept AppBar/ClubHero; repo has CatchTopBar and OrganizerHeroTopBar. Decide whether OrganizerHeroTopBar is a real component or a TopBar variant/section.",
    recommended: "catch.top_bar + catch.club_hero",
    left: findFirst(byName, "CatchTopBar"),
    right: findFirst(byName, "OrganizerHeroTopBar"),
    tags: ["header", "club"],
  });
  add({
    id: "segmented-vs-optiongroup",
    title: "SegmentedControl vs OptionGroup",
    bucket: "unify",
    reason:
      "Claude has SegPill and OptionGroup language. Decide if these are separate controls or one global segmented primitive with variants.",
    recommended: "catch.segmented_control",
    left: findFirst(byName, "CatchSegmentedControl"),
    right: findFirst(byName, "CatchChoiceInput"),
    tags: ["selection"],
  });
  add({
    id: "chip-selectable-vs-option-card",
    title: "CatchChip.selectable vs OptionCard",
    bucket: "unify",
    reason:
      "Both are selectable option affordances. Decide whether chip/card are variants of one option primitive or remain separate size/form-factor primitives.",
    recommended: "catch.option",
    left: findFirst(byName, "CatchChip"),
    right: findFirst(byName, "CatchChoiceTile"),
    priority: "P1",
    tags: ["selection"],
  });
  add({
    id: "detail-row-vs-field",
    title: "DetailRow vs Field",
    bucket: "unify",
    reason:
      "DetailRow is a compact label/value row. Review whether it is a density variant of CatchField or a separate read-only table-row primitive.",
    recommended: "catch.field",
    left: findFirst(byName, "CatchField"),
    right: findFirst(byName, "CatchDetailRow"),
    priority: "P1",
    tags: ["rows", "data-display"],
  });
  add({
    id: "browse-header-vs-feature-browse-header",
    title: "BrowseHeader vs feature browse headers",
    bucket: "unify",
    reason:
      "Explore and chat wrappers share title, scope, search, and action chrome with CatchBrowseHeader. Decide whether the wrappers are meaningful route adapters or duplicated header primitives.",
    recommended: "catch.browse_header",
    left: findFirst(byName, "CatchBrowseHeader"),
    right: findFirst(
      byName,
      "ExploreBrowseHeaderContent",
      "ChatsBrowseHeader",
    ),
    priority: "P1",
    tags: ["search", "header"],
  });
  add({
    id: "action-menu-vs-menu",
    title: "ActionMenu vs Menu",
    bucket: "unify",
    reason:
      "ActionMenu anchors the shared Menu panel behind an icon trigger. Decide whether this stays a convenience primitive or becomes a Menu mode/state under one contract.",
    recommended: "catch.menu",
    left: findFirst(byName, "CatchMenu"),
    right: findFirst(byName, "CatchActionMenu"),
    priority: "P1",
    tags: ["menu"],
  });
  add({
    id: "section-label-vs-kicker",
    title: "SectionLabel vs Kicker",
    bucket: "unify",
    reason:
      "Both are small mono section/eyebrow labels. Decide whether SectionLabel is an icon/accent variant of Kicker or a distinct section-label primitive.",
    recommended: "catch.kicker",
    left: findFirst(byName, "CatchKickerText"),
    right: findFirst(byName, "CatchSectionHeaderTitle"),
    priority: "P1",
    tags: ["typography", "sections"],
  });
  add({
    id: "section-header-vs-section",
    title: "SectionHeader vs Section",
    bucket: "unify",
    reason:
      "SectionHeader owns title/trailing header chrome while CatchSection now owns grouped information title/body rhythm. Review whether SectionHeader is only for rail/list headers or needs to fold into Section.",
    recommended: "catch.section",
    left: findFirst(byName, "CatchSection"),
    right: findFirst(byName, "CatchSectionHeader"),
    priority: "P1",
    tags: ["sections"],
  });
  add({
    id: "person-avatar-vs-person-avatar-stack",
    title: "PersonAvatar vs PersonAvatarStack",
    bucket: "unify",
    reason:
      "The stack composes person avatars with veiling and overflow rules. Decide whether it belongs under one avatar contract or stays a separate people-list primitive.",
    recommended: "catch.person_avatar",
    left: findFirst(byName, "CatchAvatar"),
    right: findFirst(byName, "CatchAvatarRow"),
    priority: "P1",
    tags: ["avatar", "people"],
  });
  add({
    id: "field-input-mode-consolidation",
    title: "Field input mode consolidation",
    bucket: "unify",
    reason:
      "Claude describes Field as the convergence of input mode and field row. Decide whether input mode remains a primitive or becomes a Field mode.",
    recommended: "catch.field + catch.field if still distinct",
    left: findFirst(byName, "CatchField"),
    right: findFirst(byName, "CatchField"),
    tags: ["forms"],
  });
  add({
    id: "field-row-mode-consolidation",
    title: "Field row mode consolidation",
    bucket: "unify",
    reason:
      "Claude says Field converges input/read/nav/toggle rows. Decide if field row migrates into Field modes.",
    recommended: "catch.field",
    left: findFirst(byName, "CatchField"),
    right: findFirst(byName, "CatchField"),
    tags: ["forms", "rows"],
  });
  const firstPassConsolidationGroups = [
    {
      id: "app-browse-header-family",
      title: "Browse header family",
      reason:
        "Several route headers repeat browse/search/scope chrome. Review what belongs in CatchBrowseHeader versus feature-owned state wiring.",
      recommended: "catch.browse_header",
      tags: ["header", "chrome"],
      names: [
        "CatchBrowseHeader",
        "ExploreBrowseHeaderContent",
        "ChatsBrowseHeader",
        "CatchesHubHeader",
        "HostRosterFilterHeader",
      ],
    },
    {
      id: "app-top-bar-family",
      title: "Top bar and route chrome family",
      reason:
        "Top bars and contextual chat/host headers may be converging on one route chrome primitive with configurable identity and actions.",
      recommended: "catch.top_bar",
      tags: ["header", "chrome"],
      names: [
        "CatchTopBar",
        "ChatEventContextHeader",
      ],
    },
    {
      id: "app-hero-app-bar-family",
      title: "Hero app bar family",
      reason:
        "Club and event hero app bars are separate from CatchTopBar, but they still look like one hero-chrome contract with media, title, and scroll states.",
      recommended: "catch.hero_chrome",
      tags: ["hero", "chrome"],
      names: [
        "OrganizerHeroTopBar",
        "EventDetailHeroTopBar",
        "CatchHeroImage",
        "CatchHeroViewport",
      ],
    },
    {
      id: "app-feature-hero-family",
      title: "Feature hero family",
      reason:
        "Large first-panel hero widgets repeat title, summary, badge, metric, and background composition across dashboard, host, and Event Success surfaces.",
      recommended: "catch.feature_hero",
      tags: ["hero", "surface"],
      names: [
        "EmptyHeroCard",
        "CompanionHeroSection",
        "EventPreviewHero",
        "LabHero",
        "ManualQaHero",
        "HostTodayEventHero",
      ],
    },
    {
      id: "app-section-header-family",
      title: "Section header family",
      reason:
        "Section/list headers repeat title, trailing action, timestamp, and compact divider behavior under feature-specific names.",
      recommended: "catch.section_header",
      tags: ["header", "sections"],
      names: [
        "CatchSectionHeader",
        "CatchDaySectionHeader",
        "HostOrganizerSectionHeader",
        "LiveSectionHeader",
        "BlockHeader",
        "LayerHeader",
      ],
    },
    {
      id: "app-kicker-label-family",
      title: "Kicker and section label family",
      reason:
        "Small uppercase/mono labels exist as kickers, section labels, setup titles, and control labels. Review whether these are variants of one typography primitive.",
      recommended: "catch.kicker",
      tags: ["typography", "sections"],
      names: [
        "CatchKickerText",
        "CatchMetadataText",
        "CatchSectionHeaderTitle",
        "HostSectionLabel",
        "StageSectionHeader",
        "SetupSectionTitle",
        "ControlLabel",
      ],
    },
    {
      id: "app-step-flow-family",
      title: "Step flow family",
      reason:
        "Create/edit wizards and onboarding-like flows repeat step body, header, progress, and form section structure.",
      recommended: "catch.step_flow",
      tags: ["forms", "wizard"],
      names: [
        "CatchPageBody",
        "CatchStepHeader",
        "CatchStepFlowHeader",
        "CreateEventStepHeader",
        "OrganizerBasicsStep",
        "EventDetailsStep",
        "WhenStep",
        "WhereStep",
      ],
    },
    {
      id: "app-empty-state-family",
      title: "Empty state family",
      reason:
        "Feature empty states should either provide semantic copy/actions around CatchEmptyState or disappear as pass-through wrappers.",
      recommended: "catch.empty_state",
      tags: ["feedback", "empty"],
      names: [
        "CatchEmptyState",
        "ExploreEmptyState",
        "ChatsEmptyState",
        "CatchesHubEmptyState",
        "HostEmptyState",
        "SwipeEmptyState",
        "HostTodayEmptyEvents",
        "DashboardEmptySliverBody",
      ],
    },
    {
      id: "app-skeleton-loading-family",
      title: "Skeleton and loading family",
      reason:
        "Skeletons currently encode local shapes in many features. Review whether the shapes are variants of CatchSkeleton recipes or legitimate feature previews.",
      recommended: "catch.skeleton",
      tags: ["feedback", "loading"],
      names: [
        "CatchSkeleton",
        "ActivitySectionSkeleton",
        "EventAgendaSliverSkeleton",
        "FiltersContentSkeleton",
        "ProfileSurfaceSkeleton",
        "CatchesProfileBodySkeleton",
        "HostSummarySkeleton",
        "HostRosterSkeleton",
        "EventPreviewHeroSkeleton",
      ],
    },
    {
      id: "app-error-state-family",
      title: "Error state family",
      reason:
        "Error banners, scaffolds, inline states, and sliver states should share one grammar for severity, retry action, icon, and compact/full-page layout.",
      recommended: "catch.error_state",
      tags: ["feedback", "error"],
      names: [
        "CatchErrorState",
        "CatchErrorState",
        "CatchSliverErrorState",
        "CatchFrameworkErrorState",
        "CatchErrorScaffold",
        "CatchBanner",
        "CatchLocalizedErrorBanner",
      ],
    },
    {
      id: "app-notice-callout-family",
      title: "Notice and callout family",
      reason:
        "Informational notes and heads-up cards repeat icon/title/body/action callout structure across payments, host edit, and Event Success.",
      recommended: "catch.notice",
      tags: ["feedback", "callout"],
      names: [
        "CatchNotice",
        "CatchBanner",
        "EventSuccessSetupNoticeBanner",
        "EditHostedEventScopeNotice",
        "PaymentConfirmationNotice",
        "IntegrationNotesCard",
        "CompanionActionsEmptyState",
      ],
    },
    {
      id: "app-share-card-family",
      title: "Share card and share sheet family",
      reason:
        "Club, event, and chat share surfaces likely need one share-card contract plus a sheet wrapper rather than three separate card grammars.",
      recommended: "catch.share_card",
      tags: ["sharing", "card"],
      names: [
        "CatchShareCardSheet",
        "OrganizerShareCard",
        "EventShareCard",
        "ChatShareCard",
        "ChatShareCardSheet",
      ],
    },
    {
      id: "app-avatar-stack-family",
      title: "Avatar stack and rail family",
      reason:
        "People stacks and avatar rails should compose CatchAvatar with shared overlap, count, veil, and compact-density rules.",
      recommended: "catch.person_avatar_stack",
      tags: ["avatar", "people"],
      names: [
        "CatchAvatarRow",
        "EventHypeAvatarRow",
        "HostTodayAvatarStack",
        "OrganizerAvatarRail",
      ],
    },
    {
      id: "app-person-avatar-family",
      title: "Person avatar family",
      reason:
        "Host/club avatar widgets should use CatchAvatar variants instead of reimplementing initials, photo fallback, ring, and dim states.",
      recommended: "catch.person_avatar",
      tags: ["avatar", "people"],
      names: [
        "CatchAvatar",
        "ClubHostAvatar",
        "HostTodayAvatarDot",
        "OrganizerHostIdentityRow",
      ],
    },
    {
      id: "app-metric-grid-family",
      title: "Metric grid and strip family",
      reason:
        "Metric strip/grid widgets should share metric item data, responsive column behavior, and tone rules before feature-specific analytics copy is layered in.",
      recommended: "catch.metric_grid",
      tags: ["metrics", "analytics"],
      names: [
        "CatchMetricSection",
        "EventStatsGrid",
        "HostAnalyticsMetricGrid",
        "HostOrganizerMetricGrid",
        "EventSuccessReportQualitySection",
      ],
    },
    {
      id: "app-metric-tile-family",
      title: "Metric tile family",
      reason:
        "Single metric tiles appear in policy labs, host analytics, organizer insights, today hero metrics, and Event Success pills.",
      recommended: "catch.metric_tile",
      tags: ["metrics", "analytics"],
      names: [
        "CatchMetricTile",
        "HostAnalyticsMetricTile",
        "HostOrganizerMetricTile",
        "HostTodayHeroMetric",
        "HostAnalyticsInlineStat",
        "EventSuccessMetricPill",
        "HostTrendKpi",
      ],
    },
    {
      id: "app-meta-row-family",
      title: "Meta row family",
      reason:
        "Compact icon/text metadata rows are implemented repeatedly in host manage, organizer, event summary, and core metadata widgets.",
      recommended: "catch.meta_row",
      tags: ["rows", "metadata"],
      names: [
        "CatchMetaRow",
        "HostMetaRow",
        "HostManageMetaRow",
        "HostEventSummaryRow",
        "HostOrganizerMetricRow",
        "HostInviteLinkRow",
        "HostActionRow",
      ],
    },
    {
      id: "app-detail-row-family",
      title: "Detail row family",
      reason:
        "Compact label/value/action rows likely belong to CatchField or CatchDetailRow density modes instead of feature-local row widgets.",
      recommended: "catch.field",
      tags: ["rows", "data-display"],
      names: [
        "CatchDetailRow",
        "CapacityRow",
        "RequirementsRow",
        "EventPolicyResultRow",
        "EventPolicyCancellationRow",
        "CompanionExpectationRow",
        "ProgressRow",
        "PeopleTokenRow",
        "CompanionPreviewText",
      ],
    },
    {
      id: "app-person-row-family",
      title: "Person row family",
      reason:
        "People rows repeat avatar/name/subtitle/status/action layout across notifications, host team, organizer team, wingman, and conversation cues.",
      recommended: "catch.person_row",
      tags: ["rows", "people"],
      names: [
        "CatchPersonRow",
        "NotificationRow",
        "HostTeamOwnerHostRow",
        "HostOrganizerTeamRow",
        "WingmanCandidateRow",
        "EventSuccessHostHelpRow",
        "ConversationCueRow",
      ],
    },
    {
      id: "app-field-editor-family",
      title: "Inline field editor family",
      reason:
        "Inline profile/host editors should be modes of the field system unless they own domain validation beyond a primitive contract.",
      recommended: "catch.field",
      tags: ["forms", "fields"],
      names: [
        "CatchField",
        "ProfileDirectTextEntryField",
        "ProfileInlineRangeEditor",
        "ProfileInlineHeightEditor",
        "StructureNumberField",
      ],
    },
    {
      id: "app-form-label-family",
      title: "Form label family",
      reason:
        "Form/control labels and setup section titles should use one typography primitive with optional helper/error affordances.",
      recommended: "catch.form_label",
      tags: ["forms", "typography"],
      names: [
        "CatchFieldLabelText",
        "ControlLabel",
        "SetupSectionTitle",
      ],
    },
    {
      id: "app-section-container-family",
      title: "Section container family",
      reason:
        "Feature section containers repeat title/body/chrome/padding variants that may belong to CatchSection or a section-layout wrapper.",
      recommended: "catch.section",
      tags: ["sections", "layout"],
      names: [
        "CatchSection",
        "ActivitySection",
        "HostSettingsSection",
        "HostAnalyticsSection",
        "EventSuccessHostSection",
        "SetupDisclosureSection",
        "FiltersSection",
        "CompatibilityQuestionnaireSection",
      ],
    },
    {
      id: "app-section-list-family",
      title: "Section list family",
      reason:
        "Stacked section lists and preview sections repeat route-level composition that may be driven by CatchSectionList placement recipes.",
      recommended: "catch.section_list",
      tags: ["sections", "lists"],
      names: [
        "CatchSectionList",
        "CatchSectionList.sliver",
        "EventDetailOverviewSection",
        "EventDetailSocialSection",
        "OrganizerReviewsSection",
        "ReviewsPreviewSection",
        "HostEventsOrganizerSection",
        "DashboardStrideSection",
      ],
    },
    {
      id: "app-surface-card-family",
      title: "Surface card family",
      reason:
        "Generic cards in dashboard, Event Success, host, and recommendations should share CatchSurface/Card defaults before feature content is composed inside.",
      recommended: "catch.surface",
      tags: ["card", "surface"],
      names: [
        "CatchSurface",
        "DashboardSectionStateCard",
        "StageCard",
        "ModuleCard",
        "EventSuccessSetupNoticeBanner",
        "PromiseCard",
        "RecommendCard",
        "PresetReviewCard",
        "HostPrivateAccessCard",
      ],
    },
    {
      id: "app-policy-section-family",
      title: "Policy section family",
      reason:
        "Policy/default/schedule sections are structured summaries with editable/read-only variants and should share one section grammar.",
      recommended: "catch.section",
      tags: ["section", "policy"],
      names: [
        "HostedEventPolicySection",
        "HostedEventScheduleSection",
        "OrganizerPolicyDefaultsCard",
        "EventDetailPolicySummary",
      ],
    },
    {
      id: "app-event-card-family",
      title: "Event card and event row family",
      reason:
        "Consumer event tiles, rows, agenda items, date rail cards, and ticket cards should converge on a small event-card grammar.",
      recommended: "catch.event_card",
      tags: ["card", "events"],
      names: [
        "EventActionCard",
        "EventDateRailCard",
        "EventCompactRow",
        "EventAgendaTile",
        "EventFocusRail",
        "EventCard",
        "AttendedEventTile",
      ],
    },
    {
      id: "app-host-event-card-family",
      title: "Host event card and row family",
      reason:
        "Host event list rows, summary cards, tool cards, today task cards, inbox cards, and club cards repeat event-management item structure.",
      recommended: "catch.host_event_card",
      tags: ["card", "host"],
      names: [
        "HostEventRow",
        "HostEventRows",
        "HostEventSummaryCard",
        "HostEventsOrganizerCard",
        "HostEventToolCard",
        "HostTodayTaskCard",
        "HostClubProfileCard",
      ],
    },
    {
      id: "app-payment-card-family",
      title: "Payment card family",
      reason:
        "Payment account states and receipt/history surfaces can likely share status-card and receipt-card primitives.",
      recommended: "catch.payment_card",
      tags: ["card", "payments"],
      names: [
        "HostPaymentAccountCard",
        "HostPaymentAccountContentCard",
        "HostPaymentAccountLoadingCard",
        "HostPaymentAccountErrorCard",
        "PaymentHistoryTile",
        "PaymentReceiptSheet",
      ],
    },
    {
      id: "app-tile-family",
      title: "List tile family",
      reason:
        "Tiles repeat leading/media, title, subtitle, metadata, and trailing action patterns across club, chat, map, report, icon, and analytics rows.",
      recommended: "catch.list_tile",
      tags: ["tiles", "rows"],
      names: [
        "CatchIconTile",
        "ClubListTile",
        "CatchPersonRow",
        "MapPinTile",
        "PublicProfileReportReasonTile",
        "HostAnalyticsEventTile",
      ],
    },
    {
      id: "app-horizontal-rail-family",
      title: "Horizontal rail family",
      reason:
        "Horizontal rails should share scroll padding, item spacing, snap/overflow affordances, and section header behavior.",
      recommended: "catch.section",
      tags: ["rail", "layout"],
      names: [
        "CatchHorizontalScrollView",
        "CatchSection",
        "DashboardClubsRail",
        "EventFocusRail",
        "ExplorePeekRailContent",
        "CountdownBeatRail",
        "RevealRoundRail",
        "QuestionProgressRail",
        "CompanionPaperProgressIndicator",
      ],
    },
    {
      id: "app-tab-rail-family",
      title: "Tab and tab rail family",
      reason:
        "Top bar tabs, host tab rails, profile tabs, Event Success tabs, and skeleton variants should share one tab-control contract.",
      recommended: "catch.tab_control",
      tags: ["tabs", "selection"],
      names: [
        "CatchPageTabBar",
        "HostSettingsTabRail",
        "HostClubTabRail",
        "EventSuccessHostTabBar",
        "ProfilePreviewBody",
        "ProfileTab",
        "EventSuccessHostSetupPageBody",
        "EventSuccessHostLivePageBody",
        "EventSuccessHostReportPageBody",
      ],
    },
    {
      id: "app-bottom-chrome-family",
      title: "Bottom chrome family",
      reason:
        "Bottom CTA, dock, booking, self-check-in, membership, and action dock surfaces need one boundary for safe-area bottom chrome.",
      recommended: "catch.bottom_chrome",
      tags: ["bottom", "actions"],
      names: [
        "CatchDock",
        "EventBookingDock",
        "OrganizerMembershipDock",
        "CompanionStageActionSection",
        "GuestAuthCtaBar",
        "CompanionSelfCheckInSection",
      ],
    },
    {
      id: "app-sheet-family",
      title: "Bottom sheet family",
      reason:
        "Sheets should share scaffold, grabber, width, title/action, and keyboard/safe-area behavior instead of each feature owning its own shell.",
      recommended: "catch.bottom_sheet",
      tags: ["sheet", "modal"],
      names: [
        "CatchSheet",
        "DraftPickerSheet",
        "BookingConflictSheet",
        "MatchTesterSheet",
        "PaymentCheckoutSheet",
        "PaymentReceiptSheet",
        "WriteReviewSheet",
        "PublicProfileReportSheet",
      ],
    },
    {
      id: "app-editor-sheet-family",
      title: "Editor and override sheet family",
      reason:
        "Editor/override sheets repeat form title, dirty-state, actions, and list-editing shell behavior across host, profile, review, and Event Success.",
      recommended: "catch.editor_sheet",
      tags: ["sheet", "forms"],
      names: [
        "GroupOverrideSheet",
        "RotationOverrideSheet",
        "CustomQuestionnaireSheet",
        "ReviewResponseSheet",
        "ProfileReactionCommentSheet",
        "HostProfileEditorSheet",
        "HostTeamAddHostSheet",
        "HostBroadcastComposerSheet",
      ],
    },
    {
      id: "app-dialog-family",
      title: "Dialog family",
      reason:
        "Dialog-style confirmation and form surfaces should be checked against CatchDialog before more feature dialogs are added.",
      recommended: "catch.dialog",
      tags: ["modal", "dialog"],
      names: [
        "CatchDialog",
        "MatchCelebrationDialog",
        "HostTeamHostActionDialog",
      ],
    },
    {
      id: "app-search-filter-family",
      title: "Search and filter family",
      reason:
        "Search bars, filter rails/sheets, roster filters, and map overlays repeat query, chip, control, and results-state chrome.",
      recommended: "catch.search_filter",
      tags: ["search", "filters"],
      names: [
        "CatchSearchField",
        "HostRosterSearchBar",
        "ExploreFilterRail",
        "ExploreFilterSheet",
        "FiltersBody",
        "FiltersSection",
        "HostRosterFilterHeader",
        "MapOverlayTopBar",
      ],
    },
    {
      id: "app-selection-option-family",
      title: "Selection option family",
      reason:
        "Cards, chips, switches, toggles, and toggle rows should share selected/disabled/error/tone semantics even when their layouts differ.",
      recommended: "catch.option",
      tags: ["selection", "forms"],
      names: [
        "CatchChoiceTile",
        "CatchChip",
        "IncludeMeField",
        "RecommendationSwitch",
        "CatchToggleInput",
        "ModuleToggleRow",
        "ManualQaToggleRow",
      ],
    },
    {
      id: "app-picker-family",
      title: "Picker family",
      reason:
        "City, scenario, section, star, location, and draft pickers need a shared picker/menu/sheet boundary.",
      recommended: "catch.picker",
      tags: ["picker", "forms"],
      names: [
        "ExploreCityPicker",
        "EventPolicyScenarioPicker",
        "HostManageSectionPicker",
        "LocationPickerScreen",
        "DraftPickerSheet",
        "StarRatingPicker",
      ],
    },
    {
      id: "app-photo-picker-family",
      title: "Photo picker family",
      reason:
        "Profile, club, event, and ordered photo pickers should share slot/grid/reorder/error behavior.",
      recommended: "catch.photo_picker",
      tags: ["media", "forms"],
      names: [
        "OrderedPhotoPicker",
        "PhotoSlotTile",
        "PhotoGrid",
        "CreateOrganizerPhotosPicker",
        "CreateOrganizerProfileImagePicker",
        "CreateEventPhotoPicker",
        "OnboardingPhotosBody",
        "ProfilePhotoEditorScreen",
      ],
    },
    {
      id: "app-map-family",
      title: "Map and location family",
      reason:
        "Map screens, pins, overlays, and loading states should share location/map display contracts before route-level state is composed.",
      recommended: "catch.map",
      tags: ["map", "location"],
      names: [
        "ActivityMapPin",
        "MapPinTile",
        "EventPinsMap",
        "EventMap",
        "EventMapLoadingBody",
        "ExploreMapScreen",
        "EventLocationMapScreen",
        "MapOverlayTopBar",
      ],
    },
    {
      id: "app-roster-family",
      title: "Roster and attendance family",
      reason:
        "Roster tables, tiles, rows, attendance panels, filters, search, and skeletons should share one attendance-data contract.",
      recommended: "catch.roster",
      tags: ["roster", "host"],
      names: [
        "ParticipantTable",
        "CatchRosterTiles",
        "ParticipantRow",
        "HostEventAttendancePanel",
        "HostRosterSkeleton",
        "HostRosterSearchBar",
        "HostRosterFilterHeader",
        "ParticipantRowAction",
      ],
    },
    {
      id: "app-team-roster-family",
      title: "Host team family",
      reason:
        "Host team management, organizer team cards/rows, owner rows, and add-host sheets likely share people-row plus management-section primitives.",
      recommended: "catch.team_management",
      tags: ["team", "host"],
      names: [
        "HostTeamManagementSection",
        "HostOrganizerTeamCard",
        "HostOrganizerTeamRow",
        "HostTeamOwnerHostRow",
        "HostTeamAddHostSheet",
      ],
    },
    {
      id: "app-analytics-family",
      title: "Analytics panel family",
      reason:
        "Host/user analytics panels repeat report sections, controls, trend panels, data-quality notes, and metric grids.",
      recommended: "catch.analytics_panel",
      tags: ["analytics", "host"],
      names: [
        "HostAnalyticsReportBody",
        "HostAnalyticsTrendSection",
        "HostAnalyticsBarTile",
        "HostAnalyticsEventList",
        "HostAnalyticsReviewsSection",
        "UserAnalyticsSection",
      ],
    },
    {
      id: "app-host-today-family",
      title: "Host today family",
      reason:
        "Host Today has its own header, hero, dashboard cards, task cards, loading, and empty states; review what becomes lifecycle primitives.",
      recommended: "catch.host_lifecycle",
      tags: ["host", "lifecycle"],
      names: [
        "HostTodayDashboardSection",
        "HostTodayDashboardCard",
        "HostTodayHeader",
        "HostTodayEventHero",
        "HostTodayTaskCard",
        "HostTodayLoadingBody",
      ],
    },
    {
      id: "app-live-console-family",
      title: "Live console family",
      reason:
        "Live console/check-in/attendance widgets repeat operational card, QR, summary strip, step context, and navigation behavior.",
      recommended: "catch.live_console",
      tags: ["live", "host"],
      names: [
        "EventSuccessControlRoomPageBody",
        "LiveCheckInQrCard",
        "LiveAttendanceSummaryCard",
        "LiveCheckInSummaryStrip",
        "CompanionArrivalProgressIndicator",
        "LiveStepContextCard",
        "EventSuccessStepActionRow",
      ],
    },
    {
      id: "app-reveal-rotation-family",
      title: "Reveal and rotation family",
      reason:
        "Rotation/reveal rows, slots, rails, and schedules repeat ordered assignment visualization and should have one Event Success primitive family.",
      recommended: "catch.rotation_reveal",
      tags: ["event-success", "reveal"],
      names: [
        "RevealRoundList",
        "RevealRoundRow",
        "RevealSlotRow",
        "RevealGroupSlotRow",
        "RotationScheduleCard",
        "RotationSlotRow",
        "GroupRotationSlotRow",
        "VisibleRotationSlots",
        "VisibleGroupRotationSlots",
      ],
    },
    {
      id: "app-questionnaire-family",
      title: "Questionnaire family",
      reason:
        "Questionnaire blocks/previews/fields/config editors repeat prompt, answer, progress, custom-question, and compatibility section UI.",
      recommended: "catch.questionnaire",
      tags: ["forms", "event-success"],
      names: [
        "QuestionnaireBlock",
        "QuestionnairePreview",
        "CustomQuestionFields",
        "CustomQuestionnaireSection",
        "EventSuccessQuestionnaireConfigEditor",
        "CompatibilityQuestionnaireSection",
        "QuestionProgressRail",
      ],
    },
    {
      id: "app-review-family",
      title: "Review family",
      reason:
        "Review cards, history items, preview sections, owner responses, review sheets, and club/event review sections need one reviews primitive family.",
      recommended: "catch.review",
      tags: ["reviews", "social-proof"],
      names: [
        "ReviewCard",
        "ReviewsPreviewSection",
        "ReviewHistoryRow",
        "ReviewOwnerResponseCard",
        "ReviewResponseSheet",
        "WriteReviewSheet",
        "OrganizerReviewsSection",
        "EventReviewsSection",
      ],
    },
  ];

  for (const group of firstPassConsolidationGroups.slice(0, 50)) {
    addAppGroup(group);
  }

  const registerList = manifest.components
    .filter((component) => {
      const desired = `Catch${component.name}`;
      const hasWidget = byName.has(component.name) || byName.has(desired);
      const hasContract = contracts.some(
        (contract) =>
          contract.name === component.name ||
          contract.name === desired ||
          contract.design?.claude?.handoffName === component.name,
      );
      return hasWidget && !hasContract;
    })
    .map((component) => {
      const local =
        findFirst(byName, component.name, `Catch${component.name}`) ??
        findFirst(byName, component.name);
      return {
        id: `register-${snakeCase(component.name)}`,
        title: `${component.name}: registered?`,
        bucket: "register",
        priority: "P2",
        reason:
          "Widgetbook has a rendering, but no global component contract exists yet.",
        recommended: `catch.${snakeCase(component.name)}`,
        tags: ["register", component.sourcePath.split("/")[1] ?? "component"],
        left: candidatePane(local, contractsByName, classificationByName),
        right: null,
        sourcePath: component.sourcePath,
      };
    });

  const priorityRank = { P0: 0, P1: 1, P2: 2, P3: 3 };
  const queueClassRank = (candidate) => {
    if (candidate.tags?.includes("pattern-family")) return 0;
    if (candidate.tags?.includes("decision-preview")) return 1;
    if (candidate.tags?.includes("variant-prune")) return 2;
    if (candidate.tags?.includes("app-consolidation")) return 3;
    if (candidate.tags?.includes("dedupe")) return 5;
    return 4;
  };
  candidates.sort((a, b) => {
    const byQueueClass = queueClassRank(a) - queueClassRank(b);
    if (byQueueClass !== 0) return byQueueClass;
    if (a.patternFamily && b.patternFamily) {
      return a.patternFamily.registryIndex - b.patternFamily.registryIndex;
    }
    if (a.tags?.includes("dedupe") && b.tags?.includes("dedupe")) {
      return (
        (a.dedupeReview?.queueRank ?? 9999) -
        (b.dedupeReview?.queueRank ?? 9999)
      );
    }
    const byPriority =
      (priorityRank[a.priority] ?? 9) - (priorityRank[b.priority] ?? 9);
    if (byPriority !== 0) return byPriority;
    const aManual = a.id.startsWith("duplicate-") ? 1 : 0;
    const bManual = b.id.startsWith("duplicate-") ? 1 : 0;
    if (aManual !== bManual) return aManual - bManual;
    return a.title.localeCompare(b.title);
  });

  const resolvedIds = resolvedCandidateIds();
  const decisionsById = decisionStateById();
  const candidatesWithState = candidates.map((candidate) =>
    withReviewState(candidate, decisionsById, resolvedIds),
  );
  const promotedComponents = new Set(
    candidatesWithState.flatMap((candidate) =>
      [
        candidate.left,
        candidate.right,
        ...(candidate.previewPanes ?? []),
        ...(candidate.related ?? []),
      ]
        .map((pane) => pane?.component)
        .filter(Boolean),
    ),
  );
  const visibleRegisterList = registerList
    .filter((item) => !promotedComponents.has(item.left?.component))
    .map((item) => withReviewState(item, decisionsById, resolvedIds));
  const pendingCandidates = candidatesWithState.filter(
    (candidate) =>
      !candidate.reviewState.decided && !candidate.reviewState.resolved,
  );
  const decidedCandidates = candidatesWithState.filter(
    (candidate) => candidate.reviewState.decided,
  );
  const resolvedCandidates = candidatesWithState.filter(
    (candidate) => candidate.reviewState.resolved,
  );

  return {
    generatedAt: new Date().toISOString(),
    widgetbookOrigin,
    widgetbookPreviewFrameUrl: useWidgetbookSameOriginFrame
      ? widgetbookPreviewFrameUrl()
      : "/preview-frame",
    stats: {
      claudeComponents: manifest.components.length,
      widgetbookComponents: components.length,
      contracts: contracts.length,
      conflicts: pendingCandidates.length,
      totalConflicts: candidatesWithState.length,
      decided: decidedCandidates.length,
      resolved: resolvedCandidates.length,
      patternFamilies: candidatesWithState.filter((candidate) =>
        candidate.tags?.includes("pattern-family"),
      ).length,
      dedupe: pendingCandidates.filter((candidate) =>
        candidate.tags?.includes("dedupe"),
      ).length,
      appConsolidation: pendingCandidates.filter((candidate) =>
        candidate.tags?.includes("app-consolidation"),
      ).length,
      registerOnly: visibleRegisterList.length,
      hiddenByDefault: decidedCandidates.length + resolvedCandidates.length,
    },
    candidates: candidatesWithState,
    registerList: visibleRegisterList,
  };
}

function decisionStateById() {
  return new Map(
    readLatestDecisions()
      .filter((entry) => entry?.id)
      .map((entry) => [entry.id, entry]),
  );
}

function withReviewState(item, decisionsById, resolvedIds) {
  const decision = decisionsById.get(item.id);
  const hasDecision = Boolean(
    decision && (decision.decision || decision.note || decision.recommended),
  );
  const implemented =
    decision?.status === "implemented" || decision?.implemented === true;
  const registryImplemented = item.patternFamily?.status === "implemented";
  return {
    ...item,
    reviewState: {
      decided: hasDecision,
      resolved: resolvedIds.has(item.id) || implemented || registryImplemented,
      status: decision?.status ?? "",
      decision: decision?.decision ?? "",
      note: decision?.note ?? "",
      updatedAt: decision?.ts ?? "",
    },
  };
}

function safeReadFile(fileParam) {
  const requested = String(fileParam ?? "");
  if (!requested) throw new Error("Missing file parameter.");
  const absolute = path.isAbsolute(requested)
    ? requested
    : path.join(repoRoot, requested);
  const normalized = path.normalize(absolute);
  const allowedRoots = [repoRoot, claudeRoot].map((root) =>
    path.normalize(root),
  );
  if (!allowedRoots.some((root) => normalized === root || normalized.startsWith(root + path.sep))) {
    throw new Error("File is outside allowed roots.");
  }
  const stat = fs.statSync(normalized);
  if (!stat.isFile()) throw new Error("Path is not a file.");
  if (stat.size > 500_000) throw new Error("File is too large for inline review.");
  return {
    file: path.isAbsolute(requested)
      ? normalized
      : path.relative(repoRoot, normalized),
    content: fs.readFileSync(normalized, "utf8"),
  };
}

function readLatestDecisions() {
  if (fs.existsSync(latestPath)) {
    return readJson(latestPath);
  }
  return [];
}

function readVisibleDecisions() {
  return readLatestDecisions();
}

function sectionStatus(markdown, heading) {
  const escapedHeading = heading.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  const match = markdown.match(
    new RegExp(
      `(^|\\n)## ${escapedHeading}\\s*\\n([\\s\\S]*?)(?=\\n##\\s|$)`,
      "u",
    ),
  );
  const status = match?.[2]?.match(/^Status:\s*([^\n]+)/mu);
  return status?.[1]?.trim().toLowerCase() ?? "";
}

function resolvedCandidateIds() {
  if (!fs.existsSync(resolutionQueuePath)) return new Set();
  const queue = fs.readFileSync(resolutionQueuePath, "utf8");
  const resolved = new Set();
  for (const [id, section] of candidateSectionMap.entries()) {
    if (sectionStatus(queue, section).startsWith("implemented")) {
      resolved.add(id);
    }
  }
  return resolved;
}

function writeDecision(payload) {
  const event = {
    ts: new Date().toISOString(),
    ...payload,
  };
  fs.appendFileSync(decisionsPath, JSON.stringify(event) + "\n");
  const latest = readLatestDecisions().filter(
    (entry) => entry.id !== event.id,
  );
  latest.unshift(event);
  fs.writeFileSync(latestPath, JSON.stringify(latest.slice(0, 200), null, 2));
  console.log(
    `REVIEW ${event.ts} ${event.id} decision=${event.decision ?? "none"} note=${JSON.stringify(
      event.note ?? "",
    )}`,
  );
  return event;
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}

function json(res, status, value) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  res.end(JSON.stringify(value, null, 2));
}

function text(res, status, value, contentType = "text/plain; charset=utf-8") {
  res.writeHead(status, {
    "content-type": contentType,
    "cache-control": "no-store",
  });
  res.end(value);
}

function normalizePreviewTarget(value) {
  if (!value) return null;
  let target;
  let widgetbook;
  try {
    target = new URL(value);
    widgetbook = new URL(widgetbookOrigin);
  } catch {
    return null;
  }
  if (target.origin !== widgetbook.origin) return null;
  if (!target.hash.startsWith("#/")) return null;
  return target.toString();
}

function previewFrameHtml(targetUrl) {
  const widgetbookRoot = widgetbookOrigin.endsWith("/")
    ? widgetbookOrigin
    : `${widgetbookOrigin}/`;
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Widgetbook Preview Frame</title>
  <style>
    html, body {
      width: 100%;
      height: 100%;
      margin: 0;
      overflow: hidden;
      background: #fff;
    }
    iframe {
      display: block;
      width: 100%;
      height: 100%;
      border: 0;
      background: #fff;
    }
    .controls {
      position: fixed;
      right: 8px;
      bottom: 8px;
      z-index: 2;
      display: flex;
      gap: 6px;
      align-items: center;
      opacity: 0;
      transition: opacity 120ms ease;
      pointer-events: none;
    }
    body:hover .controls,
    .controls:focus-within {
      opacity: 0.9;
      pointer-events: auto;
    }
    .status,
    button {
      border: 1px solid rgba(0, 0, 0, 0.18);
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.9);
      color: #17130f;
      font: 11px/1.1 ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      box-shadow: 0 8px 20px rgba(0, 0, 0, 0.12);
    }
    .status {
      padding: 6px 8px;
    }
    button {
      cursor: pointer;
      padding: 6px 9px;
    }
  </style>
</head>
<body>
  <iframe id="widgetbookFrame" src="${escapeHtml(widgetbookRoot)}" loading="eager"></iframe>
  <div class="controls" aria-live="polite">
    <span class="status" id="status">Booting Widgetbook</span>
    <button type="button" id="retry">Retry</button>
  </div>
  <script>
    const widgetbookRoot = ${JSON.stringify(widgetbookRoot)};
    const previewTarget = ${JSON.stringify(targetUrl)};
    const frame = document.getElementById("widgetbookFrame");
    const status = document.getElementById("status");
    const retry = document.getElementById("retry");
    let attempt = 0;
    let loadedOnce = false;

    function stampedTarget() {
      attempt += 1;
      const separator = previewTarget.includes("?") || previewTarget.includes("&") ? "&" : "?";
      return previewTarget + separator + "__previewTick=" + Date.now() + "_" + attempt;
    }

    function routePreview() {
      status.textContent = attempt === 0 ? "Opening preview" : "Retry " + (attempt + 1);
      frame.src = stampedTarget();
    }

    frame.addEventListener("load", () => {
      if (loadedOnce) return;
      loadedOnce = true;
      window.setTimeout(routePreview, 90);
    });

    retry.addEventListener("click", routePreview);
    [350, 900, 1700, 3000, 4800, 7600, 11200].forEach((delay) => {
      window.setTimeout(routePreview, delay);
    });

    window.setTimeout(() => {
      status.textContent = "Preview route applied";
    }, 12000);
  </script>
</body>
</html>`;
}

function widgetbookSameOriginPreviewFrameHtml() {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Catch Widgetbook Preview</title>
  <style>
    html, body {
      width: 100%;
      height: 100%;
      margin: 0;
      overflow: hidden;
      background: #fff;
    }
    iframe {
      display: block;
      width: 100%;
      height: 100%;
      border: 0;
      background: #fff;
    }
    .controls {
      position: fixed;
      right: 8px;
      bottom: 8px;
      z-index: 2;
      display: flex;
      gap: 6px;
      align-items: center;
      opacity: 0;
      transition: opacity 120ms ease;
      pointer-events: none;
    }
    body:hover .controls,
    .controls:focus-within {
      opacity: 0.9;
      pointer-events: auto;
    }
    .status,
    button {
      border: 1px solid rgba(0, 0, 0, 0.18);
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.92);
      color: #17130f;
      font: 11px/1.1 ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      box-shadow: 0 8px 20px rgba(0, 0, 0, 0.12);
    }
    .status {
      padding: 6px 8px;
    }
    button {
      cursor: pointer;
      padding: 6px 9px;
    }
  </style>
</head>
<body>
  <iframe id="widgetbookFrame" loading="eager"></iframe>
  <div class="controls" aria-live="polite">
    <span class="status" id="status">Booting Widgetbook</span>
    <button type="button" id="retry">Retry</button>
  </div>
  <script>
    const params = new URLSearchParams(window.location.search);
    const frame = document.getElementById("widgetbookFrame");
    const status = document.getElementById("status");
    const retry = document.getElementById("retry");
    const cleanParam = "__catchPreviewClean";
    let desiredHash = "";
    let rootLoaded = false;
    let attempt = 0;

    try {
      const target = new URL(params.get("target") || "", window.location.origin);
      if (target.origin !== window.location.origin || !target.hash.startsWith("#/")) {
        throw new Error("Invalid preview target");
      }
      desiredHash = target.hash;
    } catch (error) {
      status.textContent = "Invalid preview target";
    }

    function stampedHash() {
      const separator = desiredHash.includes("?") || desiredHash.includes("&") ? "&" : "?";
      return desiredHash + separator + "__previewTick=" + Date.now() + "_" + attempt;
    }

    async function resetWidgetbookRuntime() {
      if (params.has(cleanParam)) return true;
      status.textContent = "Resetting Widgetbook cache";
      try {
        if ("serviceWorker" in navigator) {
          const registrations = await navigator.serviceWorker.getRegistrations();
          await Promise.all(registrations.map((registration) => registration.unregister()));
        }
      } catch (error) {
        console.warn("Could not unregister Widgetbook service workers", error);
      }
      try {
        if ("caches" in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map((key) => caches.delete(key)));
        }
      } catch (error) {
        console.warn("Could not clear Widgetbook caches", error);
      }
      const next = new URL(window.location.href);
      next.searchParams.set(cleanParam, String(Date.now()));
      window.location.replace(next.toString());
      return false;
    }

    function bootWidgetbookRoot() {
      rootLoaded = false;
      routePreview();
    }

    function routePreview() {
      if (!desiredHash) return;
      attempt += 1;
      status.textContent = attempt === 1 ? "Opening preview" : "Retry " + attempt;
      rootLoaded = false;
      frame.src = "/" + stampedHash();
    }

    frame.addEventListener("load", () => {
      rootLoaded = true;
      if (desiredHash) status.textContent = "Preview route applied";
    });

    retry.addEventListener("click", routePreview);
    [2500, 6500].forEach((delay) => {
      window.setTimeout(() => {
        if (!rootLoaded) routePreview();
      }, delay);
    });

    window.setTimeout(() => {
      if (desiredHash) status.textContent = "Preview route applied";
    }, 11200);

    resetWidgetbookRuntime().then((ready) => {
      if (ready) bootWidgetbookRoot();
    });
  </script>
</body>
</html>`;
}

function installWidgetbookPreviewFrame() {
  try {
    if (!fs.existsSync(widgetbookBuildWebRoot)) return false;
    fs.writeFileSync(
      path.join(widgetbookBuildWebRoot, widgetbookPreviewFrameFile),
      widgetbookSameOriginPreviewFrameHtml(),
    );
    return true;
  } catch (error) {
    console.warn(`Could not install Widgetbook preview frame: ${error.message}`);
    return false;
  }
}

function appHtml() {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Catch Pattern Family Review</title>
  <style>
    :root {
      --bg: #eee9df;
      --paper: #fffaf2;
      --ink: #16120d;
      --muted: #71685e;
      --line: #ddd3c6;
      --line2: #b9ab9b;
      --accent: #111;
      --blue: #315f88;
      --red: #9c3329;
      --green: #2e6d50;
      --amber: #9a5a19;
      --shadow: 0 18px 40px rgba(18, 14, 10, 0.10);
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: var(--bg);
      color: var(--ink);
      font: 14px/1.4 ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    button, input, select, textarea { font: inherit; }
    .app {
      display: grid;
      grid-template-columns: clamp(220px, 22vw, 300px) minmax(0, 1fr);
      height: 100vh;
      overflow: hidden;
    }
    aside {
      border-right: 1px solid var(--line);
      background: #e8e1d5;
      padding: 12px;
      overflow: auto;
      min-width: 0;
    }
    main {
      min-width: 0;
      overflow: auto;
      padding: 12px;
    }
    h1 {
      font: 700 20px/1.04 Georgia, "Times New Roman", serif;
      margin: 0 0 6px;
    }
    p { margin: 0; color: var(--muted); }
    .stats {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 6px;
      margin: 12px 0;
    }
    .stat {
      border: 1px solid var(--line);
      background: rgba(255, 250, 242, 0.65);
      padding: 8px;
    }
    .stat strong { display: block; font-size: 16px; line-height: 1; }
    .stat span { display: block; color: var(--muted); font-size: 11px; margin-top: 4px; }
    .filters {
      position: sticky;
      top: -12px;
      z-index: 3;
      display: grid;
      gap: 7px;
      margin: 12px -12px 10px;
      padding: 10px 12px;
      background: #e8e1d5;
      border-bottom: 1px solid var(--line);
    }
    .filters input, .filters select {
      width: 100%;
      background: var(--paper);
      border: 1px solid var(--line2);
      padding: 8px 9px;
      color: var(--ink);
    }
    .toggle-row {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 6px;
    }
    .toggle-row label {
      display: flex;
      gap: 6px;
      align-items: center;
      min-width: 0;
      color: var(--muted);
      font-size: 12px;
      white-space: nowrap;
    }
    .queue-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
      margin: 4px 0 8px;
      color: var(--muted);
      font-size: 12px;
    }
    .candidate-list { display: grid; gap: 7px; }
    .candidate-button {
      width: 100%;
      text-align: left;
      border: 1px solid var(--line);
      background: var(--paper);
      color: var(--ink);
      padding: 9px;
      cursor: pointer;
    }
    .candidate-button.active {
      border-color: var(--ink);
      box-shadow: inset 3px 0 0 var(--ink);
    }
    .candidate-button strong { display: block; font-size: 13px; }
    .candidate-button span { display: block; color: var(--muted); font-size: 12px; margin-top: 4px; }
    .candidate-button.decided { opacity: 0.68; }
    .candidate-button.resolved {
      opacity: 0.54;
      background: rgba(255, 250, 242, 0.48);
    }
    .pill {
      display: inline-flex;
      align-items: center;
      border: 1px solid var(--line2);
      border-radius: 999px;
      padding: 2px 7px;
      color: var(--muted);
      font-size: 12px;
      margin-right: 5px;
    }
    .topbar {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 12px;
      align-items: flex-start;
      margin-bottom: 10px;
    }
    .topbar h2 {
      margin: 0 0 5px;
      font-size: 20px;
      line-height: 1.1;
    }
    .detail-actions {
      display: flex;
      flex-wrap: wrap;
      justify-content: flex-end;
      gap: 6px;
      min-width: 210px;
    }
    .small-button {
      border: 1px solid var(--line2);
      background: var(--paper);
      color: var(--ink);
      padding: 7px 9px;
      border-radius: 999px;
      cursor: pointer;
    }
    .preview-scroll {
      overflow-x: auto;
      padding-bottom: 4px;
    }
    .render-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(260px, 1fr));
      gap: 8px;
      min-width: min(100%, 528px);
    }
    .render-grid.pattern-family-lineup {
      grid-template-columns: none;
      grid-auto-flow: column;
      grid-auto-columns: 420px;
      width: max-content;
      min-width: 100%;
    }
    .render-card, .notes-card, .code-card, .register-card, .related-card {
      border: 1px solid var(--line);
      background: var(--paper);
      box-shadow: var(--shadow);
      min-width: 0;
    }
    .card-head {
      min-height: 42px;
      padding: 8px 10px;
      border-bottom: 1px solid var(--line);
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 10px;
      background: rgba(238, 232, 221, 0.58);
    }
    .card-head strong { overflow-wrap: anywhere; }
    .card-head a { color: var(--ink); }
    .card-actions {
      display: flex;
      align-items: center;
      gap: 6px;
      flex: 0 0 auto;
    }
    .review-contexts {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: center;
      padding: 10px;
      margin: 0 0 10px;
      border: 1px solid var(--line);
      background: rgba(255, 250, 242, 0.64);
    }
    .review-contexts strong {
      margin-right: 2px;
      font-size: 13px;
    }
    .context-button {
      border: 1px solid var(--line2);
      background: var(--paper);
      color: var(--ink);
      padding: 7px 10px;
      cursor: pointer;
      font: inherit;
    }
    .context-button.active {
      border-color: var(--ink);
      box-shadow: inset 0 -2px 0 var(--ink);
    }
    .context-note {
      flex-basis: 100%;
      color: var(--muted);
      font-size: 12px;
    }
    iframe {
      display: block;
      width: 100%;
      height: min(56vh, 600px);
      min-height: 430px;
      border: 0;
      background: white;
    }
    .missing {
      min-height: 540px;
      display: grid;
      place-items: center;
      color: var(--muted);
      padding: 22px;
      text-align: center;
    }
    .meta {
      color: var(--muted);
      font-size: 12px;
      padding: 8px 12px;
      border-top: 1px solid var(--line);
      overflow-wrap: anywhere;
    }
    .below {
      display: grid;
      grid-template-columns: minmax(0, 0.95fr) minmax(0, 1.05fr);
      gap: 12px;
      margin-top: 12px;
      align-items: start;
    }
    .notes-card, .code-card, .related-card { padding: 12px; }
    .related-card { margin-top: 12px; }
    .evidence-card {
      border: 1px solid var(--line);
      background: var(--paper);
      box-shadow: var(--shadow);
      padding: 12px;
      margin: 0 0 12px;
    }
    .evidence-top {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 12px;
      align-items: start;
      margin-bottom: 10px;
    }
    .evidence-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(132px, 1fr));
      gap: 8px;
      margin: 10px 0;
    }
    .evidence-metric {
      border: 1px solid var(--line);
      background: #fffdf8;
      padding: 8px;
    }
    .evidence-metric strong {
      display: block;
      font-size: 15px;
      line-height: 1.1;
    }
    .evidence-metric span {
      display: block;
      margin-top: 4px;
      color: var(--muted);
      font-size: 11px;
    }
    .why-list {
      margin: 10px 0 0;
      padding-left: 18px;
      color: var(--muted);
    }
    .why-list li + li { margin-top: 4px; }
    .review-question-grid {
      display: grid;
      gap: 8px;
      margin: 10px 0;
    }
    .review-question {
      border: 1px solid var(--line);
      background: #fffdf8;
      padding: 10px;
    }
    .review-question p {
      margin-top: 6px;
      color: var(--ink);
    }
    .review-recommendation {
      margin-top: 8px;
      color: var(--muted);
      font-size: 12px;
    }
    .review-question-options {
      display: flex;
      flex-wrap: wrap;
      gap: 5px;
      margin-top: 8px;
    }
    .action-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 8px;
      margin-top: 10px;
    }
    .action-button {
      border: 1px solid var(--line2);
      background: #fffdf8;
      color: var(--ink);
      padding: 9px;
      cursor: pointer;
      text-align: left;
    }
    .action-button.active {
      border-color: var(--ink);
      box-shadow: inset 3px 0 0 var(--ink);
    }
    .action-button strong,
    .action-button span {
      display: block;
      overflow-wrap: anywhere;
    }
    .action-button span {
      margin-top: 4px;
      color: var(--muted);
      font-size: 12px;
    }
    .member-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
      font-size: 12px;
    }
    .member-table th,
    .member-table td {
      border-top: 1px solid var(--line);
      padding: 7px 6px;
      text-align: left;
      vertical-align: top;
    }
    .member-table th {
      color: var(--muted);
      font-weight: 600;
    }
    .member-table code {
      display: inline-block;
      max-width: 100%;
      overflow-wrap: anywhere;
    }
    .related-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
      gap: 8px;
      margin-top: 10px;
    }
    .related-item {
      border: 1px solid var(--line);
      background: #fffdf8;
      padding: 9px;
      min-width: 0;
    }
    .related-item strong,
    .related-item span,
    .related-item code {
      display: block;
      overflow-wrap: anywhere;
    }
    .related-item span {
      margin-top: 4px;
      color: var(--muted);
      font-size: 12px;
    }
    .related-item code {
      margin-top: 6px;
      width: fit-content;
      max-width: 100%;
    }
    .decision-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin: 10px 0;
    }
    .decision-grid button {
      border: 1px solid var(--line2);
      background: var(--paper);
      color: var(--ink);
      padding: 8px 10px;
      border-radius: 999px;
      cursor: pointer;
    }
    .decision-grid button.active {
      background: var(--ink);
      border-color: var(--ink);
      color: var(--paper);
    }
    textarea {
      width: 100%;
      min-height: 120px;
      resize: vertical;
      border: 1px solid var(--line2);
      background: #fffdf8;
      color: var(--ink);
      padding: 10px;
    }
    .save {
      width: 100%;
      margin-top: 8px;
      border: 0;
      background: var(--ink);
      color: var(--paper);
      padding: 11px;
      cursor: pointer;
    }
    .save-row {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 8px;
      margin-top: 8px;
    }
    .save-row .save { margin-top: 0; }
    .save.secondary {
      border: 1px solid var(--line2);
      background: #fffdf8;
      color: var(--ink);
    }
    .log {
      display: grid;
      gap: 7px;
      margin-top: 10px;
      max-height: 190px;
      overflow: auto;
    }
    .log-item {
      border-top: 1px solid var(--line);
      padding-top: 7px;
      color: var(--muted);
      font-size: 12px;
    }
    .code-tabs {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-bottom: 10px;
    }
    .code-tabs button {
      border: 1px solid var(--line2);
      background: #fffdf8;
      padding: 6px 8px;
      cursor: pointer;
      font-size: 12px;
      max-width: 100%;
      overflow-wrap: anywhere;
    }
    .code-tabs button.active {
      background: var(--ink);
      color: var(--paper);
      border-color: var(--ink);
    }
    pre {
      margin: 0;
      max-height: 420px;
      overflow: auto;
      background: #16120d;
      color: #f8efe2;
      padding: 12px;
      font: 12px/1.45 "SF Mono", ui-monospace, Menlo, Consolas, monospace;
      white-space: pre;
    }
    .register-list {
      margin-top: 12px;
      display: grid;
      gap: 8px;
    }
    .register-card {
      padding: 10px;
      box-shadow: none;
      cursor: pointer;
    }
    .register-card strong { display: block; }
    .register-card span { color: var(--muted); font-size: 12px; }
    @media (max-width: 760px) {
      .app {
        grid-template-columns: minmax(210px, 36vw) minmax(0, 1fr);
        min-width: 760px;
      }
      .below { grid-template-columns: 1fr; }
      iframe, .missing { min-height: 380px; height: 52vh; }
    }
  </style>
</head>
<body>
  <div class="app">
    <aside>
      <h1>Pattern Family Review</h1>
      <p>Pattern families are the default queue. Choose another bucket when you explicitly want decision previews, variant pruning, or dedupe discovery evidence.</p>
      <div class="stats" id="stats"></div>
      <div class="filters">
        <input id="search" type="search" placeholder="Search review queue">
        <select id="bucket">
          <option value="pattern-family" selected>pattern families</option>
          <option value="">All buckets</option>
          <option value="dedupe">dedupe</option>
          <option value="needs-decision">needs-decision</option>
          <option value="variant-prune">variant-prune</option>
          <option value="consolidate">consolidate</option>
          <option value="unify">unify</option>
          <option value="register">register</option>
          <option value="repair">repair</option>
        </select>
        <select id="priority">
          <option value="">All priorities</option>
          <option value="P0">P0</option>
          <option value="P1">P1</option>
          <option value="P2">P2</option>
        </select>
        <div class="toggle-row">
          <label><input id="showDecided" type="checkbox"> Show decided</label>
          <label><input id="showResolved" type="checkbox"> Show resolved</label>
        </div>
      </div>
      <div class="queue-head"><span id="queueSummary"></span><span id="queuePosition"></span></div>
      <div class="candidate-list" id="candidateList"></div>
      <div class="register-list" id="registerList"></div>
    </aside>
    <main>
      <div id="detail"></div>
    </main>
  </div>
  <script>
    let data = null;
    let selectedId = null;
    let selectedDecision = "";
    let selectedCodeFile = "";
    const selectedReviewContexts = new Map();
    const draftNotes = new Map();
    const search = document.getElementById("search");
    const bucket = document.getElementById("bucket");
    const priority = document.getElementById("priority");
    const showDecided = document.getElementById("showDecided");
    const showResolved = document.getElementById("showResolved");
    const defaultDecisions = ["canonical", "repair", "unify", "register", "discard"];

    function esc(value) {
      return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;");
    }

    function candidateText(candidate) {
      return [
        candidate.title,
        candidate.reason,
        candidate.recommended,
        candidate.bucket,
        candidate.priority,
        candidate.reviewState?.decision,
        candidate.reviewState?.note,
        candidate.dedupeReview?.kind,
        candidate.dedupeReview?.registryId,
        candidate.dedupeReview?.detectors?.join(" "),
        candidate.dedupeReview?.whySimilar?.join(" "),
        candidate.dedupeReview?.members?.map((member) => [member.name, member.file, member.role].join(" ")).join(" "),
        candidate.patternFamily?.status,
        candidate.patternFamily?.targetContract,
        candidate.patternFamily?.qualityReference,
        candidate.patternFamily?.decisionSource,
        candidate.patternFamily?.reviewQuestions?.map((question) => [question.id, question.prompt, question.recommendation, question.selectedOption, question.options?.join(" ")].join(" ")).join(" "),
        candidate.patternFamily?.members?.map((member) => [member.symbol, member.disposition, member.target, member.preview, member.rationale].join(" ")).join(" "),
        ...(candidate.tags || []),
        ...(candidate.previewPanes || []).map((pane) => pane.component),
        ...(candidate.related || []).map((pane) => pane.component),
      ].join(" ").toLowerCase();
    }

    function allCandidates() {
      return data.candidates;
    }

    function syncSelectionFromHash() {
      const nextId =
        decodeURIComponent(window.location.hash.replace(/^#/u, "")) || null;
      const candidate = allCandidates().find((item) => item.id === nextId);
      if (!candidate) return false;
      selectedId = candidate.id;
      selectedDecision = "";
      selectedCodeFile = "";
      const hasBucketOption = [...bucket.options].some(
        (option) => option.value === candidate.bucket,
      );
      bucket.value = hasBucketOption ? candidate.bucket : "";
      if (candidate.reviewState?.resolved) {
        showResolved.checked = true;
      } else if (candidate.reviewState?.decided) {
        showDecided.checked = true;
      }
      return true;
    }

    function filteredCandidates() {
      const q = search.value.trim().toLowerCase();
      return allCandidates().filter((candidate) => {
        if (bucket.value && candidate.bucket !== bucket.value) return false;
        if (priority.value && candidate.priority !== priority.value) return false;
        if (candidate.reviewState?.resolved) {
          if (!showResolved.checked) return false;
        } else if (!showDecided.checked && candidate.reviewState?.decided) {
          return false;
        }
        if (q && !candidateText(candidate).includes(q)) return false;
        return true;
      });
    }

    function renderStats() {
      const stats = [
        [data.stats.patternFamilies, "families"],
        [data.stats.conflicts, "open"],
        [data.stats.decided, "decided"],
        [data.stats.resolved, "resolved"],
        [data.stats.dedupe, "dedupe"],
        [data.stats.totalConflicts, "total"],
        [data.stats.registerOnly, "register"],
      ];
      document.getElementById("stats").innerHTML = stats.map(([value, label]) =>
        '<div class="stat"><strong>' + esc(value) + '</strong><span>' + esc(label) + '</span></div>'
      ).join("");
    }

    function candidateStatePills(candidate) {
      const state = candidate.reviewState || {};
      const pills = [
        '<span class="pill">' + esc(candidate.priority) + '</span>',
        '<span class="pill">' + esc(candidate.bucket) + '</span>',
      ];
      if (state.resolved) pills.push('<span class="pill">resolved</span>');
      if (state.decided) pills.push('<span class="pill">' + esc(state.decision || "decided") + '</span>');
      if (candidate.patternFamily) {
        pills.push('<span class="pill">' + esc(candidate.patternFamily.status) + '</span>');
      }
      if (candidate.dedupeReview) {
        pills.push('<span class="pill">dedupe #' + esc(candidate.dedupeReview.queueRank) + '</span>');
      }
      return pills.join("");
    }

    function renderList() {
      const candidates = filteredCandidates();
      if (!candidates.some((candidate) => candidate.id === selectedId)) {
        selectedId = candidates[0]?.id || null;
      }
      const selectedIndex = candidates.findIndex((candidate) => candidate.id === selectedId);
      document.getElementById("queueSummary").textContent =
        candidates.length + " shown / " + data.stats.totalConflicts + " total";
      document.getElementById("queuePosition").textContent =
        selectedIndex >= 0 ? (selectedIndex + 1) + " of " + candidates.length : "";
      document.getElementById("candidateList").innerHTML = candidates.map((candidate) =>
        '<button class="candidate-button ' +
        (candidate.id === selectedId ? "active " : "") +
        (candidate.reviewState?.decided ? "decided " : "") +
        (candidate.reviewState?.resolved ? "resolved " : "") +
        '" data-id="' + esc(candidate.id) + '">' +
        '<strong>' + esc(candidate.title) + '</strong>' +
        '<span>' + candidateStatePills(candidate) + esc(candidate.recommended) + '</span>' +
        '</button>'
      ).join("");
      document.querySelectorAll(".candidate-button").forEach((button) => {
        button.addEventListener("click", () => {
          selectedId = button.dataset.id;
          selectedDecision = "";
          selectedCodeFile = "";
          render();
          document.querySelector("main").scrollTo({ top: 0 });
        });
      });
      const showRegisterQueue = bucket.value === "" || bucket.value === "register";
      const registerItems = showRegisterQueue ? data.registerList.slice(0, 12) : [];
      document.getElementById("registerList").innerHTML = registerItems.length
        ? '<p style="margin:14px 0 8px">Register-only queue</p>' +
          registerItems.map((item) =>
            '<div class="register-card"><strong>' + esc(item.title) + '</strong><span>' + esc(item.recommended) + '</span></div>'
          ).join("")
        : "";
    }

    function renderPane(label, pane) {
      if (!pane) {
        return '<section class="render-card"><div class="card-head"><strong>' + esc(label) + '</strong></div><div class="missing">No second rendering for this candidate yet.</div></section>';
      }
      const previewShellUrl = data.widgetbookPreviewFrameUrl || "/preview-frame";
      const previewUrl = pane.url
        ? previewShellUrl + "?v=" + encodeURIComponent(data.generatedAt) + "&target=" + encodeURIComponent(pane.url)
        : "";
      const missingMessage = pane.previewStatus === "missing-required"
        ? "Required Widgetbook preview is missing. Add coverage before approving this member."
        : pane.previewStatus === "source-only"
          ? "Source-only member. Inspect its implementation below until a standalone preview is added."
          : pane.previewStatus === "not-applicable"
            ? "The registry marks a standalone preview as not applicable."
            : "No Widgetbook URL available.";
      const frame = pane.url
        ? '<iframe src="' + esc(previewUrl) + '" data-base-src="' + esc(previewUrl) + '" loading="eager"></iframe>'
        : '<div class="missing">' + esc(missingMessage) + '</div>';
      const memberMeta = pane.memberDisposition
        ? '<br><strong>' + esc(pane.memberDisposition) + '</strong>' +
          (pane.memberTarget ? ' → <code>' + esc(pane.memberTarget) + '</code>' : '') +
          ' · preview: ' + esc(pane.previewRequirement || pane.previewStatus || "unknown") +
          '<br>' + esc(pane.memberRationale || "")
        : '';
      return '<section class="render-card">' +
        '<div class="card-head"><strong>' + esc(label + ": " + pane.component) + '</strong>' +
        '<div class="card-actions">' +
        (pane.url ? '<button class="small-button preview-reload" type="button">Reload</button><a href="' + esc(pane.url) + '" target="_blank" rel="noreferrer">open</a>' : '') +
        '</div>' +
        '</div>' +
        frame +
        '<div class="meta">' + esc(pane.location) + ' / ' + esc(pane.useCase) + '<br><code>' + esc(pane.path) + '</code>' + memberMeta + '</div>' +
        '</section>';
    }

    function selectedReviewContext(candidate) {
      const contexts = candidate.reviewContexts || [];
      if (!contexts.length) return null;
      const selected = selectedReviewContexts.get(candidate.id);
      return contexts.find((context) => context.id === selected) || contexts[0];
    }

    function renderReviewContextControls(candidate) {
      const contexts = candidate.reviewContexts || [];
      if (!contexts.length) return "";
      const active = selectedReviewContext(candidate);
      return '<div class="review-contexts"><strong>Preview context</strong>' +
        contexts.map((context) =>
          '<button class="context-button ' + (context.id === active.id ? "active" : "") +
          '" type="button" data-context-id="' + esc(context.id) + '">' + esc(context.label) + '</button>'
        ).join("") +
        '<div class="context-note">' + esc(active.note || "") + '</div></div>';
    }

    function renderPreviewGrid(candidate) {
      const context = selectedReviewContext(candidate);
      const panes = candidate.previewPanes?.length
        ? candidate.previewPanes.map((pane, index) => ({
            label: pane.memberDisposition || "Preview " + (index + 1),
            pane,
          }))
        : context && candidate.left
          ? [
              {
                label: context.label,
                pane: {
                  ...candidate.left,
                  component: candidate.left.component + " / " + context.label,
                  useCase: candidate.left.useCase + " / " + context.label,
                  url: withWidgetbookKnobs(candidate.left.url, context.knobs),
                },
              },
            ]
        : [
            { label: "Left", pane: candidate.left },
            { label: "Right", pane: candidate.right },
          ];
      const gridClass = candidate.patternFamily
        ? "render-grid pattern-family-lineup"
        : "render-grid";
      return renderReviewContextControls(candidate) +
        '<div class="preview-scroll"><div class="' + gridClass + '">' +
        panes.map(({ label, pane }) => renderPane(label, pane)).join("") +
        '</div></div>';
    }

    function withWidgetbookKnobs(url, knobs) {
      if (!url || !knobs || !Object.keys(knobs).length) return url;
      const hashIndex = url.indexOf("#");
      if (hashIndex < 0) return url;
      const originAndPath = url.slice(0, hashIndex);
      const fragment = url.slice(hashIndex + 1) || "/";
      const route = new URL(fragment, "http://widgetbook.local");
      const encodedGroup = "{" + Object.entries(knobs).map(([key, value]) =>
        encodeURIComponent(key) + ":" + encodeURIComponent(value)
      ).join(",") + "}";
      route.searchParams.set("knobs", encodedGroup);
      return originAndPath + "#" + route.pathname + "?" + route.searchParams.toString();
    }

    function reloadPreviewFrame(frame) {
      const base = frame.dataset.baseSrc || frame.src;
      frame.src = base + (base.includes("?") ? "&" : "?") + "reload=" + Date.now();
    }

    function bindPreviewControls() {
      document.querySelectorAll(".preview-reload").forEach((button) => {
        button.addEventListener("click", () => {
          const frame = button.closest(".render-card")?.querySelector("iframe");
          if (frame) reloadPreviewFrame(frame);
        });
      });
      const reloadAll = document.getElementById("reloadPreviews");
      if (reloadAll) {
        reloadAll.addEventListener("click", () => {
          document.querySelectorAll(".render-card iframe").forEach(reloadPreviewFrame);
        });
      }
    }

    function selectRelative(delta) {
      const candidates = filteredCandidates();
      if (!candidates.length) return;
      const currentIndex = Math.max(0, candidates.findIndex((candidate) => candidate.id === selectedId));
      const nextIndex = Math.min(candidates.length - 1, Math.max(0, currentIndex + delta));
      selectedId = candidates[nextIndex].id;
      selectedDecision = "";
      selectedCodeFile = "";
      render();
      document.querySelector("main").scrollTo({ top: 0 });
    }

    function filesForCandidate(candidate) {
      const files = new Set();
      for (const pane of [
        candidate.left,
        candidate.right,
        ...(candidate.previewPanes || []),
        ...(candidate.related || []),
      ]) {
        if (!pane) continue;
        for (const file of pane.files || []) files.add(file);
      }
      return [...files];
    }

    async function loadCode(file) {
      if (!file) return;
      selectedCodeFile = file;
      renderCodeTabs();
      const pre = document.getElementById("code");
      pre.textContent = "Loading " + file + "...";
      const response = await fetch("/api/code?file=" + encodeURIComponent(file));
      const payload = await response.json();
      if (!response.ok) {
        pre.textContent = payload.error || "Failed to load code.";
        return;
      }
      pre.textContent = payload.content.split("\\n").map((line, index) => String(index + 1).padStart(4, " ") + "  " + line).join("\\n");
    }

    function renderCodeTabs() {
      const candidate = allCandidates().find((item) => item.id === selectedId);
      const files = filesForCandidate(candidate);
      const tabs = document.getElementById("codeTabs");
      if (!tabs) return;
      tabs.innerHTML = files.length
        ? files.map((file) => '<button class="' + (file === selectedCodeFile ? "active" : "") + '" data-file="' + esc(file) + '">' + esc(file) + '</button>').join("")
        : '<span class="pill">No source file mapped yet</span>';
      tabs.querySelectorAll("button").forEach((button) => {
        button.addEventListener("click", () => loadCode(button.dataset.file));
      });
    }

    async function refreshLog() {
      const response = await fetch("/api/decisions");
      const latest = await response.json();
      const log = document.getElementById("log");
      if (!log) return;
      log.innerHTML = latest.slice(0, 12).map((entry) =>
        '<div class="log-item"><strong>' + esc(entry.decision || "note") + '</strong> on ' + esc(entry.title || entry.id) +
        '<br>' + esc(entry.note || "") + '</div>'
      ).join("") || '<div class="log-item">No saved notes yet.</div>';
    }

    async function saveCurrent(candidate, status = "") {
      const note = document.getElementById("note").value;
      const body = {
        id: candidate.id,
        title: candidate.title,
        decision: selectedDecision,
        note,
        status,
        implemented: status === "implemented",
        recommended: candidate.recommended,
        left: candidate.left?.component,
        right: candidate.right?.component,
        dedupeReview: candidate.dedupeReview
          ? {
              kind: candidate.dedupeReview.kind,
              registryId: candidate.dedupeReview.registryId,
              queueRank: candidate.dedupeReview.queueRank,
              members: candidate.dedupeReview.members?.map((member) => member.name) ?? [],
              detectors: candidate.dedupeReview.detectors,
            }
          : null,
      };
      const response = await fetch("/api/decision", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        alert("Failed to save decision");
        return;
      }
      candidate.reviewState = {
        ...(candidate.reviewState || {}),
        decided: true,
        resolved: status === "implemented" || candidate.reviewState?.resolved,
        status,
        decision: selectedDecision,
        note,
        updatedAt: new Date().toISOString(),
      };
      draftNotes.delete(candidate.id);
      document.getElementById("saveStatus").textContent = "Saved at " + new Date().toLocaleTimeString();
      await refreshLog();
      if (!showDecided.checked) {
        selectRelative(0);
      } else {
        render();
      }
    }

    function decisionOptionsFor(candidate) {
      return candidate?.reviewDecisionOptions?.length
        ? candidate.reviewDecisionOptions
        : defaultDecisions;
    }

    function renderDecisionButtons() {
      const candidate = allCandidates().find((item) => item.id === selectedId);
      return decisionOptionsFor(candidate).map((decision) =>
        '<button class="' + (decision === selectedDecision ? "active" : "") + '" data-decision="' + esc(decision) + '">' + esc(decision) + '</button>'
      ).join("");
    }

    function renderRelated(candidate) {
      const related = candidate.related || [];
      if (!related.length) return "";
      const variant = candidate.variantReview
        ? '<p style="margin-top:8px">Variant labels: ' + esc(candidate.variantReview.labels.join(", ")) + '</p>'
        : "";
      return '<section class="related-card"><strong>Related widgets in this family</strong>' + variant + '<div class="related-grid">' +
        related.map((pane) =>
          '<div class="related-item"><strong>' + esc(pane.component) + '</strong>' +
          '<span>' + esc(pane.location) + '</span>' +
          (pane.source ? '<code>' + esc(pane.source.file + ":" + pane.source.line) + '</code>' : '') +
          '</div>'
        ).join("") +
        '</div></section>';
    }

    function renderPatternFamily(candidate) {
      const family = candidate.patternFamily;
      if (!family) return "";
      const deltas = (family.acceptedVisualDelta || []).map((item) =>
        '<li>' + esc(item) + '</li>'
      ).join("");
      const members = (family.members || []).map((member) =>
        '<tr><td><strong>' + esc(member.symbol) + '</strong></td>' +
        '<td><span class="pill">' + esc(member.disposition) + '</span></td>' +
        '<td>' + (member.target ? '<code>' + esc(member.target) + '</code>' : '—') + '</td>' +
        '<td>' + esc(member.preview) + '</td>' +
        '<td>' + esc(member.rationale) + '</td></tr>'
      ).join("");
      const questions = (family.reviewQuestions || []).map((question) =>
        '<article class="review-question">' +
        '<div><strong>' + esc(question.id) + '</strong></div>' +
        '<p>' + esc(question.prompt) + '</p>' +
        '<div class="review-recommendation"><strong>' +
        (question.selectedOption ? 'Approved' : 'Recommended') + '</strong> ' +
        esc(question.selectedOption || question.recommendation) + '</div>' +
        '<div class="review-question-options">' +
        question.options.map((option) => '<span class="pill">' +
          (option === question.selectedOption ? '✓ ' : '') + esc(option) + '</span>').join("") +
        '</div></article>'
      ).join("");
      const questionHeading = (family.reviewQuestions || []).some(
        (question) => question.selectedOption,
      ) ? 'Owner decisions' : 'Owner questions';
      return '<section class="evidence-card">' +
        '<div class="evidence-top"><div><strong>Pattern family contract</strong><p>' +
        esc(family.id) + ' · ' + esc(family.status) + ' · ' + esc(family.decisionSource) +
        '</p></div><div><span class="pill">' + esc(family.priority) + '</span><span class="pill">' + esc(family.status) + '</span></div></div>' +
        '<div class="evidence-grid">' +
        '<div class="evidence-metric"><strong>' + esc(family.targetContract) + '</strong><span>target contract</span></div>' +
        '<div class="evidence-metric"><strong>' + esc(family.qualityReference) + '</strong><span>quality reference</span></div>' +
        '<div class="evidence-metric"><strong>' + esc(family.members?.length || 0) + '</strong><span>review members</span></div>' +
        '</div>' +
        (deltas ? '<strong>Accepted visual delta</strong><ul class="why-list">' + deltas + '</ul>' : '<p class="context-note">No visual delta is accepted while this family remains in review.</p>') +
        (questions ? '<strong>' + questionHeading + '</strong><div class="review-question-grid">' + questions + '</div>' : '') +
        '<table class="member-table"><thead><tr><th>Widget</th><th>disposition</th><th>target</th><th>preview</th><th>rationale</th></tr></thead><tbody>' +
        members +
        '</tbody></table><p class="context-note">Member dispositions are read-only here and come from <code>pattern_families.json</code>.</p></section>';
    }

    function renderDedupeReview(candidate) {
      const review = candidate.dedupeReview;
      if (!review) return "";
      const metrics = [
        review.registryRank ? [review.registryRank, "registry rank"] : null,
        review.score != null ? [review.score, "score"] : null,
        review.cohesion != null ? [formatPercent(review.cohesion), "cohesion"] : null,
        review.jaccard != null ? [formatPercent(review.jaccard), "Jaccard"] : null,
        review.containment != null ? [formatPercent(review.containment), "containment"] : null,
        review.smallWidgetMultisetJaccard ? [formatPercent(review.smallWidgetMultisetJaccard), "small-widget overlap"] : null,
        review.paramCompatibility?.mean != null ? [formatPercent(review.paramCompatibility.mean), "param mean"] : null,
        review.members?.length ? [review.members.length, "members"] : null,
      ].filter(Boolean);
      const detectorPills = (review.detectors || []).map((detector) =>
        '<span class="pill">' + esc(detector) + '</span>'
      ).join("");
      const why = (review.whySimilar || []).map((item) => '<li>' + esc(item) + '</li>').join("");
      const actions = (review.suggestedActions || []).map((action) =>
        '<button class="action-button ' + (selectedDecision === action.label ? "active" : "") +
        '" type="button" data-decision="' + esc(action.label) + '">' +
        '<strong>' + esc(action.label) + '</strong><span>' + esc(action.description) + '</span></button>'
      ).join("");
      const members = (review.members || []).map((member) =>
        '<tr><td><strong>' + esc(member.name) + '</strong></td>' +
        '<td>' + esc(member.role || "unknown") + '</td>' +
        '<td>' + esc(member.usage ?? 0) + '</td>' +
        '<td>' + esc(member.tokens ?? "") + '</td>' +
        '<td><code>' + esc(member.file || "missing") + '</code></td></tr>'
      ).join("");
      return '<section class="evidence-card">' +
        '<div class="evidence-top"><div><strong>Dedupe evidence</strong><p>' +
        esc(review.kind) + ' · ' + esc(review.registryId) +
        (review.primary ? ' · likely canonical: ' + esc(review.primary) : '') +
        '</p></div><div>' + detectorPills + '</div></div>' +
        '<div class="evidence-grid">' + metrics.map(([value, label]) =>
          '<div class="evidence-metric"><strong>' + esc(value) + '</strong><span>' + esc(label) + '</span></div>'
        ).join("") + '</div>' +
        (why ? '<ul class="why-list">' + why + '</ul>' : '') +
        (actions ? '<div class="action-grid">' + actions + '</div>' : '') +
        '<table class="member-table"><thead><tr><th>Widget</th><th>role</th><th>usage</th><th>tokens</th><th>source</th></tr></thead><tbody>' +
        members +
        '</tbody></table></section>';
    }

    function formatPercent(value) {
      return Math.round(Number(value) * 1000) / 10 + "%";
    }

    function renderDetail() {
      const candidates = filteredCandidates();
      const candidate = candidates.find((item) => item.id === selectedId) || candidates[0];
      if (!candidate) {
        document.getElementById("detail").innerHTML = '<div class="missing">No candidates match the current filters.</div>';
        return;
      }
      selectedId = candidate.id;
      const files = filesForCandidate(candidate);
      if (!selectedCodeFile && files.length) selectedCodeFile = files[0];
      const candidateIndex = candidates.findIndex((item) => item.id === candidate.id);
      const state = candidate.reviewState || {};
      if (!selectedDecision && state.decision) selectedDecision = state.decision;
      const noteValue = draftNotes.has(candidate.id)
        ? draftNotes.get(candidate.id)
        : state.note || "";
      const decisionHeading = candidate.patternFamily ? "Family review note" : "Decision";
      const decisionScope = candidate.patternFamily
        ? '<p>Saving records a family-level note only. It does not mutate the registry-owned member dispositions.</p>'
        : "";
      const implementedButton = candidate.patternFamily
        ? ""
        : '<button class="save secondary" id="markImplemented">Mark implemented</button>';
      document.getElementById("detail").innerHTML =
        '<div class="topbar"><div><h2>' + esc(candidate.title) + '</h2><p>' + esc(candidate.reason) + '</p></div>' +
        '<div class="detail-actions"><span class="pill">' + esc(candidateIndex + 1) + ' of ' + esc(candidates.length) + '</span>' +
        (state.decided ? '<span class="pill">' + esc(state.decision || "decided") + '</span>' : '') +
        (state.resolved ? '<span class="pill">resolved</span>' : '') +
        '<button class="small-button" type="button" id="prevCandidate">Previous</button>' +
        '<button class="small-button" type="button" id="nextCandidate">Next</button>' +
        '<button class="small-button" type="button" id="reloadPreviews">Reload previews</button>' +
        '</div></div>' +
        renderPatternFamily(candidate) +
        renderDedupeReview(candidate) +
        renderPreviewGrid(candidate) +
        renderRelated(candidate) +
        '<div class="below">' +
        '<section class="notes-card"><strong>' + esc(decisionHeading) + '</strong><p>Recommended: <code>' + esc(candidate.recommended) + '</code></p>' + decisionScope + '<div class="decision-grid" id="decisionGrid">' + renderDecisionButtons() + '</div><textarea id="note" placeholder="Write the instruction you want Codex to act on.">' + esc(noteValue) + '</textarea><div class="save-row"><button class="save" id="save">Save note</button>' + implementedButton + '</div><p id="saveStatus" style="margin-top:8px"></p><div class="log" id="log"></div></section>' +
        '<section class="code-card"><strong>Implementation code</strong><div class="code-tabs" id="codeTabs"></div><pre id="code">Select a file.</pre></section>' +
        '</div>';
      document.querySelectorAll("#decisionGrid button").forEach((button) => {
        button.addEventListener("click", () => {
          draftNotes.set(candidate.id, document.getElementById("note").value);
          selectedDecision = button.dataset.decision;
          renderDetail();
        });
      });
      document.querySelectorAll(".action-button").forEach((button) => {
        button.addEventListener("click", () => {
          draftNotes.set(candidate.id, document.getElementById("note").value);
          selectedDecision = button.dataset.decision;
          renderDetail();
        });
      });
      document.getElementById("note").addEventListener("input", (event) => {
        draftNotes.set(candidate.id, event.target.value);
      });
      document.getElementById("save").addEventListener("click", () => saveCurrent(candidate));
      document.getElementById("markImplemented")?.addEventListener("click", () => saveCurrent(candidate, "implemented"));
      document.getElementById("prevCandidate").addEventListener("click", () => selectRelative(-1));
      document.getElementById("nextCandidate").addEventListener("click", () => selectRelative(1));
      document.querySelectorAll(".context-button").forEach((button) => {
        button.addEventListener("click", () => {
          selectedReviewContexts.set(candidate.id, button.dataset.contextId);
          draftNotes.set(candidate.id, document.getElementById("note").value);
          renderDetail();
        });
      });
      bindPreviewControls();
      renderCodeTabs();
      if (selectedCodeFile) loadCode(selectedCodeFile);
      refreshLog();
      window.history.replaceState(null, "", "#" + encodeURIComponent(selectedId));
    }

    function render() {
      renderList();
      renderDetail();
    }

    async function boot() {
      const response = await fetch("/api/data");
      data = await response.json();
      syncSelectionFromHash();
      renderStats();
      render();
      search.addEventListener("input", render);
      bucket.addEventListener("change", render);
      priority.addEventListener("change", render);
      showDecided.addEventListener("change", render);
      showResolved.addEventListener("change", render);
      window.addEventListener("hashchange", () => {
        if (!syncSelectionFromHash()) return;
        render();
        document.querySelector("main").scrollTo({top: 0});
      });
      window.addEventListener("keydown", (event) => {
        const tag = event.target?.tagName?.toLowerCase();
        if (tag === "input" || tag === "textarea" || tag === "select") return;
        if (event.key === "j" || event.key === "ArrowDown") {
          event.preventDefault();
          selectRelative(1);
        }
        if (event.key === "k" || event.key === "ArrowUp") {
          event.preventDefault();
          selectRelative(-1);
        }
        if (event.key.toLowerCase() === "r") {
          document.querySelectorAll(".render-card iframe").forEach(reloadPreviewFrame);
        }
      });
      setInterval(refreshLog, 4000);
    }

    boot();
  </script>
</body>
</html>`;
}

export function startWidgetbookCompareServer() {
  const previewFrameInstalled = installWidgetbookPreviewFrame();
  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, `http://${req.headers.host}`);
      if (
        req.method === "GET" &&
        (url.pathname === "/" ||
          url.pathname === "/docs/design_parity/widgetbook_compare.html")
      ) {
        return text(res, 200, appHtml(), "text/html; charset=utf-8");
      }
      if (req.method === "GET" && url.pathname === "/preview-frame") {
        const target = normalizePreviewTarget(url.searchParams.get("target"));
        if (!target) {
          return text(
            res,
            400,
            "Invalid Widgetbook preview target.",
            "text/plain; charset=utf-8",
          );
        }
        return text(res, 200, previewFrameHtml(target), "text/html; charset=utf-8");
      }
      if (req.method === "GET" && url.pathname === "/api/data") {
        return json(res, 200, buildCandidates());
      }
      if (req.method === "GET" && url.pathname === "/api/code") {
        return json(res, 200, safeReadFile(url.searchParams.get("file")));
      }
      if (req.method === "GET" && url.pathname === "/api/decisions") {
        return json(res, 200, readVisibleDecisions());
      }
      if (req.method === "POST" && url.pathname === "/api/decision") {
        const body = await readBody(req);
        return json(res, 200, writeDecision(JSON.parse(body || "{}")));
      }
      if (req.method === "GET" && url.pathname === "/favicon.ico") {
        res.writeHead(204);
        return res.end();
      }
      return json(res, 404, {error: "Not found"});
    } catch (error) {
      return json(res, 500, {error: error.message});
    }
  });

  server.listen(port, host, () => {
    console.log(
      `Widgetbook compare server: http://${host}:${port}/docs/design_parity/widgetbook_compare.html`,
    );
    console.log(`Embedding Widgetbook from: ${widgetbookOrigin}`);
    console.log(
      `Widgetbook preview frame: ${previewFrameInstalled ? widgetbookPreviewFrameUrl() : "not installed"}`,
    );
    console.log(`Decision log: ${path.relative(repoRoot, decisionsPath)}`);
  });
  return server;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  startWidgetbookCompareServer();
}
