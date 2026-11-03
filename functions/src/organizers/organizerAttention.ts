import {isDeepStrictEqual} from "node:util";
import * as admin from "firebase-admin";
import {HttpsError} from "firebase-functions/v2/https";
import {operationContentHash} from "../operations/durableActions";
import {validateOperationWorkItem} from "../operations/validation";
import {
  hostPaymentAccountDocumentId,
  type HostPaymentProvider,
} from "../payments/hostPaymentAccounts";
import type {EventAssistanceCaseDocument} from
  "../shared/generated/eventAssistanceCaseDocument";
import type {
  EventDocument,
  EventParticipationDocument,
  HostPaymentAccountDocument,
  OrganizerApplicationDocument,
  OrganizerAttentionItemDocument,
  OrganizerDocument,
  OrganizerFormAutomationRuleDocument,
  OrganizerFormAutomationRunDocument,
  ProviderSyncRunDocument,
} from "../shared/generated/firestoreAdminTypes";
import {
  deliveryWorkBasis,
  deliveryWorkIds,
  deliveryWorkProjection,
  parseDeliveryWork,
} from "../eventSuccess/operations/deliveryWorkRecords";
import {
  AttentionSourceRow,
  DeliveryReviewAttentionSource,
  DesiredHostAttentionItem,
  momentAttentionWindowMillis,
  MomentAttentionSendSource,
  OfferAttentionSource,
  OrganizerAttentionSources,
} from "./organizerAttentionPolicy";

export const maxAttentionSourceRows = 400;
const resolvedRetentionMillis = 30 * 24 * 60 * 60 * 1000;

/** A bounded source read more rows than the evaluator may trust. The
 *  evaluator records the source instead of writing a partial queue. */
export class AttentionSourceOverCapError extends HttpsError {
  constructor(readonly source: string) {
    super(
      "resource-exhausted",
      `Host Today cannot safely evaluate a partial ${source} scan.`
    );
  }
}

/** A loaded source row failed validation. The evaluator records the source
 *  and the detail instead of retrying a write that cannot change it. */
export class AttentionSourceInvalidError extends HttpsError {
  constructor(readonly source: string, readonly detail: string) {
    super("internal", `Host Today cannot evaluate an invalid ${source} row: ` +
      detail);
  }
}

/** The organizer document is gone; its open rows resolve. */
export class AttentionOrganizerMissingError extends HttpsError {
  constructor() {
    super("not-found", "Organizer not found.");
  }
}

/** Executes the loader's reads, directly or inside a transaction. */
export interface AttentionSourceReader {
  getDoc(
    ref: FirebaseFirestore.DocumentReference
  ): Promise<FirebaseFirestore.DocumentSnapshot>;
  getQuery(
    query: FirebaseFirestore.Query
  ): Promise<FirebaseFirestore.QuerySnapshot>;
}

const directReader: AttentionSourceReader = {
  getDoc: (ref) => ref.get(),
  getQuery: (query) => query.get(),
};

/** Routes every source read through one transaction. */
export function transactionAttentionReader(
  tx: FirebaseFirestore.Transaction
): AttentionSourceReader {
  return {
    getDoc: (ref) => tx.get(ref),
    getQuery: (query) => tx.get(query),
  };
}

