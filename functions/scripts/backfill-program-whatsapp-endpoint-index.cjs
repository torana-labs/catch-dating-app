#!/usr/bin/env node
"use strict";

// Seeds programWhatsappEndpointIndex for the households and guests that
// existed before the endpoint-index trigger shipped (WhatsApp lane W1).
// Dry run by default; --apply writes. It only adds or updates index
// documents and never deletes or edits a household or guest (legal hold).
//
//   npm --prefix functions run build
//   node functions/scripts/backfill-program-whatsapp-endpoint-index.cjs \
//     --project <project-id> --program <programId> [--apply]

const admin = require("firebase-admin");
const {
  applyEndpointClaimChange,
  guestEndpointClaim,
  householdEndpointClaim,
} = require("../lib/programs/programWhatsapp/endpointIndex");

async function main(argv = process.argv.slice(2)) {
  const args = new Map();
  for (let index = 0; index < argv.length; index++) {
    const flag = argv[index];
    if (flag === "--apply") args.set(flag, true);
    else if (["--project", "--program"].includes(flag)) {
      args.set(flag, argv[++index]);
    } else throw new Error(`Unknown argument: ${flag}`);
  }
  const projectId = args.get("--project");
  const programId = args.get("--program");
  if (typeof projectId !== "string" || !/^[a-z0-9-]+$/.test(projectId) ||
      typeof programId !== "string" || !/^[A-Za-z0-9_-]+$/.test(programId)) {
    throw new Error("Provide explicit --project and --program identifiers.");
  }
  const apply = args.get("--apply") === true;
  admin.initializeApp({projectId});
  const db = admin.firestore();
  const claims = [];
  const households = await db.collection("programHouseholds")
    .where("programId", "==", programId).get();
  for (const doc of households.docs) {
    const claim = householdEndpointClaim(doc.id, doc.data());
    if (claim) claims.push(claim);
  }
  const guests = await db.collection("programGuests")
    .where("programId", "==", programId).get();
  for (const doc of guests.docs) {
    const claim = guestEndpointClaim(doc.id, doc.data());
    if (claim) claims.push(claim);
  }
  const summary = {projectId, programId, apply,
    households: households.size, guests: guests.size, claims: claims.length};
  if (apply) {
    // Re-claiming is idempotent: a claimant already present is replaced by
    // the same entry, so a re-run or a racing trigger converges.
    for (const claim of claims) {
      await applyEndpointClaimChange(db, {before: null, after: claim},
        Date.now());
    }
  }
  console.log(JSON.stringify(summary));
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}

module.exports = {main};
