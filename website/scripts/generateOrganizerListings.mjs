import {projectExternalEventDocument, timestampIso, validTimezone, eventDateLabelForTimezone, platformLabel, titleCaseText} from "./next/externalEventProjection.mjs";
import {listingFromFirestoreOrganizer, listingFromOrganizerDocument, organizerAuthority, enumValue, staticPublicApi, disabledPublicApi, organizerTypeLabel, canonicalOrganizerType, initialsForName, publicReviewsForListing, dateLabel, publicOwnerResponse, publicSourcesForListing, listingCapabilities, claimCapabilityReason, searchText} from "./next/organizerProjection.mjs";
export {listingFromFirestoreOrganizer} from "./next/organizerProjection.mjs";
import crypto from "node:crypto";
import fs from "node:fs";
import {createRequire} from "node:module";
import path from "node:path";
import {fileURLToPath, pathToFileURL} from "node:url";
import {
  buildOrganizerListingReadinessReceipt,
} from "./organizerListingReadiness.mjs";
import {
  schemaErrorMessages,
  validateWebsiteHostListingProjection,
} from "../../tool/contracts/generated/schema_contract_validators.mjs";
import {
  civilInstant,
  eventStateAt,
  personaForPerson,
  validateDemoWorld,
} from "../../tool/demo/lib/demo_world.mjs";
import {marketForIdOrAlias} from "../../tool/lib/location_markets.mjs";
import {inMarket} from "../src/content/markets/in.ts";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const websiteRoot = path.resolve(dirname, "..");
const repoRoot = path.resolve(websiteRoot, "..");
const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
const args = parseArgs(isMain ? process.argv.slice(2) : []);
if (args.readinessReceipt && !args.firestoreProject) {
  fail("--readiness-receipt requires a current --firestore-project snapshot.");
}
if (args.firestoreProject && (args.claimTargetReadinessReceipt ||
    process.env.ORGANIZER_CLAIM_TARGET_RECEIPT)) {
  fail("Firestore-native materialization cannot consume a legacy plan readiness receipt.");
}
if (args.help) {
  printHelp();
  process.exit(0);
}

const intakeProjectionPath = path.resolve(args.projectionPlan ?? path.join(
  repoRoot,
  "tool",
  "organizer_intake",
  "generated",
  "public_projection_plan.json"
));
const externalEventReadinessPath = path.resolve(
  args.externalEventReadiness ?? path.join(
    repoRoot,
    "tool",
    "organizer_intake",
    "generated",
    "external_event_import_execution_plan.json"
  )
);
const claimTargetSyncPreviewPath = path.resolve(
  args.claimTargetSyncPreview ?? path.join(
    repoRoot,
    "tool",
    "organizer_intake",
    "generated",
    "organizer_claim_target_sync_preview.json"
  )
);
const claimTargetPlanPath = path.resolve(
  args.claimTargetPlan ?? path.join(
    repoRoot,
    "tool",
    "organizer_intake",
    "generated",
    "organizer_claim_targets.json"
  )
);
const claimTargetReadinessReceiptPath =
  args.claimTargetReadinessReceipt ??
  process.env.ORGANIZER_CLAIM_TARGET_RECEIPT ??
  null;
const demoScenarioRoot = path.resolve(
  args.demoScenarioRoot ??
    path.join(repoRoot, "tool", "demo", "demo_seed", "scenarios")
);
// The New York host sales demo world, shown at the moment its story is set.
const demoListingWorlds = [{file: "us-nyc-host-demo.json", moment: "live"}];

const generatedPath = path.resolve(
  args.output ??
    path.join(websiteRoot, "src", "generated", "hostListings.json")
);
const checkOnly = args.check;
if (
  checkOnly &&
  !args.firestoreProject &&
  !args.projectionPlan &&
  !fs.existsSync(intakeProjectionPath)
) {
  validateExistingProjection(generatedPath, {includeDemo: args.includeDemo});
  process.exit(0);
}
const claimTargetSyncPreview = readJsonIfExists(claimTargetSyncPreviewPath);
const claimTargetReadinessReceipt = claimTargetReadinessReceiptPath ?
  readAndValidateClaimTargetReadinessReceipt(
    path.resolve(claimTargetReadinessReceiptPath)
  ) :
  null;