/** Reads every source collection needed by source-ready server policies. */
export async function loadOrganizerAttentionSources(
  db: FirebaseFirestore.Firestore,
  organizerId: string,
  now: FirebaseFirestore.Timestamp,
  reader: AttentionSourceReader = directReader
): Promise<OrganizerAttentionSources> {
  const events = db.collection("events");
  const [
    organizerSnap,
    canonicalEvents,
    compatibilityEvents,
    canonicalJoinRequests,
    compatibilityJoinRequests,
    openPracticalCases,
    deliveryReviewWorkItems,
    applications,
    providerRuns,
    automationRules,
    momentAttentionSendDocs,
    offeredOffers,
  ] = await Promise.all([
    reader.getDoc(db.collection("organizers").doc(organizerId)),
    reader.getQuery(events.where("organizerId", "==", organizerId)
      .where("status", "==", "active")
      .where("endTime", ">", now)
      .orderBy("endTime")
      .orderBy(admin.firestore.FieldPath.documentId())
      .limit(maxAttentionSourceRows + 1)),
    reader.getQuery(events.where("organizerId", "==", organizerId)
      .where("status", "==", "active")
      .where("endTime", ">", now)
      .orderBy("endTime")
      .orderBy(admin.firestore.FieldPath.documentId())
      .limit(maxAttentionSourceRows + 1)),
    reader.getQuery(db.collection("eventParticipations")
      .where("organizerId", "==", organizerId)
      .where("hostApprovalStatus", "==", "pending")
      .limit(maxAttentionSourceRows + 1)),
    reader.getQuery(db.collection("eventParticipations")
      .where("organizerId", "==", organizerId)
      .where("hostApprovalStatus", "==", "pending")
      .limit(maxAttentionSourceRows + 1)),
    reader.getQuery(db.collection("eventAssistanceCases")
      .where("context.mode", "==", "live")
      .where("context.organizerId", "==", organizerId)
      .where("owner", "==", "eventLead")
      .where("status", "==", "open")
      .orderBy("receivedAt")
      .orderBy(admin.firestore.FieldPath.documentId())
      .limit(maxAttentionSourceRows + 1)),
    reader.getQuery(db.collection("operationWorkItems")
      .where("workflowId", "==", "event-assistance")
      .where("normalizedPayload.kind", "==", "liveMessageDelivery")
      .where(
        "normalizedPayload.scope.context.organizerId",
        "==",
        organizerId
      )
      .where("normalizedPayload.checkpoint.phase", "==", "review")
      .orderBy("normalizedPayload.checkpoint.dueAt")
      .orderBy(admin.firestore.FieldPath.documentId())
      .limit(maxAttentionSourceRows + 1)),
    reader.getQuery(db.collection("organizerApplications")
      .where("organizerId", "==", organizerId)
      .where("reviewStatus", "in", ["submitted", "inReview"])
      .limit(maxAttentionSourceRows + 1)),
    reader.getQuery(db.collection("providerSyncRuns")
      .where("organizerId", "==", organizerId)
      .where("expiresAt", ">", now)
      .orderBy("expiresAt")
      .orderBy(admin.firestore.FieldPath.documentId())
      .limit(maxAttentionSourceRows + 1)),
    /* firestore-index: organizerFormAutomationRules (
      organizerId:ASCENDING, enabled:ASCENDING
    ) */
    reader.getQuery(db.collection("organizerFormAutomationRules")
      .where("organizerId", "==", organizerId)
      .where("enabled", "==", true)
      .limit(maxAttentionSourceRows + 1)),
    reader.getQuery(db.collection("organizerMomentSends")
      .where("organizerId", "==", organizerId)
      .where("actionKind", "==", "staffAttention")
      .where(
        "createdAtMillis",
        ">",
        now.toMillis() - momentAttentionWindowMillis
      )
      .orderBy("createdAtMillis")
      .orderBy(admin.firestore.FieldPath.documentId())
      .limit(maxAttentionSourceRows + 1)),
    /* firestore-index: organizerEventOffers (
      organizerId:ASCENDING, status:ASCENDING,
      expiresAtMillis:ASCENDING, __name__:ASCENDING
    ) */
    reader.getQuery(db.collection("organizerEventOffers")
      .where("organizerId", "==", organizerId)
      .where("status", "==", "offered")
      .orderBy("expiresAtMillis")
      .orderBy(admin.firestore.FieldPath.documentId())
      .limit(maxAttentionSourceRows + 1)),
  ]);
  if (!organizerSnap.exists) throw new AttentionOrganizerMissingError();

  assertBoundedSnapshot(canonicalEvents, "events");
  assertBoundedSnapshot(compatibilityEvents, "events");
  assertBoundedSnapshot(canonicalJoinRequests, "eventParticipations");
  assertBoundedSnapshot(compatibilityJoinRequests, "eventParticipations");
  assertBoundedSnapshot(openPracticalCases, "eventAssistanceCases");
  assertBoundedSnapshot(deliveryReviewWorkItems, "operationWorkItems");
  assertBoundedSnapshot(applications, "organizerApplications");
  assertBoundedSnapshot(providerRuns, "providerSyncRuns");
  assertBoundedSnapshot(automationRules, "organizerFormAutomationRules");
  assertBoundedSnapshot(momentAttentionSendDocs, "organizerMomentSends");
  assertBoundedSnapshot(offeredOffers, "organizerEventOffers");

  const eventRows = new Map<string, AttentionSourceRow<EventDocument>>();
  for (const snapshot of [canonicalEvents, compatibilityEvents]) {
    for (const doc of snapshot.docs) {
      eventRows.set(doc.id, sourceRow<EventDocument>(doc, "events"));
    }
  }
  assertBoundedAttentionRows([...eventRows.values()], "events");
  const participationRows = new Map<
    string,
    AttentionSourceRow<EventParticipationDocument>
  >();
  for (const snapshot of [
    canonicalJoinRequests,
    compatibilityJoinRequests,
  ]) {
    for (const doc of snapshot.docs) {
      participationRows.set(
        doc.id,
        sourceRow<EventParticipationDocument>(doc, "eventParticipations")
      );
    }
  }
  assertBoundedAttentionRows(
    [...participationRows.values()],
    "eventParticipations"
  );

  const currentAutomationRules = automationRules.docs.map((doc) =>
    sourceRow<OrganizerFormAutomationRuleDocument>(
      doc, "organizerFormAutomationRules"));
  const currentAutomationRuns = await loadCurrentAutomationRuns(
    db, reader, organizerId, currentAutomationRules
  );

  const organizer = sourceRow<OrganizerDocument>(organizerSnap, "organizers");
  const ownerUid = organizer.data.ownership?.ownerUserId ??
    organizer.data.ownerUserId ?? organizer.data.hostUserId ?? null;
  const paymentAccounts: OrganizerAttentionSources["paymentAccounts"] = {};
  if (ownerUid) {
    const [razorpay, stripe] = await Promise.all([
      loadHostPaymentAccount(db, reader, ownerUid, "razorpay"),
      loadHostPaymentAccount(db, reader, ownerUid, "stripe"),
    ]);
    if (razorpay) paymentAccounts.razorpay = razorpay;
    if (stripe) paymentAccounts.stripe = stripe;
  }

  return {
    organizer,
    events: [...eventRows.values()],
    eventAssistanceCases: openPracticalCases.docs.map((doc) =>
      sourceRow<EventAssistanceCaseDocument>(doc, "eventAssistanceCases")),
    deliveryReviewWorkItems: deliveryReviewWorkItems.docs.map((doc) =>
      deliveryReviewSourceRow(doc, now.toMillis())),
    eventParticipations: [...participationRows.values()],
    applications: applications.docs.map((doc) =>
      sourceRow<OrganizerApplicationDocument>(doc, "organizerApplications")),
    providerSyncRuns: providerRuns.docs.map((doc) =>
      sourceRow<ProviderSyncRunDocument>(doc, "providerSyncRuns")),
    automationRules: currentAutomationRules,
    automationRuns: currentAutomationRuns,
    paymentAccounts,
    momentAttentionSends: momentAttentionSendDocs.docs
      .map((doc) => momentAttentionSendRow(doc))
      .filter((row): row is
        AttentionSourceRow<MomentAttentionSendSource> => row !== null),
    eventOffers: offeredOffers.docs
      .map((doc) => offerAttentionSourceRow(doc))
      .filter((row): row is
        AttentionSourceRow<OfferAttentionSource> => row !== null),
  };
}

