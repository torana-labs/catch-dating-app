#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {fromRepo, relativeToRepo} from "../lib/repo_paths.mjs";

const routerPath = fromRepo("lib/routing/go_router.dart");
const routeContractPath = fromRepo("lib/routing/route_contract.dart");
const inventoryPath = fromRepo("tool/ui_capture/route_inventory.json");
const productionDartRoots = ["lib", "apps/consumer/lib", "apps/host/lib"];
const args = process.argv.slice(2);
const command = args[0] ?? "--help";
const isCliEntrypoint =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isCliEntrypoint) runCli();

function runCli() {
  if (command === "--help" || command === "-h" || command === "help") {
    printHelp();
  } else if (command === "--update" || command === "update") {
    updateInventory();
  } else if (command === "--check" || command === "check") {
    checkInventory();
  } else if (command === "--locations") {
    for (const route of extractImperativePageRouteInventory()) {
      console.log(`${route.siteId} ${route.sourcePath}:${route.line}`);
    }
  } else if (command === "--list" || command === "list") {
    listInventory();
  } else {
    console.error(`Unknown command: ${command}`);
    printHelp();
    process.exit(64);
  }
}

function updateInventory() {
  const inventory = buildInventory();
  fs.mkdirSync(path.dirname(inventoryPath), {recursive: true});
  fs.writeFileSync(inventoryPath, stableJson(inventory));
  console.log(`Updated ${relativeToRepo(inventoryPath)}.`);
}

function checkInventory() {
  if (!fs.existsSync(inventoryPath)) {
    fail([
      `${relativeToRepo(inventoryPath)} is missing.`,
      "Run node tool/ui_capture/check_route_inventory.mjs --update.",
    ]);
  }

  const expected = stableJson(buildInventory());
  const actual = fs.readFileSync(inventoryPath, "utf8");
  if (actual !== expected) {
    fail([
      `${relativeToRepo(inventoryPath)} is stale for ${relativeToRepo(routerPath)}.`,
      "Run node tool/ui_capture/check_route_inventory.mjs --update and review the route/capture inventory impact.",
    ]);
  }

  console.log("UI capture route inventory is in sync.");
}

function listInventory() {
  const inventory = buildInventory();
  for (const route of inventory.routes) {
    console.log(`${route.id.padEnd(34)} ${route.path}`);
  }
}