const firestoreWebsiteDocuments = args.firestoreProject ?
  await readFirestoreWebsiteDocuments(args.firestoreProject) :
  null;
const liveMarketKeys = new Set(
  inMarket.cities
    .filter((city) => city.status === "live")
    .flatMap((city) => [city.slug, city.label, ...city.aliases])
    .map(normalizeMarketKey)
);
const approvedIntakeProjections = organizerIntakeProjectionEntries();
const productionIntakeProjections = approvedIntakeProjections.filter(
  organizerIntakeProjectionHasLiveMarket
);
const firestoreListings = firestoreWebsiteDocuments ?
  firestoreWebsiteDocuments.organizers
    .filter(({id, data}) =>
      typeof data?.publicPage?.slug === "string" &&
      data.publicPage.slug.length > 0 &&
      (
        data.publicPage.publishStatus === "published" ||
        (args.includeDemo && data.publicPage.publishStatus === "qa")
      )
    )
    .map((document) => listingFromFirestoreOrganizer(document))
    .filter(Boolean)
    .filter((listing) => args.includeDemo || listingHasLiveMarket(listing)) :
  null;
const publicExternalEventsByHostId =
  publicExternalEventsByCanonicalHostId(readJsonIfExists(externalEventReadinessPath));
const listings = [
  ...(firestoreListings ?? (
    (args.includeDemo ? approvedIntakeProjections : productionIntakeProjections)
      .map((entry) => listingFromOrganizerIntakeProjection(entry, {
        liveMarketsOnly: !args.includeDemo,
      }))
  )),
  ...(args.includeDemo ? appCreatedDemoListings() : []),
]
  .map(withPublicExternalEvents)
  .sort((a, b) => compareText(a.name, b.name));
if (isMain) {
  validateListingProjections(listings);
  const renderedListings = `${JSON.stringify(listings, null, 2)}\n`;

  if (checkOnly) {
    if (!fs.existsSync(generatedPath)) {
      console.error(`Missing generated organizer listings: ${generatedPath}`);
      process.exit(1);
    }
    const currentListings = fs.readFileSync(generatedPath, "utf8");
    if (currentListings !== renderedListings) {
      console.error("website/src/generated/hostListings.json is stale.");
      console.error("Run: npm --workspace catch-marketing run generate:organizer-listings");
      process.exit(1);
    }
  } else {
    fs.mkdirSync(path.dirname(generatedPath), {recursive: true});
    fs.writeFileSync(generatedPath, renderedListings);
  }

  if (args.readinessReceipt) {
    const receipt = buildOrganizerListingReadinessReceipt({
      projectId: args.firestoreProject,
      documents: firestoreWebsiteDocuments.organizers,
      listings,
    });
    const receiptPath = path.resolve(args.readinessReceipt);
    fs.mkdirSync(path.dirname(receiptPath), {recursive: true});
    fs.writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);
  }
}

function organizerIntakeProjectionEntries() {
  if (!fs.existsSync(intakeProjectionPath)) return [];
  const projectionPlan = JSON.parse(fs.readFileSync(intakeProjectionPath, "utf8"));
  return (projectionPlan.entries ?? [])
    .filter((entry) =>
      entry?.projectionStatus === "ready" &&
      entry?.publicListing &&
      entry?.publishStatus === "published"
    )
    .sort((a, b) => compareText(a.entityId, b.entityId));
}

