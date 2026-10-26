#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fromRepo} from "../lib/repo_paths.mjs";
import {
  formatContentTemplate,
  readWebsiteMeta,
  validateWebsiteMeta,
} from "./website_meta_contract.mjs";
import {inMarket} from "../../website/src/content/markets/in.ts";

const args = parseArgs(process.argv.slice(2));
const liveMarketKeys = new Set(
  inMarket.cities
    .filter((city) => city.status === "live")
    .flatMap((city) => [city.slug, city.label, ...city.aliases])
    .map(normalizeMarketKey)
);

if (args.help) {
  printHelp();
  process.exit(0);
}

if (args.selfTest) {
  runSelfTest();
  process.exit(0);
}

const routesPath = fromRepo(args.routes ?? "design/website/routes.json");
const schemaPath = fromRepo("design/website/website.routes.schema.json");
const pageMetaPath = fromRepo("website/src/app/pageMeta.ts");
const postbuildPath = fromRepo("website/scripts/postbuild.mjs");
const routingPath = fromRepo("website/src/features/organizers/routing.ts");
const appPath = fromRepo("website/src/app/App.tsx");
const routeRegistryPath = fromRepo("website/src/app/routeRegistry.ts");
const hostListingsPath = fromRepo("website/src/generated/hostListings.json");
const storiesRoot = fromRepo("website/src/stories");

const errors = [];
const warnings = [];

const contract = readJson(routesPath, "website route contract");
const hostingConfigPath = contract.sourceOfTruth?.hostingConfig
  ? fromRepo(contract.sourceOfTruth.hostingConfig)
  : null;
const hostingConfig = hostingConfigPath
  ? readJson(hostingConfigPath, "Firebase Hosting config")
  : null;
const metaContentPath = contract.sourceOfTruth?.metadataContent
  ? fromRepo(contract.sourceOfTruth.metadataContent)
  : null;
const metaSchemaPath = contract.sourceOfTruth?.metadataSchema
  ? fromRepo(contract.sourceOfTruth.metadataSchema)
  : null;
let websiteMeta = null;
if (metaContentPath) {
  try {
    websiteMeta = readWebsiteMeta(metaContentPath);
  } catch (error) {
    errors.push(error.message);
  }
}
const hostListings = readJson(hostListingsPath, "generated host listings");
const pageMetaSource = readText(pageMetaPath);
const postbuildSource = readText(postbuildPath);
const routingSource = readText(routingPath);
const appSource = readText(appPath);
const routeRegistrySource = readText(routeRegistryPath);
const appRoutingSource = `${appSource}\n${routeRegistrySource}`;
const routeStoryDeclarations = collectStoryRouteDeclarations(storiesRoot);

validateContractShape(contract);
validateRedirects(contract.redirects ?? [], hostingConfig);
validateRoutes(contract.routes ?? [], routeStoryDeclarations);
validateGeneratedListingFamilies(contract.routes ?? [], hostListings);
validateMarketingNotFoundHosting(contract.routes ?? [], hostingConfig);