export function buildInventory({
  repoRoot = fromRepo("."),
  routeContractSource = fs.readFileSync(path.join(repoRoot, "lib/routing/route_contract.dart"), "utf8"),
  routerSource = fs.readFileSync(path.join(repoRoot, "lib/routing/go_router.dart"), "utf8"),
  imperativePageRoutes = extractImperativePageRouteInventory(repoRoot),
} = {}) {
  const enumBlock = extractBalancedBlock(
    routeContractSource,
    "enum Routes",
    "{",
    "}",
  );
  const goRouterBlock = extractGoRouterConfigurationBlock(routerSource);
  const routeGraph = extractRuntimeRouteGraph(routerSource, goRouterBlock);
  const routes = extractRouteEnumEntries(enumBlock.body);
  const runtimeRoutes = extractRuntimeRouteEntries(routeGraph.text, routes);
  validateRuntimeRoutes(routes, runtimeRoutes);
  const routeContract = normalizePresentationExpression(
    `${enumBlock.text}\n${extractRouterSemanticClosure(routerSource, goRouterBlock)}`,
  );
  const routeReferences = uniqueSorted(
    [...routeGraph.text.matchAll(/\bRoutes\.([A-Za-z0-9_]+)/g)].map(
      (match) => match[1]
    )
  );
  const routeReferenceIds = new Set(routeReferences);
  const runtimeRoutesById = new Map(
    runtimeRoutes.map((route) => [route.id, route])
  );

  return {
    version: 5,
    generatedBy: "tool/ui_capture/check_route_inventory.mjs",
    source: {
      path: "lib/routing/route_contract.dart",
      runtimePath: "lib/routing/go_router.dart",
      routeContractSha256: sha256(routeContract),
      goRouteCount: countMatches(routeGraph.text, /\b(?:GoRoute|HostWorkspaceDestination)\s*\(/g),
      shellBranchCount: countMatches(routeGraph.text, /\bStatefulShellBranch\s*\(/g),
      enumRouteCount: routes.length,
      referencedRouteCount: routeReferences.length,
      runtimeRouteCount: runtimeRoutes.length,
      routeHelperCount: routeGraph.routeHelperNames.length,
      routeHelpers: routeGraph.routeHelperNames,
      imperativePageRouteCount: imperativePageRoutes.length,
      imperativePageTargetCount: new Set(
        imperativePageRoutes.map((route) => route.presentationTarget),
      ).size,
    },
    routes: routes.map((route) => {
      const runtimeRoute = runtimeRoutesById.get(route.id) ?? null;
      return {
        ...route,
        runtimePath: runtimeRoute?.runtimePath ?? null,
        runtimeParentId: runtimeRoute?.parentId ?? null,
        runtimePathExpression: runtimeRoute?.pathExpression ?? null,
        renderKind: runtimeRoute?.renderKind ?? null,
        presentationExpression:
          runtimeRoute?.presentationExpression ?? null,
        presentationTarget: runtimeRoute?.presentationTarget ?? null,
        runtimePathMatchesEnum: runtimeRoute?.runtimePath === route.path,
        referencedByGoRouter: routeReferenceIds.has(route.id),
      };
    }),
    imperativePageRoutes: imperativePageRoutes.map(({line, ...route}) => route)
      .sort((a, b) => a.siteId.localeCompare(b.siteId)),
    goRouterRouteReferences: routeReferences,
  };
}

function extractImperativePageRouteInventory(repoRoot = fromRepo(".")) {
  const entries = [];
  for (const root of productionDartRoots) {
    const absoluteRoot = path.join(repoRoot, root);
    if (!fs.existsSync(absoluteRoot)) continue;
    for (const absolutePath of dartFilesUnder(absoluteRoot)) {
      const relativePath = path.relative(repoRoot, absolutePath).split(path.sep).join("/");
      const source = fs.readFileSync(absolutePath, "utf8");
      validateRouteSourceForInventory(source, relativePath);
      const routes = extractImperativePageRoutesFromSource(source, relativePath);
      entries.push(...routes);
    }
  }
  return entries.sort((a, b) =>
    a.sourcePath.localeCompare(b.sourcePath) || a.ordinal - b.ordinal
  );
}

export function extractImperativePageRoutesFromSource(source, sourcePath) {
  for (const unsupportedType of ["CupertinoPageRoute", "PageRouteBuilder"]) {
    const constructions = extractCallBlocks(source, unsupportedType);
    if (constructions.length > 0) {
      throw new Error(
        `${sourcePath}:${lineNumberAt(source, constructions[0].labelIndex)} ${unsupportedType} is a full-screen PageRoute that the generated imperative route inventory does not support. Use MaterialPageRoute or extend the inventory contract first.`,
      );
    }
  }
  const occurrences = new Map();
  return extractCallBlocks(source, "MaterialPageRoute").map((block) => {
    const builderExpression = extractTopLevelNamedArgumentExpression(
      block.body,
      "builder",
    );
    const presentationExpression = normalizePresentationExpression(
      builderExpression,
    );
    const presentationTarget = imperativePagePresentationTarget(
      builderExpression,
    );
    if (!presentationExpression || !presentationTarget) {
      throw new Error(
        `${sourcePath}:${lineNumberAt(source, block.labelIndex)} MaterialPageRoute must expose one deterministic full-screen builder target named *Screen, *Dialog, or *Page.`,
      );
    }
    const routeExpression = normalizePresentationExpression(block.text);
    const fullscreenDialogExpression = normalizePresentationExpression(
      extractTopLevelNamedArgumentExpression(block.body, "fullscreenDialog"),
    ) || null;
    const identity = `${sourcePath}:${sha256(JSON.stringify([presentationExpression, fullscreenDialogExpression]))}`;
    const occurrence = (occurrences.get(identity) ?? 0) + 1;
    occurrences.set(identity, occurrence);
    return {
      siteId: `material-page:${identity}:${occurrence}`,
      routeExpression,
      sourcePath,
      line: lineNumberAt(source, block.labelIndex),
      ordinal: occurrence,
      presentationExpression,
      presentationTarget,
      fullscreenDialogExpression,
    };
  });
}

export function validateRouteSourceForInventory(source, sourcePath) {
  const routeAlias = source.match(
    /\btypedef\s+[A-Za-z_$][A-Za-z0-9_$]*(?:\s*<[^;=>]+>)?\s*=\s*(?:(?:[A-Za-z_$][A-Za-z0-9_$]*)\.)?(GoRoute|MaterialPageRoute|CupertinoPageRoute|PageRouteBuilder)\b/u,
  );
  if (routeAlias) {
    throw new Error(
      `${sourcePath}:${lineNumberAt(source, routeAlias.index ?? 0)} route constructor typedefs are not inventory-safe (${routeAlias[1]}). Use the canonical constructor name so the generated route inventory cannot omit the site.`,
    );
  }

  if (sourcePath !== "lib/routing/go_router.dart") {
    const goRoutes = extractCallBlocks(source, "GoRoute");
    if (goRoutes.length > 0) {
      throw new Error(
        `${sourcePath}:${lineNumberAt(source, goRoutes[0].labelIndex)} GoRoute construction is outside lib/routing/go_router.dart. Route definitions must remain in the canonical route graph so inventory generation cannot omit imported routes.`,
      );
    }
  }
}

export function imperativePagePresentationTarget(expression) {
  const directTarget = routePresentationTarget(expression);
  if (/^(?:[A-Za-z_$][A-Za-z0-9_$]*\.)*[A-Za-z0-9_$]*(?:Screen|Dialog|Page)$/u.test(
    directTarget ?? "",
  )) {
    return directTarget;
  }
  const candidates = [
    ...new Set(
      [...(expression ?? "").matchAll(
        /\b([A-Za-z_$][A-Za-z0-9_$]*(?:Screen|Dialog|Page))\s*(?:<[^>{}()]*>)?\s*\(/gu,
      )].map((match) => match[1]),
    ),
  ];
  return candidates.length === 1 ? candidates[0] : null;
}

function dartFilesUnder(root) {
  const files = [];
  const queue = [root];
  while (queue.length > 0) {
    const directory = queue.pop();
    for (const entry of fs.readdirSync(directory, {withFileTypes: true})) {
      const absolutePath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        queue.push(absolutePath);
      } else if (
        entry.isFile() &&
        entry.name.endsWith(".dart") &&
        !entry.name.endsWith(".g.dart") &&
        !entry.name.endsWith(".freezed.dart")
      ) {
        files.push(absolutePath);
      }
    }
  }
  return files.sort();
}

function lineNumberAt(source, offset) {
  return source.slice(0, offset).split("\n").length;
}

export function extractRuntimeRouteGraph(source, goRouterBlock) {
  const routeListBlock = extractTopLevelNamedList(goRouterBlock.body, "routes");
  const routeHelperNames = [];
  const routeHelperBlocks = [];
  const routeFactoryBlocksByName = new Map();
  const routeFactoryMisses = new Set();
  const spreadReferences = extractRouteSpreadReferences(routeListBlock.text);
  const queue = extractRouteHelperCalls(routeListBlock.text);

  for (let index = 0; index < queue.length; index += 1) {
    const helperName = queue[index];
    if (
      routeFactoryBlocksByName.has(helperName) ||
      routeFactoryMisses.has(helperName)
    ) {
      continue;
    }

    const helperBlock = extractRouteFactoryBlock(source, helperName);
    if (!helperBlock) {
      routeFactoryMisses.add(helperName);
      continue;
    }

    routeFactoryBlocksByName.set(helperName, helperBlock);
    routeHelperNames.push(helperName);
    routeHelperBlocks.push(helperBlock.text);

    for (const nestedHelperName of extractRouteHelperCalls(helperBlock.text)) {
      if (
        routeFactoryBlocksByName.has(nestedHelperName) ||
        routeFactoryMisses.has(nestedHelperName) ||
        queue.includes(nestedHelperName)
      ) {
        continue;
      }
      queue.push(nestedHelperName);
    }
  }

  for (const [helperName, helperBlock] of routeFactoryBlocksByName) {
    const callsResolvedHelper = extractRouteHelperCalls(helperBlock.text).some(
      (nestedHelperName) =>
        nestedHelperName !== helperName &&
        routeFactoryBlocksByName.has(nestedHelperName),
    );
    if (!containsRouteConstructor(helperBlock.text) && !callsResolvedHelper) {
      throw new Error(
        `Typed route helper \`${helperName}\` does not construct a supported route or delegate to another locally resolved route helper. Imported/prebuilt route values are not inventory-safe.`,
      );
    }
  }

  for (const reference of spreadReferences) {
    if (!reference.isCall) {
      throw new Error(
        `GoRouter routes contains an imported or prebuilt spread collection \`${reference.name}\`. Compose routes through a locally declared, typed route helper so inventory generation can inspect it.`,
      );
    }
    if (routeFactoryMisses.has(reference.name)) {
      throw new Error(
        `GoRouter routes calls spread helper \`${reference.name}\`, but no locally declared typed route factory could be resolved. Imported route helpers are not inventory-safe.`,
      );
    }
  }

  return {
    text: [routeListBlock.text, ...routeHelperBlocks].join("\n"),
    routeHelperNames,
  };
}

// Hash only the router configuration and the locally declared callable closure
// it references. This retains route/shell composition, guards and presentation
// helper bodies while excluding unrelated imports, providers and diagnostics.
export function extractRouterSemanticClosure(source, configuration = extractGoRouterConfigurationBlock(source)) {
  const blocks = new Map([["GoRouter", configuration.text]]);
  const queue = [configuration.text];
  for (const text of queue) {
    for (const name of new Set(text.match(/[A-Za-z_$][A-Za-z0-9_$]*/gu) ?? [])) {
      if (blocks.has(name)) continue;
      const block = extractRouteFactoryBlock(source, name, {requireRouteType: false});
      if (!block) continue;
      blocks.set(name, block.text);
      queue.push(block.text);
    }
  }
  return [...blocks].sort(([a], [b]) => a.localeCompare(b))
    .map(([name, text]) => `${name}:${text}`).join("\n");
}

function containsRouteConstructor(source) {
  return /\b(?:GoRoute|HostWorkspaceDestination|ShellRoute|StatefulShellRoute|StatefulShellBranch)\s*(?:\.\s*[A-Za-z_$][A-Za-z0-9_$]*)?\s*(?:<[^>(){}]+>)?\s*\(/u.test(
    source,
  );
}

function extractRouteSpreadReferences(source) {
  const references = [];
  let braceDepth = 0;
  let quote = null;
  let escaped = false;
  let lineComment = false;
  let blockComment = false;

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1] ?? "";
    if (lineComment) {
      if (char === "\n") lineComment = false;
      continue;
    }
    if (blockComment) {
      if (char === "*" && next === "/") {
        blockComment = false;
        index += 1;
      }
      continue;
    }
    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === quote) {
        quote = null;
      }
      continue;
    }
    if (char === "/" && next === "/") {
      lineComment = true;
      index += 1;
      continue;
    }
    if (char === "/" && next === "*") {
      blockComment = true;
      index += 1;
      continue;
    }
    if (char === "'" || char === '"') {
      quote = char;
      continue;
    }
    if (char === "{") {
      braceDepth += 1;
      continue;
    }
    if (char === "}") {
      braceDepth -= 1;
      continue;
    }
    if (braceDepth !== 0 || !source.startsWith("...", index)) continue;

    let cursor = firstNonWhitespaceIndex(source, index + 3);
    const match = source.slice(cursor).match(
      /^([A-Za-z_$][A-Za-z0-9_$]*(?:\.[A-Za-z_$][A-Za-z0-9_$]*)*)/u,
    );
    if (!match) continue;
    const name = match[1];
    cursor = firstNonWhitespaceIndex(source, cursor + name.length);
    references.push({
      name: name.split(".").at(-1),
      isCall: source[cursor] === "(",
    });
  }
  return references;
}

