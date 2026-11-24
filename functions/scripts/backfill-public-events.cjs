#!/usr/bin/env node
"use strict";

// Creates, refreshes or removes publicEvents/{id} for every event (#1666).
// Dry run by default. It writes only publicEvents documents and never
// changes an events document. Rerun safely: each copy is rebuilt from the
// current event. Run it before the rules that limit events/{id} to the
// organizer's team deploy (publicEvents is unreadable until then), and once
// more after the Functions deploy so events written in between are current.
//
//   npm --prefix functions run build
//   node functions/scripts/backfill-public-events.cjs \
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
  const {backfillPublicEvents} =
    require("../lib/events/publicEventProjection");
  const apply = args.get("--apply") === true;
  const counts = await backfillPublicEvents(
    {firestore: () => admin.firestore()}, apply);
  console.log(JSON.stringify({projectId, apply, counts}, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
