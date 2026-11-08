#!/usr/bin/env node
"use strict";

// Rolls up the last N complete UTC days of organizerInsights (#1109) from
// the host analytics marts and organizerFollows. Dry run by default; rerun
// safely, since each day's documents are replaced.
//
//   npm --prefix functions run build
//   node functions/scripts/backfill-organizer-insights.cjs \
//     --project <project-id> [--days 30] [--apply]

const admin = require("firebase-admin");

async function main(argv = process.argv.slice(2)) {
  const args = new Map();
  for (let index = 0; index < argv.length; index++) {
    const flag = argv[index];
    if (flag === "--apply") args.set(flag, true);
    else if (["--project", "--days"].includes(flag)) {
      args.set(flag, argv[++index]);
    } else throw new Error(`Unknown argument: ${flag}`);
  }
  const projectId = args.get("--project");
  if (typeof projectId !== "string" || !/^[a-z0-9-]+$/.test(projectId)) {
    throw new Error("Provide an explicit --project identifier.");
  }
  const days = Number(args.get("--days") ?? 30);
  process.env.GCLOUD_PROJECT = projectId;
  admin.initializeApp({projectId});
  // Both modules read the project from the environment when they load.
  const {defaultHostAnalyticsBigQuerySource} =
    require("../lib/analytics/hostAnalyticsBigQuery");
  const {backfillOrganizerInsights} =
    require("../lib/organizerInsights/insightsRollup");
  const results = await backfillOrganizerInsights(days, {
    firestore: () => admin.firestore(),
    analytics: defaultHostAnalyticsBigQuerySource,
    now: () => new Date(),
  }, args.get("--apply") === true);
  console.log(JSON.stringify({apply: args.get("--apply") === true, results},
    null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