/** Reads one terminal state per enabled revision, independent of history size.
 * Success and skipped outcomes are needed to resolve an older failure. */
async function loadCurrentAutomationRuns(
  db: FirebaseFirestore.Firestore,
  reader: AttentionSourceReader,
  organizerId: string,
  rules: Array<AttentionSourceRow<OrganizerFormAutomationRuleDocument>>
): Promise<OrganizerAttentionSources["automationRuns"]> {
  const runs: OrganizerAttentionSources["automationRuns"] = [];
  // Keep fanout bounded as well as document reads (at most 400 queries/rows).
  const concurrency = 10;
  for (let offset = 0; offset < rules.length; offset += concurrency) {
    const batch = rules.slice(offset, offset + concurrency);
    const snapshots = await Promise.all(batch
      .map((rule) => {
        /* firestore-index: organizerFormAutomationRuns (
          organizerId:ASCENDING, formId:ASCENDING, ruleId:ASCENDING,
          ruleRevision:ASCENDING, status:ASCENDING,
          updatedAt:DESCENDING, __name__:DESCENDING
        ) */
        return reader.getQuery(db.collection("organizerFormAutomationRuns")
          .where("organizerId", "==", organizerId)
          .where("formId", "==", rule.data.formId)
          .where("ruleId", "==", rule.id)
          .where("ruleRevision", "==", rule.data.revision)
          .where("status", "in", [
            "succeeded", "partiallyFailed", "failed", "skipped",
          ])
          .orderBy("updatedAt", "desc")
          .orderBy(admin.firestore.FieldPath.documentId(), "desc")
          .limit(1));
      }));
    for (const snapshot of snapshots) {
      for (const doc of snapshot.docs) {
        runs.push(sourceRow<OrganizerFormAutomationRunDocument>(
          doc, "organizerFormAutomationRuns"));
      }
    }
  }
  return runs;
}

