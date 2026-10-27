import {createHash} from "crypto";
import * as admin from "firebase-admin";
import {CallableRequest, HttpsError, onCall} from
  "firebase-functions/v2/https";
import {requireAuth} from "../shared/auth";
import {appCheckCallableOptionsWithLimits} from
  "../shared/callableOptions";
import type {
  OrganizerContactDocument,
  OrganizerContactIdentityClaimDocument,
  OrganizerContactMergeReceiptDocument,
} from "../shared/generated/firestoreAdminTypes";
import type {MergeOrganizerContactsCallablePayload} from
  "../shared/generated/mergeOrganizerContactsCallablePayload";
import type {MutateOrganizerContactMergeCallableResponse} from
  "../shared/generated/mutateOrganizerContactMergeCallableResponse";
import type {UnmergeOrganizerContactsCallablePayload} from
  "../shared/generated/unmergeOrganizerContactsCallablePayload";
import {
  validateMergeOrganizerContactsCallablePayload,
} from "../shared/generated/validators/mergeOrganizerContactsInput";
import {
  validateUnmergeOrganizerContactsCallablePayload,
} from "../shared/generated/validators/unmergeOrganizerContactsInput";
import {validateOrganizerContactMergeReceiptDocument} from
  "../shared/generated/validators/organizerContactMergeReceiptDocument";
import {requireOrganizerManager} from
  "../shared/organizerManagerAuthority";
import {checkRateLimit} from "../shared/rateLimit";
import {validateCallableWithAjv} from "../shared/validation";
import {AudienceProjectionDeps, rebuildOrganizerContact} from
  "./organizerAudienceProjection";
import {assertContactMergeReceiptBudget, MergeOrigin,
  MergeSeatEvidence, prepareContactMergeSeats,
  prepareContactUnmergeSeats} from "./organizerContactMergeSeats";

const maxAtomicMergeDocuments = 400;

interface OrganizerContactMergeDeps extends AudienceProjectionDeps {
  checkRateLimit: typeof checkRateLimit;
  rebuildAfterMerge?: (receipt: OrganizerContactMergeReceiptDocument,
    receiptId: string) => Promise<void>;
}

const defaultDeps: OrganizerContactMergeDeps = {
  firestore: () => admin.firestore(),
  timestamp: () => admin.firestore.Timestamp.now(),
  identitySecret: () => "unused-by-contact-merge".padEnd(32, "_"),
  checkRateLimit,
};