function extractTopLevelNamedList(source, name) {
  const labelIndex = findTopLevelNamedArgument(source, name);
  if (labelIndex === -1) {
    throw new Error(`Could not find top-level ${name}: argument.`);
  }
  return extractBalancedBlock(source, `${name}:`, "[", "]", labelIndex);
}

function findTopLevelNamedArgument(source, name) {
  let parenDepth = 0;
  let bracketDepth = 0;
  let braceDepth = 0;
  let stringQuote = null;
  let escaped = false;
  const label = `${name}:`;

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];

    if (stringQuote) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === stringQuote) {
        stringQuote = null;
      }
      continue;
    }

    if (char === "'" || char === '"') {
      stringQuote = char;
      continue;
    }

    if (
      parenDepth === 0 &&
      bracketDepth === 0 &&
      braceDepth === 0 &&
      source.startsWith(label, index) &&
      !isIdentifierChar(source[index - 1] ?? "")
    ) {
      return index;
    }

    if (char === "(") parenDepth += 1;
    if (char === ")") parenDepth -= 1;
    if (char === "[") bracketDepth += 1;
    if (char === "]") bracketDepth -= 1;
    if (char === "{") braceDepth += 1;
    if (char === "}") braceDepth -= 1;
  }

  return -1;
}

function extractRouteHelperCalls(source) {
  const ignoredNames = new Set(["if", "for", "switch", "while"]);
  const names = [];
  for (const match of source.matchAll(
    /\b([A-Za-z_][A-Za-z0-9_]*)\s*(?:<[^>(){}]+>)?\s*\(/gu
  )) {
    const name = match[1];
    if (ignoredNames.has(name)) continue;
    const isSpreadCall = source.slice(Math.max(0, match.index - 3), match.index) === "...";
    if (source[match.index - 1] === "." && !isSpreadCall) continue;
    names.push(name);
  }
  return uniqueInOrder(names);
}

function extractRouteFactoryBlock(source, functionName, {requireRouteType = true} = {}) {
  const match = findFunctionDefinition(source, functionName);
  if (!match || (requireRouteType && !isRouteFactoryReturnType(match.returnType))) return null;

  const signature = extractBalancedBlock(
    source,
    functionName,
    "(",
    ")",
    match.signatureStart
  );
  const bodyStart = firstNonWhitespaceIndex(source, signature.closeIndex + 1);
  let body;
  if (source.startsWith("=>", bodyStart)) {
    body = extractArrowRouteFactoryExpression(source, functionName, bodyStart + 2);
  } else if (source[bodyStart] === "{") {
    // Named parameter braces belong to the signature, not the function body.
    body = extractBalancedBlock(source, functionName, "{", "}", bodyStart);
  } else {
    return null;
  }
  return {...body, text: source.slice(match.signatureStart, body.closeIndex + 1)};
}

function extractArrowRouteFactoryExpression(source, functionName, startIndex) {
  const expressionStart = firstNonWhitespaceIndex(source, startIndex);
  const opening = source[expressionStart];
  if (opening === "[") {
    return extractBalancedBlock(
      source,
      functionName,
      "[",
      "]",
      expressionStart,
    );
  }

  let parenDepth = 0;
  let bracketDepth = 0;
  let braceDepth = 0;
  let quote = null;
  let escaped = false;
  for (let index = expressionStart; index < source.length; index += 1) {
    const char = source[index];
    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === quote) {
        quote = null;
      }
      continue;
    }
    if (char === "'" || char === '"') {
      quote = char;
      continue;
    }
    if (char === "(") parenDepth += 1;
    if (char === ")") parenDepth -= 1;
    if (char === "[") bracketDepth += 1;
    if (char === "]") bracketDepth -= 1;
    if (char === "{") braceDepth += 1;
    if (char === "}") braceDepth -= 1;
    if (
      char === ";" &&
      parenDepth === 0 &&
      bracketDepth === 0 &&
      braceDepth === 0
    ) {
      return {
        labelIndex: expressionStart,
        openIndex: expressionStart,
        closeIndex: index,
        body: source.slice(expressionStart, index),
        text: source.slice(expressionStart, index),
      };
    }
  }
  throw new Error(`Could not parse arrow-bodied route factory ${functionName}.`);
}

