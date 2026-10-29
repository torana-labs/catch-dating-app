#!/usr/bin/env node
import path from "node:path";
import {createRequire} from "node:module";
import {fileURLToPath} from "node:url";
import {isFirebaseProductionTarget, resolveFirebaseProjectId} from "../lib/firebase_project.mjs";

const toolPath = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(toolPath), "../..");
const requireFromFunctions = createRequire(
  path.join(repoRoot, "functions/package.json")
);
const collectionName = "organizerIntakeReviewDecisions";

if (process.argv[1] && path.resolve(process.argv[1]) === toolPath) {
  await main();
}

export async function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  if (args.help) return printHelp();
  const projectId = resolveFirebaseProjectId({env: args.env, project: args.project, defaultEnv: null});
  if (args.apply && isFirebaseProductionTarget({env: args.env, projectId}) && !args.allowProd) {
    throw new Error(
      "Refusing to backfill prod without --allow-prod. Run a dry run first, " +
      "then rerun with --apply --allow-prod."
    );
  }
  if (args.emulatorHost) {
    process.env.FIRESTORE_EMULATOR_HOST = args.emulatorHost;
  }
  const admin = requireFromFunctions("firebase-admin");
  admin.initializeApp({projectId});
  const db = admin.firestore();
  const plan = await buildOrganizerIntakeVisibilityRepairPlan(db);
  console.log(JSON.stringify(plan.summary, null, 2));
  if (plan.summary.invalid > 0) {
    throw new Error("Refusing to apply with invalid decision documents.");
  }
  if (!args.apply) {
    console.log("\nDry run only. Re-run with --apply to write repairs.");
    return;
  }
  await applyOrganizerIntakeVisibilityRepairPlan(db, plan);
  console.log("\nApplied organizer intake visibility repairs.");
}

export async function buildOrganizerIntakeVisibilityRepairPlan(firestore) {
  const snapshot = await firestore.collection(collectionName).get();
  const repairs = [];
  const invalid = [];
  let alreadyCurrent = 0;
  for (const doc of snapshot.docs) {
    const result = visibilityPatchForDecision(doc.data());
    if (result.status === "current") {
      alreadyCurrent += 1;
      continue;
    }
    if (result.status === "invalid") {
      invalid.push({
        path: doc.ref.path,
        entityId: doc.id,
        reason: result.reason,
      });
      continue;
    }
    repairs.push({
      path: doc.ref.path,
      entityId: doc.id,
      decision: doc.data().decision,
      patch: result.patch,
    });
  }
  return {
    repairs,
    invalid,
    summary: {
      decisionsScanned: snapshot.size,
      repairsNeeded: repairs.length,
      alreadyCurrent,
      invalid: invalid.length,
      repairs: repairs.map(({patch, ...repair}) => ({...repair, patch})),
      invalidDocuments: invalid,
    },
  };
}

export function visibilityPatchForDecision(decision) {
  const publishStatus = decision?.publishStatus;
  const indexStatus = decision?.indexStatus;
  if (
    ["draft", "published", "suppressed"].includes(publishStatus) &&
    ["noindex", "indexed"].includes(indexStatus)
  ) {
    return {status: "current"};
  }
  if (
    publishStatus !== undefined ||
    indexStatus !== undefined
  ) {
    return {
      status: "invalid",
      reason: "visibility fields are partially populated or invalid",
    };
  }
  if (decision?.decision === "approve_public") {
    return {
      status: "repair",
      patch: {publishStatus: "published", indexStatus: "indexed"},
    };
  }
  if (decision?.decision === "hold") {
    return {
      status: "repair",
      patch: {publishStatus: "draft", indexStatus: "noindex"},
    };
  }
  if (decision?.decision === "suppress") {
    return {
      status: "repair",
      patch: {publishStatus: "suppressed", indexStatus: "noindex"},
    };
  }
  return {status: "invalid", reason: "decision is not recognized"};
}

export async function applyOrganizerIntakeVisibilityRepairPlan(
  firestore,
  plan
) {
  if (plan.invalid.length > 0) {
    throw new Error("Cannot apply a plan with invalid decision documents.");
  }
  for (let index = 0; index < plan.repairs.length; index += 450) {
    const batch = firestore.batch();
    for (const repair of plan.repairs.slice(index, index + 450)) {
      batch.update(firestore.doc(repair.path), repair.patch);
    }
    await batch.commit();
  }
}

function parseArgs(argv) {
  const parsed = {
    env: null,
    project: null,
    emulatorHost: null,
    apply: false,
    allowProd: false,
    help: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") parsed.help = true;
    else if (arg === "--apply") parsed.apply = true;
    else if (arg === "--allow-prod") parsed.allowProd = true;
    else if (arg === "--emulator") {
      parsed.emulatorHost = "127.0.0.1:8080";
    } else if (arg === "--emulator-host") {
      parsed.emulatorHost = requireValue(argv, ++index, arg);
    } else if (arg === "--env") {
      parsed.env = requireValue(argv, ++index, arg);
    } else if (arg === "--project") {
      parsed.project = requireValue(argv, ++index, arg);
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

function printHelp() {
  console.log(`Usage: node tool/data/backfill_organizer_intake_visibility_decisions.mjs [options]

Backfills explicit public-page publication and search-indexing fields on legacy
organizerIntakeReviewDecisions documents. Legacy approve_public decisions keep
their prior published/indexed behavior; hold and suppress remain off. The tool
is dry-run by default.

Options:
  --apply                  Write repairs. Default is dry-run.
  --allow-prod             Required with --apply against prod.
  --env <dev|staging|prod> Resolve project id from .firebaserc.
  --project <id>           Firebase project id.
  --emulator               Use Firestore emulator at 127.0.0.1:8080.
  --emulator-host <host>   Use a custom Firestore emulator host.
  -h, --help               Show this help.
`);
}
