import * as admin from "firebase-admin";
import {CallableRequest, HttpsError, onCall} from
  "firebase-functions/v2/https";
import {operationContentHash} from "../operations/durableActions";
import {validateOperationWorkItem} from "../operations/validation";
import {findHostPaymentAccount} from "../payments/hostPaymentAccounts";
import type {EventAssistanceCaseDocument} from
  "../shared/generated/eventAssistanceCaseDocument";
import {requireAuth} from "../shared/auth";
import {normalizePayloadStrings} from
  "../shared/callablePayloadNormalization";
import {appCheckCallableOptionsWithLimits} from
  "../shared/callableOptions";
import type {
  EventDocument,
  EventParticipationDocument,
  OrganizerApplicationDocument,
  OrganizerAttentionItemDocument,
  OrganizerDocument,
  OrganizerFormAutomationRuleDocument,
  OrganizerFormAutomationRunDocument,
  ProviderSyncRunDocument,
} from "../shared/generated/firestoreAdminTypes";
import type {ListOrganizerAttentionItemsCallablePayload} from
  "../shared/generated/listOrganizerAttentionItemsCallablePayload";
import type {ListOrganizerAttentionItemsCallableResponse} from
  "../shared/generated/listOrganizerAttentionItemsCallableResponse";
import {
  hostAttentionPolicyCatalog,
} from "../shared/generated/catalogs/hostAttentionPolicyCatalog";
import {schemaErrorMessages} from "../shared/generated/schemaValidationRuntime";
import {
  validateListOrganizerAttentionItemsCallablePayload,
} from
  "../shared/generated/validators/listOrganizerAttentionItemsInput";
import {
  validateListOrganizerAttentionItemsCallableResponse,
} from
  "../shared/generated/validators/listOrganizerAttentionItemsOutput";
import {requireOrganizerManager} from
  "../shared/organizerManagerAuthority";
import {checkRateLimit} from "../shared/rateLimit";
import {requireDoc, validateCallableWithAjv} from "../shared/validation";
import {
  deliveryWorkBasis,
  deliveryWorkIds,
  deliveryWorkProjection,
  parseDeliveryWork,
} from "../eventSuccess/operations/deliveryWorkRecords";
import {
  AttentionSourceRow,
  DeliveryReviewAttentionSource,
  deriveOrganizerAttentionItems,
  DesiredHostAttentionItem,
  HostAttentionItem,
  hostAttentionCoverage,
  hostAttentionHorizonMillis,
  momentAttentionWindowMillis,
  MomentAttentionSendSource,
  OfferAttentionSource,
  OrganizerAttentionSources,
} from "./organizerAttentionPolicy";

export const maxAttentionSourceRows = 400;
const resolvedRetentionMillis = 30 * 24 * 60 * 60 * 1000;
const maxBatchWrites = 450;

export interface OrganizerAttentionDeps {
  firestore: () => FirebaseFirestore.Firestore;
  checkRateLimit: typeof checkRateLimit;
  requireManager: typeof requireOrganizerManager;
  timestamp: () => FirebaseFirestore.Timestamp;
  loadSources: typeof loadOrganizerAttentionSources;
  reconcile: typeof reconcileOrganizerAttentionProjection;
}

const defaultDeps: OrganizerAttentionDeps = {
  firestore: () => admin.firestore(),
  checkRateLimit,
  requireManager: requireOrganizerManager,
  timestamp: () => admin.firestore.Timestamp.now(),
  loadSources: loadOrganizerAttentionSources,
  reconcile: reconcileOrganizerAttentionProjection,
};