function findFunctionDefinition(source, functionName) {
  const pattern = new RegExp(
    `(^|\\n)\\s*([A-Za-z_][A-Za-z0-9_<>?,]*(?:\\s+[A-Za-z_][A-Za-z0-9_<>?,]*)*)\\s+${escapeRegExp(
      functionName
    )}(?:<[^>(){}]+>)?\\s*\\(`,
    "gu"
  );
  if (["if", "switch", "while", "for", "catch", "assert"].includes(functionName)) return null;
  const match = [...source.matchAll(pattern)].find(candidate =>
    !/\b(?:return|throw|yield|case|const|final|var|new)\b/u.test(candidate[2]));
  if (!match) return null;

  return {
    returnType: match[2],
    signatureStart: match.index + match[0].indexOf(match[2]),
  };
}

function isRouteFactoryReturnType(returnType) {
  return /\b(?:GoRoute|HostWorkspaceDestination|ShellRoute|StatefulShellRoute|StatefulShellBranch|RouteBase)\b/u.test(
    returnType
  );
}

export function extractRuntimeRouteEntries(routeGraphText, enumRoutes) {
  const enumRoutesById = new Map(enumRoutes.map((route) => [route.id, route]));
  const blocks = [...extractCallBlocks(routeGraphText, "GoRoute"), ...extractCallBlocks(routeGraphText, "HostWorkspaceDestination")];
  const nodes = blocks.map((block) => {
    const pathExpression = extractTopLevelNamedArgumentExpression(
      block.body,
      "path"
    );
    const nameExpression = extractTopLevelNamedArgumentExpression(
      block.body,
      "name"
    );
    const redirectExpression = extractTopLevelNamedArgumentExpression(
      block.body,
      "redirect"
    );
    const builderExpression = extractTopLevelNamedArgumentExpression(
      block.body,
      "builder"
    );
    const pageBuilderExpression = extractTopLevelNamedArgumentExpression(
      block.body,
      "pageBuilder"
    );
    const renderKind = routeRenderKind({
      redirectExpression,
      builderExpression,
      pageBuilderExpression,
    });
    const rawPresentationExpression = switchRenderExpression({
      renderKind,
      redirectExpression,
      builderExpression,
      pageBuilderExpression,
    });
    const presentationExpression = normalizePresentationExpression(
      rawPresentationExpression,
    );
    const id = normalizeExpression(nameExpression)
      ? parseRouteNameExpression(nameExpression)
      : null;
    if (id === null && !isUnnamedRedirectOnly({
      redirectExpression,
      builderExpression,
      pageBuilderExpression,
    })) {
      throw new Error(
        "An unnamed GoRoute is allowed only as a redirect-only legacy path."
      );
    }
    const path = parseRoutePathExpression(pathExpression, enumRoutesById);
    return {
      ...block,
      id,
      path,
      pathExpression: normalizeExpression(pathExpression),
      nameExpression: normalizeExpression(nameExpression),
      renderKind,
      presentationExpression,
      presentationTarget: routePresentationTarget(rawPresentationExpression),
      parentId: null,
      runtimePath: null,
    };
  });

  for (const node of nodes) {
    const parent = nearestParentGoRoute(node, nodes);
    node.parentId = parent?.id ?? null;
    node.runtimePath = composeRuntimePath(parent?.runtimePath ?? null, node.path);
  }

  return nodes
    .filter((node) => node.id !== null)
    .map((node) => ({
      id: node.id,
      path: node.path,
      runtimePath: node.runtimePath,
      parentId: node.parentId,
      pathExpression: node.pathExpression,
      nameExpression: node.nameExpression,
      renderKind: node.renderKind,
      presentationExpression: node.presentationExpression,
      presentationTarget: node.presentationTarget,
    }));
}