/** Merges a source contact into a survivor with immutable move evidence. */
export async function mergeOrganizerContactsHandler(
  request: CallableRequest<unknown>,
  deps: OrganizerContactMergeDeps = defaultDeps
): Promise<MutateOrganizerContactMergeCallableResponse> {
  const actorUid = requireAuth(request);
  const data = validateCallableWithAjv<MergeOrganizerContactsCallablePayload>(
    request, validateMergeOrganizerContactsCallablePayload,
    normalizeMergePayload);
  if (data.survivorContactId === data.sourceContactId) {
    throw new HttpsError("invalid-argument", "A contact cannot merge itself.");
  }
  const db = deps.firestore();
  await deps.checkRateLimit(db, actorUid, "mergeOrganizerContacts", {
    maxRequests: 20, windowMs: 60 * 1000,
  });
  const receiptId = mergeReceiptId(data.organizerId, "merge",
    data.idempotencyKey);
  const receiptRef = db.collection("organizerContactMergeReceipts")
    .doc(receiptId);
  const survivorRef = db.collection("organizerContacts")
    .doc(data.survivorContactId);
  const sourceRef = db.collection("organizerContacts")
    .doc(data.sourceContactId);
  const now = deps.timestamp();
  const result = await db.runTransaction(async (tx) => {
    await requireOrganizerManager({db, organizerId: data.organizerId,
      actorUid, transaction: tx});
    const [deleted, receiptSnap, survivorSnap, sourceSnap,
      edgeSnap, evidenceSnap, claimSnap, originSnap,
      survivorOriginSnap] = await Promise.all([
      tx.get(db.collection("deletedUsers").doc(actorUid)),
      tx.get(receiptRef), tx.get(survivorRef), tx.get(sourceRef),
      tx.get(db.collection("organizerContactEventEdges")
        .where("contactId", "==", data.sourceContactId)
        .limit(maxAtomicMergeDocuments + 1)),
      tx.get(db.collection("organizerContactIdentityLinks")
        .where("contactId", "==", data.sourceContactId)
        .limit(maxAtomicMergeDocuments + 1)),
      tx.get(db.collection("organizerContactIdentityClaims")
        .where("verifiedContactId", "==", data.sourceContactId)
        .limit(maxAtomicMergeDocuments + 1)),
      tx.get(db.collection("organizerContactOrigins")
        .where("currentContactId", "==", data.sourceContactId)
        .limit(maxAtomicMergeDocuments + 1)),
      tx.get(db.collection("organizerContactOrigins")
        .where("currentContactId", "==", data.survivorContactId)
        .limit(maxAtomicMergeDocuments + 1)),
    ]);
    if (deleted.exists) {
      throw new HttpsError("permission-denied", "Account is unavailable.");
    }
    if (receiptSnap.exists) {
      const receipt = receiptDocument(receiptSnap);
      assertReceiptReplay(receipt, data, "merge");
      return {receipt, replayed: true};
    }
    const survivor = activeContact(survivorSnap, data.organizerId);
    const source = activeContact(sourceSnap, data.organizerId);
    if (survivor.revision !== data.survivorRevision ||
        source.revision !== data.sourceRevision) {
      throw new HttpsError("aborted",
        "Contact data changed. Refresh before merging.");
    }
    const totalMoved = edgeSnap.size + evidenceSnap.size + claimSnap.size +
      originSnap.size;
    if (totalMoved > maxAtomicMergeDocuments ||
        survivorOriginSnap.size > maxAtomicMergeDocuments) {
      throw new HttpsError("resource-exhausted",
        "This contact is too large for an in-app merge. Contact support.");
    }
    const conflicts = mergeConflicts(survivor, source);
    if (survivor.linkedUid && source.linkedUid &&
        survivor.linkedUid !== source.linkedUid) {
      throw new HttpsError("failed-precondition",
        "Distinct verified accounts require identity reconciliation.");
    }
    if (conflicts.length > 0 && !data.confirmConflicts) {
      throw new HttpsError("failed-precondition",
        `Confirm these identity conflicts: ${conflicts.join(", ")}.`);
    }
    const sourceOrigins = originSnap.docs.map((doc) => ({id: doc.id,
      ...doc.data()} as MergeOrigin));
    const survivorOrigins = survivorOriginSnap.docs.map((doc) => ({id: doc.id,
      ...doc.data()} as MergeOrigin));
    for (const origin of sourceOrigins) {
      if (origin.organizerId !== data.organizerId ||
          origin.currentContactId !== data.sourceContactId ||
          origin.originContactId !== data.sourceContactId) {
        throw new HttpsError("failed-precondition",
          "Contact origin provenance needs reconciliation.");
      }
    }
    for (const origin of survivorOrigins) {
      if (origin.organizerId !== data.organizerId ||
          origin.currentContactId !== data.survivorContactId) {
        throw new HttpsError("failed-precondition",
          "Survivor origin provenance needs reconciliation.");
      }
    }
    const seats = await prepareContactMergeSeats({db, tx,
      organizerId: data.organizerId,
      sourceContactId: data.sourceContactId,
      survivorContactId: data.survivorContactId,
      sourceLinkedUid: source.linkedUid,
      survivorLinkedUid: survivor.linkedUid,
      sourceOrigins, survivorOrigins});
    const receipt = {
      organizerId: data.organizerId, operation: "merge" as const,
      survivorContactId: data.survivorContactId,
      sourceContactId: data.sourceContactId,
      evidence: mergeEvidence(survivor, source), conflicts, actorUid,
      survivorRevision: survivor.revision, sourceRevision: source.revision,
      movedEdgeIds: edgeSnap.docs.map((doc) => doc.id),
      movedIdentityEvidenceIds: evidenceSnap.docs.map((doc) => doc.id),
      movedClaimIds: claimSnap.docs.map((doc) => doc.id),
      movedOriginIds: originSnap.docs.map((doc) => doc.id),
      movedEdgeCount: edgeSnap.size,
      movedIdentityEvidenceCount: evidenceSnap.size,
      movedClaimCount: claimSnap.size,
      movedOriginCount: originSnap.size,
      idempotencyKey: data.idempotencyKey,
      reversalOfReceiptId: null, createdAt: now,
      ...seats.evidence,
    } as OrganizerContactMergeReceiptDocument & MergeSeatEvidence;
    assertContactMergeReceiptBudget(receipt, totalMoved,
      seats.evidence.seatMoves.length);
    if (!validateOrganizerContactMergeReceiptDocument(receipt)) {
      throw new HttpsError("failed-precondition",
        "Merge receipt violates the canonical storage contract.");
    }
    for (const document of edgeSnap.docs) {
      if (document.data().organizerId !== data.organizerId) {
        throw new HttpsError("failed-precondition", "Foreign edge in merge.");
      }
      tx.update(document.ref, {contactId: data.survivorContactId,
        updatedAt: now});
    }
    for (const document of evidenceSnap.docs) {
      if (document.data().organizerId !== data.organizerId) {
        throw new HttpsError("failed-precondition",
          "Foreign identity in merge.");
      }
      tx.update(document.ref, {contactId: data.survivorContactId,
        updatedAt: now});
    }
    for (const document of claimSnap.docs) {
      const claim = document.data() as OrganizerContactIdentityClaimDocument;
      if (claim.organizerId !== data.organizerId) {
        throw new HttpsError("failed-precondition", "Foreign claim in merge.");
      }
      tx.update(document.ref, {verifiedContactId: data.survivorContactId,
        revision: Math.max(claim.revision + 1, now.toMillis()),
        updatedAt: now});
    }
    for (const document of originSnap.docs) {
      tx.update(document.ref, {currentContactId: data.survivorContactId});
    }
    seats.apply();
    tx.update(survivorRef, {ambiguousCandidateContactIds: [],
      revision: Math.max(survivor.revision + 1, now.toMillis()),
      updatedAt: now});
    tx.update(sourceRef, {identityState: "merged",
      mergedIntoContactId: data.survivorContactId,
      revision: Math.max(source.revision + 1, now.toMillis()),
      updatedAt: now, deletedAt: now});
    tx.create(receiptRef, receipt);
    return {receipt, replayed: false};
  });
  await rebuildMergedContacts(result.receipt, receiptId, deps);
  return receiptResponse(receiptId, result.receipt, result.replayed);
}