/** Returns a fully reconciled, explicitly covered Host Today attention view. */
export async function listOrganizerAttentionItemsHandler(
  request: CallableRequest<unknown>,
  deps: OrganizerAttentionDeps = defaultDeps
): Promise<ListOrganizerAttentionItemsCallableResponse> {
  const actorUid = requireAuth(request);
  const data = validateCallableWithAjv<
    ListOrganizerAttentionItemsCallablePayload
  >(
    request,
    validateListOrganizerAttentionItemsCallablePayload,
    (value) => normalizePayloadStrings(value, {
      stringFields: ["organizerId"],
    })
  );
  const db = deps.firestore();
  await deps.checkRateLimit(db, actorUid, "listOrganizerAttentionItems", {
    maxRequests: 60, windowMs: 60 * 1000,
  });
  await deps.requireManager({
    db,
    organizerId: data.organizerId,
    actorUid,
  });
  const now = deps.timestamp();
  const sources = await deps.loadSources(db, data.organizerId, now);
  const desired = deriveOrganizerAttentionItems({
    organizerId: data.organizerId,
    nowMillis: now.toMillis(),
    sources,
  });
  assertBoundedAttentionRows(desired, "derived attention items");
  const items = await deps.reconcile(db, data.organizerId, now, desired);
  const response: ListOrganizerAttentionItemsCallableResponse = {
    organizerId: data.organizerId,
    policyVersion: hostAttentionPolicyCatalog.policyVersion,
    generatedAtMillis: now.toMillis(),
    horizonEndsAtMillis: now.toMillis() + hostAttentionHorizonMillis,
    items,
    coverage: hostAttentionCoverage(),
  };
  if (!validateListOrganizerAttentionItemsCallableResponse(response)) {
    throw new HttpsError(
      "internal",
      "Host Today produced an invalid attention projection: " +
        schemaErrorMessages(
          validateListOrganizerAttentionItemsCallableResponse
        ).join("; ")
    );
  }
  return response;
}