/** Same lookup as findHostPaymentAccount (canonical id, then the legacy
 *  Stripe id), routed through the reader so a transaction sees it. */
async function loadHostPaymentAccount(
  db: FirebaseFirestore.Firestore,
  reader: AttentionSourceReader,
  uid: string,
  provider: HostPaymentProvider
): Promise<AttentionSourceRow<HostPaymentAccountDocument> | null> {
  const accounts = db.collection("hostPaymentAccounts");
  const canonical = await reader.getDoc(
    accounts.doc(hostPaymentAccountDocumentId(uid, provider))
  );
  if (canonical.exists) {
    return sourceRowFromSnapshot(
      canonical,
      canonical.data() as HostPaymentAccountDocument,
      "hostPaymentAccounts"
    );
  }
  if (provider !== "stripe") return null;
  const legacy = await reader.getDoc(accounts.doc(uid));
  return legacy.exists ? sourceRowFromSnapshot(
    legacy,
    legacy.data() as HostPaymentAccountDocument,
    "hostPaymentAccounts"
  ) : null;
}

/** Lenient journal parse: staffAttention sends missing projection fields
 *  (e.g. written before the contract added them) drop out of the source
 *  set rather than failing the whole projection. */
function momentAttentionSendRow(
  snapshot: FirebaseFirestore.DocumentSnapshot
): AttentionSourceRow<MomentAttentionSendSource> | null {
  const data = snapshot.data() as Record<string, unknown> | undefined;
  if (!data) return null;
  const runId = data.runId;
  const momentId = data.momentId;
  const scopeKind = data.scopeKind;
  const scopeId = data.scopeId;
  const duty = data.duty;
  const severity = data.severity;
  const title = data.title;
  const createdAtMillis = data.createdAtMillis;
  if (typeof runId !== "string" || typeof momentId !== "string" ||
      (scopeKind !== "event" && scopeKind !== "program") ||
      typeof scopeId !== "string" || typeof duty !== "string" ||
      (severity !== "info" && severity !== "warning" &&
        severity !== "urgent") ||
      typeof title !== "string" || typeof createdAtMillis !== "number") {
    return null;
  }
  return sourceRowFromSnapshot(snapshot, {
    runId,
    momentId,
    scopeKind,
    scopeId,
    duty,
    severity,
    title,
    createdAtMillis,
  }, "organizerMomentSends");
}

