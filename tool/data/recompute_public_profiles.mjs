#!/usr/bin/env node
import path from "node:path";
import {createRequire} from "node:module";
import {isDeepStrictEqual} from "node:util";
import {fileURLToPath, pathToFileURL} from "node:url";
import {parseCommonArgs} from "../lib/cli_args.mjs";
import {
  assertValidSchemaPayload,
  validatePublicProfileDocument,
} from "../contracts/generated/schema_contract_validators.mjs";
import {isFirebaseProductionTarget, resolveFirebaseProjectId} from "../lib/firebase_project.mjs";

const toolDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(toolDir, "../..");
const requireFromFunctions = createRequire(
  path.join(repoRoot, "functions/package.json")
);
const firestoreMaintenanceArgOptions = {
  booleanFlags: ["--summary-only"],
  allowPositionals: false,
  customFieldCase: "camel",
};

if (isMain()) {
  await main();
}

export async function main(argv = process.argv.slice(2)) {
  const args = parseCommonArgs(argv, firestoreMaintenanceArgOptions);
  if (args.help) {
    printHelp();
    return;
  }

  const projectId = resolveFirebaseProjectId({env: args.env, project: args.project, defaultEnv: null});
  if (args.apply && isFirebaseProductionTarget({env: args.env, projectId}) && !args.allowProd) {
    throw new Error(
      "Refusing to repair prod without --allow-prod. " +
      "Run a dry run first, then rerun with --apply --allow-prod."
    );
  }
  if (args.emulatorHost) {
    process.env.FIRESTORE_EMULATOR_HOST = args.emulatorHost;
  }

  const admin = requireFromFunctions("firebase-admin");
  admin.initializeApp({projectId});
  const db = admin.firestore();
  const plan = await buildPublicProfileRepairPlan(
    db,
    loadProfileProjection(),
    {isPublicProfileEligible: loadProfileReadiness().isSocialReadyUserProfile}
  );

  if (args.json) {
    const summary = args.summaryOnly ?
      compactSummary(plan.summary) :
      plan.summary;
    console.log(JSON.stringify(summary, null, 2));
  } else {
    printSummary(plan.summary, {summaryOnly: args.summaryOnly});
  }

  if (!args.apply) {
    console.log("\nDry run only. Re-run with --apply to write repairs.");
    return;
  }

  await applyPublicProfileRepairPlan(db, plan);
  console.log("\nApplied public profile projection repairs.");
}

export async function buildPublicProfileRepairPlan(
  firestore,
  profileProjection,
  {
    isPublicProfileEligible = null,
  } = {}
) {
  const [usersSnap, publicProfilesSnap] = await Promise.all([
    firestore.collection("users").get(),
    firestore.collection("publicProfiles").get(),
  ]);

  const publicProfiles = new Map(
    publicProfilesSnap.docs.map((doc) => [doc.id, doc.data()])
  );
  const warnings = [];
  const repairs = [];
  const usersSeen = new Set();

  for (const userDoc of usersSnap.docs) {
    const uid = userDoc.id;
    usersSeen.add(uid);
    const user = userDoc.data();
    const current = publicProfiles.get(uid);

    if (user.deleted === true) {
      if (current) repairs.push(deleteRepair(uid, current, "deletedUser"));
      continue;
    }
    if (isPublicProfileEligible && !isPublicProfileEligible(user)) {
      if (current) {
        repairs.push(deleteRepair(uid, current, "notSocialReady"));
      }
      continue;
    }

    if (!isPublicProfileEligible && user.profileComplete !== true) {
      if (current) {
        warnings.push(
          `publicProfiles/${uid} exists but users/${uid} is incomplete.`
        );
      }
      continue;
    }

    let expected;
    try {
      expected = profileProjection.publicProfileFromUserProfileDoc(user);
    } catch (error) {
      warnings.push(
        `users/${uid} could not be projected: ${error.message}`
      );
      continue;
    }

    if (expected.age < 18) {
      if (current) repairs.push(deleteRepair(uid, current, "underageUser"));
      continue;
    }

    try {
      assertValidSchemaPayload(
        validatePublicProfileDocument,
        schemaSerializableFirestoreData(expected),
        `publicProfiles/${uid}`
      );
    } catch (error) {
      warnings.push(
        `users/${uid} projected an invalid public profile: ${error.message}`
      );
      continue;
    }

    if (!current || !isDeepStrictEqual(current, expected)) {
      repairs.push({
        op: "set",
        path: `publicProfiles/${uid}`,
        uid,
        reason: current ? "staleProjection" : "missingProjection",
        current: current ?? null,
        expected,
      });
    }
  }

  for (const publicProfileDoc of publicProfilesSnap.docs) {
    if (!usersSeen.has(publicProfileDoc.id)) {
      warnings.push(
        `${publicProfileDoc.ref.path} has no matching users/` +
        `${publicProfileDoc.id}.`
      );
    }
  }

  return {
    repairs,
    summary: {
      usersScanned: usersSnap.size,
      publicProfilesScanned: publicProfilesSnap.size,
      repairsNeeded: repairs.length,
      warnings,
      repairs,
    },
  };
}