/** Reverses only source facts and seat aliases proved by the merge receipt. */
export async function unmergeOrganizerContactsHandler(
  request: CallableRequest<unknown>,
  deps: OrganizerContactMergeDeps = defaultDeps
): Promise<MutateOrganizerContactMergeCallableResponse> {
  const actorUid = requireAuth(request);
  const data = validateCallableWithAjv<UnmergeOrganizerContactsCallablePayload>(
    request, validateUnmergeOrganizerContactsCallablePayload,
    normalizeUnmergePayload);
  const db = deps.firestore();
  await deps.checkRateLimit(db, actorUid, "unmergeOrganizerContacts", {
    maxRequests: 20, windowMs: 60 * 1000,
  });
  const mergeReceiptRef = db.collection("organizerContactMergeReceipts")
    .doc(data.mergeReceiptId);
  const reversalId = mergeReversalReceiptId(data.organizerId,
    data.mergeReceiptId);
  const reversalRef = db.collection("organizerContactMergeReceipts")
    .doc(reversalId);
  const now = deps.timestamp();
  const result = await db.runTransaction(async (tx) => {
    await requireOrganizerManager({db, organizerId: data.organizerId,
      actorUid, transaction: tx});
    const [deleted, mergeReceiptSnap, reversalSnap] = await Promise.all([
      tx.get(db.collection("deletedUsers").doc(actorUid)),
      tx.get(mergeReceiptRef), tx.get(reversalRef),
    ]);
    if (deleted.exists) {
      throw new HttpsError("permission-denied", "Account is unavailable.");
    }
    const mergeReceipt = receiptDocument(mergeReceiptSnap) as
      OrganizerContactMergeReceiptDocument & Partial<MergeSeatEvidence>;
    if (mergeReceipt.organizerId !== data.organizerId ||
        mergeReceipt.operation !== "merge") {
      throw new HttpsError("not-found", "Merge receipt not found.");
    }
    if (reversalSnap.exists) {
      const receipt = receiptDocument(reversalSnap);
      assertUnmergeReplay(receipt, data, mergeReceipt);
      return {receipt, replayed: true};
    }
    const refs = mergeMoveReferences(db, mergeReceipt);
    const [sourceSnap, survivorSnap, ...moveSnaps] = await Promise.all([
      tx.get(db.collection("organizerContacts")
        .doc(mergeReceipt.sourceContactId)),
      tx.get(db.collection("organizerContacts")
        .doc(mergeReceipt.survivorContactId)),
      ...refs.map((item) => tx.get(item.ref)),
    ]);
    const source = sourceSnap.data() as OrganizerContactDocument | undefined;
    const survivor = activeContact(survivorSnap, data.organizerId);
    if (!source || source.organizerId !== data.organizerId ||
        source.identityState !== "merged" ||
        source.mergedIntoContactId !== mergeReceipt.survivorContactId ||
        source.deletedAt === null) {
      throw new HttpsError("failed-precondition",
        "The source contact changed after this merge.");
    }
    if (source.linkedUid && survivor.linkedUid &&
        source.linkedUid !== survivor.linkedUid) {
      throw new HttpsError("failed-precondition",
        "Distinct verified accounts cannot be unmerged as one seat.");
    }
    for (let index = 0; index < refs.length; index += 1) {
      assertReversibleMove(refs[index].kind, moveSnaps[index], mergeReceipt);
    }
    const seatEvidence = mergeReceipt.seatMoves &&
      mergeReceipt.seatEventGuards &&
      mergeReceipt.seatAdmissionGuards &&
      mergeReceipt.survivorOriginIdsBefore &&
      mergeReceipt.sourceOriginAliasIdsBefore ?
      mergeReceipt as OrganizerContactMergeReceiptDocument &
        MergeSeatEvidence : null;
    const restoreSeats = await prepareContactUnmergeSeats({db, tx,
      organizerId: data.organizerId,
      sourceContactId: mergeReceipt.sourceContactId,
      survivorContactId: mergeReceipt.survivorContactId,
      movedOriginIds: mergeReceipt.movedOriginIds ?? [],
      evidence: seatEvidence});
    const reversal = {...mergeReceipt,
      movedOriginIds: mergeReceipt.movedOriginIds ?? [],
      movedOriginCount: mergeReceipt.movedOriginCount ?? 0,
      operation: "unmerge" as const, actorUid,
      idempotencyKey: data.idempotencyKey,
      reversalOfReceiptId: data.mergeReceiptId,
      createdAt: now} as OrganizerContactMergeReceiptDocument;
    for (let index = 0; index < refs.length; index += 1) {
      tx.update(refs[index].ref,
        restoredMovePatch(refs[index].kind, moveSnaps[index], now));
    }
    restoreSeats();
    tx.update(db.collection("organizerContacts")
      .doc(mergeReceipt.sourceContactId), {
      identityState: "unlinked", mergedIntoContactId: null,
      deletedAt: null,
      revision: Math.max(source.revision + 1, now.toMillis()),
      updatedAt: now,
    });
    tx.create(reversalRef, reversal);
    return {receipt: reversal, replayed: false};
  });
  await rebuildMergedContacts(result.receipt, reversalId, deps);
  return receiptResponse(reversalId, result.receipt, result.replayed);
}