export function routePresentationExpression({
  renderKind,
  redirectExpression,
  builderExpression,
  pageBuilderExpression,
}) {
  return normalizePresentationExpression(switchRenderExpression({
    renderKind,
    redirectExpression,
    builderExpression,
    pageBuilderExpression,
  }));
}

export function normalizePresentationExpression(value) {
  const source = value ?? "";
  let result = "";
  let quote = null;
  let escaped = false;
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (quote) {
      result += char;
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === quote) {
        quote = null;
      }
      continue;
    }
    if (char === "'" || char === '"') {
      quote = char;
      result += char;
      continue;
    }
    if (/\s/u.test(char)) {
      let nextIndex = index + 1;
      while (nextIndex < source.length && /\s/u.test(source[nextIndex])) {
        nextIndex += 1;
      }
      const previous = result[result.length - 1] ?? "";
      const next = source[nextIndex] ?? "";
      if (/[A-Za-z0-9_$]/u.test(previous) && /[A-Za-z0-9_$]/u.test(next)) {
        result += " ";
      }
      index = nextIndex - 1;
      continue;
    }
    if (char === ",") {
      let nextIndex = index + 1;
      while (nextIndex < source.length && /\s/u.test(source[nextIndex])) {
        nextIndex += 1;
      }
      if (")]}".includes(source[nextIndex] ?? "")) {
        continue;
      }
    }
    result += char;
  }
  return result;
}

