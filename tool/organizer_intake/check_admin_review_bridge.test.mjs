import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  adminReviewBridgeChannels,
  checkAdminReviewBridge,
} from "./check_admin_review_bridge.mjs";

const sharedFiles = [
  "admin/src/shared/api/adminApi.ts",
  "admin/src/features/intake/organizer/api/organizerIntakeRepository.ts",
  "admin/src/features/intake/organizer/controllers/useOrganizerIntakeController.ts",
  "admin/src/features/intake/organizer/controllers/loadOrganizerIntakeBridge.ts",
  "admin/src/shared/types/adminTypes.ts",
  "functions/src/index.ts",
  "functions/src/admin/intakeOperations.ts",
  "functions/src/admin/intakeOperations.test.ts",
];

test("current Organizer Intake is Firestore-backed", () => {
  const result = checkAdminReviewBridge();

  assert.equal(result.ok, true);
  assert.deepEqual(result.errors, []);
  assert.equal(result.summary.channels, 3);
  assert.equal(result.summary.readyChannels, 3);
  assert.equal(result.summary.source, "firestore");
  assert.deepEqual(
    result.channels.map((channel) => channel.id),
    [
      "organizer_publication",
      "organizer_curation",
      "organizer_policy_gap_review",
    ]
  );
});

test("rejects a reintroduced Admin operational snapshot", () => {
  const root = mirrorRequiredFiles();
  const legacyPath = path.join(
    root,
    "admin/src/features/intake/organizer/generated/organizerIntakeBridge.json"
  );
  fs.mkdirSync(path.dirname(legacyPath), {recursive: true});
  fs.writeFileSync(legacyPath, "{}\n");

  const result = checkAdminReviewBridge({root});

  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /legacy-snapshot/);
});

test("rejects removal of the Supply Intake Firestore read", () => {
  const root = mirrorRequiredFiles();
  replaceIn(
    root,
    "admin/src/features/intake/organizer/controllers/loadOrganizerIntakeBridge.ts",
    "listIntakeOperations",
    "removedListIntakeOperations"
  );

  const result = checkAdminReviewBridge({root});

  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /Firestore loader/);
});

test("rejects a removed React Query decision mutation", () => {
  const root = mirrorRequiredFiles();
  replaceIn(
    root,
    "admin/src/features/intake/organizer/controllers/useOrganizerIntakeController.ts",
    "mutationFn: decideOrganizerIntake",
    "mutationFn: removedOrganizerIntake"
  );

  const result = checkAdminReviewBridge({
    root,
    channels: [adminReviewBridgeChannels[0]],
  });

  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /React Query mutation/);
});

test("rejects a drifted Firestore decision collection", () => {
  const root = mirrorRequiredFiles();
  replaceIn(
    root,
    adminReviewBridgeChannels[0].handlerFile,
    'const decisionCollection = "organizerIntakeReviewDecisions"',
    'const decisionCollection = "localOrganizerDecisions"'
  );

  const result = checkAdminReviewBridge({
    root,
    channels: [adminReviewBridgeChannels[0]],
  });

  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /Firestore collection constant/);
});

function mirrorRequiredFiles() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "catch-firestore-path-"));
  const files = new Set(sharedFiles);
  for (const channel of adminReviewBridgeChannels) {
    files.add(channel.handlerFile);
    files.add(channel.handlerTest);
    files.add(channel.payloadSchema);
    files.add(channel.firestoreSchema);
    files.add(channel.generatedPayload);
    files.add(channel.generatedDocument);
  }
  for (const file of files) {
    const source = path.resolve(file);
    const destination = path.join(root, file);
    fs.mkdirSync(path.dirname(destination), {recursive: true});
    fs.copyFileSync(source, destination);
  }
  return root;
}

function replaceIn(root, file, before, after) {
  const target = path.join(root, file);
  fs.writeFileSync(
    target,
    fs.readFileSync(target, "utf8").replaceAll(before, after)
  );
}
