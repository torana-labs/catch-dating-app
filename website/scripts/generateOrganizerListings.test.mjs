import assert from "node:assert/strict";
import crypto from "node:crypto";
import {execFileSync} from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {fileURLToPath} from "node:url";
import {
  validateWebsiteHostListingProjection,
} from "../../tool/contracts/generated/schema_contract_validators.mjs";

import "./organizerListingReadiness.test.mjs";

const scriptPath = fileURLToPath(new URL("./generateOrganizerListings.mjs", import.meta.url));

test("listing schema rejects stale publication and review target contradictions", () => {
  const listing = JSON.parse(fs.readFileSync(
    fileURLToPath(new URL("../src/generated/hostListings.json", import.meta.url)),
    "utf8"
  ))[0];
  assert.equal(validateWebsiteHostListingProjection(listing), true);

  const staleSuppression = structuredClone(listing);
  staleSuppression.authority.publishStatus = "published";
  staleSuppression.authority.claimState = "suppressed";
  assert.equal(validateWebsiteHostListingProjection(staleSuppression), false);

  const staleReviewCapability = structuredClone(listing);
  staleReviewCapability.capabilities.publicReviews.targetState = "disabled";
  staleReviewCapability.capabilities.publicReviews.readState = "enabled";
  assert.equal(validateWebsiteHostListingProjection(staleReviewCapability), false);
});

test("production output excludes demo listings while explicit story output includes them", () => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "catch-organizer-demo-split-"));
  const productionPath = path.join(tmpRoot, "hostListings.json");
  const storyPath = path.join(tmpRoot, "hostListings.demo.json");

  execFileSync(process.execPath, [scriptPath, "--output", productionPath], {
    stdio: "pipe",
  });
  execFileSync(process.execPath, [
    scriptPath,
    "--include-demo",
    "--output",
    storyPath,
  ], {stdio: "pipe"});

  const productionListings = JSON.parse(fs.readFileSync(productionPath, "utf8"));
  const storyListings = JSON.parse(fs.readFileSync(storyPath, "utf8"));
  assert.equal(productionListings.some((listing) => listing.catchEvents?.length), false);
  assert.equal(
    productionListings.some((listing) => listing.dataOrigin === "catchDemo"),
    false
  );
  assert.equal(
    productionListings.some((listing) => listing.id === "bhag"),
    false,
    "waitlist-market organizer listings must not enter the deployable projection"
  );
  assert.equal(
    storyListings.some((listing) => listing.dataOrigin === "catchDemo"),
    true
  );
  assert.equal(storyListings.some((listing) => listing.dataOrigin === "catchDemo"), true);
});