function switchRenderExpression({
  renderKind,
  redirectExpression,
  builderExpression,
  pageBuilderExpression,
}) {
  if (renderKind === "builder") return builderExpression;
  if (renderKind === "pageBuilder") return pageBuilderExpression;
  if (renderKind === "redirect") return redirectExpression;
  return null;
}

export function routePresentationTarget(expression) {
  let normalized = normalizeExpression(expression);
  if (!normalized) return null;

  const arrowMatch = normalized.match(/^\([^)]*\)\s*=>\s*/u);
  if (arrowMatch) {
    normalized = normalized.slice(arrowMatch[0].length).trim();
  } else if (/^\([^)]*\)\s*\{/u.test(normalized)) {
    const returnMatch = normalized.match(/\breturn\s+(.+?);?(?:\s*\}|$)/u);
    if (returnMatch) normalized = returnMatch[1].trim();
  }

  normalized = normalized.replace(/^(?:const|new)\s+/u, "");
  const callable = normalized.match(
    /^([A-Za-z_$][A-Za-z0-9_$]*(?:\.[A-Za-z_$][A-Za-z0-9_$]*)*)\s*(?:<[^>{}()]*>)?\s*(?:\(|$)/u,
  );
  return callable?.[1] ?? null;
}

export function routeRenderKind({
  redirectExpression,
  builderExpression,
  pageBuilderExpression,
}) {
  if (normalizeExpression(builderExpression)) return "builder";
  if (normalizeExpression(pageBuilderExpression)) return "pageBuilder";
  if (normalizeExpression(redirectExpression)) return "redirect";
  return "missing";
}

export function isUnnamedRedirectOnly({
  redirectExpression,
  builderExpression,
  pageBuilderExpression,
}) {
  return Boolean(normalizeExpression(redirectExpression)) &&
    !normalizeExpression(builderExpression) &&
    !normalizeExpression(pageBuilderExpression);
}

function extractCallBlocks(source, functionName) {
  const blocks = [];
  let searchIndex = 0;
  while (searchIndex < source.length) {
    const matchIndex = source.indexOf(functionName, searchIndex);
    if (matchIndex === -1) break;

    const before = source[matchIndex - 1] ?? "";
    let callIndex = matchIndex + functionName.length;
    if (source[callIndex] === "<") {
      let angleDepth = 0;
      for (; callIndex < source.length; callIndex += 1) {
        if (source[callIndex] === "<") angleDepth += 1;
        if (source[callIndex] === ">") {
          angleDepth -= 1;
          if (angleDepth === 0) {
            callIndex += 1;
            break;
          }
        }
      }
    }
    callIndex = firstNonWhitespaceIndex(source, callIndex);
    if (isIdentifierChar(before) || source[callIndex] !== "(") {
      searchIndex = matchIndex + functionName.length;
      continue;
    }

    const block = extractBalancedBlock(
      source,
      functionName,
      "(",
      ")",
      matchIndex
    );
    blocks.push(block);
    searchIndex = block.openIndex + 1;
  }
  return blocks;
}

