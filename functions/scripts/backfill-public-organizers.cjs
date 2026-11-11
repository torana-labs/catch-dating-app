#!/usr/bin/env node
"use strict";

// Creates or refreshes publicOrganizers/{id} for every organizer (#1221).
// Dry run by default. It writes only publicOrganizers documents and never
// changes an organizers document, so it is safe under a data hold. Rerun
// safely: each projection is rebuilt from the current organizer.
//
//   npm --prefix functions run build
//   node functions/scripts/backfill-public-organizers.cjs \
//     --project <project-id> [--apply]

const admin = require("firebase-admin");

async function main(argv = process.argv.slice(2)) {
  const args = new Map();
  for (let index = 0; index < argv.length; index++) {
    const flag = argv[index];
    if (flag === "--apply") args.set(flag, true);
    else if (flag === "--project") args.set(flag, argv[++index]);
    else throw new Error(`Unknown argument: ${flag}`);
  }
  const projectId = args.get("--project");
  if (typeof projectId !== "string" || !/^[a-z0-9-]+$/.test(projectId)) {
    throw new Error("Provide an explicit --project identifier.");
  }
  process.env.GCLOUD_PROJECT = projectId;
  admin.initializeApp({projectId});
  const {backfillPublicOrganizers} =
    require("../lib/organizers/publicOrganizerProjection");
  const apply = args.get("--apply") === true;
  const counts = await backfillPublicOrganizers(
    {firestore: () => admin.firestore()}, apply);
  console.log(JSON.stringify({projectId, apply, counts}, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
