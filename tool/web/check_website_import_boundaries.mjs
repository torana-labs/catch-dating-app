#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import ts from "typescript";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../.."
);
const websiteSrcRoot = path.join(repoRoot, "website/src");
const websiteContentRoot = path.join(websiteSrcRoot, "content");
const functionsGeneratedRoot = path.join(repoRoot, "functions/src/shared/generated");
const allowedSourceExtensions = new Set([".ts", ".tsx"]);
const args = parseArgs(process.argv.slice(2));

if (args.help) {
  printHelp();
  process.exit(0);
}

const allowedFeatureImports = new Map([
  ["claims", new Set(["marketing", "organizers"])],
  ["events", new Set(["account", "marketing", "organizers", "reviews", "eventMessaging"])],
  // Verified event text preferences are shared by registration and guest runtime.
  ["eventAssistance", new Set(["eventMessaging"])],
  ["eventRuntime", new Set(["eventMessaging"])],
  ["home", new Set(["marketing", "organizers", "waitlist"])],
  ["host", new Set(["marketing"])],
  ["organizers", new Set(["account", "claims", "events", "marketing", "reviews"])],
  ["reviews", new Set(["organizers"])],
]);

if (args.selfTest) {
  runSelfTest();
  process.exit(0);
}


function walkSourceFiles(directory) {
  const files = [];
  for (const entry of fs.readdirSync(directory, {withFileTypes: true})) {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkSourceFiles(absolutePath));
      continue;
    }
    if (allowedSourceExtensions.has(path.extname(entry.name))) {
      files.push(absolutePath);
    }
  }
  return files;
}

function relativeToWebsiteSource(absolutePath) {
  return path.relative(websiteSrcRoot, absolutePath).split(path.sep).join("/");
}

function isInside(parent, child) {
  const relativePath = path.relative(parent, child);
  return relativePath === "" ||
    (!relativePath.startsWith("..") && !path.isAbsolute(relativePath));
}

function layerFor(relativePath) {
  const parts = relativePath.split("/");
  if (relativePath.startsWith("../app/") || relativePath === "../proxy.ts") return {name: "next-entry"};
  if (parts[0] === "server") return {name: "server"};
  if (parts[0] === "app") return {name: "app"};
  if (parts[0] === "content") return {name: "content"};
  if (parts[0] === "features") return {name: "feature", feature: parts[1] ?? ""};
  if (parts[0] === "generated") return {name: "generated"};
  if (relativePath.startsWith("shared/contracts/generated/")) return {name: "contract"};
  if (parts[0] === "shared") return {name: "shared"};
  if (parts[0] === "stories") return {name: "story"};
  if (
    relativePath === "analytics.ts" || relativePath.startsWith("analytics/") ||
    relativePath === "firebase.ts" ||
    relativePath === "firebaseConfig.ts"
  ) {
    return {name: "service"};
  }
  if (relativePath === "App.tsx" || relativePath === "main.tsx") {
    return {name: "entry"};
  }
  return {name: "root"};
}

function sourceModule(source) {
  return ts.createSourceFile("boundary.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
}

function importSpecifiers(source) {
  const specifiers = [];
  const add = value => {if (value && ts.isStringLiteralLike(value)) specifiers.push(value.text);};
  function visit(node) {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) add(node.moduleSpecifier);
    if (ts.isImportEqualsDeclaration(node) && ts.isExternalModuleReference(node.moduleReference)) add(node.moduleReference.expression);
    if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument)) add(node.argument.literal);
    if (ts.isCallExpression(node) && (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
        (ts.isIdentifier(node.expression) && node.expression.text === "require"))) add(node.arguments[0]);
    ts.forEachChild(node, visit);
  }
  visit(sourceModule(source));
  return specifiers;
}

function isClientModule(source) {
  for (const statement of sourceModule(source).statements) {
    if (!ts.isExpressionStatement(statement) || !ts.isStringLiteral(statement.expression)) return false;
    if (statement.expression.text === "use client") return true;
  }
  return false;
}

