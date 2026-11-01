/* eslint-disable max-len */
import * as admin from "firebase-admin";
import {CallableRequest, HttpsError, onCall} from "firebase-functions/v2/https";
import {appCheckCallableOptions, appCheckCallableOptionsWithLimits} from "../../shared/callableOptions";
import type {AdminListInboxItemsCallablePayload} from "../../shared/generated/adminListInboxItemsCallablePayload";
import type {AdminListInboxItemsCallableResponse} from "../../shared/generated/adminListInboxItemsCallableResponse";
import type {AdminGetInboxItemCallablePayload} from "../../shared/generated/adminGetInboxItemCallablePayload";
import type {AdminGetInboxItemCallableResponse} from "../../shared/generated/adminGetInboxItemCallableResponse";
import type {AdminUpdateInboxItemCallablePayload} from "../../shared/generated/adminUpdateInboxItemCallablePayload";
import type {AdminUpdateInboxItemCallableResponse} from "../../shared/generated/adminUpdateInboxItemCallableResponse";
import type {AdminRebuildInboxCallablePayload} from "../../shared/generated/adminRebuildInboxCallablePayload";
import type {AdminRebuildInboxCallableResponse} from "../../shared/generated/adminRebuildInboxCallableResponse";
import {validateAdminListInboxItemsCallablePayload} from "../../shared/generated/validators/adminListInboxItemsInput";
import {validateAdminGetInboxItemCallablePayload} from "../../shared/generated/validators/adminGetInboxItemInput";
import {validateAdminUpdateInboxItemCallablePayload} from "../../shared/generated/validators/adminUpdateInboxItemInput";
import {validateAdminRebuildInboxCallablePayload} from "../../shared/generated/validators/adminRebuildInboxInput";
import {checkRateLimit as defaultCheckRateLimit} from "../../shared/rateLimit";
import {validateCallableWithAjv} from "../../shared/validation";
import {setAdminAuditLogInTransaction} from "../adminAudit";
import {requireAdminRole} from "../adminAuth";
import {syncPeopleIndex} from "../peopleSearch";
import {
  INBOX_ITEMS_COLLECTION,
  INBOX_ITEM_TYPES,
  INBOX_JOURNEY_COLLECTION,
  InboxItemDocument,
  InboxItemType,
  InboxJourneyStepDocument,
  InboxSourceKind,
  journeyStepDocId,
  sourceCollections,
} from "./model";
import {journeyStepDocument, syncInboxSource} from "./store";

/** Ops and the owner work the inbox; a sales associate may open their own nominations. */
export const inboxRoles = ["admin", "adminOwner", "support"] as const;
const inboxReadRoles = [...inboxRoles, "salesStaff"] as const;
const rebuildRoles = ["admin", "adminOwner"] as const;
const maxSnoozeMs = 30 * 24 * 60 * 60 * 1000;

interface InboxDeps {
  firestore: () => FirebaseFirestore.Firestore;
  serverTimestamp: () => FirebaseFirestore.FieldValue;
  now: () => Date;
  checkRateLimit?: typeof defaultCheckRateLimit;
}

const defaultDeps: InboxDeps = {
  firestore: () => admin.firestore(),
  serverTimestamp: () => admin.firestore.FieldValue.serverTimestamp(),
  now: () => new Date(),
  checkRateLimit: defaultCheckRateLimit,
};

type ListResponse = AdminListInboxItemsCallableResponse;
type Scope = AdminListInboxItemsCallablePayload["scope"];

/**
 * One page of the inbox, oldest waiting first (done: most recently decided
 * first), with real totals: how many items wait in each scope, and how many
 * of each type are in the scope you are looking at.
 */
