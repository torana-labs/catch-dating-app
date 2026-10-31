#!/usr/bin/env node
import path from "node:path";
import {createRequire} from "node:module";
import {fileURLToPath} from "node:url";
import {isFirebaseProductionTarget, resolveFirebaseProjectId} from "../lib/firebase_project.mjs";

const toolDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(toolDir, "../..");
const requireFromFunctions = createRequire(
  path.join(repoRoot, "functions/package.json")
);

if (isMain()) {
  await main();
}

export async function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  if (args.help) {
    printHelp();
    return;
  }

  const projectId = resolveFirebaseProjectId({env: args.env, project: args.project, defaultEnv: null});
  if (args.apply && isFirebaseProductionTarget({env: args.env, projectId}) && !args.allowProd) {
    throw new Error(
      "Refusing to backfill prod without --allow-prod. " +
      "Run a dry run first, then rerun with --apply --allow-prod."
    );
  }

  const algoliaConfig = readAlgoliaConfig(args);
  const admin = requireFromFunctions("firebase-admin");
  admin.initializeApp({projectId});
  const db = admin.firestore();
  const helpers = loadAlgoliaHelpers();
  const plan = await buildAlgoliaExploreSearchPlan(db, helpers);
  const summary = {
    projectId,
    organizersIndex: algoliaConfig.organizersIndex,
    eventsIndex: algoliaConfig.eventsIndex,
    ...plan.summary,
  };

  if (args.json) {
    console.log(JSON.stringify(
      args.summaryOnly ? compactSummary(summary) : summary,
      null,
      2
    ));
  } else {
    printSummary(summary, {summaryOnly: args.summaryOnly});
  }

  if (!args.apply) {
    console.log("\nDry run only. Re-run with --apply to write Algolia.");
    return;
  }

  await applyAlgoliaExploreSearchPlan(plan, algoliaConfig, helpers);
  console.log("\nApplied Algolia Explore search index settings and records.");
}

export async function buildAlgoliaExploreSearchPlan(firestore, helpers) {
  const [organizersSnap, eventsSnap] = await Promise.all([
    firestore.collection("clubs").get(),
    firestore.collection("events").get(),
  ]);
  const organizerDocs = new Map();
  for (const doc of organizersSnap.docs) {
    organizerDocs.set(doc.id, doc.data());
  }

  const organizerRecords = [];
  for (const doc of organizersSnap.docs) {
    const record = helpers.buildOrganizerSearchRecord(doc.id, doc.data());
    if (record) organizerRecords.push(record);
  }

  const eventRecords = [];
  const warnings = [];
  for (const doc of eventsSnap.docs) {
    const event = doc.data();
    const organizerId = typeof event.organizerId === "string" ? event.organizerId : null;
    const organizer = organizerId ? organizerDocs.get(organizerId) : null;
    if (!organizer) {
      warnings.push(
        `${doc.ref.path} references missing clubs/${organizerId ?? "<missing>"}; ` +
        "event was skipped."
      );
      continue;
    }
    const record = helpers.buildEventSearchRecord(doc.id, event, organizer);
    if (record) eventRecords.push(record);
  }

  return {
    organizerRecords,
    eventRecords,
    summary: {
      organizersScanned: organizersSnap.size,
      eventsScanned: eventsSnap.size,
      organizerRecords: organizerRecords.length,
      eventRecords: eventRecords.length,
      warnings,
    },
  };
}

export async function applyAlgoliaExploreSearchPlan(
  plan,
  config,
  helpers
) {
  await Promise.all([
    putSettings(
      config,
      config.organizersIndex,
      helpers.organizerSearchIndexSettings()
    ),
    putSettings(
      config,
      config.eventsIndex,
      helpers.eventSearchIndexSettings()
    ),
  ]);
  await Promise.all([
    saveObjects(config, config.organizersIndex, plan.organizerRecords),
    saveObjects(config, config.eventsIndex, plan.eventRecords),
  ]);
}

async function putSettings(config, indexName, settings) {
  await algoliaFetch(
    config,
    `/1/indexes/${encodeURIComponent(indexName)}/settings`,
    {
      method: "PUT",
      body: JSON.stringify(settings),
    }
  );
}

async function saveObjects(config, indexName, records) {
  for (let i = 0; i < records.length; i += 1000) {
    const chunk = records.slice(i, i + 1000);
    if (chunk.length === 0) continue;
    await algoliaFetch(
      config,
      `/1/indexes/${encodeURIComponent(indexName)}/batch`,
      {
        method: "POST",
        body: JSON.stringify({
          requests: chunk.map((record) => ({
            action: "addObject",
            body: record,
          })),
        }),
      }
    );
  }
}