function privilegedImport(specifier, sourceRelativePath, sourceLayer, source) {
  return /^(firebase-admin(?:\/|$)|node:)/.test(specifier) &&
    (isClientModule(source) || !["server", "next-entry"].includes(sourceLayer.name)) &&
    !/\.test\./.test(sourceRelativePath);
}

function allowedExternalImport(sourceRelativePath, targetAbsolutePath) {
  if (layerFor(sourceRelativePath).name === "next-entry" &&
      isInside(path.join(repoRoot, "website/app"), targetAbsolutePath)) return true;
  // The app-capture records are bundled at build time from the one manifest
  // tool/marketing/sync_website_media.mjs writes beside the images.
  if (sourceRelativePath === "app/marketingCaptures.ts" &&
      targetAbsolutePath === path.join(repoRoot, "website/public/assets/app-screenshots/manifest.json")) return true;
  if (["server/publicOrganizerProjection.ts", "server/publicExternalEvent.ts"].includes(sourceRelativePath) && [
    "website/scripts/next/organizerProjection.mjs",
    "website/scripts/next/externalEventProjection.mjs",
    "tool/contracts/generated/schema_contract_validators.mjs",
  ].some(target => targetAbsolutePath === path.join(repoRoot, target))) return true;
  return (
    sourceRelativePath === "features/organizers/types.ts" ||
    sourceRelativePath === "firebase.ts"
  ) && isInside(functionsGeneratedRoot, targetAbsolutePath);
}

function isAllowedGeneratedImport(sourceRelativePath) {
  return sourceRelativePath === "features/organizers/data.ts";
}

function allowedCrossFeatureImport(sourceLayer, targetLayer) {
  return allowedFeatureImports.get(sourceLayer.feature)?.has(targetLayer.feature) ?? false;
}

function violationFor(sourceRelativePath, sourceLayer, targetLayer, targetRelativePath) {
  if (targetLayer.name === "server" && !["server", "next-entry"].includes(sourceLayer.name)) {
    return "browser layers must not import server modules; shared DTO types belong outside server";
  }
  if (sourceLayer.name === "server") {
    if (["entry", "service", "generated", "story", "root"].includes(targetLayer.name)) {
      return "server readers must not import browser services, entries or build-time data";
    }
    return null;
  }
  if (sourceLayer.name === "next-entry") return null;
  if (sourceLayer.name === "story") return null;

  if (sourceLayer.name === "contract") {
    return targetLayer.name === "contract" ? null :
      "generated contracts must not import application or UI layers";
  }

  if (sourceLayer.name === "content") {
    if (targetLayer.name !== "content") {
      return "content modules must remain data-only and may only import other content modules";
    }
    return null;
  }

  if (sourceLayer.name === "shared") {
    if (targetLayer.name === "app" || targetLayer.name === "entry" || targetLayer.name === "feature") {
      return "shared modules must not import app, entry, or feature modules";
    }
    if (targetLayer.name === "generated") {
      return "shared modules must not import generated website projections directly";
    }
    if (targetLayer.name === "content") {
      // This one public chrome adapter consumes the site-wide authored owner.
      // Other shared modules and all route-specific content remain forbidden.
      if ((sourceRelativePath === "shared/site/PublicSiteChrome.tsx" ||
          sourceRelativePath === "shared/site/PublicSiteChrome.test.tsx") &&
          targetRelativePath === "content/site.ts") return null;
      return "shared UI modules must not own or depend on route-specific marketing content";
    }
    return null;
  }

  if (sourceLayer.name === "feature") {
    // Explore reuses the canonical public event model so discovery and detail agree.
    if (sourceRelativePath === "features/home/exploreDiscovery.ts" &&
        targetRelativePath === "features/events/eventDetailModel.ts") return null;
    if (targetLayer.name === "app" || targetLayer.name === "entry" || targetLayer.name === "root") {
      return "feature modules must not import app-shell, entry, or uncategorized root modules";
    }
    if (targetLayer.name === "generated" && !isAllowedGeneratedImport(sourceRelativePath)) {
      return "generated organizer projections must be read through features/organizers/data.ts";
    }
    if (
      targetLayer.name === "feature" &&
      targetLayer.feature !== sourceLayer.feature &&
      !allowedCrossFeatureImport(sourceLayer, targetLayer)
    ) {
      return `feature '${sourceLayer.feature}' must not import feature '${targetLayer.feature}' without a scanner allowlist`;
    }
    return null;
  }

  if (sourceLayer.name === "app") {
    if (targetLayer.name === "entry" || targetLayer.name === "root") {
      return "app-shell modules must not import entry or uncategorized root modules";
    }
    return null;
  }

  if (sourceLayer.name === "service") {
    if (
      targetLayer.name === "app" ||
      targetLayer.name === "content" ||
      targetLayer.name === "feature" ||
      targetLayer.name === "shared"
    ) {
      return "root service modules must stay independent of app, content, feature, and shared UI modules";
    }
    return null;
  }

  if (sourceLayer.name === "entry") return null;

  if (sourceLayer.name === "root") {
    if (targetLayer.name !== "service") {
      return "uncategorized root modules must not import production app layers";
    }
  }

  return null;
}

