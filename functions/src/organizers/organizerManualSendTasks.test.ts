import assert from "node:assert/strict";
import test from "node:test";
import * as admin from "firebase-admin";
import {HttpsError} from "firebase-functions/v2/https";
import type {
  OrganizerContactDocument,
  OrganizerManualSendTaskDocument,
} from "../shared/generated/firestoreAdminTypes";
import {
  assertManualHandoffLaunchable,
  manualTaskReplanResult,
  organizerManualSendTaskId,
  terminalManualTask,
} from "./organizerManualSendTasks";
import {hashEndpoint} from "../platform/delivery/endpointHash";

const now = admin.firestore.Timestamp.fromMillis(10_000);

test("manual task ids are stable and actor scoped", () => {
  assert.equal(
    organizerManualSendTaskId("organizer-1", "manager-1", "request-1"),
    organizerManualSendTaskId("organizer-1", "manager-1", "request-1"),
  );
  assert.notEqual(
    organizerManualSendTaskId("organizer-1", "manager-1", "request-1"),
    organizerManualSendTaskId("organizer-1", "manager-2", "request-1"),
  );
});

test(
  "mark sent requires an opened handoff and remains a host assertion",
  () => {
    assert.throws(
      () => terminalManualTask(task(), "hostMarkedSent", "manager-1", now),
      (error: unknown) => error instanceof HttpsError &&
      error.code === "failed-precondition",
    );
    const opened = {...task(), status: "handoffOpened"} as
    OrganizerManualSendTaskDocument;
    const completed = terminalManualTask(
      opened,
      "hostMarkedSent",
      "manager-1",
      now,
    );
    assert.equal(completed.status, "hostMarkedSent");
    assert.equal(completed.active, false);
    assert.equal(completed.hostMarkedSentAt, now);
    assert.equal("deliveredAt" in completed, false);
  },
);

test(
  "explicit replan advises a managed route without draining the task",
  () => {
    const original = task();
    const result = manualTaskReplanResult({
      task: original,
      contact: contact({linkedUid: "user-1", identityState: "verified"}),
      channelState: undefined,
      organizerId: "organizer-1",
      now,
    });
    assert.equal(result.disposition, "managedRouteAvailable");
    assert.equal(result.recommendedRouteId, "catchChat");
    assert.equal(original.status, "queued");
    assert.equal(original.active, true);
  },
);

test("explicit replan keeps hand work or reports its exact blocker", () => {
  const byHand = manualTaskReplanResult({
    task: task(),
    contact: contact(),
    channelState: undefined,
    organizerId: "organizer-1",
    now,
  });
  assert.equal(byHand.disposition, "keepByHand");
  assert.equal(byHand.recommendedRouteId, "personalWhatsappHandoff");

  const unavailable = manualTaskReplanResult({
    task: task(),
    contact: contact({whatsappStatus: "optedOut"}),
    channelState: undefined,
    organizerId: "organizer-1",
    now,
  });
  assert.equal(unavailable.disposition, "unavailable");
  assert.equal(unavailable.blocker, "contactOptedOut");
});

test("launch validation rejects a changed endpoint or permission", () => {
  const queued = task();
  assert.equal(
    assertManualHandoffLaunchable({
      task: queued,
      contact: contact(),
      channelState: undefined,
      organizerId: "organizer-1",
    }),
    queued,
  );
  for (const changedContact of [
    contact({phoneE164: "+919999999999"}),
    contact({whatsappStatus: "optedOut"}),
  ]) {
    assert.throws(
      () => assertManualHandoffLaunchable({
        task: queued,
        contact: changedContact,
        channelState: undefined,
        organizerId: "organizer-1",
      }),
      (error: unknown) => error instanceof HttpsError &&
        error.code === "failed-precondition",
    );
  }
});

test("replan reports endpoint drift without mutating the task", () => {
  const queued = task();
  const result = manualTaskReplanResult({
    task: queued,
    contact: contact({phoneE164: "+919999999999"}),
    channelState: undefined,
    organizerId: "organizer-1",
    now,
  });
  assert.equal(result.disposition, "unavailable");
  assert.equal(result.blocker, "endpointChanged");
  assert.equal(queued.status, "queued");
  assert.equal(queued.active, true);
});

function task(): OrganizerManualSendTaskDocument {
  return {
    organizerId: "organizer-1",
    taskId: "task-1",
    contactId: "contact-1",
    status: "queued",
    active: true,
    revision: 1,
    endpointHash: hashEndpoint("+919876543210"),
    expiresAt: admin.firestore.Timestamp.fromMillis(20_000),
    hostMarkedSentAt: null,
    skippedAt: null,
    cancelledAt: null,
  } as OrganizerManualSendTaskDocument;
}

function contact(
  values: Partial<OrganizerContactDocument> = {},
): OrganizerContactDocument {
  return {
    organizerId: "organizer-1",
    displayName: "Maya",
    displayNameOverride: null,
    linkedUid: null,
    phoneE164: "+919876543210",
    identityState: "unlinked",
    ambiguousCandidateContactIds: [],
    whatsappStatus: "unknown",
    deletedAt: null,
    hiddenAt: null,
    ...values,
  } as OrganizerContactDocument;
}