async function algoliaFetch(config, requestPath, init) {
  const response = await fetch(
    `https://${config.appId}.algolia.net${requestPath}`,
    {
      ...init,
      headers: {
        "accept": "application/json",
        "content-type": "application/json",
        "x-algolia-application-id": config.appId,
        "x-algolia-api-key": config.writeApiKey,
      },
    }
  );
  if (response.ok) return;

  const body = await response.text().catch(() => "");
  throw new Error(
    `Algolia request failed with ${response.status}: ${body.slice(0, 500)}`
  );
}

function loadAlgoliaHelpers() {
  try {
    return requireFromFunctions("./lib/search/algoliaExploreIndex.js");
  } catch (error) {
    throw new Error(
      "Could not load functions/lib/search/algoliaExploreIndex.js. " +
      "Run `npm --prefix functions run build` before this repair tool. " +
      `Original error: ${error.message}`
    );
  }
}

function readAlgoliaConfig(args) {
  const appId = args.appId || process.env.ALGOLIA_APP_ID;
  const writeApiKey = process.env.ALGOLIA_WRITE_API_KEY;
  if (!appId) {
    throw new Error("ALGOLIA_APP_ID or --app-id is required.");
  }
  if (!writeApiKey) {
    throw new Error("ALGOLIA_WRITE_API_KEY is required.");
  }
  return {
    appId,
    writeApiKey,
    organizersIndex: args.organizersIndex || process.env.ALGOLIA_ORGANIZERS_INDEX || "clubs",
    eventsIndex: args.eventsIndex || process.env.ALGOLIA_EVENTS_INDEX ||
      "events",
  };
}

function parseArgs(argv) {
  const parsed = {
    env: null,
    project: null,
    appId: null,
    organizersIndex: null,
    eventsIndex: null,
    apply: false,
    allowProd: false,
    json: false,
    summaryOnly: false,
    help: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") parsed.help = true;
    else if (arg === "--apply") parsed.apply = true;
    else if (arg === "--allow-prod") parsed.allowProd = true;
    else if (arg === "--json") parsed.json = true;
    else if (arg === "--summary-only") parsed.summaryOnly = true;
    else if (arg === "--env") parsed.env = requireValue(argv, ++i, arg);
    else if (arg === "--project") {
      parsed.project = requireValue(argv, ++i, arg);
    } else if (arg === "--app-id") {
      parsed.appId = requireValue(argv, ++i, arg);
    } else if (arg === "--clubs-index") {
      parsed.organizersIndex = requireValue(argv, ++i, arg);
    } else if (arg === "--events-index") {
      parsed.eventsIndex = requireValue(argv, ++i, arg);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return parsed;
}

function requireValue(argv, index, flag) {
  const value = argv[index];
  if (!value || value.startsWith("--")) {
    throw new Error(`${flag} requires a value.`);
  }
  return value;
}

function compactSummary(summary) {
  return {
    projectId: summary.projectId,
    organizersIndex: summary.organizersIndex,
    eventsIndex: summary.eventsIndex,
    organizersScanned: summary.organizersScanned,
    eventsScanned: summary.eventsScanned,
    organizerRecords: summary.organizerRecords,
    eventRecords: summary.eventRecords,
    warningCount: summary.warnings.length,
  };
}

function printSummary(summary, {summaryOnly}) {
  console.log(`Project: ${summary.projectId}`);
  console.log(`Indices: ${summary.organizersIndex}, ${summary.eventsIndex}`);
  console.log(`Clubs scanned: ${summary.organizersScanned}`);
  console.log(`Events scanned: ${summary.eventsScanned}`);
  console.log(`Club records: ${summary.organizerRecords}`);
  console.log(`Event records: ${summary.eventRecords}`);
  console.log(`Warnings: ${summary.warnings.length}`);
  if (!summaryOnly && summary.warnings.length > 0) {
    for (const warning of summary.warnings) {
      console.log(`- ${warning}`);
    }
  }
}

function printHelp() {
  console.log(`Usage:
  ALGOLIA_APP_ID=<app-id> ALGOLIA_WRITE_API_KEY=<key> \\
    node tool/data/backfill_algolia_explore_search.mjs --env prod --json

Options:
  --env <dev|staging|prod>    Firebase project alias from .firebaserc.
  --project <project-id>      Firebase project id override.
  --app-id <app-id>           Algolia application id override.
  --clubs-index <name>        Algolia clubs index name. Default: clubs.
  --events-index <name>       Algolia events index name. Default: events.
  --apply                     Write settings and records to Algolia.
  --allow-prod                Required with --apply for prod.
  --json                      Print JSON summary.
  --summary-only              Omit warning details.
`);
}

function isMain() {
  return process.argv[1] === fileURLToPath(import.meta.url);
}
