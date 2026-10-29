import fs from "node:fs";
import path from "node:path";

// Schema and executable checks share one closed vocabulary.
const schema = JSON.parse(fs.readFileSync(new URL(
  "../../../design/components/catch.components.schema.json", import.meta.url), "utf8"));
export const roleNouns = Object.freeze(schema.$defs.roleNoun.enum);
/** Route-level suffixes accepted alongside role nouns for feature UI. */
export const routeSuffixes = Object.freeze(["Screen", "Workspace"]);
/** `Catch` followed by an uppercase letter or digit; "Catches" is a product word. */
export const reservedPrefixPattern = /^Catch[A-Z0-9]/u;
export const componentLevels = Object.freeze(schema.$defs.componentLevel.enum);
export const componentAxes = Object.freeze([
  "Variant", "Size", "Tone", "Emphasis", "Status", "Placement", "Mode",
]);
export const widgetSlotNames = Object.freeze([
  "leading", "trailing", "title", "subtitle", "kicker", "meta", "body", "footer",
  "actions", "media", "mediaOverlay", "child", "children",
]);
const sharedHomes = new Map([
  ["packages/catch_ui/lib/src/foundations/", "L1"],
  ["packages/catch_ui/lib/src/primitives/", "L2"],
  ["packages/catch_ui/lib/src/components/", "L3"],
  ["packages/catch_ui/lib/src/patterns/", "L4"],
  ["lib/platform/riverpod_ui/", "L4a"],
]);

export function sharedWidgetLevel(file) {
  return [...sharedHomes].find(([home]) => file.startsWith(home))?.[1] ?? null;
}

/**
 * App-coupled shared widgets: context parts, the shared media editor and the
 * startup page. They bind app data and copy to catch_ui, are not
 * design-system symbols, and took over from lib/core/widgets.
 */
export function isAppSharedWidgetSource(file) {
  return /^lib\/contexts\/[^/]+\/parts\//u.test(file) ||
    file.startsWith("lib/platform/media/") ||
    file.startsWith("lib/pages/startup/");
}

/**
 * Feature UI is distinct from app bootstraps and the platform and kernel
 * layers. App-coupled shared widgets follow feature naming.
 */
export function isFeatureWidgetSource(file) {
  return /^lib\/(?!core\/|kernel\/|platform\/|l10n\/|routing\/)[^/]+\//u.test(file) ||
    isAppSharedWidgetSource(file) ||
    /^apps\/(?:consumer|host)\/lib\/[^/]+\//u.test(file);
}

export function featureWidgetNamingIssues(entry) {
  if (entry.visibility !== "public" || entry.classKind === "widget-state") return [];
  if (!isFeatureWidgetSource(entry.file) || sharedWidgetLevel(entry.file)) return [];
  const issues = [];
  if (reservedPrefixPattern.test(entry.name)) issues.push("reserved-feature-widget-prefix");
  const role = [...roleNouns, ...routeSuffixes].sort((a, b) => b.length - a.length)
    .find((candidate) => entry.name.endsWith(candidate));
  const feature = role ? entry.name.slice(0, -role.length) : "";
  if (!/^(?:[A-Z][a-z0-9]*)+$/u.test(feature)) issues.push("noncanonical-feature-widget-name");
  const file = path.basename(entry.file, ".dart");
  const suffixes = [...roleNouns, ...routeSuffixes, "Controller", "ViewModel", "State", "Repository", "Service", "Providers"];
  if (!suffixes.some((suffix) => file.endsWith(`_${snakeCase(suffix)}`))) {
    issues.push("noncanonical-feature-widget-file");
  }
  return issues;
}

/**
 * Names the role(s) an off-vocabulary noun is spelled as here, so a rejected
 * name points somewhere instead of only failing.
 */
export function roleNounRedirectAdvice(name, redirects) {
  const key = Object.keys(redirects ?? {}).sort((a, b) => b.length - a.length)
    .find((candidate) => name.endsWith(candidate));
  if (!key) return null;
  return `${key} is spelled ${redirects[key].join(" or ")} here`;
}