function mergeMoveReferences(
  db: FirebaseFirestore.Firestore,
  receipt: OrganizerContactMergeReceiptDocument
): Array<{kind: "edge" | "evidence" | "claim" | "origin";
  ref: FirebaseFirestore.DocumentReference}> {
  return [
    ...receipt.movedEdgeIds.map((id) => ({
      kind: "edge" as const,
      ref: db.collection("organizerContactEventEdges").doc(id),
    })),
    ...receipt.movedIdentityEvidenceIds.map((id) => ({
      kind: "evidence" as const,
      ref: db.collection("organizerContactIdentityLinks").doc(id),
    })),
    ...receipt.movedClaimIds.map((id) => ({
      kind: "claim" as const,
      ref: db.collection("organizerContactIdentityClaims").doc(id),
    })),
    ...(receipt.movedOriginIds ?? []).map((id) => ({
      kind: "origin" as const,
      ref: db.collection("organizerContactOrigins").doc(id),
    })),
  ];
}

function assertReversibleMove(
  kind: "edge" | "evidence" | "claim" | "origin",
  snap: FirebaseFirestore.DocumentSnapshot,
  receipt: OrganizerContactMergeReceiptDocument
): void {
  if (!snap.exists) {
    throw new HttpsError(
      "failed-precondition",
      "A merged source fact is missing."
    );
  }
  const data = snap.data() as Record<string, unknown>;
  const current = kind === "claim" ? data.verifiedContactId :
    kind === "origin" ? data.currentContactId : data.contactId;
  const origin = kind === "claim" ? data.originVerifiedContactId :
    data.originContactId;
  if (data.organizerId !== receipt.organizerId ||
      current !== receipt.survivorContactId ||
      origin !== receipt.sourceContactId) {
    throw new HttpsError(
      "failed-precondition",
      "A merged source fact changed and cannot be safely restored."
    );
  }
}

