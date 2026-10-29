#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import {createRequire} from "node:module";
import {isDeepStrictEqual} from "node:util";
import {fileURLToPath, pathToFileURL} from "node:url";
import {
  assertScheduleCompliance,
  buildScheduleLockDocs,
} from "../demo/demo_schedule_policy.mjs";
import {
  photoPromptCatalog,
  profilePromptCatalog,
} from "../contracts/generated/schema_contract_registry.mjs";
import {
  listScenarioConfigs,
  loadScenarioConfig,
} from "./demo_seed_scenario_catalog.mjs";
import {
  DEFAULT_PERSONA_CATALOG_PATH,
  loadPersonaCatalog,
  personaProfileProjection,
} from "./demo_persona_catalog.mjs";
import {isDemoWorld} from "./lib/demo_world.mjs";
import {
  assertValidSchemaPayload,
  validateActivityNotificationDocument,
  validateChatMessageDocument,
  validateMatchDocument,
  validateEventSuccessAssignmentDocument,
  validateEventSuccessCompatibilityResponseDocument,
  validateEventSuccessFeedbackDocument,
  validateEventSuccessPlanDocument,
  validateEventSuccessPreferenceDocument,
  validateEventSuccessScorecardDocument,
  validateEventSuccessWingmanRequestDocument,
  validatePaymentDocument,
  validatePhotoPromptAnswer,
  validateProfilePromptAnswer,
  validatePublicProfileDocument,
  validateReviewDocument,
  validateClubScheduleLockDocument,
  validateClubDocument,
  validateClubMembershipDocument,
  validateEventDocument,
  validateEventParticipationDocument,
  validateSavedEventDocument,
  validateSeedEventManifestDocument,
  validateSwipeDocument,
  validateUserEventScheduleLockDocument,
  validateUserProfileDocument,
} from "../contracts/generated/schema_contract_validators.mjs";
import {marketForIdOrAlias} from "../lib/location_markets.mjs";
import {isFirebaseProductionTarget, resolveFirebaseProjectId} from "../lib/firebase_project.mjs";

const toolDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(toolDir, "../..");
const requireFromFunctions = createRequire(
  path.join(repoRoot, "functions/package.json")
);
const admin = requireFromFunctions("firebase-admin");
const {
  eventDiscoveryProjection,
} = requireFromFunctions("./lib/events/eventDiscoveryProjection.js");

const DEFAULT_SEED_PREFIX = "demo_beta_2026";
const DEFAULT_MAX_BATCH_WRITES = 450;
const MATCH_MESSAGE_LIMIT = 18;
const personaCatalogRoot = path.join(toolDir, "demo_seed", "personas");

const profilePromptsById = promptsById(profilePromptCatalog);
const photoPromptsById = promptsById(photoPromptCatalog);
const requiredEventDiscoveryProjectionFields = Object.freeze([
  "discoveryCityName",
  "discoveryMarketId",
  "discoveryActivityKind",
  "discoveryGeoCell",
  "discoveryHasOpenSpots",
  "discoveryAvailability",
  "discoveryOpenCohorts",
  "discoveryWaitlistCohorts",
  "discoveryInviteRequired",
  "discoveryMembershipRequired",
  "discoveryManualApprovalRequired",
  "discoveryMinAge",
  "discoveryMaxAge",
]);

const cityData = {
  mumbai: {label: "Mumbai", lat: 19.076, lng: 72.8777, areas: ["Bandra", "Marine Drive", "Powai"]},
  delhi: {label: "Delhi", lat: 28.7041, lng: 77.1025, areas: ["Lodhi Garden", "Hauz Khas", "India Gate"]},
  bangalore: {label: "Bangalore", lat: 12.9716, lng: 77.5946, areas: ["Cubbon Park", "Indiranagar", "Jayanagar"]},
  "new-york": {label: "New York", lat: 40.7128, lng: -74.0060, areas: ["West Village", "Hudson River Park", "Williamsburg"]},
  hyderabad: {label: "Hyderabad", lat: 17.385, lng: 78.4867, areas: ["Necklace Road", "Gachibowli", "Jubilee Hills"]},
  chennai: {label: "Chennai", lat: 13.0827, lng: 80.2707, areas: ["Besant Nagar", "Marina", "Adyar"]},
  kolkata: {label: "Kolkata", lat: 22.5726, lng: 88.3639, areas: ["Maidan", "Salt Lake", "New Town"]},
  pune: {label: "Pune", lat: 18.5204, lng: 73.8567, areas: ["Koregaon Park", "Baner", "Viman Nagar"]},
  ahmedabad: {label: "Ahmedabad", lat: 23.0225, lng: 72.5714, areas: ["Riverfront", "Satellite", "Bodakdev"]},
  indore: {label: "Indore", lat: 22.7196, lng: 75.8577, areas: ["Race Course Road", "Vijay Nagar", "Rajwada"]},
};

const allCities = [
  "mumbai",
  "delhi",
  "bangalore",
  "hyderabad",
  "chennai",
  "kolkata",
  "pune",
  "ahmedabad",
  "indore",
];

function marketForScenarioCity(city) {
  const market = marketForIdOrAlias(city);
  if (!market) {
    throw new Error(
      `Scenario city "${city}" is not in the canonical market catalog.`
    );
  }
  return market;
}

function cityMetaForScenarioCity(city) {
  const market = marketForScenarioCity(city);
  const legacyMeta = cityData[city] ?? cityData[market.slug];
  return {
    ...(legacyMeta ?? {
      label: market.label,
      lat: market.latitude,
      lng: market.longitude,
      areas: [market.label],
    }),
    label: market.label,
    lat: market.latitude,
    lng: market.longitude,
    market,
  };
}

function scenarioCityKeyForMarket(market) {
  for (const city of Object.keys(cityData)) {
    if (marketForIdOrAlias(city)?.marketId === market.marketId) {
      return city;
    }
  }
  return market.slug;
}

const scenarios = {
  smoke: {
    description: "Small seed for quick local/dev checks.",
    cities: ["mumbai", "bangalore", "indore"],
    usersPerCity: 4,
    clubsPerCity: 1,
    eventsPerClub: 5,
    anchorsPerRun: 2,
  },
  "beta-full": {
    description: "Full TestFlight-style world across every supported city.",
    cities: allCities,
    usersPerCity: 8,
    clubsPerCity: 2,
    eventsPerClub: 8,
    anchorsPerRun: 4,
  },
  "city-dense": {
    description: "Dense one-city discovery, map, and list stress scenario.",
    cities: ["mumbai"],
    usersPerCity: 36,
    clubsPerCity: 5,
    eventsPerClub: 8,
    anchorsPerRun: 5,
  },
  "empty-edge-cases": {
    description: "Sparse world with empty, expired, cancelled, and waitlist states.",
    cities: ["mumbai", "delhi", "bangalore", "indore"],
    usersPerCity: 4,
    clubsPerCity: 1,
    eventsPerClub: 7,
    anchorsPerRun: 1,
  },
  "paid-flow-demo": {
    description: "Paid booking, payment history, refund, and sign-up-failed states.",
    cities: ["mumbai", "bangalore", "delhi", "indore"],
    usersPerCity: 6,
    clubsPerCity: 1,
    eventsPerClub: 6,
    anchorsPerRun: 3,
    preferPaidEvents: true,
  },
};

const firstNames = [
  "Aarav", "Aditi", "Kabir", "Mira", "Rohan", "Naina", "Vivaan", "Isha",
  "Arjun", "Sara", "Dev", "Tara", "Neel", "Anika", "Reyansh", "Zoya",
  "Kian", "Diya", "Rudra", "Kiara", "Yash", "Avni", "Vihaan", "Sia",
];
const lastNames = [
  "Mehta", "Rao", "Kapoor", "Shah", "Iyer", "Khan", "Patel", "Menon",
  "Gupta", "Nair", "Bose", "Reddy", "Malhotra", "Joshi", "Pillai", "Sethi",
];
const occupations = [
  "Product designer", "Founder", "Data analyst", "Architect", "Doctor",
  "Brand strategist", "Software engineer", "Lawyer", "Fitness coach",
  "Consultant", "Filmmaker", "Teacher",
];
const companies = [
  "Freelance", "Urban Loop", "Northstar", "Founders Office", "Studio Event",
  "Cloudline", "Stride Labs", "Independent",
];
const perfectRunAnswers = [
  "Easy kilometres, strong coffee, and plans that start on time.",
  "Training for a faster 10K and always up for post-event breakfast.",
  "I like neighbourhood routes, clean playlists, and low-pressure chats.",
  "Weekend long events, weekday strength sessions, and new city corners.",
  "Mostly here for good routes, kind people, and a reason to wake up early.",
  "Race curious, brunch serious, and happiest near a waterfront route.",
];
const afterEventAnswers = [
  "Ordering coffee before my watch has finished syncing.",
  "Looking for the best dosa within walking distance.",
  "Stretching badly and pretending that counts as recovery.",
  "Saving the route so I can argue it was uphill both ways.",
  "Asking who wants to make this a weekly thing.",
  "Finding a shaded bench and a cold lime soda.",
];
const greenFlagAnswers = [
  "I will slow down if someone is having a rough kilometre.",
  "I remember birthdays, water stops, and playlist requests.",
  "I can make a plan without turning it into a spreadsheet.",
  "I am competitive only with my own previous splits.",
  "I show up on time and bring extra safety pins on race day.",
  "I know when to talk and when to enjoy a quiet stretch.",
];
function promptsById(catalog) {
  return new Map(catalog.prompts.map((prompt) => [prompt.id, prompt]));
}

/**
 * Synthetic seed identities as a profile projection: an explicit projection
 * file (for example one generated with uploaded photos only), else the
 * personas a demo world casts, else the New York catalog for generator
 * scenarios without a cast. Catalog projections keep every photo slot.
 */
export function loadSeedPersonaProfileProjection({filePath = null, personaIds = null} = {}) {
  if (filePath) return readSeedPersonaProfileProjection(filePath);
  const catalogPaths = personaIds ?
    fs.readdirSync(personaCatalogRoot)
      .filter((name) => name.endsWith("_personas.draft.json"))
      .sort()
      .map((name) => path.join(personaCatalogRoot, name)) :
    [DEFAULT_PERSONA_CATALOG_PATH];
  const cast = personaIds ? new Set(personaIds) : null;
  const personas = catalogPaths
    .flatMap((catalogPath) =>
      personaProfileProjection(loadPersonaCatalog(catalogPath), {assetStatuses: "all"}).personas)
    .filter((persona) => !cast || cast.has(persona.id));
  if (cast && personas.length !== cast.size) {
    throw new Error("Every persona a seeded world casts must come from a persona catalog.");
  }
  for (const [index, persona] of personas.entries()) {
    validateSeedPersonaProjection(persona, {source: `seed personas[${index}]`});
  }
  return {kind: "sales-demo-persona-profile-projection", personas};
}

function readSeedPersonaProfileProjection(filePath) {
  const resolvedPath = path.resolve(repoRoot, filePath);
  const projection = JSON.parse(fs.readFileSync(resolvedPath, "utf8"));
  if (projection?.kind !== "sales-demo-persona-profile-projection") {
    throw new Error(
      `${path.relative(repoRoot, resolvedPath)} must be a sales demo persona profile projection.`
    );
  }
  if (!Array.isArray(projection.personas) || projection.personas.length === 0) {
    throw new Error(
      `${path.relative(repoRoot, resolvedPath)} must contain at least one persona.`
    );
  }
  for (const [index, persona] of projection.personas.entries()) {
    validateSeedPersonaProjection(persona, {
      source: `${path.relative(repoRoot, resolvedPath)}.personas[${index}]`,
    });
  }
  return projection;
}

function validateSeedPersonaProjection(persona, {source}) {
  for (const field of [
    "id",
    "firstName",
    "lastName",
    "displayName",
    "gender",
    "dateOfBirth",
  ]) {
    if (typeof persona?.[field] !== "string" || persona[field].trim() === "") {
      throw new Error(`${source}.${field} must be a non-empty string.`);
    }
  }
  if (!validGender(persona.gender)) {
    throw new Error(`${source}.gender must be a valid profile gender.`);
  }
  if (!Array.isArray(persona.profilePrompts) || persona.profilePrompts.length === 0) {
    throw new Error(`${source}.profilePrompts must be non-empty.`);
  }
  if (!Array.isArray(persona.profilePhotos) || persona.profilePhotos.length === 0) {
    throw new Error(`${source}.profilePhotos must be non-empty.`);
  }
}

function profilePromptAnswer(promptId, answer) {
  const prompt = profilePromptsById.get(promptId);
  if (!prompt) throw new Error(`Unknown profile prompt id: ${promptId}`);
  return {
    promptId: prompt.id,
    prompt: prompt.title,
    answer,
  };
}

function photoPromptAnswer(photoIndex, promptId) {
  const prompt = photoPromptsById.get(promptId);
  if (!prompt) throw new Error(`Unknown photo prompt id: ${promptId}`);
  return {
    photoIndex,
    promptId: prompt.id,
    prompt: prompt.title,
  };
}

function profilePromptsFromProjection(persona) {
  return persona.profilePrompts.map((prompt) =>
    profilePromptAnswer(prompt.promptId, prompt.answer)
  );
}

function profilePhotosFromProjection({uid, persona}) {
  return persona.profilePhotos
    .slice()
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    .map((photo, index) => {
      const storagePath = nonEmptyString(photo.storagePath) ??
        `users/${uid}/photos/${index}.jpg`;
      const thumbnailStoragePath = nonEmptyString(photo.thumbnailStoragePath) ??
        thumbnailStoragePathForStoragePath(storagePath);
      const promptId = nonEmptyString(photo.promptId);
      return {
        id: nonEmptyString(photo.id) ??
          profilePhotoIdForStoragePath(storagePath, index),
        url: nonEmptyString(photo.url) ??
          `https://example.test/${uid}/photos/${index}.jpg`,
        thumbnailUrl: nonEmptyString(photo.thumbnailUrl) ??
          nonEmptyString(photo.url) ??
          `https://example.test/${uid}/photos/${index}.jpg`,
        storagePath,
        thumbnailStoragePath,
        prompt: promptId ? photoPromptAnswer(index, promptId) : null,
        moderation: {status: moderationStatus(photo.moderation?.status)},
        position: index,
        createdAt: admin.firestore.Timestamp.fromMillis(0),
        updatedAt: admin.firestore.Timestamp.fromMillis(0),
      };
    });
}

function moderationStatus(value) {
  return ["pending", "approved", "rejected"].includes(value) ? value : "approved";
}