test("approved organizer intake projections render canonical listings", () => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "catch-organizer-listings-"));
  const projectionPath = path.join(tmpRoot, "public_projection_plan.json");
  const claimTargetSyncPreviewPath = path.join(tmpRoot, "organizer_claim_target_sync_preview.json");
  const externalEventReadinessPath = path.join(tmpRoot, "external_event_readiness.json");
  const outputPath = path.join(tmpRoot, "hostListings.json");
  fs.writeFileSync(projectionPath, `${JSON.stringify(approvedProjectionPlan(), null, 2)}\n`);
  fs.writeFileSync(
    claimTargetSyncPreviewPath,
    `${JSON.stringify(claimTargetSyncPreview(), null, 2)}\n`
  );
  fs.writeFileSync(
    externalEventReadinessPath,
    `${JSON.stringify(externalEventReadiness(), null, 2)}\n`
  );
  execFileSync(process.execPath, [
    scriptPath,
    "--projection-plan",
    projectionPath,
    "--claim-target-sync-preview",
    claimTargetSyncPreviewPath,
    "--external-event-readiness",
    externalEventReadinessPath,
    "--output",
    outputPath,
    "--no-demo",
  ], {stdio: "pipe"});

  const listings = JSON.parse(fs.readFileSync(outputPath, "utf8"));
  assert.equal(listings.length, 1);
  assert.equal(listings[0].id, "afterfly");
  assert.equal(listings[0].dataOrigin, "organizerIntake");
  assert.equal(listings[0].path, "/organizers/afterfly/");
  assert.deepEqual(listings[0].legacyPaths, ["/organizers/indore/afterfly-run-club/"]);
  assert.equal(listings[0].indexing, "index, follow");
  assert.equal(listings[0].claim.href, "/organizers/afterfly/#claim");
  assert.deepEqual(listings[0].publicApi, {
    state: "disabled",
    reason: "Claiming is not available until target readiness is verified against Firestore.",
    claimTargetSyncStatus: "unknown",
  });
  assert.deepEqual(listings[0].capabilities.publicReviews, {
    targetState: "disabled",
    readState: "disabled",
    writeState: "disabled",
    reason: "Public reviews are unavailable until canonical target readiness is verified.",
  });
  assert.equal(listings[0].city, "Indore");
  assert.equal(listings[0].country, "India");
  assert.equal(listings[0].sourceConfidence, "high");
  assert.equal(listings[0].lastVerifiedAt, "2026-06-17");
  assert.equal(listings[0].externalEvents.length, 1);
  assert.equal(listings[0].externalEvents[0].id, "ext-afterfly-future-run");
  assert.equal(listings[0].externalEvents[0].sourceLabel, "Luma");
  assert.equal(listings[0].externalEvents[0].sourceHref, "https://luma.com/afterfly-future-run");
  assert.equal(listings[0].externalEvents[0].availability, "read_only_external");
  assert.match(listings[0].searchText, /future takeoff run/);
  assert.equal(
    listings.some((listing) => listing.id === "afterfly-run-club-indore"),
    false
  );

  execFileSync(process.execPath, [
    scriptPath,
    "--projection-plan",
    projectionPath,
    "--claim-target-sync-preview",
    claimTargetSyncPreviewPath,
    "--external-event-readiness",
    externalEventReadinessPath,
    "--output",
    outputPath,
    "--no-demo",
    "--check",
  ], {stdio: "pipe"});

  fs.writeFileSync(
    claimTargetSyncPreviewPath,
    `${JSON.stringify(
      claimTargetSyncPreview("in_sync", "organizers/afterfly"),
      null,
      2
    )}\n`
  );
  execFileSync(process.execPath, [
    scriptPath,
    "--projection-plan",
    projectionPath,
    "--claim-target-sync-preview",
    claimTargetSyncPreviewPath,
    "--external-event-readiness",
    externalEventReadinessPath,
    "--output",
    outputPath,
    "--no-demo",
  ], {stdio: "pipe"});
  const previewOnlyListings = JSON.parse(fs.readFileSync(outputPath, "utf8"));
  assert.equal(previewOnlyListings[0].publicApi.state, "disabled");
  assert.equal(
    previewOnlyListings[0].capabilities.publicReviews.targetState,
    "disabled"
  );
  assert.match(
    previewOnlyListings[0].publicApi.reason,
    /verified against Firestore/u
  );

  const claimTargetPlanPath = path.join(tmpRoot, "organizer_claim_targets.json");
  const readinessReceiptPath = path.join(tmpRoot, "claim_target_readiness.json");
  fs.writeFileSync(
    claimTargetPlanPath,
    `${JSON.stringify(claimTargetPlan(), null, 2)}\n`
  );
  fs.writeFileSync(
    readinessReceiptPath,
    `${JSON.stringify(claimTargetReadinessReceipt(claimTargetPlanPath), null, 2)}\n`
  );
  execFileSync(process.execPath, [
    scriptPath,
    "--projection-plan",
    projectionPath,
    "--claim-target-sync-preview",
    claimTargetSyncPreviewPath,
    "--claim-target-plan",
    claimTargetPlanPath,
    "--claim-target-readiness-receipt",
    readinessReceiptPath,
    "--external-event-readiness",
    externalEventReadinessPath,
    "--output",
    outputPath,
    "--no-demo",
  ], {
    env: {
      ...process.env,
      ORGANIZER_CLAIM_TARGET_PROJECT_ID: "catch-dating-app-64e51",
    },
    stdio: "pipe",
  });
  const readyListings = JSON.parse(fs.readFileSync(outputPath, "utf8"));
  assert.deepEqual(readyListings[0].publicApi, {
    state: "enabled",
    reason: "The organizer claim target is ready.",
    claimTargetSyncStatus: "in_sync",
  });
  assert.deepEqual(readyListings[0].capabilities.publicReviews, {
    targetState: "enabled",
    readState: "enabled",
    writeState: "enabled",
    reason: "Public reviews are available for this published organizer page.",
  });

  fs.writeFileSync(
    claimTargetPlanPath,
    `${JSON.stringify(claimTargetPlan("clubs/afterfly"), null, 2)}\n`
  );
  fs.writeFileSync(
    readinessReceiptPath,
    `${JSON.stringify(
      claimTargetReadinessReceipt(claimTargetPlanPath, "clubs/afterfly"),
      null,
      2
    )}\n`
  );
  execFileSync(process.execPath, [
    scriptPath,
    "--projection-plan",
    projectionPath,
    "--claim-target-sync-preview",
    claimTargetSyncPreviewPath,
    "--claim-target-plan",
    claimTargetPlanPath,
    "--claim-target-readiness-receipt",
    readinessReceiptPath,
    "--external-event-readiness",
    externalEventReadinessPath,
    "--output",
    outputPath,
    "--no-demo",
  ], {
    env: {
      ...process.env,
      ORGANIZER_CLAIM_TARGET_PROJECT_ID: "catch-dating-app-64e51",
    },
    stdio: "pipe",
  });
  const compatibilityTargetListings = JSON.parse(
    fs.readFileSync(outputPath, "utf8")
  );
  assert.equal(compatibilityTargetListings[0].publicApi.state, "disabled");
  assert.equal(
    compatibilityTargetListings[0].capabilities.publicReviews.targetState,
    "disabled"
  );
  assert.equal(
    compatibilityTargetListings[0].capabilities.publicReviews.writeState,
    "disabled"
  );
});