if (errors.length > 0) {
  console.error("Website route contract check failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

if (args.summary || warnings.length > 0) {
  for (const warning of warnings) console.warn(`Warning: ${warning}`);
  console.log(
    [
      `Website route contract ok: ${contract.routes.length} route contract(s).`,
      `Generated organizer listings: ${hostListings.length}.`,
      `Contract: ${path.relative(fromRepo("."), routesPath)}`,
    ].join("\n")
  );
}

function validateContractShape(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    errors.push("routes.json must be a JSON object.");
    return;
  }
  if (value.$schema !== "./website.routes.schema.json") {
    errors.push("routes.json must reference ./website.routes.schema.json.");
  }
  if (!fs.existsSync(schemaPath)) {
    errors.push("missing design/website/website.routes.schema.json.");
  }
  if (!Number.isInteger(value.version) || value.version < 1) {
    errors.push("routes.json version must be a positive integer.");
  }
  if (value.owner !== "marketing_website") {
    errors.push("routes.json owner must be marketing_website.");
  }
  if (!Array.isArray(value.routes) || value.routes.length === 0) {
    errors.push("routes.json must declare at least one route.");
  }
  if (!Array.isArray(value.redirects)) {
    errors.push("routes.json must declare redirects as an array.");
  }
  for (const key of ["metadataContent", "metadataSchema", "hostingConfig"]) {
    const sourcePath = value.sourceOfTruth?.[key];
    if (typeof sourcePath !== "string" || sourcePath.length === 0) {
      errors.push(`routes.json sourceOfTruth.${key} must name a repo-relative file.`);
    } else if (!fs.existsSync(fromRepo(sourcePath))) {
      errors.push(`routes.json sourceOfTruth.${key} does not exist: ${sourcePath}.`);
    }
  }
  if (metaSchemaPath && !fs.existsSync(metaSchemaPath)) {
    errors.push("missing website metadata JSON schema.");
  }
  if (!pageMetaSource.includes('../content/meta.json')) {
    errors.push("pageMeta.ts must read website/src/content/meta.json.");
  }
  if (!pageMetaSource.includes("validatedWebsiteMeta(metaContent)")) {
    errors.push("pageMeta.ts must runtime-validate the shared metadata content.");
  }
  if (!postbuildSource.includes("readWebsiteMeta")) {
    errors.push("postbuild.mjs must read the validated website metadata content source.");
  }
}

function validateRoutes(routes, storyDeclarations) {
  const ids = new Set();
  const exactPaths = new Set();
  const routeById = new Map();
  const storyDeclarationsByRouteId = groupStoryRouteDeclarations(storyDeclarations);
  const requiredRouteIds = new Set([
    "home",
    "visitor_discovery",
    "host",
    "event_runtime",
    "event_rehearsal",
    "sales_demo",
    "event_assistance",
    "event_offer",
    "event_booking",
    "event_invite",
    "household_rsvp",
    "public_form",
    "organizer_search",
    "claim",
    "privacy",
    "terms",
    "help",
    "account_deletion",
    "refunds",
    "contact",
    "not_found",
    "organizer_listing_canonical",
    "organizer_listing_legacy",
    "event_detail_canonical",
  ]);

  for (const route of routes) {
    validateRoute(route, storyDeclarationsByRouteId.get(route.id) ?? []);
    if (!route?.id) continue;
    if (ids.has(route.id)) errors.push(`${route.id}: duplicate route id.`);
    ids.add(route.id);
    routeById.set(route.id, route);
    if (route.path) {
      const normalized = normalizeRoutePath(route.path);
      if (exactPaths.has(normalized)) {
        errors.push(`${route.id}: duplicate route path ${normalized}.`);
      }
      exactPaths.add(normalized);
    }
  }

  for (const id of requiredRouteIds) {
    if (!ids.has(id)) errors.push(`missing required route contract ${id}.`);
  }

  validateStoryRouteDeclarations(storyDeclarations, routeById);
}

function validateRoute(route, storyDeclarations) {
  if (!route || typeof route !== "object" || Array.isArray(route)) {
    errors.push("route entries must be objects.");
    return;
  }
  const label = route.id ?? "<missing-id>";
  const allowedKinds = new Set(["static", "clientDynamic", "generatedFamily"]);
  const allowedOutputs = new Set(["postbuild", "generated-postbuild", "spa-rewrite"]);
  const allowedIndexing = new Set([
    "index",
    "noindex-follow",
    "listing-controlled",
    "event-controlled",
  ]);
  const allowedSitemap = new Set([
    "included",
    "excluded",
    "listing-controlled",
    "event-controlled",
  ]);

  if (!route.id) errors.push("route missing id.");
  if (!allowedKinds.has(route.kind)) errors.push(`${label}: invalid kind ${route.kind}.`);
  if (!allowedOutputs.has(route.staticOutput)) {
    errors.push(`${label}: invalid staticOutput ${route.staticOutput}.`);
  }
  if (!allowedIndexing.has(route.indexing)) {
    errors.push(`${label}: invalid indexing ${route.indexing}.`);
  }
  if (!allowedSitemap.has(route.sitemap)) {
    errors.push(`${label}: invalid sitemap ${route.sitemap}.`);
  }
  const expectedHttpStatus = route.id === "not_found" ? 404 : 200;
  if ((route.httpStatus ?? 200) !== expectedHttpStatus) {
    errors.push(`${label}: httpStatus must be ${expectedHttpStatus}.`);
  }

  if (route.kind === "generatedFamily") {
    if (!route.pathPattern && !Array.isArray(route.pathPatterns)) {
      errors.push(`${label}: generated route needs pathPattern or pathPatterns.`);
    }
    if (route.path) errors.push(`${label}: generated route should not declare exact path.`);
  } else if (!route.path && !route.pathPattern) {
    errors.push(`${label}: route needs path or pathPattern.`);
  }

  if (route.path) {
    route.path = normalizeRoutePath(route.path);
  }

  if (!route.source || !fs.existsSync(fromRepo(route.source))) {
    errors.push(`${label}: source file does not exist: ${route.source}.`);
  }
  validatePageKey(route);
  validateMeta(route);
  validateStaticOutput(route);
  validateReview(route, storyDeclarations);
}

function validateMarketingNotFoundHosting(routes, config) {
  const notFoundRoute = routes.find((route) => route.id === "not_found");
  if (!notFoundRoute || notFoundRoute.httpStatus !== 404) {
    errors.push("not_found: route contract must declare httpStatus 404.");
  }
  for (const error of marketingNotFoundHostingErrors(config)) {
    errors.push(`not_found: ${error}`);
  }
}

function marketingNotFoundHostingErrors(config) {
  const findings = [];
  const targets = Array.isArray(config?.hosting) ? config.hosting : [];
  const marketing = targets.find((target) => target?.target === "marketing");
  if (!marketing) {
    return ["firebase.json must declare the marketing Hosting target."];
  }
  if (marketing.public !== "website/dist") {
    findings.push("marketing Hosting public directory must be website/dist.");
  }
  const rewrites = Array.isArray(marketing.rewrites) ? marketing.rewrites : [];
  const catchAll = rewrites.find((rewrite) => rewrite?.source === "**");
  if (catchAll) {
    findings.push(
      "marketing Hosting must not use a ** rewrite; it bypasses the generated custom 404.html response."
    );
  }
  return findings;
}

function validatePageKey(route) {
  const allowedPageKeys = new Set([
    "home",
    "visitor_discovery",
    "host",
    "organizers",
    "listing",
    "event_detail",
    "event_runtime",
    "event_rehearsal",
    "sales_demo",
    "event_assistance",
    "event_offer",
    "event_booking",
    "event_invite",
    "household_rsvp",
    "public_form",
    "claim",
    "privacy",
    "terms",
    "help",
    "account_deletion",
    "refunds",
    "contact",
    "not_found",
  ]);
  if (!allowedPageKeys.has(route.pageKey)) {
    errors.push(`${route.id}: invalid pageKey ${route.pageKey}.`);
    return;
  }
  if (route.pageKey === "listing") {
    if (!appRoutingSource.includes("getHostListingRouteForPath")) {
      errors.push(`${route.id}: App.tsx must resolve generated listing routes first.`);
    }
    return;
  }
  if (route.pageKey === "event_detail") {
    if (!appRoutingSource.includes("getEventDetailForPath")) {
      errors.push(`${route.id}: App.tsx must resolve generated event routes first.`);
    }
    if (!appRoutingSource.includes("marketingRoutePaths.event_detail")) {
      errors.push(`${route.id}: App.tsx must render the event detail route.`);
    }
    return;
  }

  const routePath = route.path ?? route.pathPattern ?? "";
  const expectedChecks = {
    claim: "pathname.startsWith(\"/claim\")",
    privacy: "pathname.startsWith(\"/privacy\")",
    terms: "pathname.startsWith(\"/terms\")",
    help: "pathname.startsWith(\"/help\")",
    account_deletion: "pathname.startsWith(\"/delete-account\")",
    refunds: "pathname.startsWith(\"/refunds\")",
    contact: "pathname.startsWith(\"/contact\")",
    host: '["/host", "/host/", "/host/apply", "/host/apply/"].includes(pathname)',
    event_runtime: "pathname.startsWith(\"/join/\")",
    sales_demo: "pathname.startsWith(\"/demo/\")",
    event_assistance: "pathname.startsWith(\"/event-update/\")",
    event_rehearsal: "pathname.startsWith(\"/rehearse/\")",
    organizers: "pathname.startsWith(\"/organizers\")",
  };
  const expected = expectedChecks[route.pageKey];
  if (expected && !pageMetaSource.includes(expected)) {
    errors.push(`${route.id}: getPageKey does not contain ${expected}.`);
  }
  if (route.pageKey === "home" && routePath !== "/") {
    errors.push(`${route.id}: home pageKey should be reserved for /.`);
  }
  if (route.pageKey === "not_found") {
    if (route.id !== "not_found") {
      errors.push(`${route.id}: not_found pageKey is reserved for not_found.`);
    }
    if (!pageMetaSource.includes('return "not_found"')) {
      errors.push("not_found: getPageKey must return not_found for unknown paths.");
    }
    if (!appRoutingSource.includes("marketingRoutePaths.not_found")) {
      errors.push("not_found: App.tsx must route unknown paths through marketingRoutePaths.not_found.");
    }
    if (!appRoutingSource.includes("<NotFoundPage />")) {
      errors.push("not_found: App.tsx must render NotFoundPage for fallback routes.");
    }
  }
}

function validateRedirects(redirects, config) {
  errors.push(...redirectValidationErrors(redirects, config));
}

function redirectValidationErrors(redirects, config) {
  const errors = [];
  if (!Array.isArray(redirects)) return errors;
  const targets = Array.isArray(config?.hosting) ? config.hosting : [];
  const marketing = targets.find((target) => target?.target === "marketing");
  const hostingRedirects = Array.isArray(marketing?.redirects) ? marketing.redirects : [];
  const contractBySource = new Map();

  for (const redirect of redirects) {
    const label = redirect?.source ?? "<missing-source>";
    if (!redirect || typeof redirect !== "object" || Array.isArray(redirect)) {
      errors.push("redirect entries must be objects.");
      continue;
    }
    if (typeof redirect.source !== "string" || redirect.source.length === 0) {
      errors.push("redirect missing source.");
      continue;
    }
    if (contractBySource.has(redirect.source)) {
      errors.push(`${label}: duplicate redirect source.`);
    }
    contractBySource.set(redirect.source, redirect);
    if (typeof redirect.destination !== "string" || redirect.destination.length === 0) {
      errors.push(`${label}: redirect missing destination.`);
    }
    if (![301, 302].includes(redirect.status)) {
      errors.push(`${label}: redirect status must be 301 or 302.`);
    }
    if (redirect.preserveQuery !== true) {
      errors.push(`${label}: redirect must explicitly preserve query parameters.`);
    }
  }

  if (!marketing) {
    errors.push("redirects: firebase.json must declare the marketing Hosting target.");
    return errors;
  }

  const hostingBySource = new Map(hostingRedirects.map((redirect) => [redirect.source, redirect]));
  for (const [source, redirect] of contractBySource) {
    const hostingRedirect = hostingBySource.get(source);
    if (!hostingRedirect) {
      errors.push(`${source}: missing matching Firebase Hosting redirect.`);
      continue;
    }
    if (hostingRedirect.destination !== redirect.destination) {
      errors.push(`${source}: Firebase destination must be ${redirect.destination}.`);
    }
    if (hostingRedirect.type !== redirect.status) {
      errors.push(`${source}: Firebase redirect type must be ${redirect.status}.`);
    }
  }
  for (const source of hostingBySource.keys()) {
    if (!contractBySource.has(source)) {
      errors.push(`${source}: Firebase marketing redirect is missing from routes.json.`);
    }
  }
  return errors;
}

function validateMeta(route) {
  if (route.metaKey) {
    const meta = websiteMeta?.routes?.[route.metaKey];
    if (!meta) {
      errors.push(`${route.id}: metadata content missing key ${route.metaKey}.`);
      return;
    }
    if (route.path && route.staticOutput === "postbuild") {
      if (meta.canonicalPath !== route.path) {
        errors.push(
          `${route.id}: metadata ${route.metaKey} canonicalPath must be ${route.path}.`
        );
      }
    }
    if (route.indexing === "noindex-follow" && meta.robots !== "noindex, follow") {
      errors.push(`${route.id}: metadata ${route.metaKey} must declare noindex, follow.`);
    }
    if (route.indexing === "index" && meta.robots !== undefined) {
      warnings.push(`${route.id}: index route has explicit robots metadata.`);
    }
  }

  if (route.metaFactory && !pageMetaSource.includes(`function ${route.metaFactory}`)) {
    errors.push(`${route.id}: missing meta factory ${route.metaFactory}.`);
  }
  if (route.id === "organizer_listing_legacy" && !pageMetaSource.includes("noindexOverride")) {
    errors.push("organizer_listing_legacy: pageMetaForListing must accept noindexOverride.");
  }
}

function validateStaticOutput(route) {
  if (route.staticOutput === "postbuild") {
    const needle = `writeRoute("${route.path}"`;
    if (!postbuildSource.includes(needle)) {
      errors.push(`${route.id}: postbuild.mjs does not emit ${route.path}.`);
    }
    if (route.id === "not_found" && !postbuildSource.includes('writeStaticHtml("404.html"')) {
      errors.push("not_found: postbuild.mjs must emit root 404.html.");
    }
  }
  if (route.staticOutput === "generated-postbuild") {
    if (route.id === "organizer_listing_canonical" &&
        !postbuildSource.includes("writeRoute(listing.path")) {
      errors.push("organizer_listing_canonical: postbuild must emit listing.path.");
    }
    if (route.id === "organizer_listing_legacy") {
      if (!postbuildSource.includes("for (const legacyPath of listing.legacyPaths")) {
        errors.push("organizer_listing_legacy: postbuild must iterate listing.legacyPaths.");
      }
      if (!postbuildSource.includes('robots: "noindex, follow"')) {
        errors.push("organizer_listing_legacy: postbuild must force noindex, follow.");
      }
    }
    if (route.id === "event_detail_canonical") {
      if (!postbuildSource.includes("for (const event of publicEvents)")) {
        errors.push("event_detail_canonical: postbuild must iterate publicEvents.");
      }
      if (!postbuildSource.includes("writeRoute(event.path")) {
        errors.push("event_detail_canonical: postbuild must emit event.path.");
      }
      if (!postbuildSource.includes("buildEventStructuredData")) {
        errors.push("event_detail_canonical: postbuild must emit Event structured data.");
      }
    }
  }
  if (route.staticOutput === "spa-rewrite") {
    if (route.sitemap !== "excluded") {
      errors.push(`${route.id}: SPA rewrite routes must be excluded from sitemap until static output exists.`);
    }
    for (const finding of spaRewriteHostingErrors(route, hostingConfig, postbuildSource)) {
      errors.push(`${route.id}: ${finding}`);
    }
  }
}

function spaRewriteHostingErrors(route, config, generatedRouteSource) {
  const findings = [];
  const pathPattern = String(route?.pathPattern ?? "");
  const routeRoot = pathPattern.replace(/:[^/]+\/$/u, "");
  if (!routeRoot || routeRoot === pathPattern || !routeRoot.endsWith("/")) {
    return ["SPA rewrite pathPattern must end with one dynamic segment and a trailing slash."];
  }

  if (!generatedRouteSource.includes(`writeRoute("${routeRoot}"`)) {
    findings.push(`postbuild.mjs must emit the ${routeRoot} entrypoint.`);
  }

  const targets = Array.isArray(config?.hosting) ? config.hosting : [];
  const marketing = targets.find((target) => target?.target === "marketing");
  if (!marketing) {
    findings.push("firebase.json must declare the marketing Hosting target.");
    return findings;
  }

  const expectedSource = `${routeRoot}**`;
  const expectedDestination = `${routeRoot}index.html`;
  const rewrites = Array.isArray(marketing.rewrites) ? marketing.rewrites : [];
  const matchingRewrite = rewrites.find((rewrite) => rewrite?.source === expectedSource);
  if (!matchingRewrite) {
    findings.push(`firebase.json must rewrite ${expectedSource} to ${expectedDestination}.`);
  } else if (matchingRewrite.destination !== expectedDestination) {
    findings.push(
      `firebase.json rewrite ${expectedSource} must target ${expectedDestination}.`
    );
  }
  return findings;
}

function validateReview(route, storyDeclarations) {
  const review = route.review;
  const label = route.id ?? "<missing-id>";
  if (!review || typeof review !== "object") {
    errors.push(`${label}: missing review contract.`);
    return;
  }
  if (!["p0", "p1", "p2"].includes(review.priority)) {
    errors.push(`${label}: invalid review priority.`);
  }
  if (!["planned", "manual", "captured", "ready", "excluded"].includes(review.status)) {
    errors.push(`${label}: invalid review status.`);
  }
  if (!Array.isArray(review.states) || review.states.length === 0) {
    errors.push(`${label}: review.states must list at least one state.`);
  }
  validateReviewStateCoverage(label, review, storyDeclarations);
  if (review.priority !== "p2") {
    for (const viewport of ["desktop", "mobile"]) {
      if (!review.viewports?.includes(viewport) && route.id !== "organizer_listing_legacy") {
        errors.push(`${label}: p0/p1 route review must include ${viewport} viewport.`);
      }
    }
  }
  if (review.status === "ready" && review.stateCoverage.storybook.length === 0) {
    errors.push(`${label}: ready route review needs at least one Storybook-backed state.`);
  }
  if (review.status === "manual" && review.stateCoverage.manual.length === 0) {
    errors.push(`${label}: manual route review needs at least one manual state.`);
  }
}

function validateReviewStateCoverage(label, review, storyDeclarations) {
  const coverage = review.stateCoverage;
  if (!coverage || typeof coverage !== "object" || Array.isArray(coverage)) {
    errors.push(`${label}: review.stateCoverage must declare storybook and manual states.`);
    return;
  }
  if (!Array.isArray(coverage.storybook)) {
    errors.push(`${label}: review.stateCoverage.storybook must be an array.`);
    return;
  }
  if (!Array.isArray(coverage.manual)) {
    errors.push(`${label}: review.stateCoverage.manual must be an array.`);
    return;
  }

  const states = new Set(review.states ?? []);
  const covered = new Set([...coverage.storybook, ...coverage.manual]);
  for (const state of states) {
    if (covered.has(state)) continue;
    errors.push(`${label}: review state ${state} must be storybook-backed or manual.`);
  }
  for (const state of covered) {
    if (states.has(state)) continue;
    errors.push(`${label}: stateCoverage references unknown state ${state}.`);
  }

  const storybookStates = new Set(
    storyDeclarations.flatMap((declaration) => declaration.stateCoverage.storybook)
  );
  for (const state of coverage.storybook) {
    if (storybookStates.has(state)) continue;
    errors.push(`${label}: Storybook coverage state ${state} is not declared by a catchRoute story.`);
  }
}

function validateGeneratedListingFamilies(routes, listings) {
  const canonical = routes.find((route) => route.id === "organizer_listing_canonical");
  const legacy = routes.find((route) => route.id === "organizer_listing_legacy");
  if (!canonical || !legacy) return;
  if (!Array.isArray(listings)) {
    errors.push("hostListings.json must be an array.");
    return;
  }
  if (!routingSource.includes("legacyPaths?.includes(normalizedPath)")) {
    errors.push("routing.ts must preserve legacy path resolution.");
  }

  const paths = new Set();
  for (const listing of listings) {
    if (!listing?.id) errors.push("host listing missing id.");
    if (!listingMatchesLiveMarket(listing)) {
      errors.push(
        `${listing?.id ?? "unknown"}: organizer listing market ` +
        `${listing?.citySlug ?? listing?.city ?? "missing"} is not live in the active market pack.`
      );
    }
    if (!listing?.path) {
      errors.push(`${listing?.id ?? "unknown"}: listing missing canonical path.`);
      continue;
    }
    const listingPath = normalizeRoutePath(listing.path);
    if (paths.has(listingPath)) errors.push(`${listing.id}: duplicate listing route ${listingPath}.`);
    paths.add(listingPath);
    const canonicalPatterns = routePatterns(canonical);
    if (!canonicalPatterns.some((pattern) => matchesRoutePattern(listingPath, pattern))) {
      errors.push(`${listing.id}: ${listingPath} is not covered by ${canonicalPatterns.join(" or ")}.`);
    }
    if (!["index, follow", "noindex, follow"].includes(listing.indexing)) {
      errors.push(`${listing.id}: unsupported listing indexing ${listing.indexing}.`);
    }
    for (const legacyPath of listing.legacyPaths ?? []) {
      const normalizedLegacyPath = normalizeRoutePath(legacyPath);
      if (normalizedLegacyPath === listingPath) {
        errors.push(`${listing.id}: legacy path duplicates canonical path ${listingPath}.`);
      }
      if (paths.has(normalizedLegacyPath)) {
        errors.push(`${listing.id}: duplicate listing or legacy route ${normalizedLegacyPath}.`);
      }
      paths.add(normalizedLegacyPath);
    }
  }
}

function normalizeMarketKey(value) {
  return String(value ?? "").toLowerCase().replace(/[^a-z0-9]+/gu, "");
}

function listingMatchesLiveMarket(listing) {
  return [listing?.citySlug, listing?.city]
    .map(normalizeMarketKey)
    .some((key) => key.length > 0 && liveMarketKeys.has(key));
}

function validateStoryRouteDeclarations(declarations, routeById) {
  for (const declaration of declarations) {
    const storyLabel = `${path.relative(fromRepo("."), declaration.storyPath)}:${declaration.exportName}`;
    const route = routeById.get(declaration.id);
    if (!route) {
      errors.push(`${storyLabel}: declares unknown catchRoute.id ${declaration.id}.`);
      continue;
    }

    if (declaration.path && route.path &&
        normalizeRoutePath(declaration.path) !== route.path) {
      errors.push(
        `${storyLabel}: catchRoute.path ${declaration.path} does not match ${route.path}.`
      );
    }

    assertSameStringSet(
      `${storyLabel}: catchRoute.reviewStates`,
      declaration.reviewStates,
      route.review.states
    );
    assertSameStringSet(
      `${storyLabel}: catchRoute.stateCoverage.storybook`,
      declaration.stateCoverage.storybook,
      route.review.stateCoverage.storybook
    );
    assertSameStringSet(
      `${storyLabel}: catchRoute.stateCoverage.manual`,
      declaration.stateCoverage.manual,
      route.review.stateCoverage.manual
    );
  }
}

function assertSameStringSet(label, actual, expected) {
  const actualSet = new Set(actual);
  const expectedSet = new Set(expected);
  for (const value of expectedSet) {
    if (actualSet.has(value)) continue;
    errors.push(`${label} is missing ${value}.`);
  }
  for (const value of actualSet) {
    if (expectedSet.has(value)) continue;
    errors.push(`${label} declares unknown ${value}.`);
  }
}

function groupStoryRouteDeclarations(declarations) {
  const grouped = new Map();
  for (const declaration of declarations) {
    const bucket = grouped.get(declaration.id) ?? [];
    bucket.push(declaration);
    grouped.set(declaration.id, bucket);
  }
  return grouped;
}

function collectStoryRouteDeclarations(root) {
  const declarations = [];
  for (const storyPath of walkStoryFiles(root)) {
    const source = readText(storyPath);
    declarations.push(...storyRouteDeclarations(source, storyPath));
  }
  return declarations;
}

function storyRouteDeclarations(source, storyPath) {
  const declarations = [];
  const constants = stringArrayConstants(source);
  const exportPattern = /^export\s+const\s+([A-Za-z0-9_]+)\b/gmu;
  const matches = [...source.matchAll(exportPattern)];

  for (let index = 0; index < matches.length; index += 1) {
    const match = matches[index];
    const exportName = match[1];
    const start = match.index ?? 0;
    const end = matches[index + 1]?.index ?? source.length;
    const block = source.slice(start, end);
    if (!block.includes("catchRoute")) continue;

    const catchRouteIndex = block.indexOf("catchRoute");
    const catchComponentIndex = block.indexOf("catchComponent", catchRouteIndex);
    const catchRouteBlock = block.slice(
      catchRouteIndex,
      catchComponentIndex >= 0 ? catchComponentIndex : undefined
    );
    const id = firstStringProperty(catchRouteBlock, "id");
    if (!id) continue;

    declarations.push({
      exportName,
      id,
      path: firstStringProperty(catchRouteBlock, "path"),
      reviewStates: stringArrayProperty(catchRouteBlock, "reviewStates", constants),
      stateCoverage: {
        storybook: stringArrayProperty(catchRouteBlock, "storybook", constants),
        manual: stringArrayProperty(catchRouteBlock, "manual", constants),
      },
      storyPath,
    });
  }

  return declarations;
}

function matchesRoutePattern(routePath, pattern) {
  if (!pattern || !pattern.startsWith("/")) return true;
  const normalizedPattern = normalizeRoutePath(pattern);
  const regex = new RegExp(
    `^${escapeRegExp(normalizedPattern).replace(/:([A-Za-z0-9_]+)/gu, "[^/]+")}$`,
    "u"
  );
  return regex.test(routePath);
}

function routePatterns(route) {
  if (Array.isArray(route.pathPatterns)) return route.pathPatterns;
  if (route.pathPattern) return [route.pathPattern];
  return [];
}

function normalizeRoutePath(value) {
  if (value === "/") return "/";
  return `/${String(value).replace(/^\/+|\/+$/g, "")}/`;
}

function readJson(filePath, label) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    throw new Error(`Unable to read ${label} at ${filePath}: ${error.message}`);
  }
}