function readJsonIfExists(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function validateExistingProjection(filePath, {includeDemo}) {
  if (!fs.existsSync(filePath)) {
    fail(`Missing generated organizer listings: ${filePath}`);
  }
  const existing = JSON.parse(fs.readFileSync(filePath, "utf8"));
  validateListingProjections(existing);
  if (!includeDemo && existing.some((listing) => listing.catchEvents?.length)) {
    fail("Production organizer projection must not contain mutable Catch event snapshots.");
  }
  const containsDemo = existing.some((listing) =>
    listing.dataOrigin === "catchDemo"
  );
  if (includeDemo && !containsDemo) {
    fail("Demo organizer projection must include at least one Catch demo listing.");
  }
  if (!includeDemo && containsDemo) {
    fail("Production organizer projection must not include Catch demo listings.");
  }
  console.log(
    `Organizer listing projection is valid: ${existing.length} listing(s).`
  );
}

async function readFirestoreWebsiteDocuments(projectId) {
  const requireFromFunctions = createRequire(
    path.join(repoRoot, "functions", "package.json")
  );
  let admin;
  try {
    admin = requireFromFunctions("firebase-admin");
  } catch {
    fail(
      "Firestore organizer listing generation requires Functions dependencies. " +
      "Run: npm --prefix functions ci --omit=dev"
    );
  }
  const app = admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId,
  }, `website-organizer-listings-${process.pid}`);
  try {
    // Mutable Catch events are read live by the website, never exported.
    const organizers = await app.firestore().collection("organizers").get();
    return {organizers: organizers.docs
      .map((document) => ({id: document.id, path: document.ref.path, data: document.data()}))
      .sort((a, b) => compareText(a.id, b.id))};
  } finally {
    await app.delete();
  }
}

function readAndValidateClaimTargetReadinessReceipt(filePath) {
  const receipt = readJsonIfExists(filePath);
  if (!receipt) {
    fail(`Missing organizer claim-target readiness receipt: ${filePath}`);
  }
  if (receipt.schemaVersion !== 1 ||
      receipt.receiptType !== "organizer_claim_target_readiness") {
    fail(`Unsupported organizer claim-target readiness receipt: ${filePath}`);
  }
  if (receipt.mode?.source !== "firestore_read" ||
      receipt.mode?.remoteWrites !== 0) {
    fail("Organizer claim-target readiness must come from a read-only Firestore receipt.");
  }
  const receiptTime = Date.parse(receipt.generatedAt);
  const ageMs = Date.now() - receiptTime;
  if (!Number.isFinite(receiptTime) || ageMs < -5 * 60 * 1000 || ageMs > 24 * 60 * 60 * 1000) {
    fail("Organizer claim-target readiness receipt is stale or has an invalid timestamp.");
  }
  if (typeof receipt.projectId !== "string" || !receipt.projectId.trim()) {
    fail("Organizer claim-target readiness receipt project is missing.");
  }
  const expectedProjectId =
    process.env.ORGANIZER_CLAIM_TARGET_PROJECT_ID?.trim() || null;
  if (expectedProjectId && receipt.projectId !== expectedProjectId) {
    fail(
      `Organizer claim-target receipt project ${receipt.projectId ?? "missing"} ` +
        `does not match ${expectedProjectId}.`
    );
  }
  const planHash = crypto.createHash("sha256")
    .update(fs.readFileSync(claimTargetPlanPath))
    .digest("hex");
  if (receipt.plan?.sha256 !== planHash) {
    fail("Organizer claim-target readiness receipt does not match the current plan.");
  }
  if (!Array.isArray(receipt.actions)) {
    fail("Organizer claim-target readiness receipt actions are missing.");
  }
  const identities = new Set();
  for (const action of receipt.actions) {
    if (!action?.entityId || identities.has(action.entityId) ||
        ![`organizers/${action.entityId}`, `clubs/${action.entityId}`].includes(action.path)) {
      fail("Organizer claim-target readiness receipt has contradictory target identities.");
    }
    identities.add(action.entityId);
  }
  return receipt;
}