const violations = [];
const nextRoot = path.join(repoRoot, "website/app");
const proxyPath = path.join(repoRoot, "website/proxy.ts");
for (const file of [...walkSourceFiles(websiteSrcRoot),
  ...(fs.existsSync(nextRoot) ? walkSourceFiles(nextRoot) : []),
  ...(fs.existsSync(proxyPath) ? [proxyPath] : [])]) {
  const sourceRelativePath = relativeToWebsiteSource(file);
  const sourceLayer = layerFor(sourceRelativePath);
  const source = fs.readFileSync(file, "utf8");

  const contentSourceReason = contentSourceViolation(
    sourceRelativePath,
    sourceLayer,
    source
  );
  if (contentSourceReason !== null) {
    violations.push({
      source: sourceRelativePath,
      specifier: "<module source>",
      reason: contentSourceReason,
    });
  }

  for (const specifier of importSpecifiers(source)) {
    if (privilegedImport(specifier, sourceRelativePath, sourceLayer, source)) {
      violations.push({source: sourceRelativePath, specifier,
        reason: "privileged runtime packages must remain in server modules"});
    }
    if (specifier.startsWith("@catch/web-ui/")) {
      violations.push({
        source: sourceRelativePath,
        specifier,
        reason: "shared web UI must be imported from @catch/web-ui without deep imports",
      });
      continue;
    }
    const aliasedTarget = contentAliasTarget(specifier);
    if (!specifier.startsWith(".") && aliasedTarget === null) continue;

    const targetAbsolutePath = aliasedTarget ?? path.resolve(path.dirname(file), specifier);
    if (!isInside(websiteSrcRoot, targetAbsolutePath)) {
      if (!allowedExternalImport(sourceRelativePath, targetAbsolutePath)) {
        violations.push({
          source: sourceRelativePath,
          specifier,
          reason: "relative import leaves website/src without an explicit allowlist",
        });
      }
      continue;
    }

    const targetRelativePath = relativeToWebsiteSource(resolveModulePath(targetAbsolutePath));
    const targetLayer = layerFor(targetRelativePath);
    const clientImportsServer = isClientModule(source) && targetLayer.name === "server";
    const reason = clientImportsServer ? "client components must not import server modules" :
      violationFor(sourceRelativePath, sourceLayer, targetLayer, targetRelativePath);
    if (reason !== null) {
      violations.push({source: sourceRelativePath, specifier, reason});
    }
  }
}