function restoredMovePatch(
  kind: "edge" | "evidence" | "claim" | "origin",
  snap: FirebaseFirestore.DocumentSnapshot,
  now: FirebaseFirestore.Timestamp
): Record<string, unknown> {
  const data = snap.data() as Record<string, unknown>;
  if (kind === "claim") {
    return {
      verifiedContactId: data.originVerifiedContactId,
      revision: Math.max(Number(data.revision ?? 0) + 1, now.toMillis()),
      updatedAt: now,
    };
  }
  if (kind === "origin") {
    return {currentContactId: data.originContactId};
  }
  return {contactId: data.originContactId, updatedAt: now};
}

function activeContact(
  snap: FirebaseFirestore.DocumentSnapshot,
  organizerId: string
): OrganizerContactDocument {
  const contact = snap.data() as OrganizerContactDocument | undefined;
  if (!contact || contact.organizerId !== organizerId ||
      contact.deletedAt !== null || contact.identityState === "merged") {
    throw new HttpsError("not-found", "Audience contact not found.");
  }
  return contact;
}

export function mergeConflicts(
  survivor: OrganizerContactDocument,
  source: OrganizerContactDocument
): string[] {
  const conflicts = [];
  if (survivor.linkedUid && source.linkedUid &&
      survivor.linkedUid !== source.linkedUid) conflicts.push("linkedUid");
  if (survivor.phoneE164 && source.phoneE164 &&
      survivor.phoneE164 !== source.phoneE164) conflicts.push("phoneE164");
  if (survivor.email && source.email &&
      survivor.email !== source.email) conflicts.push("email");
  return conflicts;
}

export function mergeEvidence(
  survivor: OrganizerContactDocument,
  source: OrganizerContactDocument
): OrganizerContactMergeReceiptDocument["evidence"] {
  const evidence: OrganizerContactMergeReceiptDocument["evidence"] = [
    "managerConfirmed",
  ];
  if (survivor.linkedUid && survivor.linkedUid === source.linkedUid) {
    evidence.push("sameVerifiedUid");
  }
  if (survivor.phoneE164 && survivor.phoneE164 === source.phoneE164) {
    evidence.push(survivor.linkedUid || source.linkedUid ?
      "sameVerifiedPhone" : "sameImportedPhone");
  }
  if (survivor.email && survivor.email === source.email) {
    evidence.push("sameEmail");
  }
  return evidence;
}

async function rebuildMergedContacts(
  receipt: OrganizerContactMergeReceiptDocument,
  receiptId: string,
  deps: OrganizerContactMergeDeps
): Promise<void> {
  if (deps.rebuildAfterMerge) {
    await deps.rebuildAfterMerge(receipt, receiptId);
    return;
  }
  await rebuildOrganizerContact(
    receipt.survivorContactId,
    `${receiptId}|survivor`,
    deps
  );
  await rebuildOrganizerContact(
    receipt.sourceContactId,
    `${receiptId}|source`,
    deps
  );
}