/** Reads every source collection needed by source-ready server policies. */
export async function loadOrganizerAttentionSources(
  db: FirebaseFirestore.Firestore,
  organizerId: string,
  now: FirebaseFirestore.Timestamp
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
    db.collection("organizers").doc(organizerId).get(),
    events.where("organizerId", "==", organizerId)
      .where("status", "==", "active")
      .where("endTime", ">", now)
      .orderBy("endTime")
      .orderBy(admin.firestore.FieldPath.documentId())
      .limit(maxAttentionSourceRows + 1).get(),
    events.where("clubId", "==", organizerId)
      .where("status", "==", "active")
      .where("endTime", ">", now)
      .orderBy("endTime")
      .orderBy(admin.firestore.FieldPath.documentId())
      .limit(maxAttentionSourceRows + 1).get(),
    db.collection("eventParticipations")
      .where("organizerId", "==", organizerId)
      .where("hostApprovalStatus", "==", "pending")
      .limit(maxAttentionSourceRows + 1).get(),
    db.collection("eventParticipations")
      .where("clubId", "==", organizerId)
      .where("hostApprovalStatus", "==", "pending")
      .limit(maxAttentionSourceRows + 1).get(),
    db.collection("eventAssistanceCases")
      .where("context.mode", "==", "live")
      .where("context.organizerId", "==", organizerId)
      .where("owner", "==", "eventLead")
      .where("status", "==", "open")
      .orderBy("receivedAt")
      .orderBy(admin.firestore.FieldPath.documentId())
      .limit(maxAttentionSourceRows + 1).get(),
    db.collection("operationWorkItems")
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
      .limit(maxAttentionSourceRows + 1).get(),
    db.collection("organizerApplications")
      .where("organizerId", "==", organizerId)
      .where("reviewStatus", "in", ["submitted", "inReview"])
      .limit(maxAttentionSourceRows + 1).get(),
    db.collection("providerSyncRuns")
      .where("organizerId", "==", organizerId)
      .where("expiresAt", ">", now)
      .orderBy("expiresAt")
      .orderBy(admin.firestore.FieldPath.documentId())
      .limit(maxAttentionSourceRows + 1).get(),
    /* firestore-index: organizerFormAutomationRules (
      organizerId:ASCENDING, enabled:ASCENDING
    ) */
    db.collection("organizerFormAutomationRules")
      .where("organizerId", "==", organizerId)
      .where("enabled", "==", true)
      .limit(maxAttentionSourceRows + 1).get(),
    db.collection("organizerMomentSends")
      .where("organizerId", "==", organizerId)
      .where("actionKind", "==", "staffAttention")
      .where(
        "createdAtMillis",
        ">",
        now.toMillis() - momentAttentionWindowMillis
      )
      .orderBy("createdAtMillis")
      .orderBy(admin.firestore.FieldPath.documentId())
      .limit(maxAttentionSourceRows + 1).get(),
    /* firestore-index: organizerEventOffers (
      organizerId:ASCENDING, status:ASCENDING,
      expiresAtMillis:ASCENDING, __name__:ASCENDING
    ) */
    db.collection("organizerEventOffers")
      .where("organizerId", "==", organizerId)
      .where("status", "==", "offered")
      .orderBy("expiresAtMillis")
      .orderBy(admin.firestore.FieldPath.documentId())
      .limit(maxAttentionSourceRows + 1).get(),
  ]);
  if (!organizerSnap.exists) {
    throw new HttpsError("not-found", "Organizer not found.");
  }

  assertBoundedSnapshot(canonicalEvents, "canonical active events");
  assertBoundedSnapshot(compatibilityEvents, "compatible active events");
  assertBoundedSnapshot(canonicalJoinRequests, "canonical event join requests");
  assertBoundedSnapshot(
    compatibilityJoinRequests,
    "compatible event join requests"
  );
  assertBoundedSnapshot(openPracticalCases, "open practical help cases");
  assertBoundedSnapshot(
    deliveryReviewWorkItems,
    "message delivery review work items"
  );
  assertBoundedSnapshot(applications, "open organizer applications");
  assertBoundedSnapshot(providerRuns, "unexpired provider sync runs");
  assertBoundedSnapshot(automationRules, "form automation rules");
  assertBoundedSnapshot(
    momentAttentionSendDocs,
    "moment staff attention sends"
  );
  assertBoundedSnapshot(offeredOffers, "offered event offers");

  const eventRows = new Map<string, AttentionSourceRow<EventDocument>>();
  for (const snapshot of [canonicalEvents, compatibilityEvents]) {
    for (const doc of snapshot.docs) {
      eventRows.set(doc.id, sourceRow<EventDocument>(doc));
    }
  }
  assertBoundedAttentionRows([...eventRows.values()], "active events");
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
        sourceRow<EventParticipationDocument>(doc)
      );
    }
  }
  assertBoundedAttentionRows(
    [...participationRows.values()],
    "pending event join requests"
  );

  const currentAutomationRules = automationRules.docs.map((doc) =>
    sourceRow<OrganizerFormAutomationRuleDocument>(doc));
  const currentAutomationRuns = await loadCurrentAutomationRuns(
    db, organizerId, currentAutomationRules
  );

  const organizer = sourceRow<OrganizerDocument>(organizerSnap);
  const ownerUid = organizer.data.ownership?.ownerUserId ??
    organizer.data.ownerUserId ?? organizer.data.hostUserId ?? null;
  const paymentAccounts: OrganizerAttentionSources["paymentAccounts"] = {};
  if (ownerUid) {
    const [razorpay, stripe] = await Promise.all([
      findHostPaymentAccount(db, ownerUid, "razorpay"),
      findHostPaymentAccount(db, ownerUid, "stripe"),
    ]);
    if (razorpay.account) {
      paymentAccounts.razorpay = sourceRowFromSnapshot(
        razorpay.snap,
        razorpay.account
      );
    }
    if (stripe.account) {
      paymentAccounts.stripe = sourceRowFromSnapshot(
        stripe.snap,
        stripe.account
      );
    }
  }

  return {
    organizer,
    events: [...eventRows.values()],
    eventAssistanceCases: openPracticalCases.docs.map((doc) =>
      sourceRow<EventAssistanceCaseDocument>(doc)),
    deliveryReviewWorkItems: deliveryReviewWorkItems.docs.map((doc) =>
      deliveryReviewSourceRow(doc, now.toMillis())),
    eventParticipations: [...participationRows.values()],
    applications: applications.docs.map((doc) =>
      sourceRow<OrganizerApplicationDocument>(doc)),
    providerSyncRuns: providerRuns.docs.map((doc) =>
      sourceRow<ProviderSyncRunDocument>(doc)),
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
        return db.collection("organizerFormAutomationRuns")
          .where("organizerId", "==", organizerId)
          .where("formId", "==", rule.data.formId)
          .where("ruleId", "==", rule.id)
          .where("ruleRevision", "==", rule.data.revision)
          .where("status", "in", [
            "succeeded", "partiallyFailed", "failed", "skipped",
          ])
          .orderBy("updatedAt", "desc")
          .orderBy(admin.firestore.FieldPath.documentId(), "desc")
          .limit(1).get();
      }));
    for (const snapshot of snapshots) {
      for (const doc of snapshot.docs) {
        runs.push(sourceRow<OrganizerFormAutomationRunDocument>(doc));
      }
    }
  }
  return runs;
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
  });
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
  });
}