/** Lenient offer parse: malformed offer rows drop out of the source set
 *  rather than failing the whole projection. */
function offerAttentionSourceRow(
  snapshot: FirebaseFirestore.DocumentSnapshot
): AttentionSourceRow<OfferAttentionSource> | null {
  const data = snapshot.data() as Record<string, unknown> | undefined;
  if (!data) return null;
  const eventId = data.eventId;
  const status = data.status;
  const generation = data.generation;
  const revision = data.revision;
  const expiresAtMillis = data.expiresAtMillis;
  const offeredAtMillis = data.offeredAtMillis;
  const updatedAtMillis = data.updatedAtMillis;
  const manualPayment = data.manualPayment;
  const manualPaymentStatus =
    (manualPayment as Record<string, unknown> | undefined)?.status;
  const paymentSnapshot = data.paymentSnapshot;
  const expectedAmountMinor =
    (paymentSnapshot as Record<string, unknown> | undefined)
      ?.expectedAmountMinor;
  const currency =
    (paymentSnapshot as Record<string, unknown> | undefined)?.currency;
  if (typeof eventId !== "string" || typeof status !== "string" ||
      !Number.isSafeInteger(generation) ||
      !Number.isSafeInteger(revision) ||
      typeof expiresAtMillis !== "number" ||
      typeof offeredAtMillis !== "number" ||
      typeof updatedAtMillis !== "number" ||
      typeof manualPaymentStatus !== "string" ||
      typeof expectedAmountMinor !== "number" ||
      (currency !== null && typeof currency !== "string")) {
    return null;
  }
  return sourceRowFromSnapshot(snapshot, {
    offerId: snapshot.id,
    eventId,
    status,
    generation: generation as number,
    revision: revision as number,
    expiresAtMillis,
    offeredAtMillis,
    expectedAmountMinor,
    currency: currency as string | null,
    manualPaymentStatus,
    updatedAtMillis,
  }, "organizerEventOffers");
}

function deliveryReviewSourceRow(
  snapshot: FirebaseFirestore.DocumentSnapshot,
  nowMillis: number
): AttentionSourceRow<DeliveryReviewAttentionSource> {
  const raw = snapshot.data();
  if (raw === undefined) {
    throw new AttentionSourceInvalidError("operationWorkItems",
      `${snapshot.id} is empty or missing.`);
  }
  return sourceRowFromSnapshot(
    snapshot,
    parseDeliveryReviewAttentionSource(raw, snapshot.id, nowMillis),
    "operationWorkItems"
  );
}

/** Reduces a private Operations row to the facts safe for Today projection. */
export function parseDeliveryReviewAttentionSource(
  raw: unknown,
  documentId: string,
  nowMillis: number
): DeliveryReviewAttentionSource {
  const result = validateOperationWorkItem(raw);
  if (!result.ok) {
    throw new AttentionSourceInvalidError("operationWorkItems",
      `${documentId} failed its canonical contract.`);
  }
  const item = result.value;
  let payload: ReturnType<typeof parseDeliveryWork>;
  try {
    payload = parseDeliveryWork(item.normalizedPayload, nowMillis);
  } catch (error) {
    throw new AttentionSourceInvalidError("operationWorkItems",
      `${documentId} has an invalid delivery payload: ${String(error)}`);
  }
  const checkpoint = payload.checkpoint;
  const projection = deliveryWorkProjection(payload);
  const ids = deliveryWorkIds(payload.messageId);
  const reviewDueAtMillis = checkpoint.dueAt;
  if (checkpoint.phase !== "review" || reviewDueAtMillis === null ||
      item.workItemId !== documentId || item.workItemId !== ids.workItemId ||
      item.runId !== ids.runId || item.workflowId !== "event-assistance" ||
      item.entityKind !== "message_delivery" ||
      item.externalKey !== payload.messageId ||
      item.candidateHash !== operationContentHash(deliveryWorkBasis(payload)) ||
      item.primaryStage !== projection.primaryStage ||
      item.lifecycleStatus !== projection.lifecycleStatus ||
      item.outcome !== projection.outcome ||
      JSON.stringify(item.taskFlags) !== JSON.stringify(projection.taskFlags) ||
      JSON.stringify(item.blockerCodes) !==
        JSON.stringify(projection.blockerCodes) ||
      item.expiresAt !== new Date(payload.expiresAt).toISOString() ||
      Date.parse(item.updatedAt) < payload.createdAt ||
      Date.parse(item.updatedAt) > nowMillis) {
    throw new AttentionSourceInvalidError("operationWorkItems",
      `${documentId} has inconsistent runtime evidence.`);
  }
  return {
    workItemId: item.workItemId,
    revision: item.revision,
    candidateHash: item.candidateHash,
    reviewDueAtMillis,
    payload: payload as DeliveryReviewAttentionSource["payload"],
  };
}