function nearestParentGoRoute(node, nodes) {
  let parent = null;
  for (const candidate of nodes) {
    if (candidate === node) continue;
    if (
      candidate.labelIndex < node.labelIndex &&
      node.closeIndex < candidate.closeIndex &&
      (parent == null ||
        candidate.closeIndex - candidate.labelIndex <
          parent.closeIndex - parent.labelIndex)
    ) {
      parent = candidate;
    }
  }
  return parent;
}

function extractTopLevelNamedArgumentExpression(source, name) {
  const labelIndex = findTopLevelNamedArgument(source, name);
  if (labelIndex === -1) return null;

  const expressionStart = firstNonWhitespaceIndex(
    source,
    labelIndex + `${name}:`.length
  );
  let parenDepth = 0;
  let bracketDepth = 0;
  let braceDepth = 0;
  let stringQuote = null;
  let escaped = false;

  for (let index = expressionStart; index < source.length; index += 1) {
    const char = source[index];

    if (stringQuote) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === stringQuote) {
        stringQuote = null;
      }
      continue;
    }

    if (char === "'" || char === '"') {
      stringQuote = char;
      continue;
    }
    if (char === "(") parenDepth += 1;
    if (char === ")") parenDepth -= 1;
    if (char === "[") bracketDepth += 1;
    if (char === "]") bracketDepth -= 1;
    if (char === "{") braceDepth += 1;
    if (char === "}") braceDepth -= 1;
    if (
      char === "," &&
      parenDepth === 0 &&
      bracketDepth === 0 &&
      braceDepth === 0
    ) {
      return source.slice(expressionStart, index).trim();
    }
  }

  return source.slice(expressionStart).trim();
}

function parseRouteNameExpression(nameExpression) {
  const normalized = normalizeExpression(nameExpression);
  const match = normalized.match(/^Routes\.([A-Za-z][A-Za-z0-9_]*)\.name$/u);
  if (!match) {
    throw new Error(
      `Every GoRoute must use name: Routes.<id>.name; found ${normalized || "missing name"}.`
    );
  }
  return match[1];
}