function readText(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function walkStoryFiles(directory) {
  const files = [];
  if (!fs.existsSync(directory)) return files;
  for (const entry of fs.readdirSync(directory, {withFileTypes: true})) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkStoryFiles(fullPath));
      continue;
    }
    if (entry.name.endsWith(".stories.tsx")) files.push(fullPath);
  }
  return files;
}

function stringArrayConstants(source) {
  const constants = new Map();
  const constPattern =
    /const\s+([A-Za-z0-9_]+)\s*=\s*\[([\s\S]*?)\]\s*(?:as\s+const)?\s*;/gu;
  for (const match of source.matchAll(constPattern)) {
    constants.set(match[1], stringValues(match[2]));
  }
  return constants;
}

function firstStringProperty(source, propertyName) {
  const pattern = new RegExp(`${escapeRegExp(propertyName)}:\\s*"([^"]+)"`, "u");
  return source.match(pattern)?.[1] ?? null;
}

function stringArrayProperty(source, propertyName, constants) {
  const inlinePattern = new RegExp(
    `${escapeRegExp(propertyName)}:\\s*\\[([\\s\\S]*?)\\]`,
    "u"
  );
  const inline = source.match(inlinePattern);
  if (inline) return stringValues(inline[1]);

  const referencePattern = new RegExp(
    `${escapeRegExp(propertyName)}:\\s*([A-Za-z0-9_]+)`,
    "u"
  );
  const reference = source.match(referencePattern)?.[1] ?? null;
  return reference ? constants.get(reference) ?? [] : [];
}