export interface OrganizerAttentionProjectionPlan {
  sets: Array<{
    attentionId: string;
    document: OrganizerAttentionItemDocument;
  }>;
  resolutions: Array<{
    attentionId: string;
    patch: FirebaseFirestore.UpdateData<FirebaseFirestore.DocumentData>;
  }>;
}

/** Plans deterministic projection changes separately from Firestore writes.
 *  An unchanged open row produces no write. */
export function buildOrganizerAttentionProjectionPlan(params: {
  organizerId: string;
  now: FirebaseFirestore.Timestamp;
  desired: DesiredHostAttentionItem[];
  existing: ReadonlyMap<string, OrganizerAttentionItemDocument>;
  openIds: readonly string[];
}): OrganizerAttentionProjectionPlan {
  const sets: OrganizerAttentionProjectionPlan["sets"] = [];
  const resolutions: OrganizerAttentionProjectionPlan["resolutions"] = [];
  const desiredIds = new Set(params.desired.map((item) => item.attentionId));
  for (const item of params.desired) {
    const current = params.existing.get(item.attentionId);
    const document = openProjectionDocument({
      organizerId: params.organizerId,
      now: params.now,
      desired: item,
      current,
    });
    if (!current || !sameOpenProjection(current, document)) {
      sets.push({attentionId: item.attentionId, document});
    }
  }
  for (const attentionId of params.openIds) {
    if (desiredIds.has(attentionId)) continue;
    const current = params.existing.get(attentionId);
    if (!current || current.status !== "open") continue;
    resolutions.push({
      attentionId,
      patch: attentionResolutionPatch(current, params.now),
    });
  }
  return {sets, resolutions};
}

/** Closes one open row and starts its 30-day retention. */
export function attentionResolutionPatch(
  current: Pick<OrganizerAttentionItemDocument, "resolutionVersion">,
  now: FirebaseFirestore.Timestamp
): FirebaseFirestore.UpdateData<FirebaseFirestore.DocumentData> {
  return {
    status: "resolved",
    resolutionVersion: current.resolutionVersion + 1,
    resolvedAt: now,
    updatedAt: now,
    purgeAt: admin.firestore.Timestamp.fromMillis(
      now.toMillis() + resolvedRetentionMillis
    ),
  };
}

export function assertBoundedAttentionRows(
  rows: readonly unknown[],
  source: string
): void {
  if (rows.length > maxAttentionSourceRows) {
    throw new AttentionSourceOverCapError(source);
  }
}

function assertBoundedSnapshot(
  snapshot: FirebaseFirestore.QuerySnapshot,
  source: string
): void {
  assertBoundedAttentionRows(snapshot.docs, source);
}

function sourceRow<T>(
  snapshot: FirebaseFirestore.DocumentSnapshot,
  source: string
): AttentionSourceRow<T> {
  const data = snapshot.data();
  if (data === undefined) {
    throw new AttentionSourceInvalidError(source,
      `${snapshot.id} is empty or missing.`);
  }
  return sourceRowFromSnapshot(snapshot, data as T, source);
}

