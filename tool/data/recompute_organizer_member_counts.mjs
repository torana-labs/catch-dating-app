#!/usr/bin/env node
import {isMain, parseRecomputeArgs} from "../lib/cli_args.mjs";
import {createFunctionsRequire} from "../lib/repo_paths.mjs";
import {resolveFirebaseProjectId} from "../lib/firebase_project.mjs";

const requireFromFunctions = createFunctionsRequire();
const admin = requireFromFunctions("firebase-admin");

if (isMain(import.meta.url)) {
  await main();
}

export async function main(argv = process.argv.slice(2)) {
  const args = parseRecomputeArgs(argv);
  if (args.help) {
    printHelp();
    return;
  }

  if (args.emulatorHost) {
    process.env.FIRESTORE_EMULATOR_HOST = args.emulatorHost;
  }

  admin.initializeApp({
    projectId: resolveFirebaseProjectId({...args, defaultEnv: null}),
  });
  const db = admin.firestore();
  const plan = await buildMemberCountRepairPlan(db);

  if (args.json) {
    console.log(JSON.stringify(plan.summary, null, 2));
  } else {
    printSummary(plan.summary);
  }

  if (!args.apply) {
    console.log("\nDry run only. Re-run with --apply to write memberCount.");
    return;
  }

  await applyMemberCountRepairPlan(db, plan);
  console.log("\nApplied club memberCount repairs.");
}

export async function buildMemberCountRepairPlan(firestore) {
  const [organizersSnap, membershipsSnap] = await Promise.all([
    firestore.collection("organizers").get(),
    firestore.collection("organizerMemberships").get(),
  ]);

  const organizerIds = new Set(organizersSnap.docs.map((doc) => doc.id));
  const activeCounts = new Map();
  const warnings = [];

  for (const doc of membershipsSnap.docs) {
    const data = doc.data();
    if (data.status !== "active") continue;
    if (typeof data.organizerId !== "string" || data.organizerId.length === 0) {
      warnings.push(`${doc.ref.path} has active status but no organizerId.`);
      continue;
    }
    if (!organizerIds.has(data.organizerId)) {
      warnings.push(
        `${doc.ref.path} references missing organizers/${data.organizerId}.`
      );
      continue;
    }
    activeCounts.set(data.organizerId, (activeCounts.get(data.organizerId) ?? 0) + 1);
  }

  const repairs = [];
  for (const organizerDoc of organizersSnap.docs) {
    const current = organizerDoc.data().memberCount;
    const expected = activeCounts.get(organizerDoc.id) ?? 0;
    if (current !== expected) {
      repairs.push({
        path: organizerDoc.ref.path,
        organizerId: organizerDoc.id,
        currentMemberCount: current,
        expectedMemberCount: expected,
      });
    }
  }

  return {
    repairs,
    summary: {
      organizersScanned: organizersSnap.size,
      membershipsScanned: membershipsSnap.size,
      repairsNeeded: repairs.length,
      warnings,
      repairs,
    },
  };
}

export async function applyMemberCountRepairPlan(firestore, plan) {
  for (let i = 0; i < plan.repairs.length; i += 450) {
    const batch = firestore.batch();
    for (const repair of plan.repairs.slice(i, i + 450)) {
      batch.update(firestore.doc(repair.path), {
        memberCount: repair.expectedMemberCount,
      });
    }
    await batch.commit();
  }
}

function printHelp() {
  console.log(`Usage: node tool/data/recompute_organizer_member_counts.mjs [options]

Recomputes clubs/{organizerId}.memberCount from active
organizerMemberships/{organizerId_uid} edge documents.

Options:
  --apply                 Write repairs. Default is dry-run.
  --json                  Print summary as JSON.
  --env <dev|staging|prod> Resolve project id from .firebaserc.
  --project <id>          Firebase project id.
  --emulator              Use Firestore emulator at 127.0.0.1:8080.
  --emulator-host <host>  Use a custom Firestore emulator host.
  -h, --help              Show this help.
`);
}

function printSummary(summary) {
  console.log("Club memberCount repair plan");
  console.log(`Clubs scanned: ${summary.organizersScanned}`);
  console.log(`Memberships scanned: ${summary.membershipsScanned}`);
  console.log(`Repairs needed: ${summary.repairsNeeded}`);

  if (summary.repairs.length > 0) {
    console.log("\nRepairs:");
    for (const repair of summary.repairs.slice(0, 100)) {
      console.log(
        `- ${repair.path}: ${repair.currentMemberCount} -> ` +
        `${repair.expectedMemberCount}`
      );
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