export async function adminListInboxItemsHandler(request: CallableRequest<unknown>,
  deps: InboxDeps = defaultDeps): Promise<ListResponse> {
  const adminContext = requireAdminRole(request, inboxRoles);
  const data = validateCallableWithAjv<AdminListInboxItemsCallablePayload>(request,
    validateAdminListInboxItemsCallablePayload);
  const db = deps.firestore();
  await deps.checkRateLimit?.(db, adminContext.uid, "adminListInboxItems", {maxRequests: 120, windowMs: 60 * 1000});
  const items = db.collection(INBOX_ITEMS_COLLECTION);
  const inCity = (query: FirebaseFirestore.Query) => data.city ? query.where("city", "==", data.city) : query;
  const scoped = (scope: Scope) => {
    const query = items.where("status", "==", scope === "mine" ? "waiting" : scope);
    return inCity(scope === "mine" ? query.where("assigneeUid", "==", adminContext.uid) : query);
  };
  const base = scoped(data.scope);
  const byDone = data.scope === "done";
  const orderField = byDone ? "doneAt" : "waitingSince";
  const direction = byDone ? "desc" : "asc";
  let page = (data.type ? base.where("type", "==", data.type) : base)
    .orderBy(orderField, direction).orderBy(admin.firestore.FieldPath.documentId(), direction)
    .limit(data.limit + 1);
  if (data.cursor) {
    const cursor = decodeCursor(data.cursor);
    page = page.startAfter(cursor.value, cursor.itemId);
  }
  const count = async (query: FirebaseFirestore.Query) => (await query.count().get()).data().count;
  const [snapshot, typeCounts, all, scopeCounts, oldest] = await Promise.all([
    page.get(),
    Promise.all(INBOX_ITEM_TYPES.map((type) => count(base.where("type", "==", type)))),
    count(base),
    Promise.all((["waiting", "mine", "snoozed", "working"] as const).map((scope) => count(scoped(scope)))),
    scoped("waiting").orderBy("waitingSince", "asc").limit(1).get(),
  ]);
  const docs = snapshot.docs.slice(0, data.limit);
  const last = docs.at(-1)?.data() as InboxItemDocument | undefined;
  const types = Object.fromEntries(INBOX_ITEM_TYPES.map((type, index) => [type, typeCounts[index]])) as Record<InboxItemType, number>;
  return {
    generatedAt: deps.now().toISOString(),
    scope: data.scope,
    type: data.type,
    city: data.city,
    items: docs.map((doc) => itemRow(doc.data() as InboxItemDocument)),
    nextCursor: snapshot.docs.length > data.limit && last ?
      encodeCursor({value: (byDone ? last.doneAt : last.waitingSince) ?? "", itemId: last.itemId}) : null,
    totals: {
      scopes: {waiting: scopeCounts[0], mine: scopeCounts[1], snoozed: scopeCounts[2], working: scopeCounts[3]},
      types: {all, ...types},
    },
    oldestWaitingSince: (oldest.docs[0]?.data() as InboxItemDocument | undefined)?.waitingSince ?? null,
  };
}

/** One item with every step it took, oldest first. */
export async function adminGetInboxItemHandler(request: CallableRequest<unknown>,
  deps: InboxDeps = defaultDeps): Promise<AdminGetInboxItemCallableResponse> {
  const adminContext = requireAdminRole(request, inboxReadRoles);
  const data = validateCallableWithAjv<AdminGetInboxItemCallablePayload>(request,
    validateAdminGetInboxItemCallablePayload);
  const db = deps.firestore();
  await deps.checkRateLimit?.(db, adminContext.uid, "adminGetInboxItem", {maxRequests: 240, windowMs: 60 * 1000});
  const snap = await db.collection(INBOX_ITEMS_COLLECTION).doc(data.itemId).get();
  const item = snap.exists ? snap.data() as InboxItemDocument : null;
  const ops = adminContext.roles.some((role) => (inboxRoles as readonly string[]).includes(role));
  // A sales associate sees only what they nominated, and cannot tell other items exist.
  if (!item || (!ops && item.nominatorUid !== adminContext.uid)) {
    throw new HttpsError("not-found", "This inbox item was not found.");
  }
  const journey = await db.collection(INBOX_JOURNEY_COLLECTION).where("itemId", "==", item.itemId)
    .orderBy("occurredAt", "asc").orderBy(admin.firestore.FieldPath.documentId(), "asc").limit(200).get();
  return {
    item: itemRow(item),
    journey: journey.docs.map((doc) => {
      const step = doc.data() as InboxJourneyStepDocument;
      return {stepId: step.stepId, occurredAt: step.occurredAt, title: step.title, detail: step.detail,
        actorUid: step.actorUid, tone: step.tone};
    }),
    canWork: ops && item.status !== "done",
    canDecideClaim: item.type === "claim" &&
      adminContext.roles.some((role) => role === "admin" || role === "adminOwner"),
  };
}

