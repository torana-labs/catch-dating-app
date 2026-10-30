#!/usr/bin/env node
import {isMain, parseRecomputeArgs} from "../lib/cli_args.mjs";
import {createFunctionsRequire} from "../lib/repo_paths.mjs";
import {resolveFirebaseProjectId} from "../lib/firebase_project.mjs";

const requireFromFunctions = createFunctionsRequire();
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

  const admin = requireFromFunctions("firebase-admin");
  admin.initializeApp({
    projectId: resolveFirebaseProjectId({...args, defaultEnv: null}),
  });
  const db = admin.firestore();
  const plan = await buildOrganizerHostProfileRepairPlan(db);

  if (args.json) {
    console.log(JSON.stringify(plan.summary, null, 2));
  } else {
    printSummary(plan.summary);
  }

  if (!args.apply) {
    console.log("\nDry run only. Re-run with --apply to write host fields.");
    return;
  }

  await applyOrganizerHostProfileRepairPlan(db, plan);
  console.log("\nApplied club host profile repairs.");
}

export async function buildOrganizerHostProfileRepairPlan(firestore) {
  const [organizersSnap, hostProfilesSnap] = await Promise.all([
    firestore.collection("organizers").get(),
    firestore.collection("hostProfiles").get(),
  ]);

  const hostProfileDocs = new Map(
    hostProfilesSnap.docs.map((doc) => [doc.id, doc.data()])
  );
  const warnings = [];
  const repairs = [];

  for (const organizerDoc of organizersSnap.docs) {
    const organizer = organizerDoc.data();
    const ownerUserId = resolveOwnerUserId(organizer);
    if (!ownerUserId) {
      warnings.push(`${organizerDoc.ref.path} has no ownerUserId or hostUserId.`);
      continue;
    }

    const hostUserIds = resolveHostUserIds(organizer, ownerUserId);

    const hostProfiles = hostUserIds.map((uid) => {
      const hostProfile = hostProfileDocs.get(uid);
      const fallback = existingOrganizerHostProfile(organizer, uid, ownerUserId);
      if (!hostProfile) {
        warnings.push(
          `${organizerDoc.ref.path} has no hostProfiles/${uid}; ` +
          "using the existing club host snapshot fallback."
        );
      }
      return {
        uid,
        displayName: nonBlank(hostProfile?.displayName) ??
          fallback.displayName,
        avatarUrl: nonBlank(hostProfile?.avatarUrl) ?? fallback.avatarUrl,
        role: uid === ownerUserId ? "owner" : "host",
      };
    });
    const primaryHostProfile = hostProfiles[0];
    const expected = {
      hostName: primaryHostProfile.displayName,
      hostAvatarUrl: primaryHostProfile.avatarUrl,
      ownerUserId,
      hostUserIds,
      hostProfiles,
      profileImageUrl: organizer.profileImageUrl ?? null,
    };
    const current = {
      hostName: organizer.hostName,
      hostAvatarUrl: organizer.hostAvatarUrl ?? null,
      ownerUserId: organizer.ownerUserId ?? null,
      hostUserIds: Array.isArray(organizer.hostUserIds) ? organizer.hostUserIds : [],
      hostProfiles: Array.isArray(organizer.hostProfiles) ? organizer.hostProfiles : [],
      profileImageUrl: organizer.profileImageUrl ?? null,
    };
    if (stableStringify(current) !== stableStringify(expected)) {
      repairs.push({
        path: organizerDoc.ref.path,
        organizerId: organizerDoc.id,
        hostUserId: ownerUserId,
        current,
        expected,
      });
    }
  }

  return {
    repairs,
    summary: {
      organizersScanned: organizersSnap.size,
      hostProfilesScanned: hostProfilesSnap.size,
      repairsNeeded: repairs.length,
      warnings,
      repairs,
    },
  };
}

export async function applyOrganizerHostProfileRepairPlan(firestore, plan) {
  for (let i = 0; i < plan.repairs.length; i += 450) {
    const batch = firestore.batch();
    for (const repair of plan.repairs.slice(i, i + 450)) {
      batch.update(firestore.doc(repair.path), repair.expected);
    }
    await batch.commit();
  }
}

function printHelp() {
  console.log(`Usage: node tool/data/recompute_organizer_host_profiles.mjs [options]

Recomputes club host projection fields from hostProfiles/{uid} documents.
Backfills ownerUserId, hostUserIds, hostProfiles, and profileImageUrl for
legacy clubs while preserving existing club host snapshots when a host profile
document has not been created yet.

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

function resolveOwnerUserId(organizer) {
  if (typeof organizer.ownerUserId === "string" && organizer.ownerUserId.length > 0) {
    return organizer.ownerUserId;
  }
  if (typeof organizer.hostUserId === "string" && organizer.hostUserId.length > 0) {
    return organizer.hostUserId;
  }
  return null;
}

function resolveHostUserIds(organizer, ownerUserId) {
  return [
    ownerUserId,
    typeof organizer.hostUserId === "string" ? organizer.hostUserId : null,
    ...(Array.isArray(organizer.hostUserIds) ? organizer.hostUserIds : []),
    ...(Array.isArray(organizer.hostProfiles)
      ? organizer.hostProfiles.map((host) => host?.uid)
      : []),
  ]
    .filter((uid) => typeof uid === "string" && uid.length > 0)
    .filter((uid, index, all) => all.indexOf(uid) === index);
}

function existingOrganizerHostProfile(organizer, uid, ownerUserId) {
  const existingProfile = Array.isArray(organizer.hostProfiles) ?
    organizer.hostProfiles.find((host) => host?.uid === uid) :
    null;
  const isOwner = uid === ownerUserId;
  return {
    displayName: nonBlank(existingProfile?.displayName) ??
      (isOwner ? nonBlank(organizer.hostName) : null) ??
      "Catch Host",
    avatarUrl: nonBlank(existingProfile?.avatarUrl) ??
      (isOwner ? nonBlank(organizer.hostAvatarUrl) : null),
  };
}

function nonBlank(value) {
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized || null;
}

function stableStringify(value) {
  return JSON.stringify(stableValue(value));
}

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, stableValue(value[key])])
    );
  }
  return value;
}

function printSummary(summary) {
  console.log("Club host profile repair plan");
  console.log(`Clubs scanned: ${summary.organizersScanned}`);
  console.log(`Host profiles scanned: ${summary.hostProfilesScanned}`);
  console.log(`Repairs needed: ${summary.repairsNeeded}`);

  if (summary.repairs.length > 0) {
    console.log("\nRepairs:");
    for (const repair of summary.repairs.slice(0, 100)) {
      console.log(
        `- ${repair.path}: ${JSON.stringify(repair.current)} -> ` +
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