/** Homes where the reserved `Catch` prefix is legal outside the design-system packages. */
export function reservedPrefixAllowed(file) {
  return file.startsWith("packages/catch_ui/") || file.startsWith("packages/catch_tokens/") ||
    file.startsWith("lib/platform/riverpod_ui/") ||
    // App bootstrap files carry the product name, as the grammar exempts them.
    /^lib\/[^/]+\.dart$/u.test(file) || /^apps\/(?:consumer|host)\/lib\/[^/]+\.dart$/u.test(file);
}

const topLevelDeclaration =
  /^(?:(?:abstract|sealed|final|base|interface)\s+)*(class|enum|mixin|typedef|extension(?:\s+type)?)\s+([A-Za-z_][A-Za-z0-9_]*)/gmu;

/** Top-level type-like declarations, for symbol-level naming rules. */
export function topLevelDeclarations(file, source) {
  return [...source.matchAll(topLevelDeclaration)].map((match) => ({
    file,
    kind: match[1].replace(/\s+/gu, " "),
    name: match[2],
    line: source.slice(0, match.index).split("\n").length,
  }));
}

/** `Catch`-prefixed symbols outside the design-system homes. */
export function reservedPrefixSymbolProblems(declarations) {
  return declarations
    .filter((entry) => reservedPrefixPattern.test(entry.name) && !reservedPrefixAllowed(entry.file))
    .map((entry) => ({file: entry.file, name: entry.name, issues: ["reserved-symbol-prefix"]}));
}

export function componentNamingEntries(components) {
  return components.flatMap((component) => [
    {...component, symbol: component.dart?.symbol, file: component.dart?.file},
    ...(component.contract?.members ?? []).map((member) => ({
      ...member, file: member.file ?? component.dart?.file,
    })),
  ]);
}

/** IDs cannot buy a different name for the same reviewed role and use case. */
export function canonicalWidgetName({roleNoun, naming}) {
  return `Catch${naming?.useCase ?? ""}${roleNoun}`;
}

/**
 * Enforce reviewed identities, not inferred semantic equivalence. Source/API
 * review establishes the role and use case; these checks make a changed name
 * or a new contract ID insufficient to evade that decision.
 */
