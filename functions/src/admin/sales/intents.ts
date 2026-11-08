import {invalidateFitQueueInTransaction} from "../salesFitQueue/service";
import * as admin from "firebase-admin";
import {createHash} from "node:crypto";
import {HttpsError} from "firebase-functions/v2/https";
import {newSalesAccount} from "./account";
import type {SalesActivity, SalesPrincipal, SalesTask} from "./types";

export interface LinkInput {
  intentId: string;
  organizerId: string;
  requestId: string;
  expectedRevision: number;
}

function employeeOnly(principal: SalesPrincipal): void {
  if (principal.clientId) {
    throw new HttpsError(
      "permission-denied",
      "Website intake identity review requires an employee session.",
    );
  }
}

function digest(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 24);
}

export async function linkSalesInboundIntent(
  tx: FirebaseFirestore.Transaction,
  db: FirebaseFirestore.Firestore,
  principal: SalesPrincipal,
  input: LinkInput,
  now: string,
): Promise<Record<string, unknown>> {
  employeeOnly(principal);
  const intentRef = db.collection("salesInboundIntents").doc(input.intentId);
  const organizerRef = db.collection("organizers").doc(input.organizerId);
  const accountRef = db
    .collection("organizerSalesAccounts")
    .doc(input.organizerId);
  const [intentSnap, organizerSnap, accountSnap] = await Promise.all([
    tx.get(intentRef),
    tx.get(organizerRef),
    tx.get(accountRef),
  ]);
  if (!intentSnap.exists) {
    throw new HttpsError("not-found", "Inbound intent not found.");
  }
  if (!organizerSnap.exists) {
    throw new HttpsError(
      "failed-precondition",
      "A reviewed canonical organizer is required before linking.",
    );
  }
  const intent = intentSnap.data() ?? {};
  if (
    intent.classification !== "sales_private" ||
    intent.status !== "needs_identity_review" ||
    intent.organizerId !== null
  ) {
    throw new HttpsError(
      "failed-precondition",
      "Intent is not pending identity review.",
    );
  }
  if (intent.revision !== input.expectedRevision) {
    throw new HttpsError("aborted", "Inbound intent changed since review.");
  }
  if (!accountSnap.exists) {
    tx.create(
      accountRef,
      newSalesAccount(
        input.organizerId,
        organizerSnap.data() ?? {},
        principal.uid,
        now,
        "needs_research",
      ),
    );
    invalidateFitQueueInTransaction(tx, db, input.organizerId, now);
  } else if (accountSnap.data()?.classification !== "sales_private") {
    throw new HttpsError(
      "failed-precondition",
      "Sales account contract is invalid.",
    );
  }
  const intentKey = `${principal.uid}\u0000${input.requestId}\u0000intent`;
  const taskId = `task-${digest(intentKey)}`;
  const activityId = `activity-${digest(intentKey)}`;
  const task: SalesTask = {
    schemaVersion: 1,
    classification: "sales_private",
    taskId,
    organizerId: input.organizerId,
    contactId: null,
    revision: 1,
    kind: "research",
    title: intent.source === "partner" ? "Review partner organizer nomination" :
      "Review website host enquiry",
    dueAt: null,
    ownerUid: principal.uid,
    status: "open",
    createdAt: now,
    updatedAt: now,
    updatedBy: principal.uid,
  };
  const activity: SalesActivity = {
    schemaVersion: 1,
    classification: "sales_private",
    activityId,
    organizerId: input.organizerId,
    opportunityId: null,
    type: "note",
    channel: null,
    outcome: null,
    providerConfirmed: false,
    occurredAt: now,
    recordedAt: now,
    note: intent.source === "partner" ?
      "Partner nomination linked after canonical identity review." :
      "Website host enquiry linked after canonical identity review.",
    actorUid: principal.uid,
  };
  const linked = {
    ...intent,
    revision: input.expectedRevision + 1,
    status: "linked",
    organizerId: input.organizerId,
    linkedAt: admin.firestore.Timestamp.fromDate(new Date(now)),
    linkedBy: principal.uid,
    linkRequestId: input.requestId,
    updatedAt: admin.firestore.Timestamp.fromDate(new Date(now)),
  };
  tx.set(intentRef, linked);
  tx.create(db.collection("salesTasks").doc(taskId), task);
  tx.create(db.collection("salesActivities").doc(activityId), activity);
  return {
    intent: {
      intentId: input.intentId,
      revision: linked.revision,
      status: "linked",
      organizerId: input.organizerId,
    },
    task,
    activity,
  };
}

export async function listSalesInboundIntents(
  db: FirebaseFirestore.Firestore,
  principal: SalesPrincipal,
  input: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  employeeOnly(principal);
  const limit = Number(input.limit ?? 25);
  const status = typeof input.status === "string" ? input.status : null;
  let query: FirebaseFirestore.Query = db.collection("salesInboundIntents");
  if (status) query = query.where("status", "==", status);
  query = query
    .orderBy("createdAt", "desc")
    .orderBy(admin.firestore.FieldPath.documentId());
  if (input.cursor) {
    try {
      const cursor = JSON.parse(
        Buffer.from(input.cursor as string, "base64url").toString("utf8"),
      ) as {
        seconds: number;
        nanos: number;
        id: string;
        status: string | null;
      };
      if (
        !Number.isSafeInteger(cursor.seconds) ||
        !Number.isSafeInteger(cursor.nanos) ||
        typeof cursor.id !== "string" ||
        cursor.status !== status
      ) {
        throw new Error();
      }
      query = query.startAfter(
        new admin.firestore.Timestamp(cursor.seconds, cursor.nanos),
        cursor.id,
      );
    } catch {
      throw new HttpsError(
        "invalid-argument",
        "Inbound intent cursor is invalid.",
      );
    }
  }
  const snap = await query.limit(limit + 1).get();
  const rows = snap.docs.slice(0, limit).map((doc) => {
    const value = doc.data();
    return {
      intentId: doc.id,
      revision: value.revision,
      status: value.status,
      source: value.source,
      fullName: value.fullName,
      city: value.city,
      createdAt: value.createdAt?.toDate?.().toISOString() ?? null,
      organizerId: value.organizerId,
      evidenceStatus: "self_reported",
      hostApplication: value.hostApplication ?? null,
      // Optional on the intent; absent reads as an events Host enquiry.
      programme: value.programme ?? null,
      programmeApplication: value.programmeApplication ?? null,
      hasPhone: typeof value.phone === "string",
    };
  });
  const last = snap.docs[limit - 1];
  const nextCursor =
    snap.size > limit && last ?
      Buffer.from(
        JSON.stringify({
          seconds: last.get("createdAt").seconds,
          nanos: last.get("createdAt").nanoseconds,
          id: last.id,
          status,
        }),
      ).toString("base64url") :
      null;
  return {rows, nextCursor};
}