test("legacy receipts reject stale, fixture, wrong-project and contradictory evidence", (t) => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "catch-invalid-readiness-"));
  t.after(() => fs.rmSync(tmpRoot, {recursive: true, force: true}));
  const projection = path.join(tmpRoot, "projection.json");
  const plan = path.join(tmpRoot, "plan.json");
  const receiptPath = path.join(tmpRoot, "receipt.json");
  fs.writeFileSync(projection, JSON.stringify(approvedProjectionPlan()));
  fs.writeFileSync(plan, JSON.stringify(claimTargetPlan()));
  for (const change of [
    (receipt) => {receipt.generatedAt = "2026-07-11T00:00:00.000Z";},
    (receipt) => {receipt.mode.source = "fixture";},
    (receipt) => {receipt.projectId = "wrong-project";},
    (receipt) => {receipt.plan.sha256 = "wrong-plan";},
    (receipt) => {receipt.actions[0].path = "organizers/other-id";},
    (receipt) => {receipt.actions.push({...receipt.actions[0]});},
  ]) {
    const receipt = claimTargetReadinessReceipt(plan);
    change(receipt);
    fs.writeFileSync(receiptPath, JSON.stringify(receipt));
    assert.throws(() => execFileSync(process.execPath, [scriptPath,
      "--projection-plan", projection, "--claim-target-plan", plan,
      "--claim-target-readiness-receipt", receiptPath,
      "--output", path.join(tmpRoot, "out.json")], {stdio: "pipe",
      env: {...process.env, ORGANIZER_CLAIM_TARGET_PROJECT_ID: "catch-dating-app-64e51"}}));
  }
});

function claimTargetPlan(targetPath = "organizers/afterfly") {
  return {
    schemaVersion: 1,
    targets: [
      {
        entityId: "afterfly",
        path: targetPath,
        claimState: "unclaimed",
        clubDocument: {name: "AFTER FLY"},
      },
    ],
  };
}

function claimTargetReadinessReceipt(
  planPath,
  targetPath = "organizers/afterfly"
) {
  return {
    schemaVersion: 1,
    receiptType: "organizer_claim_target_readiness",
    generatedAt: new Date().toISOString(),
    mode: {source: "firestore_read", remoteWrites: 0},
    projectId: "catch-dating-app-64e51",
    plan: {
      path: "fixture",
      sha256: crypto.createHash("sha256")
        .update(fs.readFileSync(planPath))
        .digest("hex"),
    },
    summary: {targets: 1, inSync: 1, writesNeeded: 0},
    actions: [
      {
        entityId: "afterfly",
        path: targetPath,
        status: "in_sync",
        merge: false,
        reason: "public_fields_current",
      },
    ],
  };
}

