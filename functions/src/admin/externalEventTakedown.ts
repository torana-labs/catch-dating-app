import {CallableRequest, HttpsError, onCall} from
  "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import {appCheckCallableOptions} from "../shared/callableOptions";
import type {AdminTakedownExternalEventCallablePayload} from
  "../shared/generated/adminTakedownExternalEventCallablePayload";
import type {ExternalEventPublicationReceiptDocument} from
  "../shared/generated/externalEventPublicationReceiptDocument";
import {
  validateAdminTakedownExternalEventCallablePayload,
} from
  "../shared/generated/validators/adminTakedownExternalEventInput";
import {validateCallableWithAjv} from "../shared/validation";
import {checkRateLimit as defaultCheckRateLimit} from "../shared/rateLimit";
import {requireAdminRole} from "./adminAuth";
import {setAdminAuditLogInTransaction} from "./adminAudit";
import {
  assertMatchingPublicationReceipt,
  publicationInputHash,
  publicationReceiptId,
} from "./externalEventPublicationPolicy";

const takedownRoles = ["admin", "adminOwner", "support"] as const;

interface ExternalEventTakedownDeps {
  firestore: () => FirebaseFirestore.Firestore;
  serverTimestamp: () => FirebaseFirestore.FieldValue;
  now?: () => Date;
  checkRateLimit?: typeof defaultCheckRateLimit;
}

const defaultDeps: ExternalEventTakedownDeps = {
  firestore: () => admin.firestore(),
  serverTimestamp: () => admin.firestore.FieldValue.serverTimestamp(),
  now: () => new Date(),
  checkRateLimit: defaultCheckRateLimit,
};

export interface AdminTakedownExternalEventResponse {
  eventId: string;
  targetPath: string;
  executionMode: "dry_run" | "apply";
  outcome: "would_remove" | "removed";
  receiptPath: string;
  writeApplied: boolean;
  idempotent: boolean;
  completedAt: string;
}

export async function adminTakedownExternalEventHandler(
  request: CallableRequest<unknown>,
  deps: ExternalEventTakedownDeps = defaultDeps
): Promise<AdminTakedownExternalEventResponse> {
  const adminContext = requireAdminRole(request, takedownRoles);
  const data = validateCallableWithAjv<
    AdminTakedownExternalEventCallablePayload
  >(
    request,
    validateAdminTakedownExternalEventCallablePayload,
    normalizePayload
  );
  if (!data.checklist.sourceStatusReviewed ||
    !data.checklist.takedownAuthorityReviewed ||
    !data.checklist.downstreamVisibilityReviewed) {
    throw new HttpsError(
      "failed-precondition",
      "Source status, takedown authority, and downstream visibility must be " +
        "reviewed before removing external supply."
    );
  }

  const db = deps.firestore();
  await deps.checkRateLimit?.(
    db,
    adminContext.uid,
    "adminTakedownExternalEvent",
    {maxRequests: 10, windowMs: 60 * 1000}
  );
  const targetPath = `externalEvents/${data.eventId}`;
  const eventRef = db.collection("externalEvents").doc(data.eventId);
  const inputHash = publicationInputHash(data);
  const receiptId = publicationReceiptId(
    adminContext.uid,
    "takedown",
    data.idempotencyKey
  );
  const receiptRef = db.collection("externalEventPublicationReceipts")
    .doc(receiptId);
  let idempotent = false;

  await db.runTransaction(async (tx) => {
    const [eventSnap, receiptSnap] = await Promise.all([
      tx.get(eventRef),
      tx.get(receiptRef),
    ]);
    if (receiptSnap.exists) {
      assertMatchingPublicationReceipt(receiptSnap.data() ?? {}, {
        action: "takedown",
        inputHash,
        idempotencyKey: data.idempotencyKey,
      });
      idempotent = true;
      return;
    }
    if (!eventSnap.exists) {
      throw new HttpsError("not-found", "External event was not found.");
    }
    const before = eventSnap.data() ?? {};
    if (before.publicationStatus === "removed") {
      throw new HttpsError(
        "failed-precondition",
        "External event is already removed; use its original receipt."
      );
    }
    const timestamp = deps.serverTimestamp();
    const outcome = data.executionMode === "apply" ?
      "removed" :
      "would_remove";
    if (data.executionMode === "apply") {
      tx.update(eventRef, {
        publicationStatus: "removed",
        status: "cancelled",
        updatedAt: timestamp,
        takedown: {
          removedAt: timestamp,
          removedByUid: adminContext.uid,
          reason: data.reviewNote,
          receiptId,
        },
      });
    }
    const receipt: ExternalEventPublicationReceiptDocument = {
      schemaVersion: 1,
      receiptId,
      idempotencyKey: data.idempotencyKey,
      inputHash,
      action: "takedown",
      executionMode: data.executionMode,
      outcome,
      eventId: data.eventId,
      targetPath,
      sourceActionId: null,
      externalLinkCount: externalLinkCount(before),
      reviewNote: data.reviewNote,
      actorUid: adminContext.uid,
      createdAt: timestamp as never,
    };
    tx.create(receiptRef, receipt);
    setAdminAuditLogInTransaction(tx, db, adminContext, {
      action: "adminTakedownExternalEvent",
      targetPath,
      request,
      before: {
        publicationStatus: before.publicationStatus ?? null,
        status: before.status ?? null,
      },
      after: {
        publicationStatus: data.executionMode === "apply" ?
          "removed" :
          before.publicationStatus ?? null,
        executionMode: data.executionMode,
        receiptId,
        effect: outcome,
      },
      note: data.reviewNote,
      serverTimestamp: deps.serverTimestamp,
    });
  });

  return {
    eventId: data.eventId,
    targetPath,
    executionMode: data.executionMode,
    outcome: data.executionMode === "apply" ? "removed" : "would_remove",
    receiptPath: receiptRef.path,
    writeApplied: data.executionMode === "apply" && !idempotent,
    idempotent,
    completedAt: (deps.now?.() ?? new Date()).toISOString(),
  };
}

function normalizePayload(value: unknown): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const data = value as Record<string, unknown>;
  return {
    ...data,
    eventId: normalizeString(data.eventId),
    executionMode: normalizeString(data.executionMode),
    idempotencyKey: normalizeString(data.idempotencyKey),
    reviewNote: normalizeString(data.reviewNote),
  };
}

function externalLinkCount(value: Record<string, unknown>): number {
  const booking = value.booking;
  if (!booking || typeof booking !== "object" || Array.isArray(booking)) {
    return 0;
  }
  const links = (booking as Record<string, unknown>).externalLinks;
  return Array.isArray(links) ? Math.min(links.length, 12) : 0;
}

function normalizeString(value: unknown): unknown {
  return typeof value === "string" ? value.trim() : value;
}

export const adminTakedownExternalEvent = onCall(
  appCheckCallableOptions,
  (request) => adminTakedownExternalEventHandler(request)
);
