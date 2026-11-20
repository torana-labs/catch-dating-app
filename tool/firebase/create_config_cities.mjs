#!/usr/bin/env node
import {
  applyFirestoreEmulatorHost,
  assertProdWriteAllowed,
  readFirebaseProjectAliases,
  resolveFirebaseProjectId,
} from "../lib/firebase_project.mjs";
import {createFunctionsRequire} from "../lib/repo_paths.mjs";
import {parseCommonArgs} from "../lib/cli_args.mjs";
import {
  canonicalMarkets,
  configCitiesDocument,
  launchedMarketIds,
} from "../lib/location_markets.mjs";

const requireFromFunctions = createFunctionsRequire();
const admin = requireFromFunctions("firebase-admin");

const citiesDoc = configCitiesDocument();

const args = parseArgs(process.argv.slice(2));
if (args.help) {
  printHelp();
  process.exit(0);
}

const targets = resolveTargets(args);
if (args.json) {
  console.log(JSON.stringify({
    apply: args.apply,
    targets,
    marketCount: canonicalMarkets.length,
    launchedMarketIds,
  }, null, 2));
} else {
  console.log("Config/cities plan");
  console.log(`Mode: ${args.apply ? "apply" : "dry-run"}`);
  console.log(`Targets: ${targets.map((target) => target.env).join(", ")}`);
  console.log(`Markets: ${canonicalMarkets.length}`);
  console.log(`Launched: ${launchedMarketIds.join(", ")}`);
}

if (!args.apply) {
  console.log("\nDry run only. Re-run with --apply to write config/cities.");
  process.exit(0);
}

applyFirestoreEmulatorHost(args.emulatorHost);
for (const target of targets) {
  assertProdWriteAllowed({
    env: target.env,
    projectId: target.projectId,
    apply: args.apply,
    allowProd: args.allowProd,
    action: "write config/cities to",
  });
  await writeConfigDoc(target);
}
console.log("\nConfig/cities writes applied.");

function parseArgs(argv) {
  const parsed = parseCommonArgs(argv, {booleanFlags: ["--all"]});
  parsed.all = parsed.all ?? false;
  return parsed;
}

function resolveTargets(parsed) {
  if (parsed.project) {
    return [{
      env: parsed.env ?? "custom",
      projectId: parsed.project,
    }];
  }

  if (parsed.all) {
    const aliases = readFirebaseProjectAliases();
    return ["dev", "prod"].map((env) => ({
      env,
      projectId: aliases[env],
    })).filter((target) => target.projectId);
  }

  const env = parsed.env ?? "dev";
  return [{
    env,
    projectId: resolveFirebaseProjectId({env}),
  }];
}

async function writeConfigDoc({env, projectId}) {
  const app = admin.initializeApp({projectId}, `config-cities-${env}`);
  const db = app.firestore();
  await db.collection("config").doc("cities").set(citiesDoc);
  console.log(`  OK  ${env}: ${projectId}`);
  await app.delete();
}

function printHelp() {
  console.log(`Usage: node tool/firebase/create_config_cities.mjs [options]

Writes config/cities for one Firebase environment. The tool is dry-run by
default; use --all intentionally for dev and prod.

Options:
  --apply                 Write the config doc. Default is dry-run.
  --allow-prod            Required when --apply targets prod.
  --all                   Target dev and prod.
  --json                  Print compact summary as JSON.
  --env <dev|prod> Resolve project id from .firebaserc. Defaults to dev.
  --project <id>          Firebase project id override.
  --emulator              Use Firestore emulator at 127.0.0.1:8080.
  --emulator-host <host>  Use a custom Firestore emulator host.
  -h, --help              Show this help.
`);
}