function contentSourceViolation(sourceRelativePath, sourceLayer, source) {
  if (sourceLayer.name !== "content") return null;
  if (sourceRelativePath.endsWith(".tsx")) {
    return "content modules must not own JSX; render content in feature or shared UI adapters";
  }
  if (/\bimport\.meta\.env\b/.test(source)) {
    return "content modules must not read import.meta.env; feature adapters own environment values";
  }
  return null;
}

if (violations.length > 0) {
  console.error("Website import boundary violations:");
  for (const violation of violations) {
    console.error(
      `- ${violation.source} imports ${violation.specifier}: ${violation.reason}`
    );
  }
  process.exitCode = 1;
} else {
  console.log("Website import boundaries passed.");
}

function resolveModulePath(absolutePath) {
  if (path.extname(absolutePath)) return absolutePath;
  for (const extension of [".ts", ".tsx", ".json"]) {
    const candidate = `${absolutePath}${extension}`;
    if (fs.existsSync(candidate)) return candidate;
  }
  for (const extension of [".ts", ".tsx"]) {
    const candidate = path.join(absolutePath, `index${extension}`);
    if (fs.existsSync(candidate)) return candidate;
  }
  return absolutePath;
}

function contentAliasTarget(specifier) {
  if (specifier === "@content") return websiteContentRoot;
  if (!specifier.startsWith("@content/")) return null;
  return path.join(websiteContentRoot, specifier.slice("@content/".length));
}

function parseArgs(argv) {
  const parsed = {help: false, selfTest: false};
  for (const arg of argv) {
    if (arg === "--help" || arg === "-h") parsed.help = true;
    else if (arg === "--self-test") parsed.selfTest = true;
    else if (arg === "--check" || arg === "--summary") {
      // Default scan mode; accepted for consistency with repo checkers.
    } else {
      console.error(`Unknown argument: ${arg}`);
      process.exit(64);
    }
  }
  return parsed;
}

function printHelp() {
  console.log(`Usage: node tool/web/check_website_import_boundaries.mjs [--check] [--self-test]

Checks marketing website import boundaries, including content imports, JSX
ownership, and environment-access boundaries.
`);
}