function approvedProjectionPlan() {
  return {
    schemaVersion: 1,
    entries: [
      {
        appVisibility: "hidden",
        blockedBy: [],
        canonicalPath: "/organizers/afterfly/",
        displayName: "AFTER FLY",
        entityId: "afterfly",
        indexStatus: "indexed",
        legacyPaths: ["/organizers/indore/afterfly-run-club/"],
        pageMode: "singleEntity",
        projectionStatus: "ready",
        publicListing: {
          category: "Event organizer",
          description:
            "AFTER FLY is an Indore run-and-rave organizer promoted after manual admin review.",
          formats: ["Social runs", "Run-and-rave"],
          id: "afterfly",
          indexing: "index, follow",
          markets: [
            {
              countryCode: "IN",
              displayName: "Indore",
              marketSlug: "indore",
            },
          ],
          missingEvidence: ["Owner claim"],
          name: "AFTER FLY",
          path: "/organizers/afterfly/",
          slug: "afterfly",
          sourceSummary:
            "Admin-reviewed public surfaces confirm the organizer identity.",
          sources: [
            {
              confidence: "high",
              detail: "Public Luma event page reviewed during organizer intake.",
              href: "https://luma.com/pxgmph3b",
              label: "Luma event page",
              type: "public_event_page",
            },
          ],
          status: "unclaimed",
        },
        publishStatus: "published",
        reviewDecision: {
          decidedAt: "2026-06-17",
        },
      },
    ],
  };
}

function claimTargetSyncPreview(
  status = "create",
  targetPath = "clubs/afterfly"
) {
  return {
    actions: [
      {
        entityId: "afterfly",
        path: targetPath,
        status,
      },
    ],
    mode: {
      previewOnly: true,
      remoteReads: 0,
      remoteWrites: 0,
    },
    schemaVersion: 1,
    summary: {
      targets: 1,
      writesNeeded: 1,
    },
  };
}

function externalEventReadiness() {
  return {
    actions: [
      {
        actionId: "preflight-import-afterfly-future-run",
        sourceActionId: "import-afterfly-future-run",
        sourceAction: "publish_read_only_external_event",
        status: "would_publish_read_only",
        candidateId: "afterfly-future-run-candidate",
        entityId: "afterfly",
        targetPath: "externalEvents/ext-afterfly-future-run",
        sourceStatus: "write_ready",
        sourceReviewStatus: "approved_for_import",
        blockers: [],
        payloadValidation: {valid: true, errors: []},
        projectionValidation: {valid: true, errors: []},
        externalEventDocument: {
          eventId: "ext-afterfly-future-run",
          canonicalHostId: "afterfly",
          compatibilityClubId: "afterfly",
          title: "Future Takeoff Run",
          description: "Source-attributed run imported as read-only external supply.",
          startTime: timestamp("2099-01-01T12:30:00.000Z"),
          endTime: timestamp("2099-01-01T14:30:00.000Z"),
          timezone: "Asia/Kolkata",
          meetingPoint: "Nehru Park",
          activity: {
            activityKind: "socialRun",
          },
          price: {
            displayText: "0 INR",
          },
          status: "active",
          publicationStatus: "public",
          booking: {
            mode: "external_outbound_only",
            catchBookingEnabled: false,
            catchPaymentsEnabled: false,
            catchReservationsEnabled: false,
            catchWaitlistEnabled: false,
            externalLinks: [
              {
                platform: "luma",
                url: "https://luma.com/afterfly-future-run",
                primary: true,
              },
            ],
          },
          discovery: {
            availability: "read_only_external",
          },
          dedupe: {
            normalizedEventKey: "afterfly:2099-01-01T18:00:00+05:30:future-takeoff-run",
          },
          externalSource: {
            platform: "luma",
            eventUrl: "https://luma.com/afterfly-future-run",
            sourceUrl: "https://luma.com/afterfly-future-run",
          },
        },
      },
    ],
  };
}

function timestamp(iso) {
  return {
    _seconds: Math.trunc(Date.parse(iso) / 1000),
    _nanoseconds: 0,
  };
}