function deliveryReviewSourceRow(
  snapshot: FirebaseFirestore.DocumentSnapshot,
  nowMillis: number
): AttentionSourceRow<DeliveryReviewAttentionSource> {
  const raw = requireDoc<unknown>(snapshot, "delivery review work item");
  return sourceRowFromSnapshot(
    snapshot,
    parseDeliveryReviewAttentionSource(raw, snapshot.id, nowMillis)
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
    throw new HttpsError(
      "internal",
      "A delivery review work item failed its canonical contract."
    );
  }
  const item = result.value;
  const payload = parseDeliveryWork(item.normalizedPayload, nowMillis);
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
    throw new HttpsError(
      "internal",
      "A delivery review work item has inconsistent runtime evidence."
    );
  }
  return {
    workItemId: item.workItemId,
    revision: item.revision,
    candidateHash: item.candidateHash,
    reviewDueAtMillis,
    payload: payload as DeliveryReviewAttentionSource["payload"],
  };
}

/**
 * Applies only changed rows, resolves stale opens, and returns persisted state.
 */
export async function reconcileOrganizerAttentionProjection(
  db: FirebaseFirestore.Firestore,
  organizerId: string,
  now: FirebaseFirestore.Timestamp,
  desired: DesiredHostAttentionItem[]
): Promise<HostAttentionItem[]> {
  assertBoundedAttentionRows(desired, "derived attention items");
  const collection = db.collection("organizerAttentionItems");
  const openSnapshot = await collection
    .where("organizerId", "==", organizerId)
    .where("status", "==", "open")
    .orderBy("dueAt")
    .orderBy(admin.firestore.FieldPath.documentId())
    .limit(maxAttentionSourceRows + 1)
    .get();
  assertBoundedSnapshot(openSnapshot, "open attention projection");

  const desiredRefs = desired.map((item) => collection.doc(item.attentionId));
  const desiredSnapshots = desiredRefs.length > 0 ?
    await db.getAll(...desiredRefs) : [];
  const existing = new Map<string, OrganizerAttentionItemDocument>();
  for (const doc of [...openSnapshot.docs, ...desiredSnapshots]) {
    if (doc.exists) {
      existing.set(doc.id, requireDoc<OrganizerAttentionItemDocument>(
        doc,
        "OrganizerAttentionItemDocument"
      ));
    }
  }
  const plan = buildOrganizerAttentionProjectionPlan({
    organizerId,
    now,
    desired,
    existing,
    openIds: openSnapshot.docs.map((doc) => doc.id),
  });
  const mutations: ProjectionMutation[] = [
    ...plan.sets.map((entry): ProjectionMutation => ({
      kind: "set",
      ref: collection.doc(entry.attentionId),
      data: entry.document,
    })),
    ...plan.resolutions.map((entry): ProjectionMutation => ({
      kind: "update",
      ref: collection.doc(entry.attentionId),
      data: entry.patch,
    })),
  ];
  await commitProjectionMutations(db, mutations);
  return plan.response;
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
  response: HostAttentionItem[];
}