/** Assign, unassign, snooze or wake one item. Audited, and a step in its journey. */
export async function adminUpdateInboxItemHandler(request: CallableRequest<unknown>,
  deps: InboxDeps = defaultDeps): Promise<AdminUpdateInboxItemCallableResponse> {
  const adminContext = requireAdminRole(request, inboxRoles);
  const data = validateCallableWithAjv<AdminUpdateInboxItemCallablePayload>(request,
    validateAdminUpdateInboxItemCallablePayload);
  const db = deps.firestore();
  await deps.checkRateLimit?.(db, adminContext.uid, "adminUpdateInboxItem", {maxRequests: 60, windowMs: 60 * 1000});
  const now = deps.now();
  const nowIso = now.toISOString();
  if (data.action === "assign" && !data.assigneeUid) {
    throw new HttpsError("invalid-argument", "Choose who the item is assigned to.");
  }
  if (data.action === "snooze") {
    const until = data.snoozedUntil ? Date.parse(data.snoozedUntil) : NaN;
    if (Number.isNaN(until) || until <= now.getTime() || until - now.getTime() > maxSnoozeMs) {
      throw new HttpsError("invalid-argument", "Snooze until a time in the next 30 days.");
    }
  }
  const itemRef = db.collection(INBOX_ITEMS_COLLECTION).doc(data.itemId);
  const assigneeRef = data.action === "assign" && data.assigneeUid && data.assigneeUid !== adminContext.uid ?
    db.collection("adminRoleAssignments").doc(data.assigneeUid) : null;
  const item = await db.runTransaction(async (tx) => {
    const [itemSnap, assigneeSnap] = await tx.getAll(itemRef, ...(assigneeRef ? [assigneeRef] : []));
    if (!itemSnap.exists) throw new HttpsError("not-found", "This inbox item was not found.");
    const before = itemSnap.data() as InboxItemDocument;
    if (before.status !== "waiting" && before.status !== "snoozed") {
      throw new HttpsError("failed-precondition", before.status === "done" ?
        "This item is already done." : "Catch is still working on this item.");
    }
    if (assigneeSnap) {
      const assignment = assigneeSnap.data();
      if (!assigneeSnap.exists || assignment?.status === "revoked" ||
          !Array.isArray(assignment?.roles) || assignment.roles.length === 0) {
        throw new HttpsError("failed-precondition", "Items can only be assigned to Catch staff.");
      }
    }
    const next: InboxItemDocument = {...before, updatedAt: nowIso};
    let title: string;
    switch (data.action) {
    case "assign":
      next.assigneeUid = data.assigneeUid;
      title = data.assigneeUid === adminContext.uid ? "Picked up" : "Assigned";
      break;
    case "unassign":
      next.assigneeUid = null;
      title = "Unassigned";
      break;
    case "snooze":
      next.status = "snoozed";
      next.snoozedUntil = new Date(Date.parse(data.snoozedUntil as string)).toISOString();
      title = "Snoozed";
      break;
    case "wake":
      next.status = "waiting";
      next.snoozedUntil = null;
      title = "Back in the inbox";
      break;
    }
    const stepId = `staff-${now.getTime()}-${data.action}`;
    tx.create(db.collection(INBOX_JOURNEY_COLLECTION).doc(journeyStepDocId(before.itemId, stepId)),
      journeyStepDocument(before.itemId, {stepId, occurredAt: nowIso, title,
        detail: data.action === "snooze" ? `Until ${next.snoozedUntil}${data.note ? ` · ${data.note}` : ""}` : data.note,
        actorUid: adminContext.uid, tone: "ink"}));
    tx.set(itemRef, next);
    setAdminAuditLogInTransaction(tx, db, adminContext, {
      action: "adminUpdateInboxItem",
      targetPath: itemRef.path,
      request,
      before: {status: before.status, assigneeUid: before.assigneeUid, snoozedUntil: before.snoozedUntil},
      after: {status: next.status, assigneeUid: next.assigneeUid, snoozedUntil: next.snoozedUntil},
      note: data.note,
      serverTimestamp: deps.serverTimestamp,
    });
    return next;
  });
  return {item: itemRow(item)};
}

