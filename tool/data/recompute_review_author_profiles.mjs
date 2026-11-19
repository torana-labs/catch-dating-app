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
  const plan = await buildReviewAuthorProfileRepairPlan(
    db,
    loadProfileProjection()
  );

  if (args.json) {
    console.log(JSON.stringify(plan.summary, null, 2));
  } else {
    printSummary(plan.summary);
  }

  if (!args.apply) {
    console.log("\nDry run only. Re-run with --apply to write reviewer names.");
    return;
  }

  await applyReviewAuthorProfileRepairPlan(db, plan);
  console.log("\nApplied review author profile repairs.");
}

export async function buildReviewAuthorProfileRepairPlan(
  firestore,
  profileProjection
) {
  const [reviewsSnap, usersSnap] = await Promise.all([
    firestore.collection("reviews").get(),
    firestore.collection("users").get(),
  ]);

  const users = new Map(usersSnap.docs.map((doc) => [doc.id, doc.data()]));
  const warnings = [];
  const repairs = [];

  for (const reviewDoc of reviewsSnap.docs) {
    const review = reviewDoc.data();
    if (
      typeof review.reviewerUserId !== "string" ||
      review.reviewerUserId.length === 0
    ) {
      warnings.push(`${reviewDoc.ref.path} has no reviewerUserId.`);
      continue;
    }

    const user = users.get(review.reviewerUserId);
    if (!user) {
      warnings.push(
        `${reviewDoc.ref.path} references missing users/` +
        `${review.reviewerUserId}.`
      );
      continue;
    }

    const expected = {
      reviewerName: profileProjection.publicDisplayName(user),
    };
    const current = {
      reviewerName: review.reviewerName,
    };
    if (current.reviewerName !== expected.reviewerName) {
      repairs.push({
        path: reviewDoc.ref.path,
        reviewId: reviewDoc.id,
        reviewerUserId: review.reviewerUserId,
        current,
        expected,
      });
    }
  }

  return {
    repairs,
    summary: {
      reviewsScanned: reviewsSnap.size,
      usersScanned: usersSnap.size,
      repairsNeeded: repairs.length,
      warnings,
      repairs,
    },
  };
}

export async function applyReviewAuthorProfileRepairPlan(firestore, plan) {
  for (let i = 0; i < plan.repairs.length; i += 450) {
    const batch = firestore.batch();
    for (const repair of plan.repairs.slice(i, i + 450)) {
      batch.update(firestore.doc(repair.path), repair.expected);
    }
    await batch.commit();
  }
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

function printHelp() {
  console.log(`Usage: node tool/data/recompute_review_author_profiles.mjs [options]

Recomputes reviews/{reviewId}.reviewerName from the reviewer users/{uid}
profile document.

Options:
  --apply                 Write repairs. Default is dry-run.
  --json                  Print summary as JSON.
  --env <dev|prod> Resolve project id from .firebaserc.
  --project <id>          Firebase project id.
  --emulator              Use Firestore emulator at 127.0.0.1:8080.
  --emulator-host <host>  Use a custom Firestore emulator host.
  -h, --help              Show this help.
`);
}

function printSummary(summary) {
  console.log("Review author profile repair plan");
  console.log(`Reviews scanned: ${summary.reviewsScanned}`);
  console.log(`Users scanned: ${summary.usersScanned}`);
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