function stringValues(source) {
  return [...source.matchAll(/"([^"]+)"/gu)].map((match) => match[1]);
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function parseArgs(argv) {
  const parsed = {help: false, routes: null, selfTest: false, summary: false};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") parsed.help = true;
    else if (arg === "--self-test") parsed.selfTest = true;
    else if (arg === "--summary") parsed.summary = true;
    else if (arg === "--check") {
      // Default mode; accepted for parity with other repo checkers.
    } else if (arg === "--routes") parsed.routes = requiredValue(argv, ++index, arg);
    else fail(`Unknown argument: ${arg}`);
  }
  return parsed;
}

function requiredValue(argv, index, flag) {
  const value = argv[index];
  if (!value || value.startsWith("--")) fail(`${flag} requires a value.`);
  return value;
}

function printHelp() {
  console.log(`Usage: node tool/marketing/check_website_routes.mjs [--check] [--summary] [--self-test]

Validates design/website/routes.json against the marketing website route,
metadata, postbuild, generated organizer-listing sources, and route Storybook
coverage declarations.
`);
}

function runSelfTest() {
  assert.equal(listingMatchesLiveMarket({city: "Indore", citySlug: "indore"}), true);
  assert.equal(listingMatchesLiveMarket({city: "Delhi NCR", citySlug: "delhi-ncr"}), false);
  const storyPath = fromRepo("website/src/stories/Example.stories.tsx");
  const declarations = storyRouteDeclarations(`
const searchStates = ["default", "filtered"] as const;

export const OrganizerSearch = {
  parameters: {
    catchRoute: {
      id: "organizer_search",
      path: "/organizers/",
      reviewStates: searchStates,
      stateCoverage: {
        storybook: ["default"],
        manual: ["filtered"],
      },
    },
    catchComponent: {
      id: "route_organizer_search",
      routeIds: ["organizer_search"],
      states: searchStates,
    },
  },
};
`, storyPath);
  assert.deepEqual(declarations, [
    {
      exportName: "OrganizerSearch",
      id: "organizer_search",
      path: "/organizers/",
      reviewStates: ["default", "filtered"],
      stateCoverage: {
        storybook: ["default"],
        manual: ["filtered"],
      },
      storyPath,
    },
  ]);
  const validMeta = {
    $schema: "./meta.schema.json",
    routes: Object.fromEntries(
      [
        "home",
    "visitor_discovery",
        "host",
        "host_apply",
        "public_form",
        "event_runtime",
        "event_rehearsal",
        "sales_demo",
    "event_assistance",
    "event_offer",
    "event_booking",
        "event_invite",
    "household_rsvp",
        "organizers",
        "claim",
        "privacy",
        "terms",
        "help",
        "account_deletion",
        "refunds",
        "contact",
        "not_found",
      ].map((key) => [
        key,
        {
          title: `${key} title`,
          description: `${key} description`,
          canonicalPath: key === "home" ? "/" : `/${key}/`,
          twitterDescription: `${key} social description`,
        },
      ])
    ),
    listing: {
      titleTemplate: "{name} | {city} organizer profile | Catch",
      staticLabels: {
        profileEyebrow: "Organizer profile",
        formatsHeading: "Formats",
        factsHeading: "Profile facts",
        sourcesHeading: "Public sources",
        lastVerifiedPrefix: "Last verified",
        notRecorded: "not recorded",
        homeBreadcrumb: "Catch",
        organizersBreadcrumb: "Organizers",
      },
    },
    event: {
      titleTemplate: "{title} | {city} | Catch",
      catchTwitterTemplate: "{title} by {organizer}. Booking stays in the Catch app.",
      externalTwitterTemplate:
        "{title} from {source}. Registration stays on the official source.",
      staticLabels: {
        eventEyebrow: "Event details",
        hostedByPrefix: "Hosted by",
        scheduleHeading: "Schedule and location",
        locationLabel: "Location",
        priceLabel: "Price",
        sourceLabel: "Source",
        reviewsHeading: "Event reviews",
        lastReviewedPrefix: "Listing sources last reviewed",
        homeBreadcrumb: "Catch",
        organizersBreadcrumb: "Organizers",
      },
    },
  };
  assert.deepEqual(validateWebsiteMeta(validMeta), []);
  assert.match(
    validateWebsiteMeta({
      ...validMeta,
      routes: Object.fromEntries(
        Object.entries(validMeta.routes).filter(([key]) => key !== "host_apply")
      ),
    }).join("\n"),
    /routes is missing host_apply/u
  );
  assert.match(
    validateWebsiteMeta({
      ...validMeta,
      listing: {...validMeta.listing, titleTemplate: "{name} profile"},
    }).join("\n"),
    /must contain \{city\}/u
  );
  assert.equal(
    formatContentTemplate(validMeta.listing.titleTemplate, {
      name: "AFTER FLY",
      city: "Indore",
    }),
    "AFTER FLY | Indore organizer profile | Catch"
  );
  assert.throws(
    () => formatContentTemplate("{name} in {market}", {name: "Catch"}),
    /Invalid content template values \(missing: market\)/u
  );
  assert.deepEqual(
    marketingNotFoundHostingErrors({
      hosting: [{target: "marketing", public: "website/dist", rewrites: []}],
    }),
    []
  );
  assert.match(
    marketingNotFoundHostingErrors({
      hosting: [{
        target: "marketing",
        public: "website/dist",
        rewrites: [{source: "**", destination: "/index.html"}],
      }],
    }).join("\n"),
    /must not use a \*\* rewrite/u
  );
  const publicFormRoute = {
    id: "public_form",
    pathPattern: "/f/:publicFormId/",
    staticOutput: "spa-rewrite",
    sitemap: "excluded",
  };
  assert.deepEqual(
    spaRewriteHostingErrors(
      publicFormRoute,
      {
        hosting: [{
          target: "marketing",
          rewrites: [{source: "/f/**", destination: "/f/index.html"}],
        }],
      },
      'writeRoute("/f/", metadata);'
    ),
    []
  );
  assert.match(
    spaRewriteHostingErrors(
      publicFormRoute,
      {hosting: [{target: "marketing", rewrites: []}]},
      'writeRoute("/f/", metadata);'
    ).join("\n"),
    /must rewrite \/f\/\*\* to \/f\/index\.html/u
  );
  assert.match(
    spaRewriteHostingErrors(
      publicFormRoute,
      {
        hosting: [{
          target: "marketing",
          rewrites: [{source: "/f/**", destination: "/f/index.html"}],
        }],
      },
      ""
    ).join("\n"),
    /must emit the \/f\/ entrypoint/u
  );
  const redirects = [
    {source: "/host/preview", destination: "/host/", status: 301, preserveQuery: true},
    {source: "/host/preview/**", destination: "/host/", status: 301, preserveQuery: true},
  ];
  const redirectHosting = {
    hosting: [{
      target: "marketing",
      redirects: redirects.map(({source, destination, status}) => ({
        source,
        destination,
        type: status,
      })),
    }],
  };
  assert.deepEqual(redirectValidationErrors(redirects, redirectHosting), []);
  assert.match(
    redirectValidationErrors(
      [{...redirects[0], preserveQuery: false}, redirects[1]],
      redirectHosting
    ).join("\n"),
    /explicitly preserve query parameters/u
  );
  assert.match(
    redirectValidationErrors(redirects, {
      hosting: [{target: "marketing", redirects: redirectHosting.hosting[0].redirects.slice(0, 1)}],
    }).join("\n"),
    /\/host\/preview\/\*\*: missing matching Firebase Hosting redirect/u
  );
  console.log("Website route checker self-test passed.");
}

function fail(message) {
  console.error(message);
  process.exit(64);
}