function runSelfTest() {
  // Analytics services may share pure contracts, never UI or feature state.
  assert.deepEqual(layerFor("analytics/hostServerConsent.ts"), {name: "service"});
  assert.deepEqual(layerFor("shared/contracts/generated/hostAcquisitionConsentHttpRequest.ts"), {name: "contract"});
  assert.equal(violationFor("analytics/hostServerConsent.ts", {name: "service"}, {name: "contract"}), null);
  assert.equal(violationFor("analytics/hostServerConsent.ts", {name: "service"}, {name: "service"}), null);
  for (const layer of ["app", "feature", "shared", "content"]) {
    assert.match(violationFor("analytics/hostServerConsent.ts", {name: "service"}, {name: layer}), /must stay independent/);
  }
  for (const layer of ["app", "feature", "shared", "content", "service", "server"]) {
    assert.ok(violationFor("shared/contracts/generated/test.ts", {name: "contract"}, {name: layer}));
  }
  assert.equal(violationFor("features/home/exploreDiscovery.ts", {name: "feature", feature: "home"}, {name: "feature", feature: "events"}, "features/events/eventDetailModel.ts"), null);
  assert.match(violationFor("features/home/exploreDiscovery.ts", {name: "feature", feature: "home"}, {name: "feature", feature: "events"}, "features/events/GuestEventEntry.tsx"), /without a scanner allowlist/);
  const imports = importSpecifiers(`
    // export * from "ignored-comment";
    const example = 'import("ignored-string")';
    import type {PublicDto} from "../server/dto";
    export {read} from "../server/catalog";
    export * from "firebase-admin/firestore";
    export * as admin from "firebase-admin/app";
    const lazy = import /* comment */ ("node:fs");
    const required = require("node:crypto");
    import filesystem = require("node:path");
    type Reader = import("../server/reader").Reader;
  `);
  assert.deepEqual(imports, ["../server/dto", "../server/catalog", "firebase-admin/firestore",
    "firebase-admin/app", "node:fs", "node:crypto", "node:path", "../server/reader"]);
  for (const source of ['"use client"; export * from "firebase-admin/app";', '/* boundary */ "use client"\nimport "node:fs";']) {
    assert.equal(isClientModule(source), true);
    assert.equal(privilegedImport(importSpecifiers(source)[0], "../app/client.tsx", {name: "next-entry"}, source), true);
  }
  assert.equal(isClientModule('// "use client";\nconst text = "use client";'), false);

  assert.deepEqual(layerFor("server/publicCatalog.ts"), {name: "server"});
  assert.deepEqual(layerFor("../app/page.tsx"), {name: "next-entry"});
  for (const layer of ["app", "feature", "shared", "content", "service", "story"]) {
    assert.match(violationFor("test.ts", {name: layer}, {name: "server"}), /must not import server/);
  }
  assert.equal(violationFor("../app/page.tsx", {name: "next-entry"}, {name: "server"}), null);
  assert.equal(violationFor("server/publicCatalog.ts", {name: "server"}, {name: "feature"}), null);
  assert.match(violationFor("server/publicCatalog.ts", {name: "server"}, {name: "generated"}), /build-time data/);
  assert.equal(allowedExternalImport("server/publicOrganizerProjection.ts",
    path.join(repoRoot, "website/scripts/next/organizerProjection.mjs")), true);
  assert.equal(allowedExternalImport("app/leak.ts",
    path.join(repoRoot, "website/scripts/next/organizerProjection.mjs")), false);
  assert.deepEqual(layerFor("content/meta.json"), {name: "content"});
  assert.equal(
    violationFor(
      "content/home.ts",
      {name: "content"},
      {name: "feature", feature: "home"}
    ),
    "content modules must remain data-only and may only import other content modules"
  );
  assert.equal(
    violationFor("content/home.ts", {name: "content"}, {name: "content"}),
    null
  );
  assert.equal(
    violationFor(
      "features/home/HomePage.tsx",
      {name: "feature", feature: "home"},
      {name: "content"}
    ),
    null
  );
  assert.equal(
    violationFor("shared/ui/Card.tsx", {name: "shared"}, {name: "content"}),
    "shared UI modules must not own or depend on route-specific marketing content"
  );
  for (const source of ["shared/site/PublicSiteChrome.tsx", "shared/site/PublicSiteChrome.test.tsx"]) {
    assert.equal(violationFor(source, {name: "shared"}, {name: "content"}, "content/site.ts"), null);
    for (const target of ["content/host.ts", "content/generated.ts", "content/legal.json", "content/marketingOrganization.ts"]) {
      assert.equal(violationFor(source, {name: "shared"}, {name: "content"}, target),
        "shared UI modules must not own or depend on route-specific marketing content");
    }
  }
  assert.equal(violationFor("shared/ui/Card.tsx", {name: "shared"}, {name: "content"}, "content/site.ts"),
    "shared UI modules must not own or depend on route-specific marketing content");
  assert.equal(
    contentAliasTarget("@content/markets"),
    path.join(websiteContentRoot, "markets")
  );
  assert.equal(contentAliasTarget("react"), null);
  assert.equal(
    contentSourceViolation(
      "content/site.ts",
      {name: "content"},
      'export const href = import.meta.env.VITE_APP_STORE_URL;'
    ),
    "content modules must not read import.meta.env; feature adapters own environment values"
  );
  assert.equal(
    contentSourceViolation(
      "content/HomeCopy.tsx",
      {name: "content"},
      "export const copy = <span>Copy</span>;"
    ),
    "content modules must not own JSX; render content in feature or shared UI adapters"
  );
  assert.equal(
    contentSourceViolation(
      "content/metaContract.ts",
      {name: "content"},
      "export function validate() { return true; }"
    ),
    null
  );
  console.log("Website import boundary checker self-test passed.");
}