function receiptDocument(
  snap: FirebaseFirestore.DocumentSnapshot
): OrganizerContactMergeReceiptDocument {
  if (!snap.exists) {
    throw new HttpsError("not-found", "Merge receipt not found.");
  }
  const receipt = snap.data();
  if (!validateOrganizerContactMergeReceiptDocument(receipt)) {
    throw new HttpsError("failed-precondition",
      "Stored contact merge receipt is malformed.");
  }
  return receipt as unknown as OrganizerContactMergeReceiptDocument;
}

function assertReceiptReplay(
  receipt: OrganizerContactMergeReceiptDocument,
  data: MergeOrganizerContactsCallablePayload,
  operation: "merge"
): void {
  if (receipt.operation !== operation ||
      receipt.organizerId !== data.organizerId ||
      receipt.survivorContactId !== data.survivorContactId ||
      receipt.sourceContactId !== data.sourceContactId ||
      receipt.idempotencyKey !== data.idempotencyKey) {
    throw new HttpsError(
      "already-exists",
      "Idempotency key already belongs to another contact merge."
    );
  }
}

function assertUnmergeReplay(
  receipt: OrganizerContactMergeReceiptDocument,
  data: UnmergeOrganizerContactsCallablePayload,
  mergeReceipt: OrganizerContactMergeReceiptDocument
): void {
  if (receipt.operation !== "unmerge" ||
      receipt.organizerId !== data.organizerId ||
      receipt.reversalOfReceiptId !== data.mergeReceiptId ||
      receipt.survivorContactId !== mergeReceipt.survivorContactId ||
      receipt.sourceContactId !== mergeReceipt.sourceContactId) {
    throw new HttpsError(
      "already-exists",
      "Idempotency key already belongs to another unmerge."
    );
  }
}

function receiptResponse(
  receiptId: string,
  receipt: OrganizerContactMergeReceiptDocument,
  replayed: boolean
): MutateOrganizerContactMergeCallableResponse {
  return {
    receiptId,
    operation: receipt.operation,
    survivorContactId: receipt.survivorContactId,
    sourceContactId: receipt.sourceContactId,
    movedEdgeCount: receipt.movedEdgeCount,
    movedIdentityEvidenceCount: receipt.movedIdentityEvidenceCount,
    movedClaimCount: receipt.movedClaimCount,
    movedOriginCount: receipt.movedOriginCount ?? 0,
    replayed,
  };
}

function mergeReceiptId(
  organizerId: string,
  operation: "merge" | "unmerge",
  idempotencyKey: string
): string {
  return `ocmr_${createHash("sha256")
    .update(`${organizerId}|${operation}|${idempotencyKey}`)
    .digest("hex").slice(0, 48)}`;
}

function mergeReversalReceiptId(
  organizerId: string,
  mergeReceiptIdValue: string
): string {
  return `ocmr_${createHash("sha256")
    .update(`${organizerId}|unmerge|${mergeReceiptIdValue}`)
    .digest("hex").slice(0, 48)}`;
}

function normalizeMergePayload(value: unknown): unknown {
  return normalizePayloadStrings(value, [
    "organizerId",
    "survivorContactId",
    "sourceContactId",
    "idempotencyKey",
  ]);
}

function normalizeUnmergePayload(value: unknown): unknown {
  return normalizePayloadStrings(value, [
    "organizerId",
    "mergeReceiptId",
    "idempotencyKey",
  ]);
}

function normalizePayloadStrings(
  value: unknown,
  fields: string[]
): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const input = {...value} as Record<string, unknown>;
  for (const field of fields) {
    if (typeof input[field] === "string") input[field] = input[field].trim();
  }
  return input;
}

export const mergeOrganizerContacts = onCall(
  appCheckCallableOptionsWithLimits({timeoutSeconds: 60, maxInstances: 10}),
  (request) => mergeOrganizerContactsHandler(request)
);

export const unmergeOrganizerContacts = onCall(
  appCheckCallableOptionsWithLimits({timeoutSeconds: 60, maxInstances: 10}),
  (request) => unmergeOrganizerContactsHandler(request)
);
