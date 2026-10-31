import {listingFromFirestoreOrganizer, organizerAuthority, staticPublicApi, initialsForName, dateLabel, listingCapabilities, searchText} from "./next/organizerProjection.mjs";
export {listingFromFirestoreOrganizer} from "./next/organizerProjection.mjs";
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
if (args.help) {
  printHelp();
  process.exit(0);
}

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
if (checkOnly && !args.firestoreProject) {
  validateExistingProjection(generatedPath, {includeDemo: args.includeDemo});
  process.exit(0);
}
const firestoreWebsiteDocuments = args.firestoreProject ?
  await readFirestoreWebsiteDocuments(args.firestoreProject) :
  null;
const liveMarketKeys = new Set(
  inMarket.cities
    .filter((city) => city.status === "live")
    .flatMap((city) => [city.slug, city.label, ...city.aliases])
    .map(normalizeMarketKey)
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
  [];
const listings = [
  ...firestoreListings,
  ...(args.includeDemo ? appCreatedDemoListings() : []),
].sort((a, b) => compareText(a.name, b.name));
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

function listingHasLiveMarket(listing) {
  return isLiveMarketValue(listing?.citySlug) || isLiveMarketValue(listing?.city);
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

function listingFromDemoWorld(world, moment) {
  const organizer = world.organizer;
  const market = marketForIdOrAlias(organizer.city);
  if (!market) fail(`${world.id} organizer city ${organizer.city} is not a known market.`);
  const slug = slugForName(organizer.name);
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
    id: organizer.id,
    listingVariant: "appCreatedOrganizer",
    dataOrigin: "catchDemo",
    name: organizer.name,
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
    headline: `${organizer.name} in ${city}`,
    description: organizer.description,
    sourceSummary:
      `${organizer.name} is a first-party Catch demo club with app-created events, ` +
      "verified event reviews, host identity, and event-success metrics.",
    logo: {
      mode: "monogram",
      text: initialsForName(organizer.name),
      status: "app_created",
    },
    formats: titleCaseList(organizer.tags ?? []),
    facts: [
      {label: "Location", value: `${organizer.area}, ${city}`},
      {label: "Host", value: world.host.displayName},
      {label: "Members", value: String(organizer.memberCount)},
      {label: "Rating", value: `${organizer.rating.toFixed(1)} from ${organizer.reviewCount} reviews`},
      {label: "Next event", value: nextEvent?.date ?? "Demo event schedule"},
      {label: "Built in Catch", value: "App-created club"},
    ],
    metrics: {
      memberCount: organizer.memberCount,
      rating: organizer.rating,
      reviewCount: organizer.reviewCount,
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
      organizer.name,
      city,
      organizer.area,
      world.host.displayName,
      ...(organizer.tags ?? []),
      ...events.flatMap((event) => [event.title, event.activityKind]),
    ]),
  };
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
  const organizer = world.organizer;
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
        id: `${organizer.id}-verified-review-${index + 1}`,
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
    help: false,
    includeDemo: false,
    output: null,
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
  --check                         Validate the committed output; with
                                  --firestore-project, also check drift.
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