function compareText(a, b) {
  const left = String(a ?? "");
  const right = String(b ?? "");
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function normalizeMarketKey(value) {
  return String(value ?? "").toLowerCase().replace(/[^a-z0-9]+/gu, "");
}

function isLiveMarketValue(value) {
  const key = normalizeMarketKey(value);
  return key.length > 0 && liveMarketKeys.has(key);
}

function organizerIntakeProjectionHasLiveMarket(entry) {
  return (entry?.publicListing?.markets ?? []).some((market) =>
    isLiveMarketValue(market?.marketSlug) ||
      isLiveMarketValue(market?.displayName)
  );
}

function listingHasLiveMarket(listing) {
  return isLiveMarketValue(listing?.citySlug) || isLiveMarketValue(listing?.city);
}

function publicExternalEventsByCanonicalHostId(readiness) {
  const grouped = new Map();
  for (const event of publicExternalEventProjections(readiness)) {
    for (const hostId of [event.canonicalHostId, event.compatibilityClubId]) {
      if (!hostId) continue;
      const hostEvents = grouped.get(hostId) ?? [];
      hostEvents.push(event.projection);
      grouped.set(hostId, hostEvents);
    }
  }
  for (const [hostId, events] of grouped) {
    grouped.set(
      hostId,
      uniqueById(events)
        .sort((a, b) => Date.parse(a.startTime) - Date.parse(b.startTime))
    );
  }
  return grouped;
}

function publicExternalEventProjections(readiness) {
  if (!readiness || typeof readiness !== "object") return [];
  const actions = externalEventReadinessActions(readiness);
  return actions
    .filter(isPublishableExternalEventAction)
    .map((action) => projectExternalEventDocument(action.externalEventDocument))
    .filter(Boolean);
}

function externalEventReadinessActions(readiness) {
  if (Array.isArray(readiness.actions)) return readiness.actions;
  if (Array.isArray(readiness.executionPlan?.actions)) {
    return readiness.executionPlan.actions;
  }
  return [];
}

function isPublishableExternalEventAction(action) {
  const document = action?.externalEventDocument;
  return Boolean(
    action &&
    typeof action === "object" &&
    action.sourceAction === "publish_read_only_external_event" &&
    action.status === "would_publish_read_only" &&
    Array.isArray(action.blockers) &&
    action.blockers.length === 0 &&
    action.payloadValidation?.valid === true &&
    action.projectionValidation?.valid === true &&
    document?.status === "active" &&
    document?.publicationStatus === "public" &&
    document?.discovery?.availability === "read_only_external" &&
    document?.booking?.mode === "external_outbound_only" &&
    document?.booking?.catchBookingEnabled === false &&
    document?.booking?.catchPaymentsEnabled === false &&
    document?.booking?.catchReservationsEnabled === false &&
    document?.booking?.catchWaitlistEnabled === false
  );
}

function withPublicExternalEvents(listing) {
  const externalEvents = publicExternalEventsByHostId.get(listing.id) ?? [];
  if (!externalEvents.length) return listing;
  return {
    ...listing,
    externalEvents,
    searchText: searchText([
      listing.searchText,
      ...externalEvents.flatMap((event) => [
        event.title,
        event.activityKind,
        event.date,
        event.location,
        event.priceLabel,
        event.sourceLabel,
      ]),
    ]),
  };
}

function publicApiForOrganizerIntake(entityId) {
  const action = claimTargetAction(claimTargetReadinessReceipt, entityId);
  if (!claimTargetReadinessReceipt) {
    const previewAction = claimTargetAction(claimTargetSyncPreview, entityId);
    return disabledPublicApi(
      "Claiming is not available until target readiness is verified against Firestore.",
      previewAction && previewAction.status !== "in_sync" ?
        "write_needed" :
        "unknown"
    );
  }
  if (!action) {
    return disabledPublicApi(
      "Claiming is not available because the organizer is absent from the readiness receipt.",
      "unknown"
    );
  }
  if (
    action.status === "in_sync" &&
    action.path === `organizers/${entityId}`
  ) {
    return {
      state: "enabled",
      reason: "The organizer claim target is ready.",
      claimTargetSyncStatus: "in_sync",
    };
  }
  if (action.status === "in_sync") {
    return disabledPublicApi(
      "Claiming is unavailable until the canonical organizer target is ready.",
      "unknown"
    );
  }
  return disabledPublicApi(
    "Claiming is not available for this organizer yet.",
    "write_needed"
  );
}

function publicReviewTargetForOrganizerIntake(entityId) {
  const action = claimTargetAction(claimTargetReadinessReceipt, entityId);
  if (
    action?.status === "in_sync" &&
    [
      `organizers/${entityId}`,
    ].includes(action.path)
  ) {
    return {
      state: "enabled",
      reason: "The canonical public review target is ready.",
    };
  }
  return {
    state: "disabled",
    reason: !claimTargetReadinessReceipt ?
      "Public reviews are unavailable until canonical target readiness is verified." :
      "Public reviews are unavailable until the canonical organizer target is ready.",
  };
}

function claimTargetAction(readiness, entityId) {
  return (readiness?.actions ?? []).find((item) =>
    item?.entityId === entityId &&
    item?.path === `organizers/${entityId}`
  );
}

function validateListingProjections(listings) {
  const errors = [];
  for (const listing of listings) {
    if (validateWebsiteHostListingProjection(listing)) continue;
    const label = listing?.id ?? listing?.path ?? "unknown listing";
    for (const message of schemaErrorMessages(validateWebsiteHostListingProjection)) {
      errors.push(`${label}: ${message}`);
    }
  }
  if (errors.length === 0) return;
  fail([
    "Generated organizer listings do not match WebsiteHostListingProjection.",
    ...errors.map((error) => `- ${error}`),
  ].join("\n"));
}

function appCreatedDemoListings() {
  return demoListingWorlds.map(({file, moment}) => {
    const world = validateDemoWorld(JSON.parse(
      fs.readFileSync(path.join(demoScenarioRoot, file), "utf8")
    ), file);
    return listingFromDemoWorld(world, moment);
  });
}

function listingFromOrganizerIntakeProjection(entry, {liveMarketsOnly = false} = {}) {
  const projection = entry.publicListing;
  const markets = (projection.markets ?? []).filter((market) =>
    !liveMarketsOnly ||
      isLiveMarketValue(market?.marketSlug) ||
      isLiveMarketValue(market?.displayName)
  );
  const primaryMarket = markets[0] ?? null;
  const allMarketNames = markets.map((market) => market.displayName).filter(Boolean);
  const city = allMarketNames.length > 1 ?
    "Multiple cities" :
    primaryMarket?.displayName ?? "Unknown";
  const citySlug = primaryMarket?.marketSlug ?? "multi-city";
  const country = countryNameForCode(primaryMarket?.countryCode);
  const sources = publicSourcesForOrganizerIntake(projection.sources ?? []);
  const sourceConfidence = highestSourceConfidence(sources);
  const claimState = enumValue(
    projection.status,
    ["unclaimed", "claimPending", "claimed", "verified", "suppressed"],
    "unclaimed"
  );
  const authority = organizerAuthority({
    ownershipState: claimState === "claimed" || claimState === "verified" ?
      "claimed" : "programmatic",
    claimState,
    provenanceOrigin: "import",
    sourceConfidence,
    verificationStatus: claimState === "verified" ?
      "ownerVerified" :
      ["medium", "high"].includes(sourceConfidence) ? "sourceBacked" : "unverified",
    appVisibility: entry.appVisibility ?? "hidden",
    publishStatus: projection.indexing === "index, follow" ? "published" : "qa",
    indexStatus: projection.indexing === "index, follow" ? "indexed" : "noindex",
  });
  const publicApi = publicApiForOrganizerIntake(entry.entityId);
  const publicReviewTarget = publicReviewTargetForOrganizerIntake(
    entry.entityId
  );

  return {
    id: projection.id,
    listingVariant: "unclaimedScraped",
    dataOrigin: "organizerIntake",
    name: projection.name,
    slug: projection.slug,
    city,
    citySlug,
    region: "",
    country,
    path: projection.path,
    legacyPaths: entry.legacyPaths ?? [],
    category: projection.category,
    status: claimState,
    indexing: projection.indexing,
    sourceConfidence,
    headline: projection.headline ?? `${projection.name} organizer profile`,
    description: projection.description,
    sourceSummary: projection.sourceSummary,
    logo: {
      mode: "monogram",
      text: initialsForName(projection.name),
      status: "not_verified",
    },
    formats: projection.formats ?? [],
    facts: [
      ...(allMarketNames.length ? [{
        label: allMarketNames.length > 1 ? "Markets" : "Market",
        value: allMarketNames.join(", "),
      }] : []),
      {label: "Organizer type", value: projection.category},
      {label: "Claim state", value: titleCaseText(projection.status)},
      {label: "Indexing", value: projection.indexing},
      {label: "App visibility", value: entry.appVisibility ?? "hidden"},
      {label: "Source surfaces", value: String(sources.length)},
    ],
    eventEvidence: [],
    reviews: [],
    fitNotes: [
      "This profile was promoted from organizer intake after manual admin review.",
      "Events remain market-filtered under one canonical organizer identity.",
      "Claiming unlocks owner-managed copy, official media, Catch events, and verified reviews.",
    ],
    missingEvidence: projection.missingEvidence ?? [],
    sources,
    claim: {
      href: claimState === "unclaimed" ? `${projection.path}#claim` : projection.path,
      label: claimState === "unclaimed" ? "Claim this listing" : "View organizer profile",
    },
    publicApi,
    authority,
    capabilities: listingCapabilities(
      authority,
      publicApi,
      publicReviewTarget
    ),
    lastVerifiedAt: dateLabel(entry.reviewDecision?.decidedAt),
    searchText: searchText([
      projection.name,
      projection.category,
      city,
      citySlug,
      ...(projection.formats ?? []),
      ...allMarketNames,
      ...sources.flatMap((source) => [source.label, source.detail]),
    ]),
  };
}

function listingFromDemoWorld(world, moment) {
  const club = world.organizer;
  const market = marketForIdOrAlias(club.city);
  if (!market) fail(`${world.id} organizer city ${club.city} is not a known market.`);
  const slug = slugForName(club.name);
  const citySlug = market.slug;
  const city = market.cityLabel;
  const path = `/organizers/${citySlug}/${slug}/`;
  const now = civilInstant(world.timeZone, world.moments[moment]);
  const events = demoWorldEvents(world, moment, now);
  const reviews = demoWorldReviews(world, now);
  const nextEvent = events.find((event) => event.timeline === "upcoming");
  const authority = organizerAuthority({
    ownershipState: "userCreated",
    claimState: "verified",
    provenanceOrigin: "userCreated",
    sourceConfidence: "ownerVerified",
    verificationStatus: "ownerVerified",
    appVisibility: "discoverable",
    publishStatus: "published",
    indexStatus: "noindex",
  });
  const publicApi = staticPublicApi(
    "Catch demo listings use static fixture data and do not call public organizer APIs."
  );

  return {
    id: club.id,
    listingVariant: "appCreatedClub",
    dataOrigin: "catchDemo",
    name: club.name,
    slug,
    city,
    citySlug,
    region: market.regionName,
    country: market.countryName,
    path,
    category: "Catch-created host club",
    status: "claimed",
    indexing: "noindex, follow",
    sourceConfidence: "first_party",
    headline: `${club.name} in ${city}`,
    description: club.description,
    sourceSummary:
      `${club.name} is a first-party Catch demo club with app-created events, ` +
      "verified event reviews, host identity, and event-success metrics.",
    logo: {
      mode: "monogram",
      text: initialsForName(club.name),
      status: "app_created",
    },
    formats: titleCaseList(club.tags ?? []),
    facts: [
      {label: "Location", value: `${club.area}, ${city}`},
      {label: "Host", value: world.host.displayName},
      {label: "Members", value: String(club.memberCount)},
      {label: "Rating", value: `${club.rating.toFixed(1)} from ${club.reviewCount} reviews`},
      {label: "Next event", value: nextEvent?.date ?? "Demo event schedule"},
      {label: "Built in Catch", value: "App-created club"},
    ],
    metrics: {
      memberCount: club.memberCount,
      rating: club.rating,
      reviewCount: club.reviewCount,
      nextEventAt: nextEvent?.startTime ?? null,
      nextEventLabel: nextEvent?.title ?? null,
    },
    host: {
      name: world.host.displayName,
      role: "Owner",
      avatarUrl: null,
    },
    catchEvents: events,
    eventEvidence: [],
    reviews,
    fitNotes: [
      "App-created clubs should lead with host identity, upcoming events, ratings, and member activity rather than a source ledger.",
      "Verified review aggregates matter more here than scrape confidence because the club and events already exist inside Catch.",
      "The page should help members decide whether to follow, book, or review, while unclaimed scraped pages should focus on owner claim.",
    ],
    missingEvidence: [],
    sources: [{
      type: "catch_demo",
      label: "Catch demo world",
      detail:
        "First-party synthetic club used for host workflow, roster, review, payment, and Playbook QA.",
      confidence: "high",
    }],
    claim: {
      href: `${path}#events`,
      label: "View events",
    },
    publicApi,
    authority,
    capabilities: listingCapabilities(authority, publicApi),
    lastVerifiedAt: dateLabel({_seconds: now.getTime() / 1000}),
    searchText: searchText([
      club.name,
      city,
      club.area,
      world.host.displayName,
      ...(club.tags ?? []),
      ...events.flatMap((event) => [event.title, event.activityKind]),
    ]),
  };
}

function publicSourcesForOrganizerIntake(sources) {
  return sources.map((source) => {
    const label = source.label ?? source.type ?? "Public source";
    const confidence = source.confidence ?? "medium";
    const listingSource = {
      type: source.type ?? "organizer_intake_surface",
      label,
      detail:
        source.detail ??
        `${label} was reviewed as an organizer-intake surface with ${confidence} confidence.`,
      confidence,
    };
    if (source.href) listingSource.href = source.href;
    return listingSource;
  });
}

// Each world event as the website shows it at the moment; counts are
// derived from the world's guest records.
function demoWorldEvents(world, moment, now) {
  return world.events
    .map((event) => {
      const venue = world.venues.find((item) => item.id === event.venueId);
      const start = civilInstant(world.timeZone, `${event.civilDate}T${event.startTime}:00`);
      const end = civilInstant(world.timeZone, `${event.civilDate}T${event.endTime}:00`);
      const state = eventStateAt(world, event.id, moment);
      return {
        id: event.id,
        role: "Hosted event",
        title: event.name,
        activityKind: event.activityKind,
        timeline: start > now ? "upcoming" : "past",
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        timezone: world.timeZone,
        date: eventDateLabel(start, end, world.timeZone),
        location: venue.name,
        locationDetails: venue.directions,
        summary: event.description,
        capacityLimit: event.capacity,
        bookedCount: state.booked,
        checkedInCount: state.checkedIn,
        waitlistedCount: state.waitlisted,
        priceLabel: priceLabel(event.priceInPaise),
      };
    })
    .sort((a, b) => b.startTime.localeCompare(a.startTime));
}

// Reviews written by the moment, newest first.
function demoWorldReviews(world, now) {
  const club = world.organizer;
  return world.events
    .flatMap((event) => (event.reviews ?? []).map((review) => ({event, review})))
    .map(({event, review}) => ({
      event,
      review,
      createdAt: civilInstant(world.timeZone, review.createdAt),
    }))
    .filter(({createdAt}) => createdAt <= now)
    .sort((a, b) => b.createdAt - a.createdAt)
    .map(({event, review, createdAt}, index) => {
      const persona = personaForPerson(world, review.personId);
      return {
        id: `${club.id}-verified-review-${index + 1}`,
        eventId: event.id,
        reviewerName: review.anonymous ?
          "Anonymous attendee" :
          `${persona.firstName} ${persona.lastName[0]}.`,
        rating: review.rating,
        comment: review.comment,
        createdAt: createdAt.toISOString(),
        verificationStatus: "verified",
        source: "catchEvent",
        isAnonymous: review.anonymous,
        ownerResponse: null,
      };
    });
}

function eventDateLabel(start, end, timeZone) {
  const date = new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone,
  }).format(start);
  const time = new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  }).format(start);
  const endTime = new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  }).format(end);
  return `${date}, ${time}-${endTime}`;
}

