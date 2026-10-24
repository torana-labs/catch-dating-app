#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {repoRoot} from "../lib/repo_paths.mjs";

const defaultManifestPath = "tool/design/screen_top_bar_contracts.json";
const architectureAdoptionPath =
  "tool/architecture/pattern_adoption.json";
const screenChromeArchitectureId = "ARCH-SCREEN-CHROME-001";
const appBarPattern = /\bappBar\s*:\s*([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)?)/gu;
const routeTopBarBuilderPattern =
  /\btopBarBuilder\s*:\s*\([^)]*\)\s*=>\s*(CatchTopBar\.(?:screen|primaryRail)|CatchTopBar(?:\.(?:route|identity))?)/gu;
const canonicalRouteScaffoldPath =
  "packages/catch_ui/lib/src/patterns/catch_route_scaffold.dart";
const canonicalScreenScaffoldPath =
  "packages/catch_ui/lib/src/patterns/catch_scaffold.dart";
const canonicalScreenScaffoldSymbol = "CatchScaffold";
const rawChromePattern =
  /\b(AppBar|SliverAppBar|CupertinoNavigationBar|CupertinoSliverNavigationBar)\s*\(/gu;
const manualHeaderClassPattern =
  /\bclass\s+([_$A-Za-z][\w$]*(?:Header|TopBar))\b/gu;
const screenChromeClassPattern =
  /\bclass\s+([_$A-Za-z][\w$]*(?:Screen|Scaffold|Header|TopBar|HeaderContent))\b/gu;
const manualHeaderOwnerPattern =
  /\b(CatchTopBar\.(?:screen|primaryRail)|CatchRootScreenHeader\.title|CatchTopBar(?:\.(?:route|identity))?|CatchStepHeader|CatchTextStyles\.(?:headline[A-Za-z]*|titleL))\s*\(/gu;
const canonicalRootOwners = new Set([
  "CatchTopBar.primaryRail",
  "CatchTopBar.screen",
  "CatchRootScreenHeader.title",
]);
const topBarActionOwnerPattern =
  /\b(CatchTopBar\.(?:screen|primaryRail)|CatchRootScreenHeader\.title|CatchTopBar(?:\.(?:route|identity))?)\s*\(/gu;
const directPillActionPattern = /\bCatchButton(?:\.(?!text\b)[A-Za-z_$][\w$]*)?\s*\(/u;
const rootTextScaleOverridePattern =
  /\b(?:TextScaler\.|textScaler\s*:)/gu;
const rolePolicies = new Map([
  [
    "screen",
    {expression: "CatchTopBar.screen", owner: "CatchTopBar.screen"},
  ],
  ["compact", {expression: "CatchTopBar.route", owner: "CatchTopBar"}],
  [
    "identity",
    {expression: "CatchTopBar.identity", owner: "CatchTopBar"},
  ],
]);
const validRoles = new Set([...rolePolicies.keys(), "workspace"]);
const validLeadingPolicies = new Set([
  "auto",
  "back",
  "backUnlessEmbedded",
  "none",
]);
const validSurfacePolicies = new Set(["CatchRouteScaffold"]);
const validTitlePolicies = new Set(["sharedRoute"]);
const canonicalWorkspaceOwners = new Set([
  "CatchTopBar",
  "CatchTopBar.screen",
  "CatchTopBar.primaryRail",
]);
const rawHeroExpressions = new Set([
  "SliverAppBar",
  "CupertinoSliverNavigationBar",
]);
const validManualHeaderRoles = new Set([
  "screen",
  "step-flow",
  "workspace",
  "content",
  "legacy",
]);
const manualHeaderRoleOwners = new Map([
  [
    "screen",
    new Set([
            "CatchTopBar.primaryRail",
      "CatchTopBar.screen",
      "CatchRootScreenHeader.title",
    ]),
  ],
  ["step-flow", new Set(["CatchStepHeader"])],
  ["workspace", new Set(["CatchTopBar.route"]) ],
  ["content", new Set(["CatchTextStyles.titleL"])],
  [
    "legacy",
    new Set([
      "CatchTextStyles.titleL",
      "CatchTextStyles.headline",
      "CatchTextStyles.headlineS",
    ]),
  ],
]);

const isCliEntrypoint =
  process.argv[1] != null &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isCliEntrypoint) runCli();

export function checkScreenTopBarContracts({
  root = repoRoot,
  manifestPath = defaultManifestPath,
} = {}) {
  const findings = [];
  const absoluteManifestPath = path.join(root, manifestPath);
  if (!fs.existsSync(absoluteManifestPath)) {
    return summarize([], new Map(), [
      {
        code: "missing-manifest",
        path: manifestPath,
        message: "Screen top-bar contract manifest does not exist.",
      },
    ]);
  }

  const manifest = JSON.parse(fs.readFileSync(absoluteManifestPath, "utf8"));
  const contracts = manifest.contracts ?? [];
  const rootHeaders = manifest.rootHeaders ?? [];
  const rawChromeExceptions = manifest.rawChromeExceptions ?? [];
  const routePresentations = manifest.routePresentations ?? [];
  const manualHeaders = manifest.manualHeaders ?? [];
  validateManifest(manifest, findings, manifestPath);

  const canonicalScreenScaffoldAppBarIndex =
    checkCanonicalScreenScaffoldAppBar({root, findings});
  const appBarsByPath = collectAppBars(root, {
    canonicalScreenScaffoldAppBarIndex,
  });
  const rawChromeByPath = collectRawChrome(root);
  const manualHeadersByPath = collectManualHeaders(root);
  const trackedRootHeaderPaths = collectTrackedRootHeaderPaths(root);
  const contractsByPath = new Map(
    contracts.map((contract) => [contract.path, contract]),
  );

  for (const [relativePath, appBars] of appBarsByPath) {
    const contract = contractsByPath.get(relativePath);
    if (contract == null) {
      findings.push({
        code: "unregistered-app-bar",
        path: relativePath,
        message:
          `Found ${appBars.length} Scaffold appBar declaration(s) without a ` +
          "screen-chrome contract.",
      });
      continue;
    }
    checkContract({root, contract, appBars, findings});
  }

  for (const contract of contracts) {
    if (appBarsByPath.has(contract.path)) continue;
    findings.push({
      code: "missing-app-bar",
      path: contract.path,
      message: "Registered screen-chrome owner has no appBar declaration.",
    });
  }

  checkRawChrome({
    rawChromeByPath,
    rawChromeExceptions,
    findings,
  });
  checkManualHeaders({
    root,
    manualHeadersByPath,
    manualHeaders,
    rootHeaders,
    trackedRootHeaderPaths,
    findings,
  });
  const trackedRootHeaders = checkTrackedRootHeaders({
    root,
    trackedRootHeaderPaths,
    findings,
  });
  if (manifest.rootScreenManifestPath != null) {
    checkRootHeaders({root, manifest, rootHeaders, findings});
  }
  if (manifest.screenGeometry != null) {
    checkCanonicalScreenGeometry({root, manifest, findings});
  }
  checkRoutePresentations({root, routePresentations, findings});
  checkTopBarActionFamilies({root, findings});

  return summarize(
    contracts,
    appBarsByPath,
    findings,
    rootHeaders,
    rawChromeByPath,
    routePresentations,
    manualHeaders,
    trackedRootHeaders,
  );
}

function checkTopBarActionFamilies({root, findings}) {
  const libRoot = path.join(root, "lib");
  if (!fs.existsSync(libRoot)) return;

  for (const absolutePath of walkDartFiles(libRoot)) {
    const relativePath = path.relative(root, absolutePath).split(path.sep).join("/");
    const source = maskDartCommentsAndStrings(
      fs.readFileSync(absolutePath, "utf8"),
    );
    for (const match of source.matchAll(topBarActionOwnerPattern)) {
      const callStart = match.index ?? 0;
      const openParen = callStart + match[0].lastIndexOf("(");
      const call = readBalanced(source, openParen, "(", ")");
      const actions = readNamedArgument(call, "actions");
      if (actions == null) continue;

      const inspectedActions = resolveActionExpression({
        source,
        expression: actions,
        beforeIndex: callStart,
      });
      if (!directPillActionPattern.test(inspectedActions)) continue;

      findings.push({
        code: "top-bar-direct-pill-action",
        path: relativePath,
        line: lineNumberAt(source, callStart),
        message:
          `${match[1]} receives CatchButton as a direct top-bar action. ` +
          "Use CatchTopBarPrimaryButton, CatchIconAction, " +
          "CatchButton.text, or CatchActionMenu so top-bar " +
          "geometry and compact behavior stay canonical.",
      });
    }
    topBarActionOwnerPattern.lastIndex = 0;
  }
}

function readNamedArgument(call, name) {
  const argumentsSource = call.slice(1, -1);
  for (const argument of splitTopLevelArguments(argumentsSource)) {
    const match = new RegExp(`^\\s*${escapeRegExp(name)}\\s*:`, "u").exec(
      argument,
    );
    if (match != null) return argument.slice(match[0].length).trim();
  }
  return null;
}

function resolveActionExpression({source, expression, beforeIndex}) {
  const identifier = /^([_$A-Za-z][\w$]*)$/u.exec(expression)?.[1];
  if (identifier == null) return expression;

  const declarationPattern = new RegExp(
    `\\b(?:final|const|var)(?:\\s+List\\s*<[^;=]+>)?\\s+` +
      `${escapeRegExp(identifier)}\\s*=`,
    "gu",
  );
  let nearest = null;
  for (const match of source.slice(0, beforeIndex).matchAll(declarationPattern)) {
    nearest = match;
  }
  if (nearest == null) return expression;

  const valueStart = (nearest.index ?? 0) + nearest[0].length;
  return readUntilTopLevelSemicolon(source, valueStart);
}

function readUntilTopLevelSemicolon(source, start) {
  const depths = {round: 0, square: 0, curly: 0};
  for (let index = start; index < source.length; index += 1) {
    const char = source[index];
    if (char === "(") depths.round += 1;
    if (char === ")") depths.round -= 1;
    if (char === "[") depths.square += 1;
    if (char === "]") depths.square -= 1;
    if (char === "{") depths.curly += 1;
    if (char === "}") depths.curly -= 1;
    if (
      char === ";" &&
      depths.round === 0 &&
      depths.square === 0 &&
      depths.curly === 0
    ) {
      return source.slice(start, index);
    }
  }
  return source.slice(start);
}

function checkCanonicalScreenScaffoldAppBar({root, findings}) {
  const absolutePath = path.join(root, canonicalScreenScaffoldPath);
  if (!fs.existsSync(absolutePath)) return null;

  const source = maskDartCommentsAndStrings(
    fs.readFileSync(absolutePath, "utf8"),
  );
  const appBarIndex = findCanonicalScreenScaffoldAppBarIndex(source);
  if (appBarIndex == null) {
    findings.push({
      code: "canonical-screen-scaffold-app-bar-drift",
      path: canonicalScreenScaffoldPath,
      message:
        `${canonicalScreenScaffoldSymbol}.build must contain exactly one ` +
        "direct or constraint-measured Scaffold whose top-level appBar argument forwards the " +
        "class title field directly or through its canonical scaled-size adapter. " +
        "Only that exact infrastructure " +
        "declaration is exempt from per-screen chrome registration.",
    });
  }
  return appBarIndex;
}

function findCanonicalScreenScaffoldAppBarIndex(source) {
  const classPattern = new RegExp(
    `\\bclass\\s+${canonicalScreenScaffoldSymbol}\\s+extends\\s+StatelessWidget\\b`,
    "u",
  );
  const classMatch = classPattern.exec(source);
  if (classMatch == null) return null;
  const classOpenBrace = source.indexOf(
    "{",
    classMatch.index + classMatch[0].length,
  );
  if (classOpenBrace < 0) return null;
  const classBody = readBalanced(source, classOpenBrace, "{", "}");
  if (!/\bfinal\s+PreferredSizeWidget\?\s+title\s*;/u.test(classBody)) {
    return null;
  }

  const buildMatches = [
    ...classBody.matchAll(
      /\bWidget\s+build\s*\(\s*BuildContext\s+context\s*\)\s*\{/gu,
    ),
  ];
  if (buildMatches.length !== 1) return null;
  const buildMatch = buildMatches[0];
  const buildOpenBrace =
    classOpenBrace + (buildMatch.index ?? 0) + buildMatch[0].lastIndexOf("{");
  const buildBody = readBalanced(source, buildOpenBrace, "{", "}");
  const directScaffolds = [...buildBody.matchAll(/\breturn\s+Scaffold\s*\(/gu)];
  const constrainedScaffolds = [...buildBody.matchAll(
    /\breturn\s+LayoutBuilder\s*\(\s*builder\s*:\s*\(\s*context\s*,\s*constraints\s*\)\s*=>\s*Scaffold\s*\(/gu,
  )];
  const scaffoldMatches = [...directScaffolds, ...constrainedScaffolds];
  if (scaffoldMatches.length !== 1) return null;

  const scaffoldMatch = scaffoldMatches[0];
  const scaffoldOpenParen =
    buildOpenBrace +
    (scaffoldMatch.index ?? 0) +
    scaffoldMatch[0].lastIndexOf("(");
  const scaffoldCall = readBalanced(source, scaffoldOpenParen, "(", ")");
  const argument = readNamedArgument(scaffoldCall, "appBar");
  const compactArgument = argument?.replace(/\s+/gu, "");
  const scaledForwarder =
    "switch(title){finalCatchScaledPreferredSizescaled=>PreferredSize(" +
    "preferredSize:scaled.preferredSizeFor(context),child:scaled,)," +
    "finalbar=>bar,}";
  const constrainedForwarder =
    "switch(title){finalCatchScaledPreferredSizescaled=>PreferredSize(" +
    "preferredSize:scaled.preferredSizeFor(context," +
    "width:constraints.hasBoundedWidth?constraints.maxWidth:null,),child:scaled,)," +
    "finalbar=>bar,}";
  if (constrainedScaffolds.length === 1) {
    if (compactArgument !== constrainedForwarder) return null;
  } else if (argument !== "title" && compactArgument !== scaledForwarder) {
    return null;
  }

  const appBarMatches = [...scaffoldCall.matchAll(appBarPattern)];
  if (appBarMatches.length !== 1) return null;
  return scaffoldOpenParen + (appBarMatches[0].index ?? 0);
}

function collectAppBars(root, {canonicalScreenScaffoldAppBarIndex = null} = {}) {
  const result = new Map();
  const roots = ["lib", "packages/catch_ui/lib"]
    .map((relativePath) => path.join(root, relativePath))
    .filter((absolutePath) => fs.existsSync(absolutePath));

  for (const absolutePath of roots.flatMap((sourceRoot) => [...walkDartFiles(sourceRoot)])) {
    const relativePath = path.relative(root, absolutePath).split(path.sep).join("/");
    if (relativePath === canonicalRouteScaffoldPath) continue;
    const source = maskDartCommentsAndStrings(
      fs.readFileSync(absolutePath, "utf8"),
    );
    const directMatches = [...source.matchAll(appBarPattern)]
      .filter(
        (match) =>
          relativePath !== canonicalScreenScaffoldPath ||
          (match.index ?? 0) !== canonicalScreenScaffoldAppBarIndex,
      )
      .map((match) => {
        const matchIndex = match.index ?? 0;
        const expressionOffset = match[0].lastIndexOf(match[1]);
        const valueStart = matchIndex + expressionOffset;
        return {
          expression: match[1],
          line: lineNumberAt(source, matchIndex),
          value: readAppBarValue(source, valueStart),
        };
      });
    const builderMatches = [...source.matchAll(routeTopBarBuilderPattern)].map(
      (match) => {
        const matchIndex = match.index ?? 0;
        const expressionOffset = match[0].lastIndexOf(match[1]);
        const valueStart = matchIndex + expressionOffset;
        return {
          expression: match[1],
          line: lineNumberAt(source, matchIndex),
          value: readAppBarValue(source, valueStart),
        };
      },
    );
    const scaffoldTitles = [...source.matchAll(/\bCatchScaffold\.workspace\s*\(/gu)]
      .flatMap((match) => {
        const start = match.index ?? 0;
        const openParen = start + match[0].lastIndexOf("(");
        const call = readBalanced(source, openParen, "(", ")");
        // Only this canonical preferred-size slot is screen chrome. A title
        // nested in its body or in another component is not an app bar.
        const value = readNamedArgument(call, "title");
        const expression = value?.match(/^([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)?)/u)?.[1];
        return expression == null ? [] : [{
          expression,
          line: lineNumberAt(source, start),
          value,
        }];
      });
    const matches = [...directMatches, ...builderMatches, ...scaffoldTitles];
    if (matches.length > 0) result.set(relativePath, matches);
  }
  return result;
}

function collectRawChrome(root) {
  const result = new Map();
  const libRoot = path.join(root, "lib");
  if (!fs.existsSync(libRoot)) return result;

  for (const absolutePath of walkDartFiles(libRoot)) {
    const relativePath = path.relative(root, absolutePath).split(path.sep).join("/");
    const source = maskDartCommentsAndStrings(
      fs.readFileSync(absolutePath, "utf8"),
    );
    const matches = [...source.matchAll(rawChromePattern)].map((match) => ({
      expression: match[1],
      line: lineNumberAt(source, match.index ?? 0),
    }));
    if (matches.length > 0) result.set(relativePath, matches);
  }
  return result;
}

// A CatchText variant delegates to the identically named foundation recipe.
// Preserve semantic owner identities across the SDK Text -> CatchText migration.
function manualHeaderOwners(source) {
  const owners = [...source.matchAll(manualHeaderOwnerPattern)].map((match) => match[1]);
  manualHeaderOwnerPattern.lastIndex = 0;
  for (const call of readCalls(source, "CatchText")) {
    const variant = readNamedArgument(call.slice(call.indexOf("(")), "variant");
    const role = /^(?:[A-Za-z_$][\w$]*\.)?CatchTextVariant\.(headline[A-Za-z]*|titleL)$/u.exec(variant ?? "")?.[1];
    if (role) owners.push(`CatchTextStyles.${role}`);
  }
  return [...new Set(owners)];
}

function collectManualHeaders(root) {
  const result = new Map();
  const libRoot = path.join(root, "lib");
  if (!fs.existsSync(libRoot)) return result;

  for (const absolutePath of walkDartFiles(libRoot)) {
    const relativePath = path.relative(root, absolutePath).split(path.sep).join("/");
    if (relativePath.startsWith("lib/core/widgets/")) continue;
    const source = maskDartCommentsAndStrings(
      fs.readFileSync(absolutePath, "utf8"),
    );
    const entries = [];
    for (const match of source.matchAll(manualHeaderClassPattern)) {
      const symbol = match[1];
      const bodies = readWidgetClassBodies(source, symbol);
      if (bodies.length === 0) continue;
      const combinedBody = bodies.map((entry) => entry.body).join("\n");
      const owners = manualHeaderOwners(combinedBody);
      if (owners.length === 0) continue;
      entries.push({
        symbol,
        owners: [...new Set(owners)],
        hasNavigationAction:
          /\b(?:Navigator\.|arrowBack[A-Za-z]*|close[A-Za-z]*)/u.test(
            combinedBody,
          ),
        line: lineNumberAt(source, match.index ?? 0),
      });
    }
    manualHeaderClassPattern.lastIndex = 0;
    if (entries.length > 0) result.set(relativePath, entries);
  }
  return result;
}

function collectTrackedRootHeaderPaths(root) {
  const absolutePath = path.join(root, architectureAdoptionPath);
  if (!fs.existsSync(absolutePath)) return new Set();
  const registry = JSON.parse(fs.readFileSync(absolutePath, "utf8"));
  const pattern = (registry.patterns ?? []).find(
    (candidate) => candidate.id === screenChromeArchitectureId,
  );
  return new Set(
    (pattern?.adopters ?? [])
      .filter(
        (adopter) =>
          typeof adopter.path === "string" &&
          adopter.path.startsWith("lib/") &&
          !adopter.path.startsWith("lib/core/widgets/") &&
          adopter.status === "aligned",
      )
      .map((adopter) => adopter.path),
  );
}

function checkTrackedRootHeaders({root, trackedRootHeaderPaths, findings}) {
  let surfaceCount = 0;
  for (const relativePath of trackedRootHeaderPaths) {
    const absolutePath = path.join(root, relativePath);
    if (!fs.existsSync(absolutePath)) {
      findings.push({
        code: "missing-tracked-root-header-file",
        path: relativePath,
        message: "Aligned root-screen chrome adopter source does not exist.",
      });
      continue;
    }
    const source = maskDartCommentsAndStrings(
      fs.readFileSync(absolutePath, "utf8"),
    );
    const candidates = collectScreenChromeClassCandidates(source);
    const canonicalCandidates = candidates.filter((candidate) =>
      candidate.owners.some((owner) => canonicalRootOwners.has(owner)),
    );
    surfaceCount += canonicalCandidates.length;
    if (canonicalCandidates.length === 0) {
      findings.push({
        code: "tracked-root-header-missing-owner",
        path: relativePath,
        message:
          "Aligned root-screen chrome must delegate from a Screen, Scaffold, " +
          "Header, or TopBar widget (including its State) to a canonical " +
          "screen-header owner.",
      });
      continue;
    }
    for (const candidate of candidates) {
      if (candidate.owners.some((owner) => canonicalRootOwners.has(owner))) {
        continue;
      }
      findings.push({
        code: "tracked-root-header-noncanonical-owner",
        path: relativePath,
        message:
          `${candidate.symbol} is part of an aligned root-chrome adopter but ` +
          `owns ${candidate.owners.join(", ")} instead of a canonical ` +
          "screen-header primitive.",
      });
    }
  }
  return {pathCount: trackedRootHeaderPaths.size, surfaceCount};
}

function collectScreenChromeClassCandidates(source) {
  const candidates = [];
  for (const match of source.matchAll(screenChromeClassPattern)) {
    const symbol = match[1];
    const bodies = readWidgetClassBodies(source, symbol);
    if (bodies.length === 0) continue;
    const combinedBody = bodies.map((entry) => entry.body).join("\n");
    const owners = manualHeaderOwners(combinedBody);
    if (owners.length === 0) continue;
    candidates.push({symbol, owners: [...new Set(owners)]});
  }
  screenChromeClassPattern.lastIndex = 0;
  return candidates;
}

function* walkDartFiles(directory) {
  for (const entry of fs.readdirSync(directory, {withFileTypes: true})) {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      yield* walkDartFiles(absolutePath);
      continue;
    }
    if (
      !entry.isFile() ||
      !entry.name.endsWith(".dart") ||
      entry.name.endsWith(".g.dart") ||
      entry.name.endsWith(".freezed.dart")
    ) {
      continue;
    }
    yield absolutePath;
  }
}

function checkContract({root, contract, appBars, findings}) {
  const absolutePath = path.join(root, contract.path);
  if (!fs.existsSync(absolutePath)) {
    findings.push({
      code: "missing-owner-file",
      path: contract.path,
      message: "Registered screen-chrome source does not exist.",
    });
    return;
  }

  const expectedCount = contract.occurrences ?? 1;
  if (appBars.length !== expectedCount) {
    findings.push({
      code: "app-bar-count-mismatch",
      path: contract.path,
      message: `Expected ${expectedCount} appBar declaration(s), found ${appBars.length}.`,
    });
  }

  const unexpectedExpressions = appBars.filter(
    (appBar) => appBar.expression !== contract.expression,
  );
  if (unexpectedExpressions.length > 0) {
    findings.push({
      code: "wrong-app-bar-expression",
      path: contract.path,
      message:
        `Expected appBar expression ${contract.expression}, found ` +
        `${[...new Set(appBars.map((appBar) => appBar.expression))].join(", ") || "none"}.`,
    });
  }

  const ownerPattern = new RegExp(
    `\\b${escapeRegExp(contract.owner)}(?:\\.[A-Za-z_$][\\w$]*)?\\s*\\(`,
    "u",
  );
  const appBarsWithoutOwner = appBars.filter(
    (appBar) => !ownerPattern.test(appBar.value),
  );
  if (appBarsWithoutOwner.length > 0) {
    findings.push({
      code: "missing-canonical-owner",
      path: contract.path,
      message:
        `Expected canonical top-bar owner ${contract.owner} inside every ` +
        "appBar value; unrelated calls elsewhere in the file do not count.",
    });
  }

  if (contract.surface === "CatchRouteScaffold") {
    const source = maskDartCommentsAndStrings(
      fs.readFileSync(absolutePath, "utf8"),
    );
    if (!/\bCatchRouteScaffold\s*\(/u.test(source)) {
      findings.push({
        code: "missing-route-scaffold-surface",
        path: contract.path,
        message:
          "This pushed route must use CatchRouteScaffold so surface color and " +
          "the scroll-under divider cannot drift by caller.",
      });
    }
  }

  const policy = rolePolicies.get(contract.role);
  if (policy != null && contract.owner !== policy.owner) {
    findings.push({
      code: "role-owner-drift",
      path: contract.path,
      message:
        `${contract.role} chrome must be owned by ${policy.owner}; ` +
        `${contract.owner} cannot be registered as an exception.`,
    });
  }
  if (
    policy?.expression != null &&
    contract.expression !== policy.expression
  ) {
    findings.push({
      code: "role-expression-drift",
      path: contract.path,
      message:
        `${contract.role} chrome must be declared directly as ` +
        `${policy.expression}; helper indirection and raw app bars are not allowed.`,
    });
  }

  if (contract.role === "screen") {
    const geometryOverrides = appBars.filter((appBar) =>
      /\b(?:contentPadding|height)\s*:/u.test(appBar.value),
    );
    if (geometryOverrides.length > 0) {
      findings.push({
        code: "screen-chrome-geometry-override",
        path: contract.path,
        message:
          "Screen-title routes cannot override contentPadding or height; " +
          "CatchTopBar.screen owns the approved zero-inset geometry.",
      });
    }
  }

  if (contract.role === "compact") {
    const geometryOverrides = appBars.filter((appBar) =>
      /\b(?:applySafeArea|contentCrossAxisAlignment|contentPadding|gutter|height)\s*:/u.test(
        appBar.value,
      ),
    );
    if (geometryOverrides.length > 0) {
      findings.push({
        code: "compact-chrome-geometry-override",
        path: contract.path,
        message:
          "Compact route bars cannot override safe-area, alignment, gutter, " +
          "padding, or height geometry; CatchTopBar owns those values.",
      });
    }
  }

  if (
    (contract.role === "compact" || contract.role === "workspace") &&
    contract.owner === "CatchTopBar"
  ) {
    const customTitleBypasses = appBars.filter((appBar) =>
      ['titleStyle', 'body'].some((name) => topBarArgument(appBar.value, name) != null),
    );
    if (customTitleBypasses.length > 0) {
      findings.push({
        code: "route-title-widget-bypass",
        path: contract.path,
        message:
          "Compact and workspace route bars must pass a title and optional " +
          "contextual subtitle to CatchTopBar.route. A local title " +
          "widget or style bypasses the shared route-title typography contract.",
      });
    }

    const legacyOverrides = appBars.filter((appBar) =>
      ['size', 'variant', 'mode', 'eyebrow', 'kicker', 'titleMaxLines',
       'largeHeight', 'contentCrossAxisAlignment', 'rowCrossAxisAlignment',
       'height', 'contentPadding', 'applySafeArea', 'gutter', 'trailing']
        .some((name) => topBarArgument(appBar.value, name) != null),
    );
    if (legacyOverrides.length > 0) {
      findings.push({
        code: "route-title-role-override",
        path: contract.path,
        message: "App-bar recipes own typography, hierarchy, wrapping and geometry. " +
          "Translate legacy configurations into title/context and named recipes.",
      });
    }
  }

  if (contract.leading === "back") {
    const appBarsWithoutBack = appBars.filter(
      (appBar) =>
        topBarNavigationMode(appBar.value) !== 'CatchTopBarNavigationMode.back',
    );
    if (appBarsWithoutBack.length > 0) {
      findings.push({
        code: "missing-required-back-navigation",
        path: contract.path,
        message:
          "This pushed route requires an explicit back affordance; use " +
          "navigation: CatchTopBarNavigation(mode: CatchTopBarNavigationMode.back).",
      });
    }
  }
  if (contract.leading === "backUnlessEmbedded") {
    const conditionalBackPattern =
      /^[\w.]*embedded\s*\?\s*CatchTopBarNavigationMode\.none\s*:\s*CatchTopBarNavigationMode\.back$/u;
    const appBarsWithoutConditionalBack = appBars.filter(
      (appBar) => !conditionalBackPattern.test(topBarNavigationMode(appBar.value) ?? ''),
    );
    if (appBarsWithoutConditionalBack.length > 0) {
      findings.push({
        code: "missing-embedded-back-navigation-policy",
        path: contract.path,
        message:
          "This route must expose Back when pushed and suppress duplicate " +
          "route chrome only when embedded in a master-detail workspace.",
      });
    }
  }
}


function topBarArgument(value, name) {
  const start = value.indexOf('(');
  return start < 0 ? null : readNamedArgument(readBalanced(value, start, '(', ')'), name);
}

function topBarNavigationMode(value) {
  const navigation = topBarArgument(value, 'navigation');
  if (navigation == null || !/^(?:const\s+)?CatchTopBarNavigation\s*\(/u.test(navigation)) return null;
  return topBarArgument(navigation, 'mode');
}

function validateManifest(manifest, findings, manifestPath) {
  if (manifest.schemaVersion !== 2) {
    findings.push({
      code: "invalid-schema-version",
      path: manifestPath,
      message: "schemaVersion must be 2.",
    });
  }
  if (!Array.isArray(manifest.contracts) || manifest.contracts.length === 0) {
    findings.push({
      code: "missing-contracts",
      path: manifestPath,
      message: "contracts must be a non-empty array.",
    });
    return;
  }

  const seenPaths = new Set();
  for (const contract of manifest.contracts) {
    if (typeof contract.path !== "string" || !contract.path.startsWith("lib/")) {
      findings.push({
        code: "invalid-path",
        path: manifestPath,
        message: "Every contract requires a lib-relative path.",
      });
    } else if (seenPaths.has(contract.path)) {
      findings.push({
        code: "duplicate-path",
        path: manifestPath,
        message: `Duplicate screen-chrome contract ${contract.path}.`,
      });
    }
    seenPaths.add(contract.path);

    if (!validRoles.has(contract.role)) {
      findings.push({
        code: "invalid-role",
        path: contract.path ?? manifestPath,
        message: `Unknown screen-chrome role ${contract.role}.`,
      });
    }
    if (
      contract.leading != null &&
      !validLeadingPolicies.has(contract.leading)
    ) {
      findings.push({
        code: "invalid-leading-policy",
        path: contract.path ?? manifestPath,
        message: `Unknown screen-chrome leading policy ${contract.leading}.`,
      });
    }
    if (
      contract.surface != null &&
      !validSurfacePolicies.has(contract.surface)
    ) {
      findings.push({
        code: "invalid-surface-policy",
        path: contract.path ?? manifestPath,
        message: `Unknown screen surface policy ${contract.surface}.`,
      });
    }
    if (
      contract.titlePolicy != null &&
      !validTitlePolicies.has(contract.titlePolicy)
    ) {
      findings.push({
        code: "invalid-title-policy",
        path: contract.path ?? manifestPath,
        message: `Unknown screen-chrome title policy ${contract.titlePolicy}.`,
      });
    }
    if (
      contract.titlePolicy != null &&
      contract.role !== "compact" &&
      contract.role !== "workspace"
    ) {
      findings.push({
        code: "title-policy-role-mismatch",
        path: contract.path ?? manifestPath,
        message:
          "titlePolicy is only valid for compact or workspace CatchTopBar contracts.",
      });
    }
    if (
      contract.role === "workspace" &&
      (typeof contract.reason !== "string" || contract.reason.length < 12)
    ) {
      findings.push({
        code: "missing-workspace-reason",
        path: contract.path ?? manifestPath,
        message: "Workspace chrome requires a durable reason.",
      });
    }
    if (
      contract.role === "workspace" &&
      !canonicalWorkspaceOwners.has(contract.owner)
    ) {
      findings.push({
        code: "workspace-owner-drift",
        path: contract.path ?? manifestPath,
        message:
          "Workspace chrome must still delegate to a reviewed canonical " +
          "top-bar owner.",
      });
    }
    if (
      contract.role === "workspace" &&
      rawChromePattern.test(`${contract.expression ?? ""}(`)
    ) {
      findings.push({
        code: "workspace-raw-expression",
        path: contract.path ?? manifestPath,
        message: "Workspace chrome cannot register a raw navigation bar.",
      });
    }
    rawChromePattern.lastIndex = 0;
    for (const field of ["expression", "owner"]) {
      if (typeof contract[field] === "string" && contract[field].length > 0) {
        continue;
      }
      findings.push({
        code: `invalid-${field}`,
        path: contract.path ?? manifestPath,
        message: `${field} must be a non-empty string.`,
      });
    }
  }

  validateRootHeaderManifest(manifest, findings, manifestPath);
  validateRawChromeExceptions(manifest, findings, manifestPath);
  validateScreenGeometryManifest(manifest, findings, manifestPath);
  validateRoutePresentations(manifest, findings, manifestPath);
  validateManualHeaders(manifest, findings, manifestPath);
}

function validateRootHeaderManifest(manifest, findings, manifestPath) {
  if (manifest.rootScreenManifestPath == null && manifest.rootHeaders == null) {
    return;
  }
  if (!Array.isArray(manifest.rootHeaders) || manifest.rootHeaders.length === 0) {
    findings.push({
      code: "missing-root-headers",
      path: manifestPath,
      message: "rootHeaders must classify every root-screen branch.",
    });
    return;
  }
  if (
    typeof manifest.rootScreenManifestPath !== "string" ||
    manifest.rootScreenManifestPath.length === 0
  ) {
    findings.push({
      code: "missing-root-screen-manifest-path",
      path: manifestPath,
      message: "rootScreenManifestPath must point at the root-screen branch ledger.",
    });
  }

  const seenBranches = new Set();
  for (const rootHeader of manifest.rootHeaders) {
    const branchKey = rootHeader.branchKey;
    if (typeof branchKey !== "string" || branchKey.length === 0) {
      findings.push({
        code: "invalid-root-branch-key",
        path: manifestPath,
        message: "Every root header requires a branchKey.",
      });
    } else if (seenBranches.has(branchKey)) {
      findings.push({
        code: "duplicate-root-branch",
        path: manifestPath,
        message: `Duplicate root-header branch ${branchKey}.`,
      });
    }
    seenBranches.add(branchKey);

    if (typeof rootHeader.routeName !== "string" || rootHeader.routeName.length === 0) {
      findings.push({
        code: "invalid-root-route-name",
        path: manifestPath,
        message: `Root-header branch ${branchKey ?? "unknown"} requires routeName.`,
      });
    }
    if (!Array.isArray(rootHeader.surfaces) || rootHeader.surfaces.length === 0) {
      findings.push({
        code: "missing-root-surfaces",
        path: manifestPath,
        message: `Root-header branch ${branchKey ?? "unknown"} requires surfaces.`,
      });
      continue;
    }

    const seenSurfaces = new Set();
    for (const surface of rootHeader.surfaces) {
      const surfaceKey = `${surface.path ?? ""}#${surface.symbol ?? ""}#${surface.owner ?? ""}`;
      if (seenSurfaces.has(surfaceKey)) {
        findings.push({
          code: "duplicate-root-surface",
          path: manifestPath,
          message: `Duplicate root-header surface ${surfaceKey}.`,
        });
      }
      seenSurfaces.add(surfaceKey);

      if (typeof surface.path !== "string" || !surface.path.startsWith("lib/")) {
        findings.push({
          code: "invalid-root-surface-path",
          path: manifestPath,
          message: "Every root-header surface requires a lib-relative path.",
        });
      }
      if (typeof surface.symbol !== "string" || surface.symbol.length === 0) {
        findings.push({
          code: "invalid-root-surface-symbol",
          path: surface.path ?? manifestPath,
          message: "Every root-header surface requires a class symbol.",
        });
      }
      if (!canonicalRootOwners.has(surface.owner)) {
        findings.push({
          code: "invalid-root-surface-owner",
          path: surface.path ?? manifestPath,
          message:
            `Root screen headers must use a canonical screen owner; ` +
            `${surface.owner ?? "missing"} is not allowed.`,
        });
      }
    }
  }
}

function validateRawChromeExceptions(manifest, findings, manifestPath) {
  if (!Array.isArray(manifest.rawChromeExceptions)) {
    findings.push({
      code: "invalid-raw-chrome-exceptions",
      path: manifestPath,
      message: "rawChromeExceptions must be an array.",
    });
    return;
  }
  const seen = new Set();
  for (const exception of manifest.rawChromeExceptions) {
    if (typeof exception.path !== "string" || !exception.path.startsWith("lib/")) {
      findings.push({
        code: "invalid-raw-chrome-path",
        path: manifestPath,
        message: "Every raw-chrome exception requires a lib-relative path.",
      });
    } else if (seen.has(exception.path)) {
      findings.push({
        code: "duplicate-raw-chrome-path",
        path: manifestPath,
        message: `Duplicate raw-chrome exception ${exception.path}.`,
      });
    }
    seen.add(exception.path);
    if (!rawHeroExpressions.has(exception.expression)) {
      findings.push({
        code: "invalid-raw-hero-expression",
        path: exception.path ?? manifestPath,
        message:
          "Raw-chrome exceptions are restricted to collapsing sliver hero " +
          "navigation bars; Material AppBar and CupertinoNavigationBar cannot " +
          "be blessed.",
      });
    }
    if (typeof exception.reason !== "string" || exception.reason.length < 12) {
      findings.push({
        code: "missing-raw-chrome-reason",
        path: exception.path ?? manifestPath,
        message: "Raw-chrome exceptions require a durable reason.",
      });
    }
  }
}

function validateScreenGeometryManifest(manifest, findings, manifestPath) {
  const geometry = manifest.screenGeometry;
  if (geometry == null) return;
  if (typeof geometry !== "object") return;
  if (typeof geometry.tokenPath !== "string" ||
      !/^packages\/catch_tokens\/lib\/(?:[a-z_]+\/)*[a-z_]+\.dart$/u.test(geometry.tokenPath)) {
    findings.push({
      code: "invalid-screen-geometry-path",
      path: manifestPath,
      message: "screenGeometry.tokenPath must name a Dart source inside packages/catch_tokens/lib.",
    });
  }
  if (typeof geometry.token !== "string" || geometry.token.length === 0) {
    findings.push({
      code: "invalid-screen-geometry-token",
      path: manifestPath,
      message: "screenGeometry.token must name the canonical inset.",
    });
  }
  if (typeof geometry.topInset !== "string" || geometry.topInset.length === 0) {
    findings.push({
      code: "invalid-screen-geometry-inset",
      path: manifestPath,
      message: "screenGeometry.topInset must name the approved zero token.",
    });
  }
}

function validateRoutePresentations(manifest, findings, manifestPath) {
  if (!Array.isArray(manifest.routePresentations)) {
    if (manifest.routePresentations != null) {
      findings.push({
        code: "invalid-route-presentations",
        path: manifestPath,
        message: "routePresentations must be an array.",
      });
    }
    return;
  }
  const seen = new Set();
  for (const presentation of manifest.routePresentations) {
    const key = `${presentation.path ?? ""}#${presentation.symbol ?? ""}`;
    if (seen.has(key)) {
      findings.push({
        code: "duplicate-route-presentation",
        path: manifestPath,
        message: `Duplicate route presentation ${key}.`,
      });
    }
    seen.add(key);
    if (typeof presentation.path !== "string" || !presentation.path.startsWith("lib/")) {
      findings.push({
        code: "invalid-route-presentation-path",
        path: manifestPath,
        message: "Every route presentation requires a lib-relative path.",
      });
    }
    if (typeof presentation.symbol !== "string" || presentation.symbol.length === 0) {
      findings.push({
        code: "invalid-route-presentation-symbol",
        path: presentation.path ?? manifestPath,
        message: "Every route presentation requires a launcher symbol.",
      });
    }
    if (presentation.navigator !== "root") {
      findings.push({
        code: "invalid-route-presentation-navigator",
        path: presentation.path ?? manifestPath,
        message: "Shell-covering editors must declare navigator root.",
      });
    }
    if (typeof presentation.reason !== "string" || presentation.reason.length < 12) {
      findings.push({
        code: "missing-route-presentation-reason",
        path: presentation.path ?? manifestPath,
        message: "Route presentations require a durable reason.",
      });
    }
  }
}

function validateManualHeaders(manifest, findings, manifestPath) {
  if (!Array.isArray(manifest.manualHeaders)) {
    if (manifest.manualHeaders != null) {
      findings.push({
        code: "invalid-manual-headers",
        path: manifestPath,
        message: "manualHeaders must be an array.",
      });
    }
    return;
  }
  const seen = new Set();
  for (const header of manifest.manualHeaders) {
    const key = `${header.path ?? ""}#${header.symbol ?? ""}`;
    if (seen.has(key)) {
      findings.push({
        code: "duplicate-manual-header",
        path: manifestPath,
        message: `Duplicate manual header ${key}.`,
      });
    }
    seen.add(key);
    if (typeof header.path !== "string" || !header.path.startsWith("lib/")) {
      findings.push({
        code: "invalid-manual-header-path",
        path: manifestPath,
        message: "Every manual header requires a lib-relative path.",
      });
    }
    if (typeof header.symbol !== "string" || header.symbol.length === 0) {
      findings.push({
        code: "invalid-manual-header-symbol",
        path: header.path ?? manifestPath,
        message: "Every manual header requires a class symbol.",
      });
    }
    if (!validManualHeaderRoles.has(header.role)) {
      findings.push({
        code: "invalid-manual-header-role",
        path: header.path ?? manifestPath,
        message: `Unknown manual-header role ${header.role}.`,
      });
    }
    const allowedOwners = manualHeaderRoleOwners.get(header.role);
    if (allowedOwners != null && !allowedOwners.has(header.owner)) {
      findings.push({
        code: "manual-header-role-owner-drift",
        path: header.path ?? manifestPath,
        message:
          `${header.role} manual chrome cannot be owned by ` +
          `${header.owner ?? "a missing owner"}; use its canonical role owner.`,
      });
    }
    if (typeof header.owner !== "string" || header.owner.length === 0) {
      findings.push({
        code: "invalid-manual-header-owner",
        path: header.path ?? manifestPath,
        message: "Every manual header requires an exact owner expression.",
      });
    }
    if (typeof header.reason !== "string" || header.reason.length < 12) {
      findings.push({
        code: "missing-manual-header-reason",
        path: header.path ?? manifestPath,
        message: "Manual headers require a durable role reason.",
      });
    }
  }
}

function checkManualHeaders({
  root,
  manualHeadersByPath,
  manualHeaders,
  rootHeaders,
  trackedRootHeaderPaths,
  findings,
}) {
  const registered = new Map(
    manualHeaders.map((header) => [`${header.path}#${header.symbol}`, header]),
  );
  const registeredRootSurfaces = new Set(
    rootHeaders.flatMap((rootHeader) =>
      (rootHeader.surfaces ?? []).map(
        (surface) => `${surface.path}#${surface.symbol}`,
      ),
    ),
  );

  for (const [relativePath, entries] of manualHeadersByPath) {
    for (const entry of entries) {
      const key = `${relativePath}#${entry.symbol}`;
      if (registeredRootSurfaces.has(key)) continue;
      const contract = registered.get(key);
      if (contract == null) {
        if (
          trackedRootHeaderPaths.has(relativePath) &&
          entry.owners.some((owner) => canonicalRootOwners.has(owner))
        ) {
          continue;
        }
        findings.push({
          code: "unregistered-manual-header",
          path: relativePath,
          message:
            `${entry.symbol} owns header typography outside Scaffold.appBar ` +
            "without an exact screen-chrome classification.",
        });
        continue;
      }
      if (!entry.owners.includes(contract.owner)) {
        findings.push({
          code: "manual-header-owner-drift",
          path: relativePath,
          message:
            `${entry.symbol} must delegate to ${contract.owner}; found ` +
            `${entry.owners.join(", ")}.`,
        });
      }
      if (contract.role === "content" && entry.hasNavigationAction) {
        findings.push({
          code: "content-header-owns-navigation",
          path: relativePath,
          message:
            `${entry.symbol} owns back/close navigation and cannot be ` +
            "reclassified as content chrome.",
        });
      }
    }
  }

  for (const contract of manualHeaders) {
    const entries = manualHeadersByPath.get(contract.path) ?? [];
    if (entries.some((entry) => entry.symbol === contract.symbol)) continue;
    findings.push({
      code: "stale-manual-header-contract",
      path: contract.path,
      message: `Registered manual header ${contract.symbol} no longer exists.`,
    });
  }
}

function checkRoutePresentations({root, routePresentations, findings}) {
  for (const presentation of routePresentations) {
    if (
      typeof presentation.path !== "string" ||
      typeof presentation.symbol !== "string"
    ) {
      continue;
    }
    const absolutePath = path.join(root, presentation.path);
    if (!fs.existsSync(absolutePath)) {
      findings.push({
        code: "missing-route-presentation-file",
        path: presentation.path,
        message: `Launcher ${presentation.symbol} source does not exist.`,
      });
      continue;
    }
    const source = maskDartCommentsAndStrings(
      fs.readFileSync(absolutePath, "utf8"),
    );
    const body = readFunctionBody(source, presentation.symbol);
    if (body == null) {
      findings.push({
        code: "missing-route-presentation-symbol",
        path: presentation.path,
        message: `Launcher ${presentation.symbol} does not exist.`,
      });
      continue;
    }
    if (!/\bNavigator\.of\s*\(\s*context\s*,\s*rootNavigator\s*:\s*true\s*\)/u.test(body)) {
      findings.push({
        code: "route-under-shell-chrome",
        path: presentation.path,
        message:
          `${presentation.symbol} must push from the root navigator so its ` +
          "app bar and body cover the floating tab shell.",
      });
    }
  }
}

function checkRawChrome({rawChromeByPath, rawChromeExceptions, findings}) {
  const exceptionsByPath = new Map(
    rawChromeExceptions.map((exception) => [exception.path, exception]),
  );

  for (const [relativePath, entries] of rawChromeByPath) {
    const exception = exceptionsByPath.get(relativePath);
    if (exception == null) {
      findings.push({
        code: "unregistered-raw-chrome",
        path: relativePath,
        message:
          `Found raw ${[...new Set(entries.map((entry) => entry.expression))].join(", ")} ` +
          "outside the canonical app-bar primitive and without a documented hero exception.",
      });
      continue;
    }
    const expectedCount = exception.occurrences ?? 1;
    const matching = entries.filter(
      (entry) => entry.expression === exception.expression,
    );
    if (entries.length !== expectedCount || matching.length !== expectedCount) {
      findings.push({
        code: "raw-chrome-exception-drift",
        path: relativePath,
        message:
          `Expected ${expectedCount} ${exception.expression} call(s), found ` +
          `${entries.map((entry) => entry.expression).join(", ") || "none"}.`,
      });
    }
  }

  for (const exception of rawChromeExceptions) {
    if (rawChromeByPath.has(exception.path)) continue;
    findings.push({
      code: "stale-raw-chrome-exception",
      path: exception.path,
      message: "Documented raw-chrome exception no longer has raw chrome.",
    });
  }
}

function checkRootHeaders({root, manifest, rootHeaders, findings}) {
  const rootScreenManifestPath = manifest.rootScreenManifestPath;
  if (typeof rootScreenManifestPath !== "string" || rootScreenManifestPath.length === 0) {
    return;
  }
  const absoluteRootScreenManifestPath = path.join(root, rootScreenManifestPath);
  if (!fs.existsSync(absoluteRootScreenManifestPath)) {
    findings.push({
      code: "missing-root-screen-manifest",
      path: rootScreenManifestPath,
      message: "Tab-root branch ledger does not exist.",
    });
    return;
  }

  const rootScreenManifest = JSON.parse(
    fs.readFileSync(absoluteRootScreenManifestPath, "utf8"),
  );
  const branches = rootScreenManifest.branches ?? [];
  const rootsByBranch = new Map(
    rootHeaders.map((rootHeader) => [rootHeader.branchKey, rootHeader]),
  );

  for (const branch of branches) {
    const rootHeader = rootsByBranch.get(branch.branchKey);
    if (rootHeader == null) {
      findings.push({
        code: "unregistered-root-header",
        path: rootScreenManifestPath,
        message:
          `Tab-root branch ${branch.branchKey} (${branch.routeName}) has no ` +
          "screen-header contract.",
      });
      continue;
    }
    if (rootHeader.routeName !== branch.routeName) {
      findings.push({
        code: "root-header-route-drift",
        path: rootScreenManifestPath,
        message:
          `Branch ${branch.branchKey} maps to ${branch.routeName}, not ` +
          `${rootHeader.routeName}.`,
      });
    }
  }

  const branchKeys = new Set(branches.map((branch) => branch.branchKey));
  for (const rootHeader of rootHeaders) {
    if (!branchKeys.has(rootHeader.branchKey)) {
      findings.push({
        code: "unknown-root-header-branch",
        path: rootScreenManifestPath,
        message: `Screen-header contract ${rootHeader.branchKey} is not a root-screen branch.`,
      });
    }
    for (const surface of rootHeader.surfaces ?? []) {
      checkRootHeaderSurface({root, rootHeader, surface, findings});
    }
  }
}

function checkRootHeaderSurface({root, rootHeader, surface, findings}) {
  if (
    typeof surface.path !== "string" ||
    typeof surface.symbol !== "string" ||
    typeof surface.owner !== "string"
  ) {
    return;
  }
  const absolutePath = path.join(root, surface.path);
  if (!fs.existsSync(absolutePath)) {
    findings.push({
      code: "missing-root-header-file",
      path: surface.path,
      message: `Root-header source for ${rootHeader.branchKey} does not exist.`,
    });
    return;
  }

  const source = maskDartCommentsAndStrings(
    fs.readFileSync(absolutePath, "utf8"),
  );
  const classBodies = readWidgetClassBodies(source, surface.symbol);
  if (classBodies.length === 0) {
    findings.push({
      code: "missing-root-header-symbol",
      path: surface.path,
      message:
        `Root-header symbol ${surface.symbol} for ${rootHeader.branchKey} ` +
        "does not exist.",
    });
    return;
  }

  const classBody = classBodies.map((entry) => entry.body).join("\n");
  const ownerCalls = readCalls(classBody, surface.owner);
  const expectedCount = surface.minimumOccurrences ?? 1;
  if (ownerCalls.length < expectedCount) {
    findings.push({
      code: "missing-root-header-owner",
      path: surface.path,
      message:
        `${surface.symbol} must call ${surface.owner} at least ` +
        `${expectedCount} time(s); found ${ownerCalls.length}.`,
    });
  }

  if (manualHeaderOwners(classBody).some((owner) => /^CatchTextStyles\.headline[A-Za-z]*$/u.test(owner))) {
    findings.push({
      code: "local-root-title-style",
      path: surface.path,
      message:
        `${surface.symbol} styles root-title text directly; title typography ` +
        "must come from the canonical screen-header primitive.",
    });
  }

  if (rootTextScaleOverridePattern.test(classBody)) {
    findings.push({
      code: "root-title-text-scale-override",
      path: surface.path,
      message:
        `${surface.symbol} overrides text scaling around screen chrome; ` +
        "root titles must inherit the app accessibility scale.",
    });
  }
  rootTextScaleOverridePattern.lastIndex = 0;

  const geometryPattern = /\b(?:padding|contentPadding|height|titleMaxLines|titleStyle|rowCrossAxisAlignment|eyebrow|kicker)\s*:/u;
  if (ownerCalls.some((call) => geometryPattern.test(call))) {
    findings.push({
      code: "root-header-geometry-override",
      path: surface.path,
      message:
        `${surface.symbol} overrides ${surface.owner} geometry; the canonical ` +
        "screen-header primitive owns the approved zero top inset and extent.",
    });
  }
}

function checkCanonicalScreenGeometry({root, manifest, findings}) {
  const geometry = manifest.screenGeometry;
  if (
    geometry == null ||
    typeof geometry.tokenPath !== "string" ||
    typeof geometry.token !== "string" ||
    typeof geometry.topInset !== "string"
  ) {
    return;
  }
  const absolutePath = path.join(root, geometry.tokenPath);
  if (!fs.existsSync(absolutePath)) {
    findings.push({
      code: "missing-screen-geometry-file",
      path: geometry.tokenPath,
      message: "Canonical screen-header inset source does not exist.",
    });
    return;
  }

  const source = maskDartCommentsAndStrings(
    fs.readFileSync(absolutePath, "utf8"),
  );
  const declarationPattern = new RegExp(
    `\\bstatic\\s+const\\s+EdgeInsets\\s+${escapeRegExp(geometry.token)}` +
      `\\s*=\\s*EdgeInsets\\.fromLTRB\\s*\\(`,
    "u",
  );
  const declaration = declarationPattern.exec(source);
  if (declaration == null) {
    findings.push({
      code: "screen-geometry-not-owned",
      path: geometry.tokenPath,
      message:
        `${geometry.token} must explicitly own an EdgeInsets.fromLTRB value ` +
        "instead of aliasing a generic page-header inset.",
    });
    return;
  }

  const openParen = declaration.index + declaration[0].lastIndexOf("(");
  const invocation = readBalanced(source, openParen, "(", ")");
  const argumentsList = splitTopLevelArguments(
    invocation.slice(1, invocation.length - 1),
  ).filter((argument) => argument.trim().length > 0);
  if (argumentsList.length !== 4 || argumentsList[1].trim() !== geometry.topInset) {
    findings.push({
      code: "screen-top-inset-drift",
      path: geometry.tokenPath,
      message:
        `${geometry.token}.top must be ${geometry.topInset}; found ` +
        `${argumentsList[1]?.trim() ?? "an unreadable value"}.`,
    });
  }
}

function readClassBody(source, symbol) {
  const classPattern = new RegExp(`\\bclass\\s+${escapeRegExp(symbol)}\\b`, "u");
  const match = classPattern.exec(source);
  if (match == null) return null;
  const openBrace = source.indexOf("{", match.index + match[0].length);
  if (openBrace < 0) return null;
  return readBalanced(source, openBrace, "{", "}");
}

function readWidgetClassBodies(source, symbol) {
  const bodies = [];
  const widgetBody = readClassBody(source, symbol);
  if (widgetBody != null) bodies.push({symbol, body: widgetBody});

  const statePattern = new RegExp(
    `\\bclass\\s+([_$A-Za-z][\\w$]*)\\s+extends\\s+` +
      `(?:ConsumerState|State)\\s*<\\s*${escapeRegExp(symbol)}\\s*>`,
    "gu",
  );
  for (const match of source.matchAll(statePattern)) {
    const stateSymbol = match[1];
    const stateBody = readClassBody(source, stateSymbol);
    if (stateBody != null) bodies.push({symbol: stateSymbol, body: stateBody});
  }
  return bodies;
}

function readFunctionBody(source, symbol) {
  const pattern = new RegExp(`\\b${escapeRegExp(symbol)}\\s*\\(`, "u");
  const match = pattern.exec(source);
  if (match == null) return null;
  const openParen = match.index + match[0].lastIndexOf("(");
  const parameters = readBalanced(source, openParen, "(", ")");
  const bodyStart = source.indexOf("{", openParen + parameters.length);
  if (bodyStart < 0) return null;
  return readBalanced(source, bodyStart, "{", "}");
}

function readCalls(source, owner) {
  const pattern = new RegExp(`\\b${escapeRegExp(owner)}\\s*\\(`, "gu");
  const calls = [];
  for (const match of source.matchAll(pattern)) {
    const openParen = (match.index ?? 0) + match[0].lastIndexOf("(");
    calls.push(`${owner}${readBalanced(source, openParen, "(", ")")}`);
  }
  return calls;
}

function readBalanced(source, start, open, close) {
  let depth = 0;
  for (let index = start; index < source.length; index += 1) {
    const char = source[index];
    if (char === open) depth += 1;
    if (char !== close) continue;
    depth -= 1;
    if (depth === 0) return source.slice(start, index + 1);
  }
  return source.slice(start);
}

function splitTopLevelArguments(source) {
  const result = [];
  let start = 0;
  const depths = {round: 0, square: 0, curly: 0};
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (char === "(") depths.round += 1;
    if (char === ")") depths.round -= 1;
    if (char === "[") depths.square += 1;
    if (char === "]") depths.square -= 1;
    if (char === "{") depths.curly += 1;
    if (char === "}") depths.curly -= 1;
    if (
      char === "," &&
      depths.round === 0 &&
      depths.square === 0 &&
      depths.curly === 0
    ) {
      result.push(source.slice(start, index));
      start = index + 1;
    }
  }
  result.push(source.slice(start));
  return result;
}

function readAppBarValue(source, start) {
  const depths = {round: 0, square: 0, curly: 0};
  for (let index = start; index < source.length; index += 1) {
    const char = source[index];
    if (char === "(") depths.round += 1;
    if (char === ")") {
      if (depths.round === 0 && depths.square === 0 && depths.curly === 0) {
        return source.slice(start, index);
      }
      depths.round -= 1;
    }
    if (char === "[") depths.square += 1;
    if (char === "]") depths.square -= 1;
    if (char === "{") depths.curly += 1;
    if (char === "}") depths.curly -= 1;
    if (
      char === "," &&
      depths.round === 0 &&
      depths.square === 0 &&
      depths.curly === 0
    ) {
      return source.slice(start, index);
    }
  }
  return source.slice(start);
}

function maskDartCommentsAndStrings(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//gu, (match) => match.replace(/[^\n]/gu, " "))
    .replace(/\/\/[^\n]*/gu, (match) => " ".repeat(match.length))
    .replace(/r?(?:'''[\s\S]*?'''|"""[\s\S]*?"""|'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*")/gu,
      (match) => match.replace(/[^\n]/gu, " "));
}

function lineNumberAt(source, index) {
  return source.slice(0, index).split("\n").length;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

function summarize(
  contracts,
  appBarsByPath,
  findings,
  rootHeaders = [],
  rawChromeByPath = new Map(),
  routePresentations = [],
  manualHeaders = [],
  trackedRootHeaders = {pathCount: 0, surfaceCount: 0},
) {
  return {
    contractCount: contracts.length,
    appBarFileCount: appBarsByPath.size,
    appBarCount: [...appBarsByPath.values()].reduce(
      (sum, entries) => sum + entries.length,
      0,
    ),
    rootHeaderCount: rootHeaders.length,
    rootSurfaceCount: rootHeaders.reduce(
      (sum, rootHeader) => sum + (rootHeader.surfaces?.length ?? 0),
      0,
    ),
    trackedRootHeaderPathCount: trackedRootHeaders.pathCount,
    trackedRootSurfaceCount: trackedRootHeaders.surfaceCount,
    rawChromeCount: [...rawChromeByPath.values()].reduce(
      (sum, entries) => sum + entries.length,
      0,
    ),
    routePresentationCount: routePresentations.length,
    manualHeaderCount: manualHeaders.length,
    legacyManualHeaderCount: manualHeaders.filter(
      (header) => header.role === "legacy",
    ).length,
    findings,
  };
}

function runCli() {
  const args = process.argv.slice(2);
  if (args.includes("--help") || args.includes("-h")) {
    console.log(`Usage: node tool/design/check_screen_top_bar_contracts.mjs [--check|--json]

Requires every Flutter Scaffold appBar declaration to be classified in the
screen-chrome manifest. Also verifies classified body-owned headers,
shell-covering route presentation, and raw hero exceptions; root-screen headers
and primitive-owned geometry are verified when their optional manifests are
present.`);
    return;
  }

  const rootIndex = args.indexOf("--root");
  const root = rootIndex >= 0 ? args[rootIndex + 1] : repoRoot;
  const result = checkScreenTopBarContracts({root});
  if (args.includes("--json")) {
    console.log(JSON.stringify(result, null, 2));
  } else if (result.findings.length === 0) {
    console.log(
      `Screen top-bar contracts: ${result.contractCount} contracts, ` +
        `${result.appBarCount} app bars, ${result.trackedRootHeaderPathCount} ` +
        `tracked root paths, ${result.trackedRootSurfaceCount} tracked root ` +
        `surfaces, ${result.rootHeaderCount} root screens, ` +
        `${result.rootSurfaceCount} root-screen surfaces, ${result.rawChromeCount} ` +
        `raw hero exceptions, ${result.routePresentationCount} root route ` +
        `presentations, ${result.manualHeaderCount} classified manual headers ` +
        `(${result.legacyManualHeaderCount} legacy), 0 findings.`,
    );
  } else {
    for (const finding of result.findings) {
      console.error(`${finding.path}: ${finding.code}: ${finding.message}`);
    }
  }

  if (args.includes("--check") && result.findings.length > 0) {
    process.exitCode = 1;
  }
}