function timestampFromBirthDate(value) {
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid persona dateOfBirth: ${value}`);
  }
  return admin.firestore.Timestamp.fromDate(date);
}

function nonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0 ?
    value.trim() :
    null;
}

function profilePromptsForIndex(index) {
  return [
    profilePromptAnswer(
      "perfectRun",
      perfectRunAnswers[index % perfectRunAnswers.length]
    ),
    profilePromptAnswer(
      "afterEvent",
      afterEventAnswers[index % afterEventAnswers.length]
    ),
    profilePromptAnswer(
      "greenFlag",
      greenFlagAnswers[index % greenFlagAnswers.length]
    ),
  ];
}

function photoPromptsForIndex(index) {
  const prompt = photoPromptCatalog.prompts[index % photoPromptCatalog.prompts.length];
  return [photoPromptAnswer(0, prompt.id)];
}
const profilePhotos = [
  "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1527980965255-d3b416303d12?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1544723795-3fb6469f5b39?auto=format&fit=crop&w=900&q=80",
];
const clubImages = [
  "https://images.unsplash.com/photo-1552674605-db6ffd4facb5?auto=format&fit=crop&w=1400&q=80",
  "https://images.unsplash.com/photo-1486218119243-13883505764c?auto=format&fit=crop&w=1400&q=80",
  "https://images.unsplash.com/photo-1546483875-ad9014c88eba?auto=format&fit=crop&w=1400&q=80",
  "https://images.unsplash.com/photo-1571008887538-b36bb32f4571?auto=format&fit=crop&w=1400&q=80",
];

const meetingPointData = {
  "new-york": [
    {key: "west_village_table", label: "Cervo's private table", lat: 40.7143, lng: -73.9912, detail: "Ask for the Catch host table near the back banquette."},
    {key: "hudson_river_pier_57", label: "Pier 57 south entrance", lat: 40.7421, lng: -74.0089, detail: "Meet by the south entrance benches facing the Hudson."},
    {key: "williamsburg_court_2", label: "McCarren Park court 2", lat: 40.7215, lng: -73.9515, detail: "Meet beside court 2 near the clubhouse gate."},
  ],
  mumbai: [
    {key: "bandra_carter_road_amphitheatre", label: "Bandra Carter Road amphitheatre", lat: 19.0704, lng: 72.8220, detail: "Meet beside the amphitheatre steps facing the promenade."},
    {key: "marine_drive_police_gymkhana", label: "Marine Drive police gymkhana gate", lat: 18.9432, lng: 72.8234, detail: "Meet near the sea-facing gate before the promenade warm-up."},
    {key: "powai_lake_garden", label: "Powai lake garden entrance", lat: 19.1197, lng: 72.9052, detail: "Meet at the garden entrance opposite the lake path."},
  ],
  delhi: [
    {label: "Lodhi Garden gate 1", lat: 28.5933, lng: 77.2209, detail: "Meet just inside gate 1 near the stone benches."},
    {label: "Hauz Khas deer park gate", lat: 28.5494, lng: 77.2001, detail: "Meet at the deer park entrance before the loop."},
    {label: "India Gate lawns east side", lat: 28.6129, lng: 77.2295, detail: "Meet on the east lawn path facing India Gate."},
  ],
  bangalore: [
    {label: "Cubbon Park Queen's statue", lat: 12.9763, lng: 77.5929, detail: "Meet near the Queen's statue before the park loop."},
    {label: "Indiranagar 100 ft road metro gate", lat: 12.9784, lng: 77.6408, detail: "Meet outside the metro gate on the service-road side."},
    {label: "Jayanagar 4th block bus stand", lat: 12.9250, lng: 77.5938, detail: "Meet near the bus stand entrance before the neighbourhood route."},
  ],
  hyderabad: [
    {label: "Necklace Road People's Plaza", lat: 17.4239, lng: 78.4738, detail: "Meet at the plaza entrance facing Hussain Sagar."},
    {label: "Gachibowli stadium gate", lat: 17.4401, lng: 78.3489, detail: "Meet outside the main stadium gate."},
    {label: "Jubilee Hills check post", lat: 17.4326, lng: 78.4071, detail: "Meet near the check-post pavement before the hill route."},
  ],
  chennai: [
    {label: "Besant Nagar beach police booth", lat: 12.9995, lng: 80.2668, detail: "Meet beside the beach police booth before the promenade event."},
    {label: "Marina lighthouse entrance", lat: 13.0500, lng: 80.2824, detail: "Meet near the lighthouse entrance facing the service road."},
    {label: "Adyar theosophical gate", lat: 13.0067, lng: 80.2574, detail: "Meet outside the gate before the shaded loop."},
  ],
  kolkata: [
    {label: "Maidan Victoria Memorial north gate", lat: 22.5600, lng: 88.3426, detail: "Meet at the north gate before the Maidan loop."},
    {label: "Salt Lake Central Park gate", lat: 22.5867, lng: 88.4171, detail: "Meet by the Central Park gate near the lake path."},
    {label: "New Town Eco Park gate 1", lat: 22.5810, lng: 88.4765, detail: "Meet outside gate 1 before the long loop."},
  ],
  pune: [
    {label: "Koregaon Park lane 5 corner", lat: 18.5362, lng: 73.8938, detail: "Meet at the lane 5 corner before the tree-lined route."},
    {label: "Baner hill trail gate", lat: 18.5590, lng: 73.7868, detail: "Meet at the trail gate before the hill warm-up."},
    {label: "Viman Nagar jogging track gate", lat: 18.5679, lng: 73.9143, detail: "Meet outside the jogging track gate."},
  ],
  ahmedabad: [
    {label: "Sabarmati Riverfront event centre", lat: 23.0300, lng: 72.5800, detail: "Meet at the event-centre entrance on the riverfront path."},
    {label: "Satellite prahladnagar garden gate", lat: 23.0301, lng: 72.5178, detail: "Meet by the garden gate before the neighbourhood route."},
    {label: "Bodakdev sindhu bhavan corner", lat: 23.0396, lng: 72.5130, detail: "Meet at the corner pavement near the cafe row."},
  ],
  indore: [
    {label: "Race Course Road main gate", lat: 22.7274, lng: 75.8818, detail: "Meet by the main gate on the Race Course Road side."},
    {label: "Vijay Nagar main gate", lat: 22.7533, lng: 75.8937, detail: "Meet outside the Vijay Nagar main gate before the service-road loop."},
    {label: "Rajwada square clock tower", lat: 22.7196, lng: 75.8577, detail: "Meet near the clock tower side of Rajwada square."},
  ],
};

if (isMain()) {
  await main();
}

export async function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  if (args.help) {
    printHelp();
    return;
  }

  if (args.listScenarios) {
    printScenarios();
    return;
  }

  const scenario = applyCityOverride(
    resolveSeedScenario(args.scenario),
    args.cities
  );

  const projectId = resolveFirebaseProjectId({env: args.env, project: args.project});
  const isProdTarget = isFirebaseProductionTarget({env: args.env, projectId});
  if (args.apply && isProdTarget && !args.allowProd) {
    throw new Error(
      "Refusing to write to prod without --allow-prod. Rerun only if this is intentional."
    );
  }
  if (args.resetSynthetic && !args.apply) {
    throw new Error("--reset-synthetic only makes sense with --apply.");
  }
  if (args.deleteOnly && !args.apply) {
    throw new Error("--delete-only requires --apply.");
  }
  if (args.deleteOnly && !args.resetSynthetic) {
    throw new Error("--delete-only requires --reset-synthetic.");
  }
  if (args.appendAnchors && args.resetSynthetic) {
    throw new Error("--append-anchors cannot be combined with --reset-synthetic.");
  }
  if (args.appendAnchors && args.deleteOnly) {
    throw new Error("--append-anchors cannot be combined with --delete-only.");
  }
  if (args.emulatorHost) {
    process.env.FIRESTORE_EMULATOR_HOST = args.emulatorHost;
  }

  admin.initializeApp({projectId});
  const db = admin.firestore();

  const anchorSpecs = loadAnchorSpecs(args);
  const anchorProfiles = await loadAnchorProfiles(db, anchorSpecs);
  const missingPublicProfileIds = await findMissingPublicProfiles(
    db,
    anchorProfiles.map((profile) => profile.uid)
  );
  const personaProjection = loadSeedPersonaProfileProjection({
    filePath: args.personaProfileProjection,
    personaIds: scenario.castPersonaIds,
  });
  const seed = buildSeed({
    scenarioName: args.scenario,
    scenario,
    seedPrefix: args.seedPrefix,
    anchorProfiles,
    personaProjection,
    now: args.appendAnchors ?
      await readExistingSeedTime(db, `${args.seedPrefix}_${args.scenario}`) :
      new Date(),
    includeScheduleLocks: args.includeScheduleLocks,
  });
  const writePlan = args.appendAnchors ?
    await createAppendWritePlan({db, seed, anchorProfiles}) :
    createWritePlan(seed);
  const schemaValidation = validateSeedDocuments(writePlan);

  if (args.json) {
    console.log(JSON.stringify(summary({args, projectId, scenario, anchorProfiles, seed, writePlan, missingPublicProfileIds, schemaValidation}), null, 2));
  } else {
    printSummary({args, projectId, scenario, anchorProfiles, seed, writePlan, missingPublicProfileIds, schemaValidation});
  }

  if (!args.apply) {
    if (!args.json) {
      console.log("\nDry run only. Re-run with --apply to write these documents.");
    }
    return;
  }

  const resetReport = args.resetSynthetic ?
    await resetSyntheticData({
      db,
      manifestId: seed.manifestId,
      seedPrefix: args.seedPrefix,
      fallbackPaths: writePlan.paths,
    }) :
    {deleted: 0, source: "skipped"};
  if (args.deleteOnly) {
    if (!args.json) {
      console.log("\nSynthetic seed data deleted.");
      console.log(`Reset source: ${resetReport.source}`);
      console.log(`Deleted docs: ${resetReport.deleted}`);
    }
    return;
  }
  const writeReport = await applyWritePlan({db, docs: writePlan.docs});
  await db.collection("seedEvents").doc(seed.manifestId).set(
    writePlan.manifest ?? seed.manifest
  );

  if (!args.json) {
    console.log("\nSeed applied.");
    console.log(`Reset source: ${resetReport.source}`);
    console.log(`Deleted docs: ${resetReport.deleted}`);
    console.log(`Written docs: ${writeReport.written}`);
    console.log(`Manifest: seedEvents/${seed.manifestId}`);
  }
}

function parseArgs(argv) {
  const parsed = {
    env: null,
    project: null,
    scenario: "beta-full",
    seedPrefix: DEFAULT_SEED_PREFIX,
    cities: null,
    anchorUsers: [],
    anchorPhones: [],
    anchorFile: null,
    apply: false,
    allowProd: false,
    resetSynthetic: false,
    deleteOnly: false,
    appendAnchors: false,
    emulatorHost: null,
    personaProfileProjection: null,
    json: false,
    includeScheduleLocks: false,
    help: false,
    listScenarios: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") parsed.help = true;
    else if (arg === "--list-scenarios") parsed.listScenarios = true;
    else if (arg === "--json") parsed.json = true;
    else if (arg === "--include-schedule-locks") parsed.includeScheduleLocks = true;
    else if (arg === "--apply") parsed.apply = true;
    else if (arg === "--dry-run") parsed.apply = false;
    else if (arg === "--allow-prod") parsed.allowProd = true;
    else if (arg === "--reset-synthetic") parsed.resetSynthetic = true;
    else if (arg === "--delete-only") parsed.deleteOnly = true;
    else if (arg === "--append-anchors") parsed.appendAnchors = true;
    else if (arg === "--emulator") parsed.emulatorHost = "127.0.0.1:8080";
    else if (arg === "--emulator-host") parsed.emulatorHost = requireValue(argv, ++i, arg);
    else if (arg === "--persona-profile-projection") parsed.personaProfileProjection = requireValue(argv, ++i, arg);
    else if (arg === "--env") parsed.env = requireValue(argv, ++i, arg);
    else if (arg === "--project") parsed.project = requireValue(argv, ++i, arg);
    else if (arg === "--scenario") parsed.scenario = requireValue(argv, ++i, arg);
    else if (arg === "--seed-prefix") parsed.seedPrefix = requireValue(argv, ++i, arg);
    else if (arg === "--cities") parsed.cities = splitCsv(requireValue(argv, ++i, arg));
    else if (arg === "--anchor-users") parsed.anchorUsers = splitCsv(requireValue(argv, ++i, arg));
    else if (arg === "--anchor-phones") parsed.anchorPhones = splitCsv(requireValue(argv, ++i, arg));
    else if (arg === "--anchor-file") parsed.anchorFile = requireValue(argv, ++i, arg);
    else throw new Error(`Unknown argument: ${arg}`);
  }

  return parsed;
}

function applyCityOverride(scenario, rawCities) {
  if (rawCities == null || rawCities.length === 0) return scenario;
  const cities = [];
  const seen = new Set();
  for (const rawCity of rawCities) {
    const market = marketForIdOrAlias(rawCity);
    if (!market) {
      throw new Error(`Unknown seed city or market: ${rawCity}`);
    }
    const city = scenarioCityKeyForMarket(market);
    if (seen.has(city)) continue;
    seen.add(city);
    cities.push(city);
  }
  return {
    ...scenario,
    cities,
  };
}

function resolveSeedScenario(name) {
  if (scenarios[name]) return scenarios[name];
  let config;
  try {
    config = loadScenarioConfig(name);
  } catch {
    throw new Error(`Unknown scenario "${name}". Use --list-scenarios.`);
  }
  if (!config.seedWorld) {
    throw new Error(
      `Demo scenario "${name}" does not define seedWorld. Use demo_ops scenario-info for non-seed readiness scenarios.`
    );
  }
  return normalizeSeedWorldScenario(config);
}

// A demo world's generator casts the world's own people and host; an older
// generator-only scenario draws from the default persona catalog.
function normalizeSeedWorldScenario(config) {
  return {
    description: config.seedWorld.description ?? config.description,
    sourceScenarioId: config.id,
    cities: config.seedWorld.cities,
    usersPerCity: config.seedWorld.usersPerCity,
    clubsPerCity: config.seedWorld.clubsPerCity,
    eventsPerClub: config.seedWorld.eventsPerClub,
    anchorsPerRun: config.seedWorld.anchorsPerRun,
    preferPaidEvents: config.seedWorld.preferPaidEvents === true,
    eventPatterns: config.seedWorld.eventPatterns ?? null,
    castPersonaIds: isDemoWorld(config) ?
      [config.host.personaId, ...config.people.map((person) => person.personaId)] :
      null,
  };
}

function requireValue(argv, index, flag) {
  const value = argv[index];
  if (!value || value.startsWith("--")) {
    throw new Error(`${flag} requires a value.`);
  }
  return value;
}

function splitCsv(value) {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

function loadAnchorSpecs(parsed) {
  const result = {
    users: new Set(parsed.anchorUsers),
    phones: new Set(parsed.anchorPhones),
  };
  if (!parsed.anchorFile) {
    return {
      users: [...result.users],
      phones: [...result.phones],
    };
  }

  const filePath = path.resolve(process.cwd(), parsed.anchorFile);
  const raw = fs.readFileSync(filePath, "utf8");
  if (filePath.endsWith(".json")) {
    const json = JSON.parse(raw);
    for (const uid of json.uids ?? json.users ?? []) result.users.add(uid);
    for (const phone of json.phones ?? json.phoneNumbers ?? []) result.phones.add(phone);
  } else {
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      if (trimmed.startsWith("+")) result.phones.add(trimmed);
      else result.users.add(trimmed);
    }
  }
  return {
    users: [...result.users],
    phones: [...result.phones],
  };
}

async function loadAnchorProfiles(firestore, anchorSpecs) {
  const byUid = new Map();
  for (const uid of anchorSpecs.users) {
    const doc = await firestore.collection("users").doc(uid).get();
    if (!doc.exists) throw new Error(`Anchor user not found: users/${uid}`);
    byUid.set(uid, anchorProfileFromUserDoc(uid, doc.data()));
  }
  for (const phone of anchorSpecs.phones) {
    const snap = await firestore.collection("users")
      .where("phoneNumber", "==", phone)
      .limit(2)
      .get();
    if (snap.empty) throw new Error(`Anchor phone number not found in users: ${phone}`);
    if (snap.size > 1) throw new Error(`Anchor phone number matched multiple users: ${phone}`);
    const doc = snap.docs[0];
    byUid.set(doc.id, anchorProfileFromUserDoc(doc.id, doc.data()));
  }
  return [...byUid.values()].sort((a, b) => a.uid.localeCompare(b.uid));
}

function anchorProfileFromUserDoc(uid, data) {
  const market = marketForIdOrAlias(data.city) ?? marketForScenarioCity("mumbai");
  const scenarioCity = scenarioCityKeyForMarket(market);
  const firstName = data.firstName || firstWord(data.displayName || data.name || "Runner");
  const displayName = data.displayName || firstName;
  const gender = validGender(data.gender) ? data.gender : "other";
  const profilePhotos = normalizedProfilePhotos({uid, ...data});
  return {
    uid,
    firstName,
    name: data.name || displayName,
    displayName,
    gender,
    city: scenarioCity,
    marketId: market.marketId,
    latitude: typeof data.latitude === "number" ? data.latitude : market.latitude,
    longitude: typeof data.longitude === "number" ? data.longitude : market.longitude,
    age: ageFromTimestamp(data.dateOfBirth) ?? 30,
    profilePhotos,
    source: "anchor",
  };
}

async function findMissingPublicProfiles(firestore, uids) {
  const missing = [];
  for (const uid of uids) {
    const doc = await firestore.collection("publicProfiles").doc(uid).get();
    if (!doc.exists) missing.push(uid);
  }
  return missing;
}

function buildSeed({
  scenarioName,
  scenario,
  seedPrefix,
  anchorProfiles,
  personaProjection,
  now,
  includeScheduleLocks = false,
}) {
  const seedId = `${seedPrefix}_${scenarioName}`;
  const seedMarker = {
    synthetic: true,
    seedPrefix,
    scenario: scenarioName,
  };
  const users = buildSyntheticUsers({
    scenario,
    seedPrefix,
    seedMarker,
    personaProjection,
  });
  const clubs = [];
  const memberships = [];
  const events = [];
  const participations = [];
  const savedEvents = [];
  const swipes = [];
  const matches = [];
  const messages = [];
  const payments = [];
  const reviews = [];
  const notifications = [];
  const eventSuccessPlans = [];
  const eventSuccessPreferences = [];
  const eventSuccessCompatibilityResponses = [];
  const eventSuccessWingmanRequests = [];
  const eventSuccessAssignments = [];
  const eventSuccessFeedback = [];
  const eventSuccessScorecards = [];

  for (const city of scenario.cities) {
    const cityAnchors = anchorProfiles.filter((person) => person.city === city);
    const syntheticCityUsers = users.filter((person) => person.city === city);
    for (let clubIndex = 0; clubIndex < scenario.clubsPerCity; clubIndex += 1) {
      const host = syntheticCityUsers[clubIndex % syntheticCityUsers.length] ?? users[clubIndex % users.length];
      const club = buildClub({seedPrefix, seedMarker, city, clubIndex, host});
      clubs.push(club);

      const clubMembers = uniqueByUid([
        host,
        ...cityAnchors.slice(0, scenario.anchorsPerRun),
        ...rotate(syntheticCityUsers, clubIndex).slice(0, Math.min(10, syntheticCityUsers.length)),
      ]);
      for (const member of clubMembers) {
        memberships.push(buildMembership({seedMarker, clubId: club.id, uid: member.uid, role: member.uid === host.uid ? "owner" : "member", now}));
      }

      for (let runIndex = 0; runIndex < scenario.eventsPerClub; runIndex += 1) {
        const event = buildEvent({
          seedPrefix,
          seedMarker,
          scenario,
          city,
          club,
          runIndex,
          clubIndex,
          now,
          preferPaid: scenario.preferPaidEvents,
        });
        const roster = buildRoster({event, runIndex, clubMembers, anchorProfiles: cityAnchors});
        applyRosterAggregates(event, roster);
        const eventSuccessDocs = buildEventSuccessDocs({
          seedMarker,
          event,
          roster,
          now,
        });
        eventSuccessPlans.push(...eventSuccessDocs.plans);
        eventSuccessPreferences.push(...eventSuccessDocs.preferences);
        eventSuccessCompatibilityResponses.push(...eventSuccessDocs.compatibilityResponses);
        eventSuccessWingmanRequests.push(...eventSuccessDocs.wingmanRequests);
        eventSuccessAssignments.push(...eventSuccessDocs.assignments);
        eventSuccessFeedback.push(...eventSuccessDocs.feedback);
        eventSuccessScorecards.push(...eventSuccessDocs.scorecards);
        events.push(event);
        for (const rosterEntry of roster) {
          participations.push(buildParticipation({seedMarker, event, entry: rosterEntry, now}));
          if (rosterEntry.paymentState) {
            payments.push(buildPayment({seedPrefix, seedMarker, event, uid: rosterEntry.person.uid, state: rosterEntry.paymentState, now}));
          }
        }
        for (const anchor of cityAnchors.slice(0, Math.min(2, cityAnchors.length))) {
          if (runIndex === 0 || runIndex === 1) {
            savedEvents.push(buildSavedEvent({seedMarker, uid: anchor.uid, eventId: event.id, now}));
          }
        }
        if (event.kind === "pastOpen") {
          const relationshipDocs = buildSwipeMatchDocs({
            seedPrefix,
            seedMarker,
            event,
            roster,
            anchorProfiles,
            now,
          });
          swipes.push(...relationshipDocs.swipes);
          matches.push(...relationshipDocs.matches);
          messages.push(...relationshipDocs.messages);
          notifications.push(...relationshipDocs.notifications);
        }
        if (event.kind === "pastOld") {
          reviews.push(...buildReviews({seedPrefix, seedMarker, club, event, roster, now}));
        }
      }
    }
  }

  updateClubAggregates({clubs, memberships, reviews, events});
  notifications.push(...buildGeneralNotifications({seedMarker, anchorProfiles, clubs, events, now}));
  payments.push(...buildPaymentHistoryEdges({seedPrefix, seedMarker, anchorProfiles, events, now}));
  const suvbotDocs = buildSuvbotSeedDocs({seedPrefix, seedMarker, anchorProfiles, now});
  assertScheduleCompliance({events, participations});
  assertRunCoordinateQuality({events});
  const scheduleLocks = includeScheduleLocks ?
    buildScheduleLockDocs({events, participations}) :
    [];

  const docs = [
    ...users.flatMap((user) => [
      {path: `users/${user.uid}`, data: user.userDoc},
      {path: `publicProfiles/${user.uid}`, data: user.publicProfileDoc},
    ]),
    ...clubs.map((club) => ({path: `clubs/${club.id}`, data: club.doc})),
    ...memberships.map((membership) => ({path: `clubMemberships/${membership.id}`, data: membership.doc})),
    ...events.map((event) => ({path: `events/${event.id}`, data: event.doc})),
    ...participations.map((participation) => ({path: `eventParticipations/${participation.id}`, data: participation.doc})),
    ...eventSuccessPlans.map((plan) => ({path: `eventSuccessPlans/${plan.id}`, data: plan.doc})),
    ...eventSuccessPreferences.map((preference) => ({path: `eventSuccessPreferences/${preference.id}`, data: preference.doc})),
    ...eventSuccessCompatibilityResponses.map((response) => ({path: `eventSuccessCompatibilityResponses/${response.id}`, data: response.doc})),
    ...eventSuccessWingmanRequests.map((request) => ({path: `eventSuccessWingmanRequests/${request.id}`, data: request.doc})),
    ...eventSuccessAssignments.map((assignment) => ({path: `eventSuccessAssignments/${assignment.id}`, data: assignment.doc})),
    ...eventSuccessFeedback.map((feedback) => ({path: `eventSuccessFeedback/${feedback.id}`, data: feedback.doc})),
    ...eventSuccessScorecards.map((scorecard) => ({path: `eventSuccessScorecards/${scorecard.id}`, data: scorecard.doc})),
    ...scheduleLocks,
    ...savedEvents.map((savedEvent) => ({path: `savedEvents/${savedEvent.id}`, data: savedEvent.doc})),
    ...swipes.map((swipe) => ({path: `profileDecisions/${swipe.swiperId}/outgoing/${swipe.targetId}`, data: swipe.doc})),
    ...matches.map((match) => ({path: `matches/${match.id}`, data: match.doc})),
    ...messages.map((message) => ({path: `matches/${message.matchId}/messages/${message.id}`, data: message.doc})),
    ...payments.map((payment) => ({path: `payments/${payment.id}`, data: payment.doc})),
    ...reviews.map((review) => ({path: `reviews/${review.id}`, data: review.doc})),
    ...notifications.map((notification) => ({
      path: `notifications/${notification.uid}/items/${notification.id}`,
      data: notification.doc,
    })),
    ...suvbotDocs,
  ];
  const uniqueDocs = uniqueDocsByPath(docs);
  const manifestId = seedId.replace(/[^A-Za-z0-9_-]/g, "_");
  const manifest = {
    ...seedMarker,
    seedId,
    manifestId,
    generatedAt: admin.firestore.Timestamp.fromDate(now),
    anchorUserIds: anchorProfiles.map((profile) => profile.uid),
    counts: countDocs(uniqueDocs),
    paths: uniqueDocs.map((doc) => doc.path),
  };

  return {
    seedId,
    manifestId,
    docs: uniqueDocs,
    manifest,
    counts: manifest.counts,
  };
}

function buildSyntheticUsers({scenario, seedPrefix, seedMarker, personaProjection}) {
  const users = [];
  const usedDisplayNames = new Set();
  const personas = personaProjection.personas;
  let index = 0;
  for (const city of scenario.cities) {
    const cityMeta = cityMetaForScenarioCity(city);
    const market = cityMeta.market;
    for (let cityUserIndex = 0; cityUserIndex < scenario.usersPerCity; cityUserIndex += 1) {
      const uid = `${seedPrefix}_user_${String(index + 1).padStart(3, "0")}`;
      const persona = personas[index % personas.length];
      const firstName = persona.firstName;
      const lastName = persona.lastName;
      const gender = persona.gender;
      const displayName = uniqueSyntheticDisplayName({
        firstName: persona.displayName,
        lastName: "",
        city,
        usedDisplayNames,
      });
      const lat = cityMeta.lat + (((index % 7) - 3) * 0.008);
      const lng = cityMeta.lng + ((((index + 3) % 7) - 3) * 0.008);
      const profilePrompts = profilePromptsFromProjection(persona);
      const profilePhotosForUser = profilePhotosFromProjection({
        uid,
        persona,
      });
      const dateOfBirth = timestampFromBirthDate(persona.dateOfBirth);
      const age = ageFromTimestamp(dateOfBirth) ?? 30;
      const activityPreferences = {
        running: {
          paceMinSecsPerKm: 275 + (index % 5) * 15,
          paceMaxSecsPerKm: 375 + (index % 5) * 20,
          preferredDistances: [["fiveK", "tenK"], ["tenK"], ["halfMarathon"], ["fiveK", "halfMarathon"]][index % 4],
          runningReasons: [["fitness", "social"], ["community", "mindfulness"], ["challenge", "raceTraining"]][index % 3],
          preferredRunTimes: [["morning"], ["evening"], ["earlyMorning"], ["morning", "evening"], ["afternoon"]][index % 5],
          version: 1,
        },
      };
      const userDoc = {
        ...seedMarker,
        name: `${firstName} ${lastName}`,
        firstName,
        lastName,
        displayName,
        dateOfBirth,
        gender,
        phoneNumber: `+919900${String(index + 1).padStart(6, "0")}`,
        profileComplete: true,
        email: `${emailSegment(firstName)}.${emailSegment(lastName)}.${index + 1}@example.test`,
        profilePrompts,
        instagramHandle: `${firstName.toLowerCase()}events${index + 1}`,
        profilePhotos: profilePhotosForUser,
        city: market.marketId,
        latitude: lat,
        longitude: lng,
        interestedInGenders: interestedInFor(gender, index),
        minAgePreference: 22,
        maxAgePreference: 42,
        height: persona.heightCm ?? 155 + (index % 38),
        occupation: persona.occupation ?? occupations[index % occupations.length],
        company: persona.company ?? companies[index % companies.length],
        education: ["bachelors", "masters", "someCollege", "phd", "tradeSchool"][index % 5],
        religion: ["hindu", "muslim", "christian", "sikh", "jain", "nonReligious"][index % 6],
        languages: languageSet(city, index),
        relationshipGoal: ["relationship", "casual", "marriage", "friendship", "unsure"][index % 5],
        drinking: ["never", "socially", "often"][index % 3],
        smoking: ["never", "occasionally", "never"][index % 3],
        workout: ["sometimes", "often", "everyday"][index % 3],
        diet: ["omnivore", "vegetarian", "vegan", "jain"][index % 4],
        children: ["dontHave", "wantSomeday", "dontWant"][index % 3],
        activityPreferences,
        prefsNewCatches: true,
        prefsMessages: true,
        prefsEventReminders: true,
        prefsRunStatusUpdates: true,
        prefsClubUpdates: true,
        prefsWeeklyDigest: index % 3 === 0,
        prefsShowOnMap: true,
      };
      users.push({
        uid,
        firstName,
        name: userDoc.name,
        displayName,
        gender,
        city,
        marketId: market.marketId,
        age,
        latitude: lat,
        longitude: lng,
        profilePhotos: profilePhotosForUser,
        source: "synthetic",
        userDoc,
        publicProfileDoc: publicProfileFromUserDoc(userDoc),
      });
      index += 1;
    }
  }
  return users;
}

function uniqueSyntheticDisplayName({firstName, lastName, city, usedDisplayNames}) {
  const base = [firstName, lastName].filter((part) =>
    typeof part === "string" && part.trim().length > 0
  ).join(" ");
  if (!usedDisplayNames.has(base)) {
    usedDisplayNames.add(base);
    return base;
  }

  const cityLabel = cityData[city]?.label ?? city;
  let candidate = `${base} (${cityLabel})`;
  let suffix = 2;
  while (usedDisplayNames.has(candidate)) {
    candidate = `${base} (${cityLabel} ${suffix})`;
    suffix += 1;
  }
  usedDisplayNames.add(candidate);
  return candidate;
}

function emailSegment(value) {
  return String(value || "demo")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .replace(/^$/, "demo");
}

export function publicProfileFromUserDoc(userDoc) {
  return {
    synthetic: userDoc.synthetic,
    seedPrefix: userDoc.seedPrefix,
    scenario: userDoc.scenario,
    name: userDoc.displayName || userDoc.firstName || firstWord(userDoc.name),
    age: ageFromTimestamp(userDoc.dateOfBirth) ?? 30,
    gender: userDoc.gender,
    profilePrompts: Array.isArray(userDoc.profilePrompts) ?
      userDoc.profilePrompts :
      [],
    profilePhotos: normalizedProfilePhotos(userDoc),
    city: userDoc.city,
    height: userDoc.height,
    occupation: userDoc.occupation,
    company: userDoc.company,
    education: userDoc.education,
    religion: userDoc.religion,
    languages: userDoc.languages,
    relationshipGoal: userDoc.relationshipGoal,
    drinking: userDoc.drinking,
    smoking: userDoc.smoking,
    workout: userDoc.workout,
    diet: userDoc.diet,
    children: userDoc.children,
    activityPreferences: normalizedActivityPreferences(userDoc),
  };
}

export function thumbnailUrlForPhoto(photoUrl) {
  if (typeof photoUrl !== "string" || photoUrl.length === 0) return null;
  try {
    const url = new URL(photoUrl);
    if (url.hostname === "images.unsplash.com") {
      url.searchParams.set("auto", "format");
      url.searchParams.set("fit", "crop");
      url.searchParams.set("crop", "faces");
      url.searchParams.set("w", "160");
      url.searchParams.set("h", "160");
      url.searchParams.set("q", "55");
      return url.toString();
    }
  } catch {
    return photoUrl;
  }
  return photoUrl;
}

function normalizedPhotoThumbnailUrls(userDoc) {
  if (
    Array.isArray(userDoc.photoThumbnailUrls) &&
    userDoc.photoThumbnailUrls.length > 0
  ) {
    return userDoc.photoThumbnailUrls;
  }
  const photoUrls = Array.isArray(userDoc.photoUrls) ? userDoc.photoUrls : [];
  return photoUrls
    .map((photoUrl) => thumbnailUrlForPhoto(photoUrl))
    .filter((photoUrl) => typeof photoUrl === "string" && photoUrl.length > 0);
}

function normalizedProfilePhotos(userDoc) {
  if (Array.isArray(userDoc.profilePhotos) && userDoc.profilePhotos.length > 0) {
    return userDoc.profilePhotos;
  }
  return profilePhotosFromLegacyArrays({
    uid: userDoc.uid ?? "seed",
    photoUrls: Array.isArray(userDoc.photoUrls) ? userDoc.photoUrls : [],
    photoThumbnailUrls: normalizedPhotoThumbnailUrls(userDoc),
    photoPrompts: Array.isArray(userDoc.photoPrompts) ? userDoc.photoPrompts : [],
  });
}

function normalizedActivityPreferences(userDoc) {
  const running = userDoc.activityPreferences?.running ?? {};
  return {
    running: {
      paceMinSecsPerKm: running.paceMinSecsPerKm ??
        userDoc.paceMinSecsPerKm ??
        300,
      paceMaxSecsPerKm: running.paceMaxSecsPerKm ??
        userDoc.paceMaxSecsPerKm ??
        420,
      preferredDistances: running.preferredDistances ??
        userDoc.preferredDistances ??
        [],
      runningReasons: running.runningReasons ??
        userDoc.runningReasons ??
        [],
      preferredRunTimes: running.preferredRunTimes ??
        userDoc.preferredRunTimes ??
        [],
      version: running.version ?? userDoc.runPreferencesVersion ?? 0,
    },
  };
}

function profilePhotosFromLegacyArrays({
  uid,
  photoUrls,
  photoThumbnailUrls,
  photoPrompts,
}) {
  const promptsByIndex = new Map(
    (photoPrompts ?? []).map((prompt) => [prompt.photoIndex, prompt])
  );
  return (photoUrls ?? []).map((photoUrl, index) => {
    const storagePath = storagePathForSeedPhoto(uid, photoUrl, index);
    return {
      id: profilePhotoIdForStoragePath(storagePath, index),
      url: photoUrl,
      thumbnailUrl: photoThumbnailUrls[index] ?? photoUrl,
      storagePath,
      thumbnailStoragePath: thumbnailStoragePathForStoragePath(storagePath),
      prompt: promptsByIndex.get(index) ?? null,
      moderation: null,
      position: index,
      createdAt: admin.firestore.Timestamp.fromMillis(0),
      updatedAt: admin.firestore.Timestamp.fromMillis(0),
    };
  });
}

function thumbnailStoragePathForStoragePath(storagePath) {
  const parts = storagePath.split("/");
  if (parts.length >= 4 && parts[0] === "users" && parts[2] === "photos") {
    const sourceName = (parts[parts.length - 1] ?? "").replace(/\.[^.]+$/, "");
    return `users/${parts[1]}/photoThumbnails/${sourceName}.jpg`;
  }
  return `${storagePath}.thumbnail.jpg`;
}

function storagePathForSeedPhoto(uid, photoUrl, index) {
  const parsedPath = storagePathFromFirebaseDownloadUrl(photoUrl);
  if (parsedPath) return parsedPath;
  return `users/${uid}/photos/${index}.jpg`;
}

function primaryProfilePhotoUrl(profilePhotos) {
  if (!Array.isArray(profilePhotos)) return null;
  const photo = profilePhotos.find((candidate) =>
    typeof candidate?.url === "string" && candidate.url.length > 0
  );
  return photo?.url ?? null;
}

function primaryProfilePhotoThumbnailUrl(profilePhotos) {
  if (!Array.isArray(profilePhotos)) return null;
  const photo = profilePhotos.find((candidate) =>
    typeof candidate?.thumbnailUrl === "string" &&
    candidate.thumbnailUrl.length > 0
  );
  return photo?.thumbnailUrl ?? primaryProfilePhotoUrl(profilePhotos);
}

function storagePathFromFirebaseDownloadUrl(value) {
  try {
    const url = new URL(value);
    const segments = url.pathname.split("/").filter(Boolean);
    const objectMarkerIndex = segments.indexOf("o");
    if (objectMarkerIndex < 0 || objectMarkerIndex + 1 >= segments.length) {
      return null;
    }
    return decodeURIComponent(segments[objectMarkerIndex + 1]);
  } catch {
    return null;
  }
}

function profilePhotoIdForStoragePath(storagePath, position) {
  const fileName = storagePath.split("/").pop() ?? "";
  const withoutExtension = fileName.replace(/\.[^.]+$/, "");
  const normalized = withoutExtension
    .replace(/[^A-Za-z0-9_-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
  return normalized || `photo_${position}`;
}

function buildClub({seedPrefix, seedMarker, city, clubIndex, host}) {
  const cityMeta = cityMetaForScenarioCity(city);
  const market = cityMeta.market;
  const area = cityMeta.areas[clubIndex % cityMeta.areas.length];
  const id = `${seedPrefix}_club_${city}_${String(clubIndex + 1).padStart(2, "0")}`;
  const hostName = host.displayName || host.firstName;
  const hostAvatarUrl = primaryProfilePhotoThumbnailUrl(host.profilePhotos);
  return {
    id,
    city,
    doc: {
      ...seedMarker,
      name: `${area} Event Collective`,
      description: `Social ${cityMeta.label} events for easy kilometres, coffee stops, and reliable weekend training.`,
      location: market.marketId,
      locationCityId: market.cityId,
      locationMarketId: market.marketId,
      cityName: market.cityLabel,
      regionName: market.regionName,
      countryCode: market.countryIsoCode,
      countryName: market.countryName,
      area,
      hostUserId: host.uid,
      hostName,
      hostAvatarUrl,
      ownerUserId: host.uid,
      hostUserIds: [host.uid],
      hostProfiles: [{
        uid: host.uid,
        displayName: hostName,
        avatarUrl: hostAvatarUrl,
        role: "owner",
      }],
      createdAt: admin.firestore.Timestamp.fromDate(daysFromNow(-35 - clubIndex)),
      imageUrl: clubImages[clubIndex % clubImages.length],
      profileImageUrl: null,
      tags: ["social", clubIndex % 2 === 0 ? "beginner-friendly" : "tempo", cityMeta.label.toLowerCase()],
      memberCount: 0,
      rating: 0,
      reviewCount: 0,
      nextEventAt: null,
      nextEventLabel: null,
      instagramHandle: `${area.toLowerCase().replace(/\s+/g, "")}events`,
      phoneNumber: `+918800${String(clubIndex + 1).padStart(6, "0")}`,
      email: `${area.toLowerCase().replace(/\s+/g, ".")}@catch.demo`,
      status: "active",
      archived: false,
      archivedAt: null,
      archiveReason: null,
    },
  };
}

function buildMembership({seedMarker, clubId, uid, role, now}) {
  return {
    id: `${clubId}_${uid}`,
    doc: {
      ...seedMarker,
      clubId,
      uid,
      role,
      status: "active",
      pushNotificationsEnabled: true,
      joinedAt: admin.firestore.Timestamp.fromDate(offsetDate(now, {days: -18})),
      leftAt: null,
      deletedAt: null,
    },
  };
}

function buildEvent({
  seedPrefix,
  seedMarker,
  scenario,
  city,
  club,
  runIndex,
  clubIndex,
  now,
  preferPaid,
}) {
  const cityMeta = cityMetaForScenarioCity(city);
  const market = cityMeta.market;
  const patterns = scenario.eventPatterns ?? defaultEventPatterns(preferPaid);
  const pattern = patterns[runIndex % patterns.length];
  const start = offsetDate(now, {hours: pattern.offsetHours + clubIndex * 8 + runIndex * 2});
  const end = offsetDate(start, {minutes: pattern.durationMinutes});
  const id = `${seedPrefix}_run_${city}_${String(clubIndex + 1).padStart(2, "0")}_${String(runIndex + 1).padStart(2, "0")}`;
  const pace = ["easy", "moderate", "fast", "competitive"][runIndex % 4];
  const meetingPoint = meetingPointForRun({
    city,
    clubIndex,
    runIndex,
    key: pattern.meetingPointKey,
  });
  const eventFormat = seedEventFormatForRun(runIndex, pattern.activityKind);
  const isSinglesMixer = eventFormat.activityKind === "singlesMixer";
  const locationDetails = isSinglesMixer ?
    "Check in with the host near the Catch table." :
    meetingPoint.detail;
  return {
    id,
    clubId: club.id,
    city,
    cityMarketId: market.marketId,
    kind: pattern.kind,
    priceInPaise: pattern.price,
    doc: {
      ...seedMarker,
      clubId: club.id,
      startTime: admin.firestore.Timestamp.fromDate(start),
      endTime: admin.firestore.Timestamp.fromDate(end),
      meetingPoint: meetingPoint.label,
      meetingLocation: {
        name: meetingPoint.label,
        address: null,
        placeId: null,
        latitude: meetingPoint.lat,
        longitude: meetingPoint.lng,
        notes: locationDetails,
      },
      startingPointLat: meetingPoint.lat,
      startingPointLng: meetingPoint.lng,
      locationDetails,
      eventFormat,
      distanceKm: isSinglesMixer ? 0 : [3, 5, 7, 10, 12, 15][runIndex % 6],
      pace,
      capacityLimit: pattern.capacity,
      description: isSinglesMixer ?
        `${cityMeta.label} singles mixer with guided rotations, quick questions, and a live reveal.` :
        `${cityMeta.label} ${pace} event with a seeded roster for end-to-end testing.`,
      priceInPaise: pattern.price,
      bookedCount: 0,
      checkedInCount: 0,
      waitlistedCount: 0,
      status: pattern.kind === "cancelled" ? "cancelled" : "active",
      cancelledAt: pattern.kind === "cancelled" ?
        admin.firestore.Timestamp.fromDate(offsetDate(now, {days: -1})) :
        null,
      cancellationReason: pattern.kind === "cancelled" ? "Demo cancellation state." : null,
      constraints: {
        minAge: 21,
        maxAge: 45,
        maxMen: runIndex % 3 === 0 ? 8 : null,
        maxWomen: runIndex % 4 === 0 ? 8 : null,
      },
      eventPolicy: eventPolicyForSeedEvent({
        capacityLimit: pattern.capacity,
        priceInPaise: pattern.price,
        kind: pattern.kind,
      }),
      genderCounts: {},
      cohortCounts: {},
      waitlistedCohortCounts: {},
    },
  };
}

function defaultEventPatterns(preferPaid) {
  return [
    {kind: "upcomingFree", offsetHours: 30, price: 0, capacity: 12, durationMinutes: 70, activityKind: "singlesMixer"},
    {kind: "upcomingPaid", offsetHours: 84, price: preferPaid ? 79900 : 29900, capacity: 10, durationMinutes: 80, activityKind: "socialRun"},
    {kind: "upcomingFull", offsetHours: 168, price: preferPaid ? 49900 : 0, capacity: 6, durationMinutes: 60, activityKind: "socialRun"},
    {kind: "upcomingWaitlist", offsetHours: 336, price: 0, capacity: 5, durationMinutes: 65, activityKind: "socialRun"},
    {kind: "pastOpen", offsetHours: -8, price: 0, capacity: 14, durationMinutes: 60, activityKind: "singlesMixer"},
    {kind: "pastOld", offsetHours: -120, price: preferPaid ? 39900 : 0, capacity: 14, durationMinutes: 75, activityKind: "socialRun"},
    {kind: "cancelled", offsetHours: 220, price: 0, capacity: 10, durationMinutes: 70, activityKind: "socialRun"},
    {kind: "upcomingFree", offsetHours: 504, price: 0, capacity: 16, durationMinutes: 90, activityKind: "socialRun"},
  ];
}

function seedEventFormatForRun(runIndex, activityKind = null) {
  if (activityKind) return eventFormatForActivityKind(activityKind);
  if (runIndex % 4 === 0) return singlesMixerEventFormat();
  return socialRunEventFormat();
}

function eventFormatForActivityKind(activityKind) {
  if (activityKind === "singlesMixer") return singlesMixerEventFormat();
  if (activityKind === "dinner") {
    return {
      version: 1,
      activityKind: "dinner",
      interactionModel: "seatedTable",
      defaultPlaybookId: "dinner_table_mixer",
    };
  }
  if (activityKind === "pickleball") {
    return {
      version: 1,
      activityKind: "pickleball",
      interactionModel: "pairedRotations",
      defaultPlaybookId: "pickleball_rotations",
    };
  }
  return socialRunEventFormat();
}

function socialRunEventFormat() {
  return {
    version: 1,
    activityKind: "socialRun",
    interactionModel: "pacePods",
    defaultPlaybookId: "social_run_light",
  };
}

function singlesMixerEventFormat() {
  return {
    version: 1,
    activityKind: "singlesMixer",
    interactionModel: "pairedRotations",
    defaultPlaybookId: "algorithmic_mixer_reveal",
    defaultModuleIds: [
      "qr_check_in",
      "guided_rotations",
      "live_reveal",
      "compatibility_questionnaire",
      "wingman_requests",
      "decomposed_feedback",
      "host_analytics",
      "safety_controls",
    ],
    activityDetails: {
      formatLabel: "Singles live reveal",
      primaryMoment: "Live reveal",
    },
  };
}

function meetingPointForRun({city, clubIndex, runIndex, key = null}) {
  const points = meetingPointData[city] ?? [];
  if (key) {
    const point = points.find((item) => item.key === key);
    if (point) return point;
  }
  if (points.length === 0) {
    const cityMeta = cityMetaForScenarioCity(city);
    return {
      label: `${cityMeta.label} demo meeting point`,
      lat: cityMeta.lat,
      lng: cityMeta.lng,
      detail: "Meet near the Catch demo pacer.",
    };
  }
  return points[(clubIndex + runIndex) % points.length];
}

function eventPolicyForSeedEvent({capacityLimit, priceInPaise, kind}) {
  const waitlistMode = kind === "upcomingWaitlist" ?
    "rankedOffer" :
    "disabled";
  return {
    version: 1,
    admission: {
      format: "balancedRatio",
      capacityLimit,
      waitlistPolicy: {mode: waitlistMode, offerWindowMinutes: waitlistMode === "disabled" ? 0 : 20},
      inviteRequired: false,
      membershipRequired: false,
      manualApprovalRequired: false,
      privateAccessPolicy: {
        mode: "none",
        inviteCodeHint: null,
        privateLinkEnabled: false,
      },
      cohortCapacityLimits: {},
      balancedRatioPolicy: {
        leftCohortId: "menInterestedInWomen",
        rightCohortId: "womenInterestedInMen",
        maxSkew: 2,
        openingBufferPerCohort: 2,
        outOfRatioCohortPolicy: "waitlist",
      },
    },
    pricing: {
      basePriceInPaise: priceInPaise,
      cohortAdjustmentsInPaise: {},
      demandPricingRules: [],
    },
    cancellation: {policyId: "standard"},
    settlement: {hostPayoutTiming: "afterEventCompletion"},
  };
}

function assertRunCoordinateQuality({events}) {
  const issues = [];
  for (const event of events) {
    if (event.doc.status === "cancelled") continue;
    const lat = event.doc.startingPointLat;
    const lng = event.doc.startingPointLng;
    if (typeof lat !== "number" || typeof lng !== "number") {
      issues.push(`${event.id}: missing exact starting coordinates`);
      continue;
    }

    const knownPoint = (meetingPointData[event.city] ?? []).find(
      (point) => point.label === event.doc.meetingPoint
    );
    if (!knownPoint) {
      issues.push(`${event.id}: meeting point is not in the curated venue catalog`);
      continue;
    }
    if (Math.abs(knownPoint.lat - lat) > 0.000001 ||
        Math.abs(knownPoint.lng - lng) > 0.000001) {
      issues.push(`${event.id}: coordinates do not match curated venue catalog`);
    }
  }

  if (issues.length > 0) {
    throw new Error(
      "Demo event coordinates are not map/check-in ready:\n" +
        issues.map((issue) => `- ${issue}`).join("\n")
    );
  }
}

function buildRoster({event, runIndex, clubMembers, anchorProfiles}) {
  if (event.kind === "cancelled") return [];
  const members = uniqueByUid([...anchorProfiles, ...rotate(clubMembers, runIndex)]);
  const signedCount = event.kind === "upcomingFull" || event.kind === "upcomingWaitlist" ?
    event.doc.capacityLimit :
    Math.min(event.doc.capacityLimit - 1, 6 + (runIndex % 4));
  const attendedCount = event.kind === "pastOpen" || event.kind === "pastOld" ?
    Math.min(event.doc.capacityLimit, Math.max(6, members.length)) :
    0;
  const roster = [];

  if (attendedCount > 0) {
    for (const person of members.slice(0, attendedCount)) {
      roster.push({person, status: "attended"});
    }
    return roster;
  }

  for (const person of members.slice(0, signedCount)) {
    roster.push({
      person,
      status: "signedUp",
      paymentState: event.priceInPaise > 0 ? "completed" : null,
    });
  }
  if (event.kind === "upcomingWaitlist") {
    for (const person of members.slice(signedCount, signedCount + 3)) {
      roster.push({person, status: "waitlisted"});
    }
  }
  if (event.kind === "upcomingFree" && members[signedCount]) {
    roster.push({person: members[signedCount], status: "cancelled"});
  }
  return roster;
}

function applyRosterAggregates(event, roster) {
  const booked = roster.filter((entry) => entry.status === "signedUp" || entry.status === "attended");
  const attended = roster.filter((entry) => entry.status === "attended");
  const waitlisted = roster.filter((entry) => entry.status === "waitlisted");
  event.doc.bookedCount = booked.length;
  event.doc.checkedInCount = attended.length;
  event.doc.waitlistedCount = waitlisted.length;
  event.doc.genderCounts = {};
  event.doc.cohortCounts = {};
  event.doc.waitlistedCohortCounts = {};
  for (const entry of booked) {
    const gender = entry.person.gender || "other";
    event.doc.genderCounts[gender] = (event.doc.genderCounts[gender] ?? 0) + 1;
    const cohort = cohortIdForSeedPerson(entry.person);
    event.doc.cohortCounts[cohort] = (event.doc.cohortCounts[cohort] ?? 0) + 1;
  }
  for (const entry of waitlisted) {
    const cohort = cohortIdForSeedPerson(entry.person);
    event.doc.waitlistedCohortCounts[cohort] =
      (event.doc.waitlistedCohortCounts[cohort] ?? 0) + 1;
  }
  applySeedEventDiscoveryProjection(event);
}

function applySeedEventDiscoveryProjection(event) {
  Object.assign(
    event.doc,
    eventDiscoveryProjection({
      event: event.doc,
      clubLocation: event.city,
      clubLocationMarketId: event.cityMarketId,
      bookedCount: event.doc.bookedCount,
    })
  );
}

function cohortIdForSeedPerson(person) {
  if (person.gender === "man") return "menInterestedInWomen";
  if (person.gender === "woman") return "womenInterestedInMen";
  if (person.gender === "nonBinary" || person.gender === "other") {
    return "nonBinaryOrOther";
  }
  return "queerOrOpen";
}

function buildParticipation({seedMarker, event, entry, now}) {
  const createdAt = offsetDate(now, {days: -8, minutes: stableNumber(`${event.id}_${entry.person.uid}`, 180)});
  const statusTime = entry.status === "attended" ?
    admin.firestore.Timestamp.fromDate(offsetDate(event.doc.endTime.toDate(), {minutes: 5})) :
    null;
  return {
    id: `${event.id}_${entry.person.uid}`,
    doc: {
      ...seedMarker,
      eventId: event.id,
      clubId: event.clubId,
      uid: entry.person.uid,
      status: entry.status,
      createdAt: admin.firestore.Timestamp.fromDate(createdAt),
      updatedAt: admin.firestore.Timestamp.fromDate(offsetDate(now, {hours: -2})),
      signedUpAt: ["signedUp", "attended"].includes(entry.status) ?
        admin.firestore.Timestamp.fromDate(createdAt) :
        null,
      waitlistedAt: entry.status === "waitlisted" ?
        admin.firestore.Timestamp.fromDate(createdAt) :
        null,
      attendedAt: statusTime,
      cancelledAt: entry.status === "cancelled" ?
        admin.firestore.Timestamp.fromDate(offsetDate(now, {days: -1})) :
        null,
      deletedAt: null,
      genderAtSignup: entry.person.gender || "other",
      paymentId: entry.paymentState ? paymentIdFor(event.id, entry.person.uid, entry.paymentState) : null,
    },
  };
}

function buildSavedEvent({seedMarker, uid, eventId, now}) {
  return {
    id: `${uid}_${eventId}`,
    doc: {
      ...seedMarker,
      uid,
      eventId,
      savedAt: admin.firestore.Timestamp.fromDate(offsetDate(now, {hours: -6})),
    },
  };
}

function buildEventSuccessDocs({seedMarker, event, roster, now}) {
  const empty = {
    plans: [],
    preferences: [],
    compatibilityResponses: [],
    wingmanRequests: [],
    assignments: [],
    feedback: [],
    scorecards: [],
  };
  if (!isLiveRevealSeedEvent(event)) return empty;

  const participants = roster.filter((entry) =>
    entry.status === "signedUp" || entry.status === "attended"
  );
  if (participants.length < 2) return empty;

  const createdAt = admin.firestore.Timestamp.fromDate(
    offsetDate(event.doc.startTime.toDate(), {days: -3})
  );
  const updatedAt = admin.firestore.Timestamp.fromDate(
    offsetDate(event.doc.startTime.toDate(), {days: -1})
  );
  const planStatus = eventSuccessPlanStatus(event, now);
  const revealStartedAt = planStatus === "setup" ? null :
    admin.firestore.Timestamp.fromDate(offsetDate(event.doc.startTime.toDate(), {minutes: 18}));
  const frozenAt = event.doc.bookedCount > 0 || event.doc.waitlistedCount > 0 ?
    updatedAt :
    null;
  const completedAt = planStatus === "complete" ?
    admin.firestore.Timestamp.fromDate(offsetDate(event.doc.endTime.toDate(), {minutes: 20})) :
    null;

  const plans = [{
    id: event.id,
    doc: {
      ...seedMarker,
      eventId: event.id,
      clubId: event.clubId,
      playbookId: "algorithmic_mixer_reveal",
      selectedModuleIds: [
        "qr_check_in",
        "guided_rotations",
        "live_reveal",
        "compatibility_questionnaire",
        "wingman_requests",
        "decomposed_feedback",
        "host_analytics",
        "safety_controls",
      ],
      targetAttendeeCount: Math.max(event.doc.capacityLimit, participants.length),
      structureConfig: {
        unitKind: "pairs",
        unitSize: 2,
        unitCount: Math.ceil(participants.length / 2),
        rotationIntervalMinutes: 12,
        revealCountdownSeconds: 10,
      },
      hostGoal: "Help singles meet several promising people without awkward room logistics.",
      wingmanRequestsEnabled: true,
      contextualOpenersEnabled: true,
      compatibilityAffectsRanking: true,
      questionnaireConfig: {
        templateId: "balanced",
        customTitle: "Quick match clues",
      },
      activeStepIndex: planStatus === "setup" ? 0 : 2,
      status: planStatus,
      revealStatus: planStatus === "setup" ? "idle" : "revealed",
      activeRevealRoundIndex: planStatus === "setup" ? 0 : 1,
      revealStartedAt,
      attendeePrompt: "Notice who felt easy to talk to, then use the reveal to follow up.",
      createdAt,
      updatedAt,
      frozenAt,
      completedAt,
    },
  }];

  const preferences = participants.map((entry, index) => ({
    id: `${event.id}_${entry.person.uid}`,
    doc: {
      ...seedMarker,
      eventId: event.id,
      clubId: event.clubId,
      uid: entry.person.uid,
      microPodsOptedOut: false,
      guidedRotationsOptedOut: index % 7 === 0,
      createdAt,
      updatedAt,
    },
  }));

  const compatibilityResponses = participants.slice(0, 12).map((entry, index) => ({
    id: `${event.id}_${entry.person.uid}`,
    doc: {
      ...seedMarker,
      eventId: event.id,
      clubId: event.clubId,
      uid: entry.person.uid,
      answerIds: compatibilityAnswerIdsForIndex(index),
      createdAt,
      updatedAt,
    },
  }));

  const assignments = buildEventSuccessAssignments({
    seedMarker,
    event,
    participants,
    createdAt,
    updatedAt,
  });

  const completedParticipants = participants.filter((entry) => entry.status === "attended");
  const feedback = completedParticipants.slice(0, 8).map((entry, index) => ({
    id: `${event.id}_${entry.person.uid}`,
    doc: {
      ...seedMarker,
      eventId: event.id,
      clubId: event.clubId,
      uid: entry.person.uid,
      welcomeRating: 4 + (index % 2),
      structureRating: index % 3 === 0 ? 5 : 4,
      metNewPeopleCount: 2 + (index % 4),
      safetyConcern: false,
      privateNote: index === 0 ?
        "The reveal made it easier to follow up without guessing." :
        null,
      createdAt: admin.firestore.Timestamp.fromDate(offsetDate(event.doc.endTime.toDate(), {minutes: 25 + index})),
      updatedAt: admin.firestore.Timestamp.fromDate(offsetDate(event.doc.endTime.toDate(), {minutes: 25 + index})),
    },
  }));

  const wingmanRequests = completedParticipants.length >= 2 ? [{
    id: `${event.id}_${completedParticipants[0].person.uid}`,
    doc: {
      ...seedMarker,
      eventId: event.id,
      clubId: event.clubId,
      requesterUid: completedParticipants[0].person.uid,
      targetUid: completedParticipants[1].person.uid,
      status: "active",
      hostVisibleConsent: true,
      note: "Could you help us find each other after the reveal?",
      createdAt: admin.firestore.Timestamp.fromDate(offsetDate(event.doc.endTime.toDate(), {minutes: 18})),
      updatedAt: admin.firestore.Timestamp.fromDate(offsetDate(event.doc.endTime.toDate(), {minutes: 18})),
    },
  }] : [];

  const catchSentCount = Math.min(
    completedParticipants.length,
    Math.max(0, Math.round(completedParticipants.length * 0.7))
  );
  const attendeesWhoCaughtSomeone = Math.min(
    completedParticipants.length,
    Math.max(0, Math.round(completedParticipants.length * 0.55))
  );
  const catchRecipientCount = Math.min(
    completedParticipants.length,
    Math.max(0, Math.round(completedParticipants.length * 0.6))
  );

  const scorecards = feedback.length > 0 ? [{
    id: event.id,
    doc: {
      ...seedMarker,
      eventId: event.id,
      clubId: event.clubId,
      bookedCount: event.doc.bookedCount,
      checkedInCount: event.doc.checkedInCount,
      feedbackCount: feedback.length,
      attendeesWhoMetTwoPlusPeople: feedback.filter((doc) => doc.doc.metNewPeopleCount >= 2).length,
      catchSentCount,
      attendeesWhoCaughtSomeone,
      catchRecipientCount,
      catchRate: event.doc.checkedInCount > 0 ?
        attendeesWhoCaughtSomeone / event.doc.checkedInCount :
        0,
      mutualMatchCount: Math.min(3, Math.floor(completedParticipants.length / 2)),
      chatStartedCount: Math.min(2, Math.floor(completedParticipants.length / 3)),
      averageWelcomeRating: averageRating(feedback, "welcomeRating"),
      averageStructureRating: averageRating(feedback, "structureRating"),
      safetyIncidentCount: feedback.filter((doc) => doc.doc.safetyConcern).length,
      funnel: {
        inviteLinkCount: 0,
        inviteOpenCount: 0,
        totalDemandCount: participants.length,
        requestCount: 0,
        pendingRequestCount: 0,
        approvedRequestCount: 0,
        declinedRequestCount: 0,
        directSignupCount: completedParticipants.length,
        waitlistJoinCount: event.doc.waitlistedCount,
        waitlistOfferCount: 0,
        waitlistOfferActiveCount: 0,
        waitlistOfferAcceptedCount: 0,
        waitlistOfferDeclinedCount: 0,
        waitlistOfferExpiredCount: 0,
        checkoutStartedCount: event.doc.priceInPaise > 0 ?
          event.doc.bookedCount :
          0,
        paymentPendingCount: 0,
        paymentCompletedCount: event.doc.priceInPaise > 0 ?
          event.doc.bookedCount :
          0,
        paymentFailedCount: 0,
        paymentRefundedCount: 0,
        bookedCount: event.doc.bookedCount,
        checkedInCount: event.doc.checkedInCount,
        noShowCount: Math.max(0, event.doc.bookedCount - event.doc.checkedInCount),
        catchSentCount,
        attendeesWhoCaughtSomeone,
        mutualMatchCount: Math.min(3, Math.floor(completedParticipants.length / 2)),
        chatStartedCount: Math.min(2, Math.floor(completedParticipants.length / 3)),
        repeatAttendeeCount: Math.floor(completedParticipants.length * 0.25),
      },
      updatedAt: admin.firestore.Timestamp.fromDate(offsetDate(event.doc.endTime.toDate(), {minutes: 35})),
    },
  }] : [];

  return {
    plans,
    preferences,
    compatibilityResponses,
    wingmanRequests,
    assignments,
    feedback,
    scorecards,
  };
}

function isLiveRevealSeedEvent(event) {
  return event.doc.status === "active" &&
    event.doc.eventFormat?.activityKind === "singlesMixer" &&
    event.doc.eventFormat?.defaultPlaybookId === "algorithmic_mixer_reveal";
}

function eventSuccessPlanStatus(event, now) {
  if (event.doc.endTime.toDate() <= now) return "complete";
  if (event.doc.startTime.toDate() <= now) return "live";
  return "setup";
}

function compatibilityAnswerIdsForIndex(index) {
  const answerSets = [
    ["event_energy_easy_conversation", "first_conversation_stories"],
    ["event_energy_playful", "first_conversation_food"],
    ["event_energy_deep_chat", "first_conversation_music"],
    ["event_energy_try_anything", "first_conversation_travel"],
  ];
  return answerSets[index % answerSets.length];
}

function buildEventSuccessAssignments({seedMarker, event, participants, createdAt, updatedAt}) {
  if (participants.length < 2) return [];
  return participants.map((entry, index) => {
    const firstPeer = participants[(index + 1) % participants.length].person;
    const secondPeer = participants.length > 2 ?
      participants[(index + 2) % participants.length].person :
      null;
    const rotationPeers = [firstPeer, secondPeer].filter(Boolean);
    const peerUids = [...new Set(rotationPeers.map((peer) => peer.uid))];
    return {
      id: `${event.id}_guided_rotations_${entry.person.uid}`,
      doc: {
        ...seedMarker,
        eventId: event.id,
        clubId: event.clubId,
        uid: entry.person.uid,
        moduleId: "guided_rotations",
        label: "Live reveal rotations",
        displayTitle: `Start with ${displayNameForSeedPerson(firstPeer)}`,
        displaySubtitle: "Follow the host cue when the reveal opens.",
        peerUids,
        rotationSlots: rotationPeers.map((peer, roundIndex) =>
          eventSuccessRotationSlot({event, roundIndex, peer})
        ),
        source: "server_v1",
        createdAt,
        updatedAt,
      },
    };
  });
}

function displayNameForSeedPerson(person) {
  return person.displayName || person.name || person.firstName || "someone new";
}

function eventSuccessRotationSlot({event, roundIndex, peer}) {
  const startsAt = offsetDate(event.doc.startTime.toDate(), {minutes: 12 + roundIndex * 12});
  return {
    roundIndex,
    label: `Round ${roundIndex + 1}`,
    startsAt: admin.firestore.Timestamp.fromDate(startsAt),
    endsAt: admin.firestore.Timestamp.fromDate(offsetDate(startsAt, {minutes: 12})),
    peerUid: peer.uid,
    compatibility: roundIndex === 0 ? "questionnaire_match" : "social",
  };
}

function averageRating(feedback, field) {
  if (feedback.length === 0) return 0;
  const total = feedback.reduce((sum, doc) => sum + doc.doc[field], 0);
  return Number((total / feedback.length).toFixed(1));
}

function buildSwipeMatchDocs({seedPrefix, seedMarker, event, roster, anchorProfiles, now}) {
  const attendedPeople = roster.filter((entry) => entry.status === "attended").map((entry) => entry.person);
  const anchors = anchorProfiles.filter((anchor) => attendedPeople.some((person) => person.uid === anchor.uid));
  const syntheticTargets = attendedPeople.filter((person) => person.source === "synthetic");
  const swipes = [];
  const matches = [];
  const messages = [];
  const notifications = [];

  for (const [anchorIndex, anchor] of anchors.entries()) {
    const targets = rotate(syntheticTargets, anchorIndex).slice(0, 4);
    for (const [targetIndex, target] of targets.entries()) {
      const direction = targetIndex === 3 ? "pass" : "like";
      swipes.push(swipeDoc({seedMarker, swiper: anchor, target, event, direction, now, offsetMinutes: targetIndex}));
      if (direction === "like" && targetIndex < 2) {
        swipes.push(swipeDoc({seedMarker, swiper: target, target: anchor, event, direction: "like", now, offsetMinutes: targetIndex + 5}));
        const match = matchDoc({seedMarker, userA: anchor, userB: target, event, now});
        matches.push(match);
        const builtMessages = buildMessages({seedPrefix, seedMarker, match, anchor, target, now});
        messages.push(...builtMessages);
        notifications.push(notificationDoc({
          seedMarker,
          uid: anchor.uid,
          id: `match_${match.id}`,
          type: "match",
          title: "New catch",
          body: `${target.displayName || target.firstName} liked you back.`,
          createdAt: offsetDate(now, {hours: -4, minutes: targetIndex}),
          matchId: match.id,
          eventId: event.id,
          actorUid: target.uid,
          actorName: target.displayName || target.firstName,
        }));
      }
    }
  }
  return {swipes, matches, messages, notifications};
}

function swipeDoc({seedMarker, swiper, target, event, direction, now, offsetMinutes}) {
  return {
    swiperId: swiper.uid,
    targetId: target.uid,
    doc: {
      ...seedMarker,
      swiperId: swiper.uid,
      targetId: target.uid,
      eventId: event.id,
      direction,
      createdAt: admin.firestore.Timestamp.fromDate(offsetDate(now, {hours: -3, minutes: offsetMinutes})),
    },
  };
}

function matchDoc({seedMarker, userA, userB, event, now}) {
  const [user1Id, user2Id] = [userA.uid, userB.uid].sort();
  const id = `${user1Id}_${user2Id}`;
  return {
    id,
    user1Id,
    user2Id,
    doc: {
      ...seedMarker,
      user1Id,
      user2Id,
      eventIds: [event.id],
      createdAt: admin.firestore.Timestamp.fromDate(offsetDate(now, {hours: -3})),
      lastMessageAt: null,
      lastMessagePreview: null,
      lastMessageSenderId: null,
      unreadCounts: {[user1Id]: 0, [user2Id]: 0},
      status: "active",
      blockedBy: null,
      blockedAt: null,
      participantIds: [user1Id, user2Id],
    },
  };
}

function buildMessages({seedPrefix, seedMarker, match, anchor, target, now}) {
  const snippets = [
    {sender: target, text: `That ${cityData[target.city]?.label ?? "city"} route was fun. Same pace next time?`},
    {sender: anchor, text: "Definitely. I liked the last 2 km push."},
    {sender: target, text: "Coffee after the weekend event?"},
  ].slice(0, MATCH_MESSAGE_LIMIT);
  return snippets.map((snippet, index) => {
    const id = `${seedPrefix}_msg_${match.id}_${String(index + 1).padStart(2, "0")}`;
    const sentAt = offsetDate(now, {hours: -2, minutes: index * 7});
    match.doc.lastMessageAt = admin.firestore.Timestamp.fromDate(sentAt);
    match.doc.lastMessagePreview = snippet.text;
    match.doc.lastMessageSenderId = snippet.sender.uid;
    const recipientId = snippet.sender.uid === match.doc.user1Id ?
      match.doc.user2Id :
      match.doc.user1Id;
    match.doc.unreadCounts = {
      ...match.doc.unreadCounts,
      [snippet.sender.uid]: 0,
      [recipientId]: 1,
    };
    return {
      matchId: match.id,
      id,
      doc: {
        ...seedMarker,
        senderId: snippet.sender.uid,
        text: snippet.text,
        imageUrl: null,
        sentAt: admin.firestore.Timestamp.fromDate(sentAt),
      },
    };
  });
}

function buildSuvbotSeedDocs({seedPrefix, seedMarker, anchorProfiles, now}) {
  const docs = [{
    path: "publicProfiles/suvbot",
      data: {
        ...seedMarker,
        name: "Suvbot",
        age: 99,
        gender: "other",
        profilePrompts: [],
        profilePhotos: [],
        city: marketForScenarioCity("mumbai").marketId,
        activityPreferences: {
          running: {
            paceMinSecsPerKm: 300,
            paceMaxSecsPerKm: 420,
            preferredDistances: [],
            runningReasons: ["community"],
            preferredRunTimes: [],
            version: 1,
          },
        },
      },
  }];
  const text = "I can refresh your seeded demo state or check what is ready to test.";
  for (const anchor of anchorProfiles) {
    const matchId = `suvbot_${anchor.uid}`;
    docs.push({
      path: `demoSelfServiceAccess/${anchor.uid}`,
      data: {
        ...seedMarker,
        uid: anchor.uid,
        enabled: true,
        source: "seed_demo_data",
        createdAt: admin.firestore.Timestamp.fromDate(now),
        updatedAt: admin.firestore.Timestamp.fromDate(now),
      },
    });
    docs.push({
      path: `matches/${matchId}`,
      data: {
        ...seedMarker,
        demoOpsCommand: "suvbot-thread",
        user1Id: "suvbot",
        user2Id: anchor.uid,
        eventIds: ["suvbot"],
        createdAt: admin.firestore.Timestamp.fromDate(offsetDate(now, {minutes: -45})),
        lastMessageAt: admin.firestore.Timestamp.fromDate(offsetDate(now, {minutes: -44})),
        lastMessagePreview: text,
        lastMessageSenderId: "suvbot",
        unreadCounts: {suvbot: 0, [anchor.uid]: 1},
        status: "active",
        blockedBy: null,
        blockedAt: null,
        participantIds: ["suvbot", anchor.uid],
      },
    });
    docs.push({
      path: `matches/${matchId}/messages/suvbot_welcome`,
      data: {
        ...seedMarker,
        demoOpsCommand: "suvbot-thread",
        senderId: "suvbot",
        text,
        imageUrl: null,
        sentAt: admin.firestore.Timestamp.fromDate(offsetDate(now, {minutes: -44})),
      },
    });
  }
  return docs;
}

function buildReviews({seedPrefix, seedMarker, club, event, roster, now}) {
  return roster
    .filter((entry) => entry.status === "attended")
    .slice(0, 4)
    .map((entry, index) => {
      const id = `${event.id}~${entry.person.uid}`;
      return {
        id,
        clubId: club.id,
        rating: 4 + (index % 2),
        doc: {
          ...seedMarker,
          organizerId: club.id,
          eventId: event.id,
          reviewerUserId: entry.person.uid,
          reviewerName: entry.person.name || entry.person.displayName || "Runner",
          rating: 4 + (index % 2),
          comment: "Well organized demo event with clear pacing and a friendly group.",
          createdAt: admin.firestore.Timestamp.fromDate(offsetDate(now, {days: -2, minutes: index})),
          updatedAt: null,
        },
      };
    });
}

function buildPayment({seedPrefix, seedMarker, event, uid, state, now}) {
  const id = paymentIdFor(event.id, uid, state);
  return {
    id,
    doc: {
      ...seedMarker,
      userId: uid,
      orderId: `${seedPrefix}_order_${event.id}_${uid}`,
      paymentId: id,
      eventId: event.id,
      amount: event.priceInPaise || 29900,
      currency: "INR",
      status: state,
      signUpFailed: state === "failed",
      createdAt: admin.firestore.Timestamp.fromDate(offsetDate(now, {days: -1})),
    },
  };
}

function buildPaymentHistoryEdges({seedPrefix, seedMarker, anchorProfiles, events, now}) {
  const paidEvents = events.filter((event) => event.priceInPaise > 0);
  const result = [];
  for (const [index, anchor] of anchorProfiles.entries()) {
    const event = paidEvents[index % paidEvents.length];
    if (!event) continue;
    result.push(buildPayment({seedPrefix, seedMarker, event, uid: anchor.uid, state: "refunded", now}));
    result.push(buildPayment({seedPrefix, seedMarker, event, uid: anchor.uid, state: "failed", now}));
  }
  return result;
}

function buildGeneralNotifications({seedMarker, anchorProfiles, clubs, events, now}) {
  const result = [];
  const upcoming = events.find((event) => event.kind === "upcomingFree") ?? events[0];
  const paid = events.find((event) => event.kind === "upcomingPaid") ?? upcoming;
  const club = clubs[0];
  for (const anchor of anchorProfiles) {
    if (upcoming) {
      result.push(notificationDoc({
        seedMarker,
        uid: anchor.uid,
        id: `eventReminder_${upcoming.id}`,
        type: "eventReminder",
        title: "Event coming up",
        body: "Your demo event starts tomorrow morning.",
        createdAt: offsetDate(now, {hours: -1}),
        eventId: upcoming.id,
        clubId: upcoming.clubId,
      }));
    }
    if (paid) {
      result.push(notificationDoc({
        seedMarker,
        uid: anchor.uid,
        id: `eventSignup_${paid.id}`,
        type: "eventSignup",
        title: "Spot confirmed",
        body: "Your paid demo event booking is confirmed.",
        createdAt: offsetDate(now, {hours: -5}),
        eventId: paid.id,
        clubId: paid.clubId,
        readAt: offsetDate(now, {hours: -4}),
      }));
    }
    if (club) {
      result.push(notificationDoc({
        seedMarker,
        uid: anchor.uid,
        id: `clubUpdate_${club.id}`,
        type: "clubUpdate",
        title: `${club.doc.name} update`,
        body: "New demo events were added for this week.",
        createdAt: offsetDate(now, {days: -1}),
        clubId: club.id,
      }));
    }
  }
  return result;
}

function notificationDoc({
  seedMarker,
  uid,
  id,
  type,
  title,
  body,
  createdAt,
  readAt = null,
  matchId = null,
  eventId = null,
  clubId = null,
  actorUid = null,
  actorName = null,
}) {
  return {
    uid,
    id,
    doc: {
      ...seedMarker,
      uid,
      type,
      title,
      body,
      createdAt: admin.firestore.Timestamp.fromDate(createdAt),
      readAt: readAt ? admin.firestore.Timestamp.fromDate(readAt) : null,
      matchId,
      eventId,
      clubId,
      actorUid,
      actorName,
    },
  };
}

function updateClubAggregates({clubs, memberships, reviews, events}) {
  const membersByClub = groupBy(memberships, (membership) => membership.doc.clubId);
  const reviewsByClub = groupBy(reviews, (review) => review.clubId);
  const upcomingByClub = groupBy(
    events
      .filter((event) => event.doc.status === "active" && event.doc.startTime.toDate() > new Date())
      .sort((a, b) => a.doc.startTime.toMillis() - b.doc.startTime.toMillis()),
    (event) => event.clubId
  );
  for (const club of clubs) {
    const activeMembers = (membersByClub.get(club.id) ?? [])
      .filter((membership) => membership.doc.status === "active");
    const clubReviews = reviewsByClub.get(club.id) ?? [];
    const totalRating = clubReviews.reduce((sum, review) => sum + review.rating, 0);
    const nextEvent = upcomingByClub.get(club.id)?.[0];
    club.doc.memberCount = activeMembers.length;
    club.doc.reviewCount = clubReviews.length;
    club.doc.rating = clubReviews.length > 0 ?
      Number((totalRating / clubReviews.length).toFixed(1)) :
      0;
    club.doc.nextEventAt = nextEvent?.doc.startTime ?? null;
    club.doc.nextEventLabel = nextEvent ? nextEvent.doc.meetingPoint : null;
  }
}

function createWritePlan(seed) {
  return {
    docs: seed.docs,
    paths: seed.docs.map((doc) => doc.path),
    manifest: seed.manifest,
  };
}

export function validateSeedDocuments(writePlan) {
  const result = {
    users: 0,
    publicProfiles: 0,
    clubs: 0,
    clubMemberships: 0,
    events: 0,
    eventParticipations: 0,
    eventSuccessPlans: 0,
    eventSuccessPreferences: 0,
    eventSuccessCompatibilityResponses: 0,
    eventSuccessWingmanRequests: 0,
    eventSuccessAssignments: 0,
    eventSuccessFeedback: 0,
    eventSuccessScorecards: 0,
    clubScheduleLocks: 0,
    userEventScheduleLocks: 0,
    savedEvents: 0,
    payments: 0,
    profileDecisions: 0,
    matches: 0,
    chatMessages: 0,
    reviews: 0,
    activityNotifications: 0,
    seedManifests: 0,
    profilePromptAnswers: 0,
    photoPromptAnswers: 0,
    projectionPairs: 0,
  };
  const userDocsByUid = new Map();
  const publicDocsByUid = new Map();

  for (const doc of writePlan.docs) {
    if (doc.op === "update") {
      continue;
    }

    if (isUserProfilePath(doc.path)) {
      userDocsByUid.set(uidFromProfilePath(doc.path), doc.data);
      const data = schemaSerializableFirestoreData(doc.data);
      validatePromptAnswers({
        path: doc.path,
        data,
        result,
      });
      assertValidSchemaPayload(
        validateUserProfileDocument,
        data,
        doc.path
      );
      result.users += 1;
    } else if (isPublicProfilePath(doc.path)) {
      publicDocsByUid.set(uidFromProfilePath(doc.path), doc.data);
      const data = schemaSerializableFirestoreData(doc.data);
      validatePromptAnswers({
        path: doc.path,
        data,
        result,
      });
      assertValidSchemaPayload(
        validatePublicProfileDocument,
        data,
        doc.path
      );
      result.publicProfiles += 1;
    } else if (isClubPath(doc.path)) {
      assertValidSchemaPayload(
        validateClubDocument,
        schemaSerializableFirestoreData(doc.data),
        doc.path
      );
      result.clubs += 1;
    } else if (isClubMembershipPath(doc.path)) {
      assertValidSchemaPayload(
        validateClubMembershipDocument,
        schemaSerializableFirestoreData(doc.data),
        doc.path
      );
      result.clubMemberships += 1;
    } else if (isRunPath(doc.path)) {
      const data = schemaSerializableFirestoreData(doc.data);
      assertValidSchemaPayload(
        validateEventDocument,
        data,
        doc.path
      );
      assertSyntheticEventDiscoveryProjection({
        path: doc.path,
        data,
      });
      result.events += 1;
    } else if (isEventParticipationPath(doc.path)) {
      assertValidSchemaPayload(
        validateEventParticipationDocument,
        schemaSerializableFirestoreData(doc.data),
        doc.path
      );
      result.eventParticipations += 1;
    } else if (isEventSuccessPlanPath(doc.path)) {
      assertValidSchemaPayload(
        validateEventSuccessPlanDocument,
        schemaSerializableFirestoreData(doc.data),
        doc.path
      );
      result.eventSuccessPlans += 1;
    } else if (isEventSuccessPreferencePath(doc.path)) {
      assertValidSchemaPayload(
        validateEventSuccessPreferenceDocument,
        schemaSerializableFirestoreData(doc.data),
        doc.path
      );
      result.eventSuccessPreferences += 1;
    } else if (isEventSuccessCompatibilityResponsePath(doc.path)) {
      assertValidSchemaPayload(
        validateEventSuccessCompatibilityResponseDocument,
        schemaSerializableFirestoreData(doc.data),
        doc.path
      );
      result.eventSuccessCompatibilityResponses += 1;
    } else if (isEventSuccessWingmanRequestPath(doc.path)) {
      assertValidSchemaPayload(
        validateEventSuccessWingmanRequestDocument,
        schemaSerializableFirestoreData(doc.data),
        doc.path
      );
      result.eventSuccessWingmanRequests += 1;
    } else if (isEventSuccessAssignmentPath(doc.path)) {
      assertValidSchemaPayload(
        validateEventSuccessAssignmentDocument,
        schemaSerializableFirestoreData(doc.data),
        doc.path
      );
      result.eventSuccessAssignments += 1;
    } else if (isEventSuccessFeedbackPath(doc.path)) {
      assertValidSchemaPayload(
        validateEventSuccessFeedbackDocument,
        schemaSerializableFirestoreData(doc.data),
        doc.path
      );
      result.eventSuccessFeedback += 1;
    } else if (isEventSuccessScorecardPath(doc.path)) {
      assertValidSchemaPayload(
        validateEventSuccessScorecardDocument,
        schemaSerializableFirestoreData(doc.data),
        doc.path
      );
      result.eventSuccessScorecards += 1;
    } else if (isClubScheduleLockPath(doc.path)) {
      assertValidSchemaPayload(
        validateClubScheduleLockDocument,
        schemaSerializableFirestoreData(doc.data),
        doc.path
      );
      result.clubScheduleLocks += 1;
    } else if (isUserEventScheduleLockPath(doc.path)) {
      assertValidSchemaPayload(
        validateUserEventScheduleLockDocument,
        schemaSerializableFirestoreData(doc.data),
        doc.path
      );
      result.userEventScheduleLocks += 1;
    } else if (isSavedEventPath(doc.path)) {
      assertValidSchemaPayload(
        validateSavedEventDocument,
        schemaSerializableFirestoreData(doc.data),
        doc.path
      );
      result.savedEvents += 1;
    } else if (isPaymentPath(doc.path)) {
      assertValidSchemaPayload(
        validatePaymentDocument,
        schemaSerializableFirestoreData(doc.data),
        doc.path
      );
      result.payments += 1;
    } else if (isSwipePath(doc.path)) {
      assertValidSchemaPayload(
        validateSwipeDocument,
        schemaSerializableFirestoreData(doc.data),
        doc.path
      );
      result.profileDecisions += 1;
    } else if (isMatchPath(doc.path)) {
      assertValidSchemaPayload(
        validateMatchDocument,
        schemaSerializableFirestoreData(doc.data),
        doc.path
      );
      result.matches += 1;
    } else if (isChatMessagePath(doc.path)) {
      assertValidSchemaPayload(
        validateChatMessageDocument,
        schemaSerializableFirestoreData(doc.data),
        doc.path
      );
      result.chatMessages += 1;
    } else if (isReviewPath(doc.path)) {
      assertValidSchemaPayload(
        validateReviewDocument,
        schemaSerializableFirestoreData(doc.data),
        doc.path
      );
      result.reviews += 1;
    } else if (isActivityNotificationPath(doc.path)) {
      assertValidSchemaPayload(
        validateActivityNotificationDocument,
        schemaSerializableFirestoreData(doc.data),
        doc.path
      );
      result.activityNotifications += 1;
    }
  }

  if (writePlan.manifest) {
    assertValidSchemaPayload(
      validateSeedEventManifestDocument,
      schemaSerializableFirestoreData(writePlan.manifest),
      `seedEvents/${writePlan.manifest.manifestId ?? "<unknown>"}`
    );
    result.seedManifests += 1;
  }

  for (const [uid, userDoc] of userDocsByUid.entries()) {
    const publicDoc = publicDocsByUid.get(uid);
    if (!publicDoc) continue;
    const expected = schemaSerializableFirestoreData(
      publicProfileFromUserDoc(userDoc)
    );
    const actual = schemaSerializableFirestoreData(publicDoc);
    if (!isDeepStrictEqual(actual, expected)) {
      throw new Error(
        `publicProfiles/${uid} projection mismatch for users/${uid}.`
      );
    }
    result.projectionPairs += 1;
  }

  return result;
}

function assertSyntheticEventDiscoveryProjection({path: docPath, data}) {
  if (data.synthetic !== true) return;
  const missing = requiredEventDiscoveryProjectionFields.filter((field) =>
    data[field] === undefined
  );
  if (missing.length > 0) {
    throw new Error(
      `${docPath} synthetic event is missing discovery projection fields: ` +
        missing.join(", ")
    );
  }

  const expected = eventDiscoveryProjection({
    event: data,
    clubLocation: data.discoveryCityName,
    clubLocationMarketId: data.discoveryMarketId,
    bookedCount: data.bookedCount,
  });
  const mismatches = requiredEventDiscoveryProjectionFields.filter((field) =>
    !isDeepStrictEqual(data[field], expected[field])
  );
  if (mismatches.length > 0) {
    throw new Error(
      `${docPath} synthetic event discovery projection is stale: ` +
        mismatches.join(", ")
    );
  }
}

export const validateSeedProfileDocuments = validateSeedDocuments;

function validatePromptAnswers({path: docPath, data, result}) {
  for (const [index, prompt] of (data.profilePrompts ?? []).entries()) {
    assertKnownProfilePrompt(
      prompt,
      `${docPath}.profilePrompts[${index}]`
    );
    assertValidSchemaPayload(
      validateProfilePromptAnswer,
      prompt,
      `${docPath}.profilePrompts[${index}]`
    );
    result.profilePromptAnswers += 1;
  }
  const photoPrompts = (data.profilePhotos ?? [])
    .map((photo) => photo?.prompt)
    .filter(Boolean);
  for (const [index, prompt] of photoPrompts.entries()) {
    assertKnownPhotoPrompt(
      prompt,
      `${docPath}.profilePhotos[${index}].prompt`
    );
    assertValidSchemaPayload(
      validatePhotoPromptAnswer,
      prompt,
      `${docPath}.profilePhotos[${index}].prompt`
    );
    result.photoPromptAnswers += 1;
  }
}

function assertKnownProfilePrompt(prompt, label) {
  const expected = profilePromptsById.get(prompt.promptId);
  if (!expected) {
    throw new Error(`${label} uses unknown profile prompt id: ${prompt.promptId}`);
  }
  if (prompt.prompt !== expected.title) {
    throw new Error(
      `${label} prompt title mismatch for ${prompt.promptId}: ` +
      `expected "${expected.title}", got "${prompt.prompt}"`
    );
  }
}

function assertKnownPhotoPrompt(prompt, label) {
  const expected = photoPromptsById.get(prompt.promptId);
  if (!expected) {
    throw new Error(`${label} uses unknown photo prompt id: ${prompt.promptId}`);
  }
  if (prompt.prompt !== expected.title) {
    throw new Error(
      `${label} prompt title mismatch for ${prompt.promptId}: ` +
      `expected "${expected.title}", got "${prompt.prompt}"`
    );
  }
}

function isUserProfilePath(docPath) {
  return /^users\/[^/]+$/.test(docPath);
}

function isPublicProfilePath(docPath) {
  return /^publicProfiles\/[^/]+$/.test(docPath);
}

function isClubPath(docPath) {
  return /^clubs\/[^/]+$/.test(docPath);
}

function isClubMembershipPath(docPath) {
  return /^clubMemberships\/[^/]+$/.test(docPath);
}

function isRunPath(docPath) {
  return /^events\/[^/]+$/.test(docPath);
}

function isEventParticipationPath(docPath) {
  return /^eventParticipations\/[^/]+$/.test(docPath);
}

function isEventSuccessPlanPath(docPath) {
  return /^eventSuccessPlans\/[^/]+$/.test(docPath);
}

function isEventSuccessPreferencePath(docPath) {
  return /^eventSuccessPreferences\/[^/]+$/.test(docPath);
}

function isEventSuccessCompatibilityResponsePath(docPath) {
  return /^eventSuccessCompatibilityResponses\/[^/]+$/.test(docPath);
}

function isEventSuccessWingmanRequestPath(docPath) {
  return /^eventSuccessWingmanRequests\/[^/]+$/.test(docPath);
}

function isEventSuccessAssignmentPath(docPath) {
  return /^eventSuccessAssignments\/[^/]+$/.test(docPath);
}

function isEventSuccessFeedbackPath(docPath) {
  return /^eventSuccessFeedback\/[^/]+$/.test(docPath);
}

function isEventSuccessScorecardPath(docPath) {
  return /^eventSuccessScorecards\/[^/]+$/.test(docPath);
}

function isClubScheduleLockPath(docPath) {
  return /^clubScheduleLocks\/[^/]+$/.test(docPath);
}

function isUserEventScheduleLockPath(docPath) {
  return /^userEventScheduleLocks\/[^/]+$/.test(docPath);
}

function isSavedEventPath(docPath) {
  return /^savedEvents\/[^/]+$/.test(docPath);
}

function isPaymentPath(docPath) {
  return /^payments\/[^/]+$/.test(docPath);
}

function isSwipePath(docPath) {
  return /^profileDecisions\/[^/]+\/outgoing\/[^/]+$/.test(docPath);
}

function isMatchPath(docPath) {
  return /^matches\/[^/]+$/.test(docPath);
}

function isChatMessagePath(docPath) {
  return /^matches\/[^/]+\/messages\/[^/]+$/.test(docPath);
}

function isReviewPath(docPath) {
  return /^reviews\/[^/]+$/.test(docPath);
}

function isActivityNotificationPath(docPath) {
  return /^notifications\/[^/]+\/items\/[^/]+$/.test(docPath);
}

function uidFromProfilePath(docPath) {
  return docPath.split("/")[1];
}

function schemaSerializableFirestoreData(value) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (isFirestoreTimestamp(value)) {
    return schemaSerializableTimestamp(value);
  }
  if (Array.isArray(value)) {
    return value.map((item) => schemaSerializableFirestoreData(item));
  }
  if (typeof value === "object") {
    const result = {};
    for (const [key, item] of Object.entries(value)) {
      const serialized = schemaSerializableFirestoreData(item);
      if (serialized !== undefined) result[key] = serialized;
    }
    return result;
  }
  return value;
}

function isFirestoreTimestamp(value) {
  return value &&
    typeof value === "object" &&
    typeof value.toDate === "function" &&
    typeof value.toMillis === "function";
}

function schemaSerializableTimestamp(timestamp) {
  const seconds = firstInteger(
    timestamp.seconds,
    timestamp._seconds
  );
  const nanoseconds = firstInteger(
    timestamp.nanoseconds,
    timestamp._nanoseconds
  );
  if (seconds !== null && nanoseconds !== null) {
    return {_seconds: seconds, _nanoseconds: nanoseconds};
  }

  const millis = timestamp.toMillis();
  const fallbackSeconds = Math.floor(millis / 1000);
  return {
    _seconds: fallbackSeconds,
    _nanoseconds: Math.round((millis - fallbackSeconds * 1000) * 1_000_000),
  };
}

function firstInteger(...values) {
  for (const value of values) {
    if (Number.isInteger(value)) return value;
  }
  return null;
}

async function readExistingSeedTime(firestore, seedId) {
  const manifestId = seedId.replace(/[^A-Za-z0-9_-]/g, "_");
  const snap = await firestore.collection("seedEvents").doc(manifestId).get();
  if (!snap.exists) {
    throw new Error(
      `--append-anchors requires an existing seedEvents/${manifestId} manifest. ` +
      "Run a full seed first."
    );
  }
  const generatedAt = snap.data().generatedAt;
  if (!generatedAt || typeof generatedAt.toDate !== "function") {
    throw new Error(`seedEvents/${manifestId} is missing generatedAt.`);
  }
  return generatedAt.toDate();
}

async function createAppendWritePlan({db: firestore, seed, anchorProfiles}) {
  const manifestRef = firestore.collection("seedEvents").doc(seed.manifestId);
  const manifestSnap = await manifestRef.get();
  if (!manifestSnap.exists) {
    throw new Error(
      `--append-anchors requires an existing ${manifestRef.path} manifest. ` +
      "Run a full seed first."
    );
  }

  const existingManifest = manifestSnap.data();
  const existingAnchorIds = new Set(existingManifest.anchorUserIds ?? []);
  const currentAnchorIds = anchorProfiles.map((profile) => profile.uid);
  const mergedAnchorIds = new Set([...existingAnchorIds, ...currentAnchorIds]);
  const newAnchorIds = currentAnchorIds.filter((uid) => !existingAnchorIds.has(uid));
  const existingPaths = new Set(existingManifest.paths ?? []);

  if (newAnchorIds.length === 0) {
    return {
      docs: [],
      paths: [],
      manifest: {
        ...seed.manifest,
        anchorUserIds: [...mergedAnchorIds].sort(),
        paths: [...existingPaths].sort(),
        counts: countDocs([...existingPaths].map((docPath) => ({path: docPath}))),
      },
      append: {
        existingAnchorIds: [...existingAnchorIds].sort(),
        newAnchorIds,
        existingPathCount: existingPaths.size,
        finalPathCount: existingPaths.size,
      },
    };
  }

  const newAnchorSet = new Set(newAnchorIds);
  const newAnchorMatchIds = new Set(
    seed.docs
      .filter((doc) => doc.path.startsWith("matches/") &&
        !doc.path.includes("/messages/") &&
        (newAnchorSet.has(doc.data.user1Id) || newAnchorSet.has(doc.data.user2Id)))
      .map((doc) => doc.path.split("/")[1])
  );
  let docs = seed.docs.filter((doc) =>
    isNewAnchorRelationshipDoc(doc, newAnchorSet, newAnchorMatchIds)
  );
  const existingTargetFilter = await filterAppendDocsForExistingTargets(
    firestore,
    docs
  );
  docs = existingTargetFilter.docs;
  docs = await normalizeAppendParticipationsForCapacity(firestore, docs);
  const relationshipFilter = await filterAppendDocsForValidRelationships(
    firestore,
    docs
  );
  docs = relationshipFilter.docs;
  const aggregateUpdates = buildAppendAggregateUpdates(docs);
  const mergedPaths = new Set([...existingPaths, ...docs.map((doc) => doc.path)]);

  return {
    docs: [...docs, ...aggregateUpdates],
    paths: docs.map((doc) => doc.path),
    manifest: {
      ...seed.manifest,
      anchorUserIds: [...mergedAnchorIds].sort(),
      paths: [...mergedPaths].sort(),
      counts: countDocs([...mergedPaths].map((docPath) => ({path: docPath}))),
      appendMode: true,
      appendedAnchorUserIds: newAnchorIds,
    },
    append: {
      existingAnchorIds: [...existingAnchorIds].sort(),
      newAnchorIds,
      existingPathCount: existingPaths.size,
      finalPathCount: mergedPaths.size,
      skippedMissingTargetCount: existingTargetFilter.skippedPaths.length,
      skippedMissingTargetPaths: existingTargetFilter.skippedPaths,
      skippedInvalidRelationshipCount:
        relationshipFilter.skippedPaths.length,
      skippedInvalidRelationshipPaths: relationshipFilter.skippedPaths,
    },
  };
}

function isNewAnchorRelationshipDoc(doc, newAnchorSet, newAnchorMatchIds) {
  const parts = doc.path.split("/");
  if (doc.path.startsWith("clubMemberships/")) {
    return newAnchorSet.has(doc.data.uid);
  }
  if (doc.path.startsWith("eventParticipations/")) {
    return newAnchorSet.has(doc.data.uid);
  }
  if (doc.path.startsWith("eventSuccessPreferences/") ||
      doc.path.startsWith("eventSuccessCompatibilityResponses/") ||
      doc.path.startsWith("eventSuccessFeedback/")) {
    return newAnchorSet.has(doc.data.uid);
  }
  if (doc.path.startsWith("eventSuccessWingmanRequests/")) {
    return newAnchorSet.has(doc.data.requesterUid) ||
      newAnchorSet.has(doc.data.targetUid);
  }
  if (doc.path.startsWith("eventSuccessAssignments/")) {
    return newAnchorSet.has(doc.data.uid) ||
      (Array.isArray(doc.data.peerUids) &&
        doc.data.peerUids.some((uid) => newAnchorSet.has(uid)));
  }
  if (doc.path.startsWith("userEventScheduleLocks/")) {
    return newAnchorSet.has(doc.data.uid);
  }
  if (doc.path.startsWith("savedEvents/")) {
    return newAnchorSet.has(doc.data.uid);
  }
  if (doc.path.startsWith("demoSelfServiceAccess/")) {
    return newAnchorSet.has(doc.data.uid);
  }
  if (doc.path.startsWith("payments/")) {
    return newAnchorSet.has(doc.data.userId);
  }
  if (doc.path.startsWith("profileDecisions/")) {
    return newAnchorSet.has(doc.data.swiperId) ||
      newAnchorSet.has(doc.data.targetId);
  }
  if (parts[0] === "matches" && parts.length === 2) {
    return newAnchorSet.has(doc.data.user1Id) ||
      newAnchorSet.has(doc.data.user2Id);
  }
  if (parts[0] === "matches" && parts[2] === "messages") {
    return newAnchorMatchIds.has(parts[1]);
  }
  if (parts[0] === "notifications" && parts[2] === "items") {
    return newAnchorSet.has(parts[1]);
  }
  return false;
}

async function filterAppendDocsForExistingTargets(firestore, docs) {
  const eventIds = new Set();
  const clubIds = new Set();

  for (const doc of docs) {
    collectString(doc.data.eventId, eventIds);
    collectString(doc.data.clubId, clubIds);
    collectString(doc.data.clubId, clubIds);
    if (Array.isArray(doc.data.eventIds)) {
      for (const eventId of doc.data.eventIds) collectString(eventId, eventIds);
    }
  }

  const [existingEventIds, existingClubIds] = await Promise.all([
    existingDocumentIds(firestore, "events", eventIds),
    existingDocumentIds(firestore, "clubs", clubIds),
  ]);

  const skippedPaths = [];
  let kept = docs.filter((doc) => {
    const hasExistingTargets = docTargetsExist(doc, {
      existingEventIds,
      existingClubIds,
    });
    if (!hasExistingTargets) skippedPaths.push(doc.path);
    return hasExistingTargets;
  });

  const keptMatchIds = new Set(
    kept
      .filter((doc) => {
        const parts = doc.path.split("/");
        return parts[0] === "matches" && parts.length === 2;
      })
      .map((doc) => doc.path.split("/")[1])
  );

  kept = kept.filter((doc) => {
    const parts = doc.path.split("/");
    const isMessage = parts[0] === "matches" && parts[2] === "messages";
    if (!isMessage || keptMatchIds.has(parts[1])) return true;
    skippedPaths.push(doc.path);
    return false;
  });

  return {docs: kept, skippedPaths};
}

async function existingDocumentIds(firestore, collection, ids) {
  const existing = new Set();
  await Promise.all([...ids].map(async (id) => {
    const snap = await firestore.collection(collection).doc(id).get();
    if (snap.exists) existing.add(id);
  }));
  return existing;
}

function docTargetsExist(doc, {existingEventIds, existingClubIds}) {
  if (doc.path.startsWith("matches/suvbot_") ||
      doc.path.startsWith("demoSelfServiceAccess/")) {
    return true;
  }
  if (!stringTargetExists(doc.data.eventId, existingEventIds)) return false;
  if (!stringTargetExists(doc.data.clubId, existingClubIds)) return false;
  if (!stringTargetExists(doc.data.clubId, existingClubIds)) return false;
  if (Array.isArray(doc.data.eventIds)) {
    return doc.data.eventIds.every((eventId) =>
      stringTargetExists(eventId, existingEventIds)
    );
  }
  return true;
}

function collectString(value, target) {
  if (typeof value === "string" && value.length > 0) target.add(value);
}

function stringTargetExists(value, existingIds) {
  return typeof value !== "string" ||
    value.length === 0 ||
    existingIds.has(value);
}

export async function normalizeAppendParticipationsForCapacity(firestore, docs) {
  const removedPaymentIds = new Set();
  const participationsByRun = groupBy(
    docs.filter((doc) =>
      doc.path.startsWith("eventParticipations/") &&
      (doc.data.status === "signedUp" || doc.data.status === "attended")
    ),
    (doc) => doc.data.eventId
  );

  for (const [eventId, participationDocs] of participationsByRun.entries()) {
    const eventSnap = await firestore.collection("events").doc(eventId).get();
    const event = eventSnap.data();
    if (!event || !Number.isInteger(event.capacityLimit)) continue;

    let bookedCount = Number.isInteger(event.bookedCount) ? event.bookedCount : 0;
    for (const doc of participationDocs) {
      if (doc.data.status === "attended" && isFutureRun(event)) {
        doc.data.status = "signedUp";
        doc.data.attendedAt = null;
      }

      if (bookedCount < event.capacityLimit) {
        bookedCount += 1;
        continue;
      }

      if (doc.data.paymentId) removedPaymentIds.add(doc.data.paymentId);
      doc.data.status = "waitlisted";
      doc.data.signedUpAt = null;
      doc.data.attendedAt = null;
      doc.data.paymentId = null;
      doc.data.waitlistedAt = doc.data.createdAt;
    }
  }

  if (removedPaymentIds.size === 0) return docs;
  return docs.filter((doc) =>
    !doc.path.startsWith("payments/") ||
    !removedPaymentIds.has(doc.path.split("/")[1])
  );
}

function isFutureRun(event, now = new Date()) {
  return event.startTime?.toDate?.() > now;
}

export async function filterAppendDocsForValidRelationships(firestore, docs) {
  const participationCache = new Map();
  for (const doc of docs) {
    if (!doc.path.startsWith("eventParticipations/")) continue;
    participationCache.set(doc.path.split("/")[1], doc.data);
  }

  const skippedPaths = [];
  let kept = [];
  const skippedMatchIds = new Set();

  for (const doc of docs) {
    if (!doc.path.startsWith("profileDecisions/")) {
      kept.push(doc);
      continue;
    }

    const valid = await hasValidSwipeAttendance({
      firestore,
      doc,
      participationCache,
    });
    if (valid) {
      kept.push(doc);
      continue;
    }

    skippedPaths.push(doc.path);
    const matchId = matchIdForSwipe(doc);
    if (matchId) skippedMatchIds.add(matchId);
  }

  if (skippedMatchIds.size === 0) {
    return {docs: kept, skippedPaths};
  }

  const nextKept = [];
  for (const doc of kept) {
    const parts = doc.path.split("/");
    const isSkippedMatch = parts[0] === "matches" &&
      skippedMatchIds.has(parts[1]);
    const isSkippedMatchNotification = parts[0] === "notifications" &&
      parts[2] === "items" &&
      skippedMatchIds.has(doc.data.matchId);
    if (isSkippedMatch || isSkippedMatchNotification) {
      skippedPaths.push(doc.path);
      continue;
    }
    nextKept.push(doc);
  }

  kept = nextKept.filter((doc) => {
    const parts = doc.path.split("/");
    const isMessage = parts[0] === "matches" && parts[2] === "messages";
    if (!isMessage || !skippedMatchIds.has(parts[1])) return true;
    skippedPaths.push(doc.path);
    return false;
  });

  return {docs: kept, skippedPaths};
}

async function hasValidSwipeAttendance({firestore, doc, participationCache}) {
  const {eventId, swiperId, targetId} = doc.data;
  if (
    typeof eventId !== "string" ||
    typeof swiperId !== "string" ||
    typeof targetId !== "string"
  ) {
    return false;
  }

  const [swiperParticipation, targetParticipation] = await Promise.all([
    effectiveParticipation({firestore, participationCache, eventId, uid: swiperId}),
    effectiveParticipation({firestore, participationCache, eventId, uid: targetId}),
  ]);
  return swiperParticipation?.status === "attended" &&
    targetParticipation?.status === "attended";
}

async function effectiveParticipation({
  firestore,
  participationCache,
  eventId,
  uid,
}) {
  const id = `${eventId}_${uid}`;
  if (participationCache.has(id)) return participationCache.get(id);
  const snap = await firestore.collection("eventParticipations").doc(id).get();
  const data = snap.exists ? snap.data() : null;
  participationCache.set(id, data);
  return data;
}

function matchIdForSwipe(doc) {
  const {swiperId, targetId, direction} = doc.data;
  if (
    direction !== "like" ||
    typeof swiperId !== "string" ||
    typeof targetId !== "string" ||
    swiperId === targetId
  ) {
    return null;
  }
  return [swiperId, targetId].sort().join("_");
}

function buildAppendAggregateUpdates(docs) {
  const eventUpdates = new Map();
  const clubUpdates = new Map();

  for (const doc of docs) {
    if (doc.path.startsWith("clubMemberships/") &&
        doc.data.status === "active") {
      const clubUpdate = mapEntry(clubUpdates, `clubs/${doc.data.clubId}`);
      clubUpdate.memberCount = (clubUpdate.memberCount ?? 0) + 1;
    }

    if (!doc.path.startsWith("eventParticipations/")) continue;
    const eventUpdate = mapEntry(eventUpdates, `events/${doc.data.eventId}`);
    if (doc.data.status === "signedUp" || doc.data.status === "attended") {
      eventUpdate.bookedCount = (eventUpdate.bookedCount ?? 0) + 1;
      const gender = doc.data.genderAtSignup ?? "other";
      const genderKey = `genderCounts.${gender}`;
      eventUpdate[genderKey] = (eventUpdate[genderKey] ?? 0) + 1;
      const cohort = doc.data.cohortAtSignup ?? cohortIdForSeedPerson({gender});
      const cohortKey = `cohortCounts.${cohort}`;
      eventUpdate[cohortKey] = (eventUpdate[cohortKey] ?? 0) + 1;
    }
    if (doc.data.status === "attended") {
      eventUpdate.checkedInCount = (eventUpdate.checkedInCount ?? 0) + 1;
    }
    if (doc.data.status === "waitlisted") {
      eventUpdate.waitlistedCount = (eventUpdate.waitlistedCount ?? 0) + 1;
      const cohort = doc.data.cohortAtSignup ??
        cohortIdForSeedPerson({gender: doc.data.genderAtSignup});
      const cohortKey = `waitlistedCohortCounts.${cohort}`;
      eventUpdate[cohortKey] = (eventUpdate[cohortKey] ?? 0) + 1;
    }
  }

  return [
    ...[...clubUpdates.entries()].map(([docPath, increments]) => ({
      path: docPath,
      op: "update",
      data: incrementPatch(increments),
    })),
    ...[...eventUpdates.entries()].map(([docPath, increments]) => ({
      path: docPath,
      op: "update",
      data: incrementPatch(increments),
    })),
  ];
}

function mapEntry(map, key) {
  if (!map.has(key)) map.set(key, {});
  return map.get(key);
}

function incrementPatch(increments) {
  return Object.fromEntries(
    Object.entries(increments).map(([key, value]) => [
      key,
      admin.firestore.FieldValue.increment(value),
    ])
  );
}

async function resetSyntheticData({db: firestore, manifestId, seedPrefix, fallbackPaths}) {
  const manifestRef = firestore.collection("seedEvents").doc(manifestId);
  const manifestSnap = await manifestRef.get();
  const manifestPaths = manifestSnap.exists && Array.isArray(manifestSnap.data().paths) ?
    manifestSnap.data().paths :
    fallbackPaths;
  const orphanMessagePaths = await syntheticMatchMessagePaths({
    db: firestore,
    seedPrefix,
  });
  const paths = [...new Set([
    ...manifestPaths,
    ...orphanMessagePaths,
    manifestRef.path,
  ])];
  let deleted = 0;
  for (const chunk of chunks(paths, DEFAULT_MAX_BATCH_WRITES)) {
    const batch = firestore.batch();
    for (const docPath of chunk) {
      batch.delete(firestore.doc(docPath));
      deleted += 1;
    }
    await batch.commit();
  }
  return {
    deleted,
    source: manifestSnap.exists ? `seedEvents/${manifestId}` : "current generated plan",
  };
}

async function syntheticMatchMessagePaths({db: firestore, seedPrefix}) {
  const snap = await firestore.collectionGroup("messages").get();
  return snap.docs
    .filter((doc) => doc.ref.parent.parent?.id.includes(seedPrefix))
    .map((doc) => doc.ref.path);
}

async function applyWritePlan({db: firestore, docs}) {
  let written = 0;
  for (const chunk of chunks(docs, DEFAULT_MAX_BATCH_WRITES)) {
    const batch = firestore.batch();
    for (const doc of chunk) {
      if (doc.op === "update") {
        batch.update(firestore.doc(doc.path), doc.data);
      } else {
        batch.set(firestore.doc(doc.path), doc.data);
      }
      written += 1;
    }
    await batch.commit();
  }
  return {written};
}

function printSummary({
  args,
  projectId,
  scenario,
  anchorProfiles,
  seed,
  writePlan,
  missingPublicProfileIds,
  schemaValidation,
}) {
  const identityDiagnostics = syntheticPublicIdentityDiagnostics(seed.docs);
  console.log("Catch demo data seed plan");
  console.log(`Project: ${projectId}`);
  if (args.emulatorHost) console.log(`Emulator: ${args.emulatorHost}`);
  console.log(`Scenario: ${args.scenario} - ${scenario.description}`);
  console.log(`Seed prefix: ${args.seedPrefix}`);
  console.log(`Mode: ${args.apply ? "apply" : "dry-run"}`);
  if (args.deleteOnly) console.log("Delete only: yes");
  if (args.appendAnchors) {
    console.log("Append anchors: yes");
    console.log(`New anchor users: ${writePlan.append?.newAnchorIds.length ?? 0}`);
  }
  console.log(`Reset synthetic first: ${args.resetSynthetic ? "yes" : "no"}`);
  console.log(`Anchor users: ${anchorProfiles.length}`);
  if (missingPublicProfileIds.length > 0) {
    console.log(`Warning: missing publicProfiles for anchors: ${missingPublicProfileIds.join(", ")}`);
  }
  console.log("\nDocument counts:");
  for (const [collection, count] of Object.entries(seed.counts)) {
    console.log(`- ${collection}: ${count}`);
  }
  console.log(`\nTotal docs to write: ${writePlan.docs.length}`);
  console.log(
    `Schema-validated docs: ${schemaValidation.users} users, ` +
    `${schemaValidation.publicProfiles} public profiles, ` +
    `${schemaValidation.clubs} clubs, ` +
    `${schemaValidation.events} events, ` +
    `${schemaValidation.eventParticipations} participations, ` +
    `${schemaValidation.profileDecisions} decisions, ` +
    `${schemaValidation.matches} matches`
  );
  if (identityDiagnostics.duplicateNamePhotoPairs > 0) {
    console.log(
      `Warning: ${identityDiagnostics.duplicateNamePhotoPairs} duplicate synthetic public name/photo pairs generated.`
    );
  }
  console.log(`Manifest: seedEvents/${seed.manifestId}`);
}

function summary({
  args,
  projectId,
  scenario,
  anchorProfiles,
  seed,
  writePlan,
  missingPublicProfileIds,
  schemaValidation,
}) {
  return {
    projectId,
    emulatorHost: args.emulatorHost,
    scenario: args.scenario,
    scenarioDescription: scenario.description,
    scenarioCities: scenario.cities,
    cityOverride: args.cities,
    seedPrefix: args.seedPrefix,
    apply: args.apply,
    resetSynthetic: args.resetSynthetic,
    deleteOnly: args.deleteOnly,
    appendAnchors: args.appendAnchors,
    includeScheduleLocks: args.includeScheduleLocks,
    append: writePlan.append ?? null,
    anchorUserIds: anchorProfiles.map((profile) => profile.uid),
    missingPublicProfileIds,
    syntheticPublicIdentityDiagnostics: syntheticPublicIdentityDiagnostics(seed.docs),
    counts: seed.counts,
    schemaValidation,
    totalDocsToWrite: writePlan.docs.length,
    manifestPath: `seedEvents/${seed.manifestId}`,
  };
}

function printScenarios() {
  console.log("Available demo seed scenarios:");
  for (const [name, scenario] of Object.entries(scenarios)) {
    console.log(`- ${name}: ${scenario.description}`);
  }
  for (const scenario of listScenarioConfigs()) {
    if (!scenario.seedWorld) continue;
    console.log(`- ${scenario.id}: ${scenario.seedWorld.description ?? scenario.description}`);
  }
}

function printHelp() {
  console.log(`
Seed deterministic Catch demo data with the Firebase Admin SDK.

Usage:
  node tool/demo/seed_demo_data.mjs --env dev --scenario smoke
  node tool/demo/seed_demo_data.mjs --env dev --scenario beta-full --anchor-users uid1,uid2 --apply --reset-synthetic
  node tool/demo/seed_demo_data.mjs --env prod --scenario beta-full --anchor-file anchors.txt --apply --allow-prod --reset-synthetic

Options:
  --env <dev|staging|prod>       Resolve project id from .firebaserc.
  --project <firebase-project>   Explicit Firebase/GCP project id.
  --scenario <name>              Scenario to generate. Default: beta-full.
  --list-scenarios               Print scenario names and exit.
  --cities <city,...>            Override scenario cities with canonical
                                 cities/markets, e.g. in-mp-indore.
  --seed-prefix <prefix>         Stable document prefix. Default: ${DEFAULT_SEED_PREFIX}.
  --anchor-users <uid,...>       Real TestFlight user UIDs to seed around.
  --anchor-phones <phone,...>    Resolve real users by users.phoneNumber.
  --anchor-file <path>           Newline file, or JSON with uids/users and phones.
  --dry-run                      Print plan only. Default.
  --apply                        Write documents.
  --reset-synthetic              Delete previous manifest docs before writing.
  --delete-only                  Delete previous manifest docs and exit. Requires
                                 --apply --reset-synthetic.
  --append-anchors               Add only newly listed anchors to an existing
                                 seed manifest without recreating old anchors.
  --include-schedule-locks       Also write denormalized schedule lock docs.
                                 Usually unnecessary for demo worlds because
                                 Functions query canonical event/participation docs.
  --persona-profile-projection <path>
                                 Profile projection file to use for synthetic
                                 seed identities, e.g. one generated by
                                 demo_ops persona-profile-projection. Default:
                                 the world's cast, or for generator scenarios
                                 ${path.relative(repoRoot, DEFAULT_PERSONA_CATALOG_PATH)}.
  --allow-prod                   Required when writing to the prod Firebase project.
  --emulator                     Use FIRESTORE_EMULATOR_HOST=127.0.0.1:8080.
  --emulator-host <host:port>    Use a custom Firestore emulator host.
  --json                         Emit machine-readable summary.
`);
}

function uniqueDocsByPath(docs) {
  const byPath = new Map();
  for (const doc of docs) byPath.set(doc.path, doc);
  return [...byPath.values()].sort((a, b) => a.path.localeCompare(b.path));
}

function countDocs(docs) {
  const counts = {};
  for (const doc of docs) {
    const key = countKeyForPath(doc.path);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort());
}

function countKeyForPath(docPath) {
  if (/^matches\/[^/]+\/messages\//.test(docPath)) return "messages";
  if (/^profileDecisions\/[^/]+\/outgoing\//.test(docPath)) return "profileDecisions";
  if (/^notifications\/[^/]+\/items\//.test(docPath)) return "notifications";
  return docPath.split("/")[0];
}

function isMain() {
  return process.argv[1] &&
    import.meta.url === pathToFileURL(process.argv[1]).href;
}

function syntheticPublicIdentityDiagnostics(docs) {
  const seen = new Map();
  const duplicates = [];

  for (const doc of docs) {
    if (!doc.path.startsWith("publicProfiles/")) continue;
    if (doc.data.synthetic !== true) continue;
    const name = normalizedPublicName(doc.data.name);
    const firstPhoto = Array.isArray(doc.data.profilePhotos) ?
      doc.data.profilePhotos[0]?.url :
      null;
    if (!name || typeof firstPhoto !== "string" || firstPhoto.length === 0) continue;
    const key = `${name}|${firstPhoto}`;
    const firstPath = seen.get(key);
    if (firstPath) {
      duplicates.push({firstPath, duplicatePath: doc.path, name: doc.data.name});
    } else {
      seen.set(key, doc.path);
    }
  }

  return {
    duplicateNamePhotoPairs: duplicates.length,
    duplicateSamples: duplicates.slice(0, 10),
  };
}

function normalizedPublicName(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function groupBy(items, keyFn) {
  const result = new Map();
  for (const item of items) {
    const key = keyFn(item);
    if (!result.has(key)) result.set(key, []);
    result.get(key).push(item);
  }
  return result;
}

function uniqueByUid(items) {
  const byUid = new Map();
  for (const item of items) {
    if (item?.uid) byUid.set(item.uid, item);
  }
  return [...byUid.values()];
}

function rotate(items, offset) {
  if (items.length === 0) return [];
  const start = offset % items.length;
  return [...items.slice(start), ...items.slice(0, start)];
}

function chunks(items, size) {
  const result = [];
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size));
  }
  return result;
}

function dateOfBirthForAge(age, index) {
  const date = new Date(Date.UTC(new Date().getUTCFullYear() - age, index % 12, 10 + (index % 18), 0, 0, 0));
  return admin.firestore.Timestamp.fromDate(date);
}

function ageFromTimestamp(timestamp) {
  if (!timestamp || typeof timestamp.toDate !== "function") return null;
  const dob = timestamp.toDate();
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const monthDiff = now.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())) {
    age -= 1;
  }
  return age;
}

function firstWord(value) {
  return String(value || "Runner").trim().split(/\s+/)[0] || "Runner";
}

function validGender(value) {
  return ["man", "woman", "nonBinary", "other"].includes(value);
}

function interestedInFor(gender, index) {
  if (gender === "man") return ["woman", "nonBinary"];
  if (gender === "woman") return ["man", "nonBinary"];
  if (index % 2 === 0) return ["man", "woman", "nonBinary"];
  return ["man", "woman", "nonBinary", "other"];
}

function languageSet(city, index) {
  const cityLanguage = {
    mumbai: "marathi",
    delhi: "hindi",
    bangalore: "kannada",
    hyderabad: "telugu",
    chennai: "tamil",
    kolkata: "bengali",
    pune: "marathi",
    ahmedabad: "gujarati",
    indore: "hindi",
  }[city] ?? "hindi";
  return index % 3 === 0 ? ["english", cityLanguage] : ["english", "hindi"];
}

function daysFromNow(days) {
  return offsetDate(new Date(), {days});
}

function offsetDate(date, {days = 0, hours = 0, minutes = 0, seconds = 0}) {
  const offsetSeconds = (((days * 24 + hours) * 60 + minutes) * 60) + seconds;
  return new Date(date.getTime() + offsetSeconds * 1000);
}

function stableNumber(value, mod) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) - hash + value.charCodeAt(index)) | 0;
  }
  return Math.abs(hash) % mod;
}

function paymentIdFor(eventId, uid, state) {
  return `${eventId}_${uid}_${state}`;
}
