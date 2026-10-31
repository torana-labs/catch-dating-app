#!/usr/bin/env node
import {isDeepStrictEqual} from "node:util";
import {fileURLToPath} from "node:url";
import {
  applyFirestoreEmulatorHost,
  assertProdWriteAllowed,
  resolveFirebaseProjectId,
} from "../lib/firebase_project.mjs";
import {parseCommonArgs} from "../lib/cli_args.mjs";
import {createFunctionsRequire} from "../lib/repo_paths.mjs";
import {
  configCitiesDocument,
  marketForIdOrAlias,
} from "../lib/location_markets.mjs";

const requireFromFunctions = createFunctionsRequire();
const admin = requireFromFunctions("firebase-admin");

if (isMain()) {
  await main();
}

export async function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  if (args.help) {
    printHelp();
    return;
  }

  const projectId = resolveFirebaseProjectId({
    env: args.env,
    project: args.project,
  });
  assertProdWriteAllowed({
    env: args.env,
    projectId,
    apply: args.apply,
    allowProd: args.allowProd,
    action: "backfill location market fields in",
  });
  applyFirestoreEmulatorHost(args.emulatorHost);

  const app = admin.initializeApp({projectId}, "location-market-backfill");
  const db = app.firestore();
  const plan = await buildLocationMarketBackfillPlan(db, {
    includeConfig: !args.skip_config && !args.clubs_only,
    includeProfiles: !args.clubs_only,
  });

  const output = args.summary_only ? compactSummary(plan.summary) : plan.summary;
  if (args.json) {
    console.log(JSON.stringify(output, null, 2));
  } else {
    printSummary(output, {summaryOnly: args.summary_only});
  }

  if (!args.apply) {
    console.log("\nDry run only. Re-run with --apply to write repairs.");
    await app.delete();
    return;
  }

  await applyLocationMarketBackfillPlan(db, plan);
  console.log("\nApplied location market backfill repairs.");
  await app.delete();
}

export async function buildLocationMarketBackfillPlan(
  firestore,
  {includeConfig = true, includeProfiles = true} = {}
) {
  const [configDoc, organizersSnap, usersSnap, publicProfilesSnap] =
    await Promise.all([
      includeConfig ? firestore.collection("config").doc("cities").get() : null,
      firestore.collection("clubs").get(),
      includeProfiles ? firestore.collection("users").get() : emptySnapshot(),
      includeProfiles ?
        firestore.collection("publicProfiles").get() :
        emptySnapshot(),
    ]);

  const repairs = [];
  const warnings = [];

  if (includeConfig) {
    const expectedConfig = configCitiesDocument();
    const currentConfig = configDoc.exists ? configDoc.data() : null;
    if (!isDeepStrictEqual(currentConfig, expectedConfig)) {
      repairs.push({
        path: "config/cities",
        op: "set",
        data: expectedConfig,
      });
    }
  }

  for (const doc of organizersSnap.docs) {
    const organizer = doc.data();
    const market = marketForOrganizer(organizer);
    if (!market) {
      warnings.push(`${doc.ref.path} has no resolvable location market.`);
      continue;
    }
    const patch = changedPatch(organizer, {
      location: market.marketId,
      locationCityId: market.cityId,
      locationMarketId: market.marketId,
      cityName: market.cityLabel,
      regionName: market.regionName,
      countryCode: market.countryIsoCode,
      countryName: market.countryName,
      ...(organizer.publicPage && !stringOrNull(organizer.publicPage.citySlug) ? {
        "publicPage.citySlug": market.slug,
      } : {}),
    });
    if (Object.keys(patch).length > 0) {
      repairs.push({
        path: doc.ref.path,
        op: "update",
        data: patch,
      });
    }
  }

  for (const doc of usersSnap.docs) {
    const patch = profileCityPatch(doc.data());
    if (patch.warning) warnings.push(`${doc.ref.path}: ${patch.warning}`);
    if (patch.data) {
      repairs.push({
        path: doc.ref.path,
        op: "update",
        data: patch.data,
      });
    }
  }

  for (const doc of publicProfilesSnap.docs) {
    const patch = profileCityPatch(doc.data());
    if (patch.warning) warnings.push(`${doc.ref.path}: ${patch.warning}`);
    if (patch.data) {
      repairs.push({
        path: doc.ref.path,
        op: "update",
        data: patch.data,
      });
    }
  }

  return {
    repairs,
    summary: {
      configChecked: includeConfig,
      organizersScanned: organizersSnap.size,
      usersScanned: usersSnap.size,
      publicProfilesScanned: publicProfilesSnap.size,
      repairsNeeded: repairs.length,
      warnings,
      repairs,
    },
  };
}