function priceLabel(priceInPaise) {
  if (!priceInPaise) return "Free";
  return `$${(priceInPaise / 100 / 83).toFixed(0)}`;
}

function uniqueById(items) {
  const byId = new Map();
  for (const item of items) {
    if (!byId.has(item.id)) byId.set(item.id, item);
  }
  return Array.from(byId.values());
}

function titleCaseList(values) {
  return values.map((value) =>
    String(value)
      .split(/[\s_-]+/)
      .filter(Boolean)
      .map((word) => `${word[0]?.toUpperCase() ?? ""}${word.slice(1)}`)
      .join(" ")
  );
}

function highestSourceConfidence(sources) {
  if (sources.some((source) => source.confidence === "high")) return "high";
  if (sources.some((source) => source.confidence === "medium")) return "medium";
  return "low";
}

function countryNameForCode(countryCode) {
  if (countryCode === "IN") return "India";
  if (countryCode === "US") return "United States";
  return countryCode ?? "";
}

function slugForName(name) {
  return String(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function parseArgs(argv) {
  const parsed = {
    check: false,
    demoScenarioRoot: null,
    externalEventReadiness: null,
    help: false,
    includeDemo: false,
    output: null,
    projectionPlan: null,
    claimTargetPlan: null,
    claimTargetReadinessReceipt: null,
    firestoreProject: null,
    readinessReceipt: null,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--check") parsed.check = true;
    else if (arg === "--help" || arg === "-h") parsed.help = true;
    else if (arg === "--include-demo") parsed.includeDemo = true;
    else if (arg === "--no-demo") parsed.includeDemo = false;
    else if (arg === "--demo-scenario-root") {
      parsed.demoScenarioRoot = requiredValue(argv, ++index, arg);
    } else if (arg === "--output") {
      parsed.output = requiredValue(argv, ++index, arg);
    } else if (arg === "--projection-plan") {
      parsed.projectionPlan = requiredValue(argv, ++index, arg);
    } else if (arg === "--external-event-readiness") {
      parsed.externalEventReadiness = requiredValue(argv, ++index, arg);
    } else if (arg === "--claim-target-sync-preview") {
      parsed.claimTargetSyncPreview = requiredValue(argv, ++index, arg);
    } else if (arg === "--claim-target-plan") {
      parsed.claimTargetPlan = requiredValue(argv, ++index, arg);
    } else if (arg === "--claim-target-readiness-receipt") {
      parsed.claimTargetReadinessReceipt = requiredValue(argv, ++index, arg);
    } else if (arg === "--readiness-receipt") {
      parsed.readinessReceipt = requiredValue(argv, ++index, arg);
    } else if (arg === "--firestore-project") {
      parsed.firestoreProject = requiredValue(argv, ++index, arg);
    } else {
      fail(`Unknown argument: ${arg}`);
    }
  }

  return parsed;
}

function requiredValue(argv, index, flag) {
  const value = argv[index];
  if (!value || value.startsWith("--")) fail(`${flag} requires a value.`);
  return value;
}

function printHelp() {
  console.log(`Usage: node website/scripts/generateOrganizerListings.mjs [options]

Options:
  --check                         Check generated hostListings.json drift.
  --projection-plan <path>         Read a specific organizer public projection plan.
  --external-event-readiness <path>
                                  Read a specific external event readiness/preflight plan.
  --claim-target-sync-preview <path>
                                  Read a specific claim target sync preview.
  --claim-target-plan <path>       Read a specific claim target plan for receipt validation.
  --claim-target-readiness-receipt <path>
                                  Read a Firestore readiness receipt for public claim APIs.
  --firestore-project <project>    Read canonical content and readiness in one Firestore snapshot.
  --readiness-receipt <path>       Save project/target/projection-bound read-only evidence.
                                  This evidence cannot be reused to enable capabilities.
  --demo-scenario-root <path>      Read demo scenario configs from a specific folder.
  --output <path>                  Write or check a specific output file.
  --include-demo                  Include app-created demo listings (Storybook/sales fixtures only).
  --no-demo                       Compatibility flag; production already excludes demos by default.
`);
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