export function sharedWidgetNamingProblems({components, declarations}) {
  const problems = [];
  const entries = componentNamingEntries(components);
  const byId = new Map(entries.map((entry) => [entry.id, entry]));
  const bySymbol = groupBy(entries, (entry) => entry.symbol);
  const widgets = declarations.filter((entry) =>
    entry.classKind === "widget" && entry.visibility === "public");
  const bySourceSymbol = groupBy(widgets, (entry) => entry.name);
  const reviewed = [];

  for (const declaration of widgets) {
    const level = sharedWidgetLevel(declaration.file);
    if (!level) {
      if (declaration.file.startsWith("packages/catch_ui/lib/")) {
        problems.push(`${declaration.name}: shared Widget is outside a declared ladder home`);
      }
      continue;
    }
    const matches = bySymbol.get(declaration.name) ?? [];
    if (matches.length !== 1) {
      problems.push(`${declaration.name}: expected one registry identity, found ${matches.length}`);
      continue;
    }
    const entry = matches[0];
    reviewed.push(entry);
    if (entry.file !== declaration.file) {
      problems.push(`${entry.id}: registry source ${entry.file} differs from ${declaration.file}`);
    }
    if (entry.level !== level) {
      problems.push(`${entry.id}: level must be ${level} for ${declaration.file}`);
    }
    if (!roleNouns.includes(entry.roleNoun)) {
      problems.push(`${entry.id}: missing or unknown roleNoun '${entry.roleNoun ?? ""}'`);
      continue;
    }
    const inherited = isInheritedScope(declaration);
    if (inherited && entry.roleNoun !== "Scope") {
      problems.push(`${entry.id}: inherited context publication must use the Scope role`);
    }
    if (entry.roleNoun === "Scope") {
      if (!inherited) {
        problems.push(`${entry.id}: Scope requires an inherited context Widget`);
      }
      const parent = entry.governance?.parentConceptId;
      if (entry.governance?.conceptRole !== "member" || !byId.has(parent) ||
        !entry.naming?.useCase || !entry.naming?.comparedWith?.includes(parent)) {
        problems.push(`${entry.id}: Scope must name its published contract and compare with its owning parent concept`);
      }
    }
    if (!entry.naming || typeof entry.naming.useCase !== "string") {
      problems.push(`${entry.id}: explicit naming.useCase is required (empty for the base role)`);
      continue;
    }
    const useCase = entry.naming.useCase;
    if (useCase !== "" && !/^(?:[A-Z][a-z0-9]*)+$/u.test(useCase)) {
      problems.push(`${entry.id}: useCase must be PascalCase words`);
    }
    const words = useCase.match(/[A-Z][a-z0-9]*/gu) ?? [];
    if (words.some((word) => /^(?:Custom|New|Modern|Legacy|Old|V\d+)$/u.test(word))) {
      problems.push(`${entry.id}: useCase '${useCase}' is an implementation/version escape`);
    }
    if (entry.symbol !== canonicalWidgetName(entry)) {
      problems.push(`${entry.id}: expected ${canonicalWidgetName(entry)}, found ${entry.symbol}`);
    }
    if (useCase) validateComparison(entry);
  }

  for (const entry of entries) {
    if (!sharedWidgetLevel(entry.file ?? "")) continue;
    // Non-Widget symbols have their own contract checks. A declared naming
    // decision cannot silently disappear when its Widget is removed/renamed.
    if (entry.naming && !(bySourceSymbol.get(entry.symbol) ?? [])
      .some((declaration) => declaration.file === entry.file)) {
      problems.push(`${entry.id}: named Widget ${entry.symbol} is absent from its source`);
    }
  }
  for (const [name, identities] of groupBy(reviewed, canonicalWidgetName)) {
    const sources = new Set(identities.map((entry) => `${entry.id}:${entry.file}`));
    if (sources.size > 1) {
      problems.push(`canonical name collision ${name}: ${[...sources].sort().join(", ")}`);
    }
  }
  for (const [file, siblings] of groupBy(widgets.filter((entry) =>
    sharedWidgetLevel(entry.file)), (entry) => entry.file)) {
    const primary = siblings.filter((entry) =>
      path.basename(file, ".dart") === snakeCase(entry.name));
    if (primary.length !== 1) {
      problems.push(`${file}: file must name exactly one primary public Widget`);
      continue;
    }
    const primaryEntry = bySymbol.get(primary[0].name)?.[0];
    const conceptId = primaryEntry?.governance?.conceptId;
    for (const sibling of siblings.filter((entry) => entry !== primary[0])) {
      const member = bySymbol.get(sibling.name)?.[0];
      if (!conceptId || member?.governance?.conceptRole !== "member" ||
        member.governance.parentConceptId !== conceptId) {
        problems.push(`${file}: ${sibling.name} must be a member of the primary Widget's concept`);
      }
    }
  }
  return [...new Set(problems)].sort();

  function isInheritedScope(declaration, visited = new Set()) {
    const base = declaration.baseClass?.split("<")[0].split(".").at(-1);
    if (!base || visited.has(base)) return false;
    if (["InheritedWidget", "InheritedNotifier", "InheritedModel"].includes(base)) return true;
    visited.add(base);
    const parents = bySourceSymbol.get(base) ?? [];
    return parents.length === 1 && isInheritedScope(parents[0], visited);
  }

  function validateComparison(entry) {
    const {comparedWith, reason} = entry.naming;
    if (!Array.isArray(comparedWith) || comparedWith.length === 0 ||
      typeof reason !== "string" || !reason.trim()) {
      problems.push(`${entry.id}: qualified use case requires comparedWith and a concrete reason`);
      return;
    }
    for (const id of comparedWith) {
      const other = byId.get(id);
      if (!other || other.id === entry.id) {
        problems.push(`${entry.id}: comparison must name another existing contract: ${id}`);
      } else if (other.roleNoun !== entry.roleNoun &&
        other.id !== entry.governance?.parentConceptId) {
        problems.push(`${entry.id}: comparison ${id} must share its role or own its parent concept`);
      }
    }
  }
}

function snakeCase(value) {
  return value.replace(/([A-Z]+)([A-Z][a-z])/gu, "$1_$2")
    .replace(/([a-z0-9])([A-Z])/gu, "$1_$2").toLowerCase();
}

function groupBy(entries, keyFor) {
  const groups = new Map();
  for (const entry of entries) {
    const key = keyFor(entry);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(entry);
  }
  return groups;
}