/** Plans deterministic projection changes separately from Firestore writes. */
export function buildOrganizerAttentionProjectionPlan(params: {
  organizerId: string;
  now: FirebaseFirestore.Timestamp;
  desired: DesiredHostAttentionItem[];
  existing: ReadonlyMap<string, OrganizerAttentionItemDocument>;
  openIds: readonly string[];
}): OrganizerAttentionProjectionPlan {
  const sets: OrganizerAttentionProjectionPlan["sets"] = [];
  const resolutions: OrganizerAttentionProjectionPlan["resolutions"] = [];
  const response: HostAttentionItem[] = [];
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
    response.push(responseItem(item, document));
  }
  for (const attentionId of params.openIds) {
    if (desiredIds.has(attentionId)) continue;
    const current = params.existing.get(attentionId);
    if (!current || current.status !== "open") continue;
    resolutions.push({
      attentionId,
      patch: {
        status: "resolved",
        resolutionVersion: current.resolutionVersion + 1,
        resolvedAt: params.now,
        updatedAt: params.now,
        purgeAt: admin.firestore.Timestamp.fromMillis(
          params.now.toMillis() + resolvedRetentionMillis
        ),
      },
    });
  }
  return {sets, resolutions, response};
}

export function assertBoundedAttentionRows(
  rows: readonly unknown[],
  source: string
): void {
  if (rows.length > maxAttentionSourceRows) {
    throw new HttpsError(
      "resource-exhausted",
      `Host Today cannot safely return a partial ${source} scan.`
    );
  }
}

function assertBoundedSnapshot(
  snapshot: FirebaseFirestore.QuerySnapshot,
  source: string
): void {
  assertBoundedAttentionRows(snapshot.docs, source);
}

function sourceRow<T>(
  snapshot: FirebaseFirestore.DocumentSnapshot
): AttentionSourceRow<T> {
  return sourceRowFromSnapshot(
    snapshot,
    requireDoc<T>(snapshot, "attention source")
  );
}

function sourceRowFromSnapshot<T>(
  snapshot: FirebaseFirestore.DocumentSnapshot,
  data: T
): AttentionSourceRow<T> {
  const updatedAt = snapshot.updateTime ?? snapshot.createTime;
  if (!updatedAt) {
    throw new HttpsError(
      "internal",
      "An attention source is missing Firestore update metadata."
    );
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
    JSON.stringify(current.destination) === JSON.stringify(next.destination) &&
    JSON.stringify(current.context) === JSON.stringify(next.context) &&
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

function responseItem(
  desired: DesiredHostAttentionItem,
  document: OrganizerAttentionItemDocument
): HostAttentionItem {
  const {sourceUpdatedAtMillis, ...item} = desired;
  void sourceUpdatedAtMillis;
  return {
    ...item,
    resolutionVersion: document.resolutionVersion,
    openedAtMillis: document.openedAt.toMillis(),
  };
}

function timestampMillis(
  value: FirebaseFirestore.Timestamp | null
): number | null {
  return value?.toMillis() ?? null;
}

type ProjectionMutation = {
  kind: "set" | "update";
  ref: FirebaseFirestore.DocumentReference;
  data: FirebaseFirestore.DocumentData;
};

async function commitProjectionMutations(
  db: FirebaseFirestore.Firestore,
  mutations: ProjectionMutation[]
): Promise<void> {
  for (let offset = 0; offset < mutations.length; offset += maxBatchWrites) {
    const batch = db.batch();
    for (const mutation of mutations.slice(offset, offset + maxBatchWrites)) {
      if (mutation.kind === "set") batch.set(mutation.ref, mutation.data);
      else batch.update(mutation.ref, mutation.data);
    }
    await batch.commit();
  }
}

export const listOrganizerAttentionItems = onCall(
  appCheckCallableOptionsWithLimits({timeoutSeconds: 60, maxInstances: 20}),
  (request) => listOrganizerAttentionItemsHandler(request)
);