function sourceRowFromSnapshot<T>(
  snapshot: FirebaseFirestore.DocumentSnapshot,
  data: T,
  source: string
): AttentionSourceRow<T> {
  const updatedAt = snapshot.updateTime ?? snapshot.createTime;
  if (!updatedAt) {
    throw new AttentionSourceInvalidError(source,
      `${snapshot.id} is missing Firestore update metadata.`);
  }
  return {
    id: snapshot.id,
    data,
    sourceUpdatedAtMillis: updatedAt.toMillis(),
  };
}

function openProjectionDocument(params: {
  organizerId: string;
  now: FirebaseFirestore.Timestamp;
  desired: DesiredHostAttentionItem;
  current: OrganizerAttentionItemDocument | undefined;
}): OrganizerAttentionItemDocument {
  const reopening = params.current && params.current.status !== "open";
  const openedAt = !params.current || reopening ?
    params.now : params.current.openedAt;
  const resolutionVersion = !params.current ? 1 : reopening ?
    params.current.resolutionVersion + 1 : params.current.resolutionVersion;
  return {
    schemaVersion: 1,
    attentionId: params.desired.attentionId,
    organizerId: params.organizerId,
    kind: params.desired.kind,
    scope: params.desired.scope,
    sourceOwner: params.desired.sourceOwner,
    sourceId: params.desired.sourceId,
    sourceRevision: params.desired.sourceRevision,
    eventId: params.desired.eventId,
    status: "open",
    consequence: params.desired.consequence,
    blocking: params.desired.blocking,
    urgency: params.desired.urgency,
    destination: params.desired.destination,
    context: params.desired.context,
    dedupeKey: params.desired.dedupeKey,
    policyVersion: params.desired.policyVersion,
    resolutionVersion,
    assignedHostUid: params.desired.assignedHostUid,
    openedAt,
    dueAt: admin.firestore.Timestamp.fromMillis(params.desired.dueAtMillis),
    actionExpiresAt: params.desired.expiresAtMillis === null ? null :
      admin.firestore.Timestamp.fromMillis(params.desired.expiresAtMillis),
    sourceUpdatedAt: admin.firestore.Timestamp.fromMillis(
      params.desired.sourceUpdatedAtMillis
    ),
    createdAt: params.current?.createdAt ?? params.now,
    updatedAt: params.now,
    resolvedAt: null,
    purgeAt: null,
  };
}

function sameOpenProjection(
  current: OrganizerAttentionItemDocument,
  next: OrganizerAttentionItemDocument
): boolean {
  return current.schemaVersion === next.schemaVersion &&
    current.attentionId === next.attentionId &&
    current.organizerId === next.organizerId &&
    current.kind === next.kind &&
    current.scope === next.scope &&
    current.sourceOwner === next.sourceOwner &&
    current.sourceId === next.sourceId &&
    current.sourceRevision === next.sourceRevision &&
    current.eventId === next.eventId &&
    current.status === "open" &&
    current.consequence === next.consequence &&
    current.blocking === next.blocking &&
    current.urgency === next.urgency &&
    // Firestore does not keep map key order, so compare maps structurally.
    isDeepStrictEqual(current.destination, next.destination) &&
    isDeepStrictEqual(current.context, next.context) &&
    current.dedupeKey === next.dedupeKey &&
    current.policyVersion === next.policyVersion &&
    current.resolutionVersion === next.resolutionVersion &&
    current.assignedHostUid === next.assignedHostUid &&
    current.openedAt.toMillis() === next.openedAt.toMillis() &&
    current.dueAt.toMillis() === next.dueAt.toMillis() &&
    timestampMillis(current.actionExpiresAt) ===
      timestampMillis(next.actionExpiresAt) &&
    current.sourceUpdatedAt.toMillis() === next.sourceUpdatedAt.toMillis() &&
    current.resolvedAt === null && current.purgeAt === null;
}

function timestampMillis(
  value: FirebaseFirestore.Timestamp | null
): number | null {
  return value?.toMillis() ?? null;
}