export async function applyPublicProfileRepairPlan(firestore, plan) {
  for (let i = 0; i < plan.repairs.length; i += 450) {
    const batch = firestore.batch();
    for (const repair of plan.repairs.slice(i, i + 450)) {
      const ref = firestore.doc(repair.path);
      if (repair.op === "delete") batch.delete(ref);
      else batch.set(ref, repair.expected);
    }
    await batch.commit();
  }
}

function deleteRepair(uid, current, reason) {
  return {
    op: "delete",
    path: `publicProfiles/${uid}`,
    uid,
    reason,
    current,
    expected: null,
  };
}

function loadProfileProjection() {
  try {
    return requireFromFunctions("./lib/shared/profileProjection.js");
  } catch (error) {
    throw new Error(
      "Could not load functions/lib/shared/profileProjection.js. " +
      "Event `npm --prefix functions run build` before this repair tool. " +
      `Original error: ${error.message}`
    );
  }
}

function loadProfileReadiness() {
  try {
    return requireFromFunctions("./lib/shared/profileReadiness.js");
  } catch (error) {
    throw new Error(
      "Could not load functions/lib/shared/profileReadiness.js. " +
      "Event `npm --prefix functions run build` before this repair tool. " +
      `Original error: ${error.message}`
    );
  }
}

function schemaSerializableFirestoreData(value) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (isFirestoreTimestamp(value)) return schemaSerializableTimestamp(value);
  if (Array.isArray(value)) {
    return value.map((item) => schemaSerializableFirestoreData(item));
  }
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .map(([key, item]) => [key, schemaSerializableFirestoreData(item)])
        .filter(([, item]) => item !== undefined)
    );
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
  if (
    Number.isInteger(timestamp.seconds) &&
    Number.isInteger(timestamp.nanoseconds)
  ) {
    return {_seconds: timestamp.seconds, _nanoseconds: timestamp.nanoseconds};
  }
  const millis = timestamp.toMillis();
  return {
    _seconds: Math.floor(millis / 1000),
    _nanoseconds: (millis % 1000) * 1000000,
  };
}

function printHelp() {
  console.log(`Usage: node tool/data/recompute_public_profiles.mjs [options]

Recomputes publicProfiles/{uid} from users/{uid} using the compiled Functions
profile projection helper. The script is dry-run by default and writes full
public profile replacements so stale legacy fields are removed.

Options:
  --apply                 Write repairs. Default is dry-run.
  --allow-prod            Required with --apply against prod.
  --json                  Print summary as JSON.
  --summary-only          Omit per-document repair details from output.
  --env <dev|staging|prod> Resolve project id from .firebaserc.
  --project <id>          Firebase project id.
  --emulator              Use Firestore emulator at 127.0.0.1:8080.
  --emulator-host <host>  Use a custom Firestore emulator host.
  -h, --help              Show this help.
`);
}

function compactSummary(summary) {
  const reasonCounts = {};
  for (const repair of summary.repairs) {
    reasonCounts[repair.reason] = (reasonCounts[repair.reason] ?? 0) + 1;
  }
  return {
    usersScanned: summary.usersScanned,
    publicProfilesScanned: summary.publicProfilesScanned,
    repairsNeeded: summary.repairsNeeded,
    repairReasonCounts: reasonCounts,
    warningCount: summary.warnings.length,
    warnings: summary.warnings,
  };
}

function printSummary(summary, {summaryOnly = false} = {}) {
  const compact = compactSummary(summary);
  console.log("Public profile projection repair plan");
  console.log(`Users scanned: ${summary.usersScanned}`);
  console.log(`Public profiles scanned: ${summary.publicProfilesScanned}`);
  console.log(`Repairs needed: ${summary.repairsNeeded}`);
  if (Object.keys(compact.repairReasonCounts).length > 0) {
    console.log(
      `Repair reasons: ${JSON.stringify(compact.repairReasonCounts)}`
    );
  }

  if (!summaryOnly && summary.repairs.length > 0) {
    console.log("\nRepairs:");
    for (const repair of summary.repairs.slice(0, 100)) {
      console.log(
        `- ${repair.path} [${repair.op}/${repair.reason}]: ` +
        `${JSON.stringify(repair.current)} -> ` +
        `${JSON.stringify(repair.expected)}`
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

function isMain() {
  return process.argv[1] &&
    import.meta.url === pathToFileURL(process.argv[1]).href;
}