export async function applyLocationMarketBackfillPlan(firestore, plan) {
  for (let index = 0; index < plan.repairs.length; index += 450) {
    const batch = firestore.batch();
    for (const repair of plan.repairs.slice(index, index + 450)) {
      const ref = firestore.doc(repair.path);
      if (repair.op === "set") {
        batch.set(ref, repair.data);
      } else {
        batch.update(ref, repair.data);
      }
    }
    await batch.commit();
  }
}

function marketForOrganizer(organizer) {
  return marketForIdOrAlias(organizer.locationMarketId) ??
    marketForIdOrAlias(organizer.location) ??
    marketForIdOrAlias(organizer.publicPage?.citySlug) ??
    marketForIdOrAlias(organizer.cityName);
}

function profileCityPatch(profile) {
  const value = stringOrNull(profile.city);
  if (!value) return {data: null, warning: null};
  const market = marketForIdOrAlias(value);
  if (!market) {
    return {data: null, warning: `unresolvable city "${value}"`};
  }
  if (value === market.marketId) {
    return {data: null, warning: null};
  }
  return {data: {city: market.marketId}, warning: null};
}

function changedPatch(source, expected) {
  const patch = {};
  for (const [key, value] of Object.entries(expected)) {
    if (!isDeepStrictEqual(readPath(source, key), value)) {
      patch[key] = value;
    }
  }
  return patch;
}

function readPath(source, key) {
  return key.split(".").reduce((value, segment) => {
    if (value == null || typeof value !== "object") return undefined;
    return value[segment];
  }, source);
}

function stringOrNull(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function emptySnapshot() {
  return {size: 0, docs: []};
}

function parseArgs(argv) {
  return parseCommonArgs(argv, {
    booleanFlags: ["--clubs-only", "--summary-only", "--skip-config"],
  });
}

function compactSummary(summary) {
  return {
    configChecked: summary.configChecked,
    organizersScanned: summary.organizersScanned,
    usersScanned: summary.usersScanned,
    publicProfilesScanned: summary.publicProfilesScanned,
    repairsNeeded: summary.repairsNeeded,
    warningCount: summary.warnings.length,
    warnings: summary.warnings,
  };
}

function printSummary(summary, {summaryOnly = false} = {}) {
  console.log("Location market backfill plan");
  console.log(`Config checked: ${summary.configChecked ? "yes" : "no"}`);
  console.log(`Clubs scanned: ${summary.organizersScanned}`);
  console.log(`Users scanned: ${summary.usersScanned}`);
  console.log(`Public profiles scanned: ${summary.publicProfilesScanned}`);
  console.log(`Repairs needed: ${summary.repairsNeeded}`);

  if (!summaryOnly && summary.repairs.length > 0) {
    console.log("\nRepairs:");
    for (const repair of summary.repairs.slice(0, 100)) {
      console.log(`- ${repair.op} ${repair.path}: ${JSON.stringify(repair.data)}`);
    }
    if (summary.repairs.length > 100) {
      console.log(`... ${summary.repairs.length - 100} more repairs`);
    }
  }

  if (summary.warnings.length > 0) {
    console.log("\nWarnings:");
    for (const warning of summary.warnings.slice(0, 100)) {
      console.log(`- ${warning}`);
    }
    if (summary.warnings.length > 100) {
      console.log(`... ${summary.warnings.length - 100} more warnings`);
    }
  }
}

function printHelp() {
  console.log(`Usage: node tool/data/backfill_location_market_fields.mjs [options]

Backfills config/cities plus canonical market fields on clubs, users, and
publicProfiles. The script is dry-run by default.

Options:
  --apply                 Write repairs. Default is dry-run.
  --allow-prod            Required with --apply against prod.
  --clubs-only            Repair only clubs; skip config and profile reads.
  --skip-config           Do not repair config/cities.
  --json                  Print summary as JSON.
  --summary-only          Omit per-document repair details from output.
  --env <dev|staging|prod> Resolve project id from .firebaserc.
  --project <id>          Firebase project id override.
  --emulator              Use Firestore emulator at 127.0.0.1:8080.
  --emulator-host <host>  Use a custom Firestore emulator host.
  -h, --help              Show this help.
`);
}

function isMain() {
  return process.argv[1] &&
    fileURLToPath(import.meta.url) === process.argv[1];
}