function parseRoutePathExpression(pathExpression, enumRoutesById) {
  const normalized = normalizeExpression(pathExpression);
  const routePathMatch = normalized.match(
    /^Routes\.([A-Za-z][A-Za-z0-9_]*)\.path$/u
  );
  if (routePathMatch) {
    const route = enumRoutesById.get(routePathMatch[1]);
    if (!route) {
      throw new Error(
        `GoRoute path references unknown Routes.${routePathMatch[1]}.path.`
      );
    }
    return route.path;
  }

  const stringMatch = normalized.match(/^(['"])(.*)\1$/u);
  if (stringMatch) return stringMatch[2];

  throw new Error(
    `Every GoRoute path must be a string literal or Routes.<id>.path; found ${
      normalized || "missing path"
    }.`
  );
}

function composeRuntimePath(parentPath, pathSegment) {
  if (pathSegment.startsWith("/")) return normalizeRuntimePath(pathSegment);
  if (!parentPath || parentPath === "/") {
    return normalizeRuntimePath(`/${pathSegment}`);
  }
  return normalizeRuntimePath(`${parentPath}/${pathSegment}`);
}

function normalizeRuntimePath(routePath) {
  if (routePath === "/") return routePath;
  return routePath.replace(/\/+/gu, "/").replace(/\/$/u, "");
}

function validateRuntimeRoutes(enumRoutes, runtimeRoutes) {
  const errors = [];
  const enumRoutesById = new Map(enumRoutes.map((route) => [route.id, route]));
  const seenRuntimeIds = new Set();

  for (const runtimeRoute of runtimeRoutes) {
    if (seenRuntimeIds.has(runtimeRoute.id)) {
      errors.push(`Routes.${runtimeRoute.id} is wired by more than one GoRoute.`);
      continue;
    }
    seenRuntimeIds.add(runtimeRoute.id);

    const enumRoute = enumRoutesById.get(runtimeRoute.id);
    if (!enumRoute) {
      errors.push(`GoRoute references Routes.${runtimeRoute.id}, but the enum entry is missing.`);
      continue;
    }
    if (runtimeRoute.runtimePath !== enumRoute.path) {
      errors.push(
        `Routes.${runtimeRoute.id} enum path is ${enumRoute.path}, but the composed runtime path is ${runtimeRoute.runtimePath}.`
      );
    }
    if (runtimeRoute.renderKind === "missing") {
      errors.push(
        `Routes.${runtimeRoute.id} has no builder, pageBuilder, or redirect presentation.`,
      );
    }
    if (!runtimeRoute.presentationExpression) {
      errors.push(
        `Routes.${runtimeRoute.id} has no normalized presentation expression.`,
      );
    }
    if (!runtimeRoute.presentationTarget) {
      errors.push(
        `Routes.${runtimeRoute.id} presentation does not expose a deterministic presentation target.`,
      );
    }
  }

  for (const enumRoute of enumRoutes) {
    if (!seenRuntimeIds.has(enumRoute.id)) {
      errors.push(`Routes.${enumRoute.id} is declared but not wired by a GoRoute.`);
    }
  }

  if (errors.length > 0) throw new Error(errors.join("\n"));
}

function extractRouteEnumEntries(enumBody) {
  const entriesBody = enumBody.split(/\n\s*;\s*\n/u)[0] ?? "";
  const withoutLineComments = entriesBody
    .split("\n")
    .filter((line) => !line.trim().startsWith("//"))
    .join("\n");
  const matches = [
    ...withoutLineComments.matchAll(
      /^\s*([A-Za-z][A-Za-z0-9_]*)\s*\(\s*(['"])([^'"]+)\2\s*(?:,\s*AppRouteAudience\.(?:shared|consumer|host)\s*)?,?\s*\)\s*,?/gmu
    ),
  ];

  if (matches.length === 0) {
    throw new Error("No Routes enum entries found in lib/routing/go_router.dart.");
  }

  return matches.map((match) => ({
    id: match[1],
    path: match[3],
    pathParameters: extractPathParameters(match[3]),
    requiresFixture: match[3].includes(":"),
    gated: isDevRoute(match[3]),
  }));
}

function extractPathParameters(routePath) {
  return [...routePath.matchAll(/:([A-Za-z][A-Za-z0-9_]*)/g)].map(
    (match) => match[1]
  );
}

function isDevRoute(routePath) {
  return routePath.startsWith("/dev/");
}

export function extractGoRouterConfigurationBlock(source) {
  const constructorMatch =
    /\b(?:return\s+|(?:final|var)\s+[A-Za-z_$][\w$]*\s*=\s*)GoRouter\s*\(/u.exec(
      source,
    );
  if (constructorMatch == null) {
    throw new Error(
      "Could not find a returned or locally owned `GoRouter(` configuration in lib/routing/go_router.dart.",
    );
  }
  return extractBalancedBlock(
    source,
    "GoRouter",
    "(",
    ")",
    constructorMatch.index,
  );
}

function extractBalancedBlock(source, label, openChar, closeChar, startAt = null) {
  const labelIndex = startAt ?? source.indexOf(label);
  if (labelIndex === -1) {
    throw new Error(`Could not find ${label}.`);
  }
  const openIndex = source.indexOf(openChar, labelIndex);
  if (openIndex === -1) {
    throw new Error(`Could not find ${openChar} after ${label}.`);
  }

  let depth = 0;
  let stringQuote = null;
  let escaped = false;
  for (let index = openIndex; index < source.length; index += 1) {
    const char = source[index];

    if (stringQuote) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === stringQuote) {
        stringQuote = null;
      }
      continue;
    }

    if (char === "'" || char === '"') {
      stringQuote = char;
      continue;
    }
    if (char === openChar) depth += 1;
    if (char === closeChar) {
      depth -= 1;
      if (depth === 0) {
        return {
          labelIndex,
          text: source.slice(labelIndex, index + 1),
          body: source.slice(openIndex + 1, index),
          openIndex,
          closeIndex: index,
        };
      }
    }
  }

  throw new Error(`Could not find balanced ${openChar}${closeChar} block for ${label}.`);
}

function normalizeExpression(value) {
  return (value ?? "").replace(/\s+/gu, " ").trim();
}

function stableJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function countMatches(value, pattern) {
  return [...value.matchAll(pattern)].length;
}

function uniqueSorted(values) {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

function uniqueInOrder(values) {
  const seen = new Set();
  const unique = [];
  for (const value of values) {
    if (seen.has(value)) continue;
    seen.add(value);
    unique.push(value);
  }
  return unique;
}

function firstNonWhitespaceIndex(value, startAt) {
  for (let index = startAt; index < value.length; index += 1) {
    if (!/\s/u.test(value[index])) return index;
  }
  return value.length;
}

function isIdentifierChar(value) {
  return /[A-Za-z0-9_]/u.test(value);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

function fail(errors) {
  console.error("UI capture route inventory check failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

function printHelp() {
  console.log(`Usage: node tool/ui_capture/check_route_inventory.mjs <command>

Commands:
  --update  Regenerate tool/ui_capture/route_inventory.json from the route contract and runtime router.
  --check   Fail if the route inventory is stale.
  --list    Print the current route ids and paths.
  --locations Print live imperative route source locations (not stored in the inventory).
`);
}