/**
 * Re-projects one page of a source collection into the inbox, or of users
 * into the people index. Triggers keep both current; this fills them for
 * documents written before the triggers existed.
 */
export async function adminRebuildInboxHandler(request: CallableRequest<unknown>,
  deps: InboxDeps = defaultDeps): Promise<AdminRebuildInboxCallableResponse> {
  const adminContext = requireAdminRole(request, rebuildRoles);
  const data = validateCallableWithAjv<AdminRebuildInboxCallablePayload>(request,
    validateAdminRebuildInboxCallablePayload);
  const db = deps.firestore();
  await deps.checkRateLimit?.(db, adminContext.uid, "adminRebuildInbox", {maxRequests: 30, windowMs: 60 * 1000});
  const collection = data.source === "people" ? "users" : sourceCollections[data.source as InboxSourceKind];
  let query = db.collection(collection).orderBy(admin.firestore.FieldPath.documentId()).limit(data.limit);
  if (data.cursor) query = query.startAfter(data.cursor);
  const snapshot = await query.get();
  let written = 0;
  for (const doc of snapshot.docs) {
    if (data.source === "people") {
      if (await syncPeopleIndex(db, doc.id, doc.data(), deps.now())) written += 1;
    } else {
      const result = await syncInboxSource(db, data.source as InboxSourceKind, doc.id, doc.data(), deps.now());
      if (result.outcome === "written") written += 1;
    }
  }
  return {
    source: data.source,
    scanned: snapshot.docs.length,
    written,
    nextCursor: snapshot.docs.length === data.limit ? snapshot.docs.at(-1)?.id ?? null : null,
  };
}

function itemRow(item: InboxItemDocument): ListResponse["items"][number] {
  return {
    itemId: item.itemId, type: item.type, sourceKind: item.sourceKind, sourceId: item.sourceId,
    sourcePath: item.sourcePath, title: item.title, subtitle: item.subtitle, cameFrom: item.cameFrom,
    nominatorUid: item.nominatorUid, city: item.city, state: item.state, status: item.status,
    waitingSince: item.waitingSince, doneAt: item.doneAt, assigneeUid: item.assigneeUid,
    snoozedUntil: item.snoozedUntil, recommendation: item.recommendation,
  };
}

function encodeCursor(cursor: {value: string; itemId: string}): string {
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

function decodeCursor(value: string): {value: string; itemId: string} {
  try {
    const cursor = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as Record<string, unknown>;
    if (typeof cursor.value === "string" && typeof cursor.itemId === "string") {
      return {value: cursor.value, itemId: cursor.itemId};
    }
  } catch {
    // Falls through to the refusal below.
  }
  throw new HttpsError("invalid-argument", "This page cursor is invalid; reload the inbox.");
}

export const adminListInboxItems = onCall(appCheckCallableOptions,
  (request) => adminListInboxItemsHandler(request));
export const adminGetInboxItem = onCall(appCheckCallableOptions,
  (request) => adminGetInboxItemHandler(request));
export const adminUpdateInboxItem = onCall(appCheckCallableOptions,
  (request) => adminUpdateInboxItemHandler(request));
export const adminRebuildInbox = onCall(appCheckCallableOptionsWithLimits({timeoutSeconds: 300}),
  (request) => adminRebuildInboxHandler(request));
