import {contactFilterSelection,
  contactMatchesFilters} from "./organizerContactFilters";
import {createHash} from "crypto";
import * as admin from "firebase-admin";
import {CallableRequest, HttpsError, onCall} from
  "firebase-functions/v2/https";
import {resolveIndividualCommunicationPlan} from
  "../communications/organizerCommunicationPlan";
import {requireAuth} from "../shared/auth";
import {appCheckCallableOptionsWithLimits} from "../shared/callableOptions";
import type {ArchiveOrganizerSavedAudienceCallablePayload} from
  "../shared/generated/archiveOrganizerSavedAudienceCallablePayload";
import type {
  OrganizerCommunicationPreferenceDocument,
  OrganizerAudienceSummaryDocument,
  OrganizerContactChannelStateDocument,
  OrganizerContactDocument,
  OrganizerContactTagVocabularyDocument,
  OrganizerContactTraitDocument,
  OrganizerSavedAudienceDocument,
} from "../shared/generated/firestoreAdminTypes";
import type {ListOrganizerSavedAudiencesCallablePayload} from
  "../shared/generated/listOrganizerSavedAudiencesCallablePayload";
import type {ListOrganizerSavedAudiencesCallableResponse} from
  "../shared/generated/listOrganizerSavedAudiencesCallableResponse";
import type {OrganizerSavedAudienceCallableResponse} from
  "../shared/generated/organizerSavedAudienceCallableResponse";
import type {PreviewOrganizerSavedAudienceCallablePayload} from
  "../shared/generated/previewOrganizerSavedAudienceCallablePayload";
import type {PreviewOrganizerSavedAudienceCallableResponse} from
  "../shared/generated/previewOrganizerSavedAudienceCallableResponse";
import type {UpsertOrganizerSavedAudienceCallablePayload} from
  "../shared/generated/upsertOrganizerSavedAudienceCallablePayload";
import {
  validateResolveOrganizerAudienceMembersCallablePayload,
} from
  "../shared/generated/validators/resolveOrganizerAudienceMembersInput";
import {
  validateArchiveOrganizerSavedAudienceCallablePayload,
} from
  "../shared/generated/validators/archiveOrganizerSavedAudienceInput";
import {
  validateListOrganizerSavedAudiencesCallablePayload,
} from
  "../shared/generated/validators/listOrganizerSavedAudiencesInput";
import {
  validatePreviewOrganizerSavedAudienceCallablePayload,
} from
  "../shared/generated/validators/previewOrganizerSavedAudienceInput";
import {
  validateUpsertOrganizerSavedAudienceCallablePayload,
} from
  "../shared/generated/validators/upsertOrganizerSavedAudienceInput";
import {
  effectiveOrganizerCommunicationStatus,
  organizerCommunicationPreferenceId,
} from
  "../shared/organizerCommunicationPreferences";
import {requireOrganizerManager} from
  "../shared/organizerManagerAuthority";
import {checkRateLimit} from "../shared/rateLimit";
import {validateCallableWithAjv} from "../shared/validation";
import {hashCanonical, organizerContactChannelStateId} from
  "./organizerCampaignModel";
import {organizerContactTraitMatchesSegment} from "./organizerAudienceModel";
import {resolveOrganizerAudienceCoverage} from
  "./organizerAudienceCoverage";

import {assertSavedAudienceSources, savedAudienceSourceMatches,
  savedAudienceFilterOptions} from "./organizerSavedAudienceSources";
import type {ResolveOrganizerAudienceMembersCallablePayload} from
  "../shared/generated/resolveOrganizerAudienceMembersCallablePayload";
import type {ResolveOrganizerAudienceMembersCallableResponse} from
  "../shared/generated/resolveOrganizerAudienceMembersCallableResponse";
import {resolveStaticAudienceSelection} from
  "./organizerSavedAudienceMembership";
import {savedAudienceMemberPage} from "./organizerSavedAudienceMembers";

export const organizerSavedAudienceDefinitionVersion = 3;
export const organizerSavedAudienceEvaluationLimit = 2500;
const savedAudienceListDefaultLimit = 25;
const getAllChunkSize = 250;

type AudienceDefinition = OrganizerSavedAudienceDocument["definition"];
type AudiencePredicate = AudienceDefinition["predicates"][number];

export interface SavedAudienceEvaluationRow {
  contactId: string;
  contact: OrganizerContactDocument;
  trait: OrganizerContactTraitDocument;
  preference: OrganizerCommunicationPreferenceDocument | null;
  channelState: OrganizerContactChannelStateDocument | null;
  sourcePredicateKeys?: Set<string>;
}

interface SavedAudienceDeps {
  firestore: () => FirebaseFirestore.Firestore;
  checkRateLimit: typeof checkRateLimit;
  now: () => FirebaseFirestore.Timestamp;
}

const defaultDeps: SavedAudienceDeps = {
  firestore: () => admin.firestore(),
  checkRateLimit,
  now: () => admin.firestore.Timestamp.now(),
};

/** Returns one bounded selected-contact projection without per-row lookups. */
export async function resolveOrganizerAudienceMembersHandler(
  request: CallableRequest<unknown>, deps: SavedAudienceDeps = defaultDeps
): Promise<ResolveOrganizerAudienceMembersCallableResponse> {
  const actorUid = requireAuth(request);
  const data = validateCallableWithAjv<
    ResolveOrganizerAudienceMembersCallablePayload
  >(
    request, validateResolveOrganizerAudienceMembersCallablePayload);
  const db = deps.firestore();
  await deps.checkRateLimit(db, actorUid, "resolveOrganizerAudienceMembers", {
    maxRequests: 60, windowMs: 60 * 1000,
  });
  await requireOrganizerManager({db, organizerId: data.organizerId, actorUid});
  return {members: await resolveStaticAudienceSelection(db, data.organizerId,
    data.contactIds, false)};
}

export async function upsertOrganizerSavedAudienceHandler(
  request: CallableRequest<unknown>,
  deps: SavedAudienceDeps = defaultDeps,
): Promise<OrganizerSavedAudienceCallableResponse> {
  const actorUid = requireAuth(request);
  const data =
    validateCallableWithAjv<UpsertOrganizerSavedAudienceCallablePayload>(
      request,
      validateUpsertOrganizerSavedAudienceCallablePayload,
      normalizeSavedAudiencePayload,
    );
  const db = deps.firestore();
  await deps.checkRateLimit(db, actorUid, "upsertOrganizerSavedAudience", {
    maxRequests: 30, windowMs: 60 * 1000,
  });
  await requireOrganizerManager({db, organizerId: data.organizerId, actorUid});
  const definition = canonicalSavedAudienceDefinition(data.definition);
  await assertManualTagsExist(db, data.organizerId, definition);
  await assertSavedAudienceSources(db, data.organizerId, definition);
  const audienceId = data.audienceId ?? savedAudienceId(
    data.organizerId,
    actorUid,
    data.requestId,
  );
  const ref = db.collection("organizerSavedAudiences").doc(audienceId);
  const now = deps.now();
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const existing = snap.data() as OrganizerSavedAudienceDocument | undefined;
    if (existing && existing.organizerId !== data.organizerId) {
      throw new HttpsError("already-exists", "Saved audience id collision.");
    }
    if (existing?.status === "archived") {
      throw new HttpsError(
        "failed-precondition",
        "Archived audiences cannot be edited.",
      );
    }
    if (
      existing && data.expectedRevision != null &&
      existing.revision !== data.expectedRevision
    ) {
      throw new HttpsError(
        "aborted",
        "Saved audience changed. Refresh before editing it.",
      );
    }
    const next: OrganizerSavedAudienceDocument = {
      organizerId: data.organizerId,
      audienceId,
      scope: "organizerCrm",
      name: data.name,
      status: "active",
      definition,
      definitionHash: hashCanonical(definition),
      definitionVersion: organizerSavedAudienceDefinitionVersion,
      revision: (existing?.revision ?? 0) + 1,
      createdByUid: existing?.createdByUid ?? actorUid,
      updatedByUid: actorUid,
      lastPreviewMatchCount: null,
      lastPreviewReachSummary: null,
      lastPreviewAt: null,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      archivedAt: null,
    };
    if (snap.exists) tx.set(ref, next);
    else tx.create(ref, next);
  });
  return savedAudienceResponse(
    (await ref.get()).data() as OrganizerSavedAudienceDocument,
  );
}

export async function listOrganizerSavedAudiencesHandler(
  request: CallableRequest<unknown>,
  deps: SavedAudienceDeps = defaultDeps,
): Promise<ListOrganizerSavedAudiencesCallableResponse> {
  const actorUid = requireAuth(request);
  const data =
    validateCallableWithAjv<ListOrganizerSavedAudiencesCallablePayload>(
      request,
      validateListOrganizerSavedAudiencesCallablePayload,
      normalizeSavedAudiencePayload,
    );
  const db = deps.firestore();
  await deps.checkRateLimit(db, actorUid, "listOrganizerSavedAudiences", {
    maxRequests: 60, windowMs: 60 * 1000,
  });
  await requireOrganizerManager({db, organizerId: data.organizerId, actorUid});
  const limit = data.limit ?? savedAudienceListDefaultLimit;
  const cursor = decodeSavedAudienceCursor(data.cursor ?? null);
  if (
    cursor &&
    (cursor.organizerId !== data.organizerId ||
      cursor.status !== (data.status ?? "active"))
  ) {
    throw new HttpsError("invalid-argument", "Saved audience cursor mismatch.");
  }
  let query = db.collection("organizerSavedAudiences")
    .where("organizerId", "==", data.organizerId)
    .where("status", "==", data.status ?? "active")
    .orderBy("updatedAt", "desc")
    .orderBy(admin.firestore.FieldPath.documentId(), "desc");
  if (cursor) {
    query = query.startAfter(
      admin.firestore.Timestamp.fromMillis(cursor.updatedAtMillis),
      cursor.audienceId,
    );
  }
  const snap = await query.limit(limit + 1).get();
  const visible = snap.docs.slice(0, limit);
  const final = visible.at(-1);
  return {
    organizerId: data.organizerId,
    ...(data.includeFilterOptions ? {filterOptions:
      await savedAudienceFilterOptions(db, data.organizerId)} : {}),
    audiences: visible.map((doc) =>
      savedAudienceResponse(doc.data() as OrganizerSavedAudienceDocument),
    ),
    nextCursor: snap.size > limit && final ? encodeSavedAudienceCursor({
      organizerId: data.organizerId,
      status: data.status ?? "active",
      updatedAtMillis:
        (final.data() as OrganizerSavedAudienceDocument).updatedAt.toMillis(),
      audienceId: final.id,
    }) : null,
  };
}

export async function previewOrganizerSavedAudienceHandler(
  request: CallableRequest<unknown>,
  deps: SavedAudienceDeps = defaultDeps,
): Promise<PreviewOrganizerSavedAudienceCallableResponse> {
  const actorUid = requireAuth(request);
  const data =
    validateCallableWithAjv<PreviewOrganizerSavedAudienceCallablePayload>(
      request,
      validatePreviewOrganizerSavedAudienceCallablePayload,
      normalizeSavedAudiencePayload,
    );
  const db = deps.firestore();
  await deps.checkRateLimit(db, actorUid, "previewOrganizerSavedAudience", {
    maxRequests: 20, windowMs: 60 * 1000,
  });
  await requireOrganizerManager({db, organizerId: data.organizerId, actorUid});
  const ref = db.collection("organizerSavedAudiences").doc(data.audienceId);
  const snap = await ref.get();
  const audience = snap.data() as OrganizerSavedAudienceDocument | undefined;
  assertActiveAudience(audience, data.organizerId);
  assertAudienceRevision(audience!, data.expectedRevision ?? null);
  const now = deps.now();
  const rows = await resolveSavedAudienceRows({
    db,
    organizerId: data.organizerId,
    definition: audience!.definition,
    now,
  });
  const reachSummary = savedAudienceReachSummary(rows);
  const page = savedAudienceMemberPage({
    organizerId: data.organizerId, audienceId: data.audienceId,
    revision: audience!.revision, rows, cursor: data.cursor,
    limit: data.sampleLimit ?? 10,
  });
  await db.runTransaction(async (tx) => {
    const current = (await tx.get(ref)).data() as
      OrganizerSavedAudienceDocument | undefined;
    assertActiveAudience(current, data.organizerId);
    assertAudienceRevision(current!, audience!.revision);
    tx.update(ref, {lastPreviewMatchCount: rows.length,
      lastPreviewReachSummary: reachSummary, lastPreviewAt: now});
  });
  const refreshed: OrganizerSavedAudienceDocument = {
    ...audience!,
    lastPreviewMatchCount: rows.length,
    lastPreviewReachSummary: reachSummary,
    lastPreviewAt: now,
  };
  return {
    audience: savedAudienceResponse(refreshed),
    coverage: "exact",
    matchCount: rows.length,
    reachSummary,
    nextCursor: page.nextCursor,
    sample: page.rows.map((row) => ({
      contactId: row.contactId,
      displayName: row.contact.displayNameOverride ?? row.contact.displayName,
    })),
    evaluatedAtMillis: now.toMillis(),
  };
}

/**
 * Aggregates the shared, server-derived individual communication plan.
 * Saved-audience UI never reinterprets contact, identity, permission, or
 * suppression facts locally. Automatic remains zero until the shared plan
 * exposes a managed campaign route for this intent.
 */
export function savedAudienceReachSummary(
  rows: SavedAudienceEvaluationRow[]
): {
  inCatch: number;
  automatic: number;
  byHand: number;
  unavailable: number;
} {
  const summary = {inCatch: 0, automatic: 0, byHand: 0, unavailable: 0};
  for (const row of rows) {
    if (row.contact.identityState === "merged") {
      summary.unavailable += 1;
      continue;
    }
    const plan = resolveIndividualCommunicationPlan({
      contactId: row.contactId,
      displayName:
        row.contact.displayNameOverride?.trim() || row.contact.displayName,
      linkedUid: row.contact.linkedUid,
      identityState: row.contact.identityState,
      ambiguousCandidateCount:
        row.contact.ambiguousCandidateContactIds.length,
      phoneE164: row.contact.phoneE164,
      email: row.contact.email ?? null,
      whatsappStatus: row.contact.whatsappStatus,
      whatsappAdminSuppressed: row.channelState?.adminSuppressed === true,
    });
    summary[plan.outcome] += 1;
  }
  return summary;
}

export async function archiveOrganizerSavedAudienceHandler(
  request: CallableRequest<unknown>,
  deps: SavedAudienceDeps = defaultDeps,
): Promise<OrganizerSavedAudienceCallableResponse> {
  const actorUid = requireAuth(request);
  const data =
    validateCallableWithAjv<ArchiveOrganizerSavedAudienceCallablePayload>(
      request,
      validateArchiveOrganizerSavedAudienceCallablePayload,
      normalizeSavedAudiencePayload,
    );
  const db = deps.firestore();
  await deps.checkRateLimit(db, actorUid, "archiveOrganizerSavedAudience", {
    maxRequests: 20, windowMs: 60 * 1000,
  });
  await requireOrganizerManager({db, organizerId: data.organizerId, actorUid});
  const ref = db.collection("organizerSavedAudiences").doc(data.audienceId);
  const now = deps.now();
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const audience = snap.data() as OrganizerSavedAudienceDocument | undefined;
    if (!audience || audience.organizerId !== data.organizerId) {
      throw new HttpsError("not-found", "Saved audience not found.");
    }
    assertAudienceRevision(audience, data.expectedRevision);
    if (audience.status !== "archived") {
      tx.update(ref, {
        status: "archived",
        archivedAt: now,
        updatedAt: now,
        updatedByUid: actorUid,
        revision: audience.revision + 1,
      });
    }
  });
  return savedAudienceResponse(
    (await ref.get()).data() as OrganizerSavedAudienceDocument,
  );
}

export async function resolveSavedAudienceRows(params: {
  db: FirebaseFirestore.Firestore;
  organizerId: string;
  definition: AudienceDefinition;
  now: FirebaseFirestore.Timestamp;
}): Promise<SavedAudienceEvaluationRow[]> {
  const summarySnap = await params.db.collection("organizerAudienceSummaries")
    .doc(params.organizerId).get();
  const summary = summarySnap.data() as OrganizerAudienceSummaryDocument |
    undefined;
  const coverage = await resolveOrganizerAudienceCoverage({
    db: params.db,
    organizerId: params.organizerId,
    storedCoverage: summary?.sourceCoverage,
  });
  if (coverage !== "exact") {
    throw new HttpsError(
      "failed-precondition",
      "Customer projection is incomplete. Refresh it before previewing " +
        "this audience.",
    );
  }
  const contactSnap = await params.db.collection("organizerContacts")
    .where("organizerId", "==", params.organizerId)
    .where("deletedAt", "==", null)
    .where("hiddenAt", "==", null)
    .orderBy(admin.firestore.FieldPath.documentId())
    .limit(organizerSavedAudienceEvaluationLimit + 1)
    .get();
  if (contactSnap.size > organizerSavedAudienceEvaluationLimit) {
    throw new HttpsError(
      "resource-exhausted",
      "Audience evaluation exceeds " +
        `${organizerSavedAudienceEvaluationLimit} contacts.`,
    );
  }
  const contacts = contactSnap.docs.map((doc) => ({
    contactId: doc.id,
    contact: doc.data() as OrganizerContactDocument,
  }));
  const traitSnaps = await getAllChunked(
    params.db,
    contacts.map((row) =>
      params.db.collection("organizerContactTraits").doc(row.contactId),
    ),
  );
  const traits = new Map(
    traitSnaps.filter((snap) => snap.exists).map((snap) => [
      snap.id,
      snap.data() as OrganizerContactTraitDocument,
    ]),
  );
  const linkedContacts = contacts.filter((row) => row.contact.linkedUid);
  const preferenceSnaps = await getAllChunked(
    params.db,
    linkedContacts.map((row) => params.db
      .collection("organizerCommunicationPreferences")
      .doc(organizerCommunicationPreferenceId(
        params.organizerId,
        row.contact.linkedUid!,
      ))),
  );
  const preferences = new Map(preferenceSnaps.filter((snap) => snap.exists)
    .map((snap) => {
      const value = snap.data() as OrganizerCommunicationPreferenceDocument;
      return [value.uid, value] as const;
    }));
  const channelSnaps = await getAllChunked(
    params.db,
    contacts.map((row) => params.db
      .collection("organizerContactChannelStates")
      .doc(organizerContactChannelStateId(params.organizerId, row.contactId))),
  );
  const channels = new Map(channelSnaps.filter((snap) => snap.exists)
    .map((snap) => {
      const value = snap.data() as OrganizerContactChannelStateDocument;
      return [value.contactId, value] as const;
    }));
  const sourceMatches = await savedAudienceSourceMatches(
    params.db, params.organizerId, params.definition, params.now.toMillis());
  return contacts.flatMap((row): SavedAudienceEvaluationRow[] => {
    if (row.contact.mergedIntoContactId != null ||
        row.contact.identityState === "merged") return [];
    const trait = traits.get(row.contactId);
    if (!trait || trait.organizerId !== params.organizerId) return [];
    const candidate: SavedAudienceEvaluationRow = {
      ...row,
      trait,
      sourcePredicateKeys: new Set([...sourceMatches.entries()]
        .filter(([, ids]) => ids.has(row.contactId)).map(([key]) => key)),
      preference: row.contact.linkedUid ?
        preferences.get(row.contact.linkedUid) ?? null : null,
      channelState: channels.get(row.contactId) ?? null,
    };
    return savedAudienceDefinitionMatches(
      candidate,
      params.definition,
      params.now,
    ) ? [candidate] : [];
  });
}

export function savedAudienceDefinitionMatches(
  row: SavedAudienceEvaluationRow,
  definition: AudienceDefinition,
  now: FirebaseFirestore.Timestamp,
): boolean {
  const results = definition.predicates.map((predicate) =>
    savedAudiencePredicateMatches(row, predicate, now),
  );
  return definition.join === "all" ?
    results.every(Boolean) : results.some(Boolean);
}

function savedAudiencePredicateMatches(
  row: SavedAudienceEvaluationRow,
  predicate: AudiencePredicate,
  now: FirebaseFirestore.Timestamp,
): boolean {
  switch (predicate.kind) {
  case "spend":
  case "staticMembers":
  case "applicationStatus":
  case "formAnswer":
  case "attendedEvent":
    return row.sourcePredicateKeys?.has(JSON.stringify(predicate)) ?? false;
  case "directoryFilters":
    return contactMatchesFilters(predicate, row.contact.manualTagIds ?? [],
      row.trait);
  case "computedSegment":
    return organizerContactTraitMatchesSegment(
      row.trait,
      predicate.segmentId
    );
  case "manualTag":
    return (row.contact.manualTagIds ?? []).includes(predicate.manualTagId);
  case "attendanceCount":
    return predicate.operator === "atLeast" ?
      row.trait.attendedEventCount >= predicate.eventCount :
      row.trait.attendedEventCount <= predicate.eventCount;
  case "lastSeenWithinDays":
    return now.toMillis() - row.trait.lastSeenAt.toMillis() <=
      predicate.days * 24 * 60 * 60 * 1000;
  case "reachableForIntent":
    return isReachableForOrganizerWhatsappCampaign(row);
  }
}

export function isReachableForOrganizerWhatsappCampaign(
  row: SavedAudienceEvaluationRow,
): boolean {
  const {contact, preference, channelState} = row;
  if (
    contact.identityState !== "verified" ||
    contact.identityConfidence !== "verified" ||
    !contact.linkedUid ||
    !contact.phoneE164 ||
    !/^\+[1-9][0-9]{7,14}$/.test(contact.phoneE164) ||
    !preference ||
    preference.organizerId !== contact.organizerId ||
    preference.uid !== contact.linkedUid ||
    effectiveOrganizerCommunicationStatus(preference, "whatsapp") !==
      "optedIn"
  ) return false;
  return channelState?.adminSuppressed !== true &&
    !["optedOut", "providerBlocked", "invalidEndpoint", "adminSuppressed"]
      .includes(channelState?.suppressionStatus ?? "none");
}

export function canonicalSavedAudienceDefinition(
  definition: AudienceDefinition,
): AudienceDefinition {
  if (definition.predicates.some((p) => p.kind === "staticMembers") &&
      (definition.predicates.length !== 1 || definition.join !== "all")) {
    throw new HttpsError("invalid-argument",
      "Static lists cannot be combined with automatic audience rules.");
  }
  const predicates = definition.predicates
    .map((predicate) => predicate.kind === "staticMembers" ?
      {...predicate, contactIds: [...new Set(predicate.contactIds)].sort()} :
      predicate.kind === "directoryFilters" ?
        {kind: predicate.kind, ...contactFilterSelection(predicate)} :
        {...predicate})
    .sort((left, right) =>
      JSON.stringify(left).localeCompare(JSON.stringify(right)));
  const keys = predicates.map((predicate) => JSON.stringify(predicate));
  if (new Set(keys).size !== keys.length) {
    throw new HttpsError(
      "invalid-argument",
      "Saved audience contains duplicate predicates.",
    );
  }
  return {join: definition.join, predicates};
}

function assertActiveAudience(
  audience: OrganizerSavedAudienceDocument | undefined,
  organizerId: string,
): void {
  if (!audience || audience.organizerId !== organizerId) {
    throw new HttpsError("not-found", "Saved audience not found.");
  }
  if (audience.scope !== "organizerCrm" || audience.status !== "active") {
    throw new HttpsError(
      "failed-precondition",
      "Saved audience is not active reusable CRM authority.",
    );
  }
}

function assertAudienceRevision(
  audience: OrganizerSavedAudienceDocument,
  expectedRevision: number | null,
): void {
  if (expectedRevision != null && audience.revision !== expectedRevision) {
    throw new HttpsError(
      "aborted",
      "Saved audience changed. Refresh before continuing.",
    );
  }
}

async function assertManualTagsExist(
  db: FirebaseFirestore.Firestore,
  organizerId: string,
  definition: AudienceDefinition,
): Promise<void> {
  const requested = definition.predicates.flatMap((predicate) =>
    predicate.kind === "manualTag" ? [predicate.manualTagId] :
      predicate.kind === "directoryFilters" ? predicate.manualTagIds : [],
  );
  if (requested.length === 0) return;
  const snap = await db.collection("organizerContactTagVocabularies")
    .doc(organizerId).get();
  const vocabulary = snap.data() as
    OrganizerContactTagVocabularyDocument | undefined;
  const available = new Set(
    vocabulary?.organizerId === organizerId ?
      vocabulary.tags.map((tag) => tag.tagId) : [],
  );
  if (requested.some((tagId) => !available.has(tagId))) {
    throw new HttpsError(
      "failed-precondition",
      "Saved audience references a missing organizer tag.",
    );
  }
}

export function savedAudienceResponse(
  audience: OrganizerSavedAudienceDocument,
): OrganizerSavedAudienceCallableResponse {
  return {
    organizerId: audience.organizerId,
    audienceId: audience.audienceId,
    scope: audience.scope,
    name: audience.name,
    status: audience.status,
    definition: audience.definition,
    definitionHash: audience.definitionHash,
    definitionVersion: audience.definitionVersion,
    revision: audience.revision,
    lastPreviewMatchCount: audience.lastPreviewMatchCount,
    lastPreviewReachSummary: audience.lastPreviewReachSummary ?? null,
    lastPreviewAtMillis: audience.lastPreviewAt?.toMillis() ?? null,
    createdAtMillis: audience.createdAt.toMillis(),
    updatedAtMillis: audience.updatedAt.toMillis(),
  };
}

function savedAudienceId(
  organizerId: string,
  actorUid: string,
  requestId: string,
): string {
  const digest = createHash("sha256")
    .update(`${organizerId}|${actorUid}|${requestId}`)
    .digest("hex")
    .slice(0, 48);
  return `osa_${digest}`;
}

interface SavedAudienceCursor {
  organizerId: string;
  status: "active" | "archived";
  updatedAtMillis: number;
  audienceId: string;
}

function encodeSavedAudienceCursor(cursor: SavedAudienceCursor): string {
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

function decodeSavedAudienceCursor(value: string | null):
  SavedAudienceCursor | null {
  if (!value) return null;
  try {
    const decoded = JSON.parse(
      Buffer.from(value, "base64url").toString("utf8"),
    ) as SavedAudienceCursor;
    if (
      typeof decoded.organizerId !== "string" ||
      !["active", "archived"].includes(decoded.status) ||
      !Number.isSafeInteger(decoded.updatedAtMillis) ||
      typeof decoded.audienceId !== "string"
    ) throw new Error("invalid");
    return decoded;
  } catch {
    throw new HttpsError("invalid-argument", "Invalid saved audience cursor.");
  }
}

async function getAllChunked(
  db: FirebaseFirestore.Firestore,
  refs: FirebaseFirestore.DocumentReference[],
): Promise<FirebaseFirestore.DocumentSnapshot[]> {
  const snapshots: FirebaseFirestore.DocumentSnapshot[] = [];
  for (let index = 0; index < refs.length; index += getAllChunkSize) {
    snapshots.push(...await db.getAll(
      ...refs.slice(index, index + getAllChunkSize),
    ));
  }
  return snapshots;
}

function normalizeSavedAudiencePayload(data: unknown): unknown {
  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    return data;
  }
  const normalized = {...data as Record<string, unknown>};
  for (const [key, value] of Object.entries(normalized)) {
    if (typeof value === "string") normalized[key] = value.trim();
  }
  if (
    typeof normalized.definition === "object" &&
    normalized.definition !== null &&
    !Array.isArray(normalized.definition)
  ) {
    const definition = {...normalized.definition as Record<string, unknown>};
    if (Array.isArray(definition.predicates)) {
      definition.predicates = definition.predicates.map((value) => {
        if (
          typeof value !== "object" ||
          value === null ||
          Array.isArray(value)
        ) {
          return value;
        }
        return Object.fromEntries(Object.entries(value).map(([key, item]) => [
          key,
          typeof item === "string" ? item.trim() : item,
        ]));
      });
    }
    normalized.definition = definition;
  }
  return normalized;
}

const savedAudienceCallableLimits = {
  timeoutSeconds: 60,
  maxInstances: 30,
  concurrency: 40,
};

export const upsertOrganizerSavedAudience = onCall(
  appCheckCallableOptionsWithLimits(savedAudienceCallableLimits),
  (request) => upsertOrganizerSavedAudienceHandler(request),
);
export const listOrganizerSavedAudiences = onCall(
  appCheckCallableOptionsWithLimits(savedAudienceCallableLimits),
  (request) => listOrganizerSavedAudiencesHandler(request),
);
export const previewOrganizerSavedAudience = onCall(
  appCheckCallableOptionsWithLimits(savedAudienceCallableLimits),
  (request) => previewOrganizerSavedAudienceHandler(request),
);
export const archiveOrganizerSavedAudience = onCall(
  appCheckCallableOptionsWithLimits(savedAudienceCallableLimits),
  (request) => archiveOrganizerSavedAudienceHandler(request),
);

export const resolveOrganizerAudienceMembers = onCall(
  appCheckCallableOptionsWithLimits(savedAudienceCallableLimits),
  (request) => resolveOrganizerAudienceMembersHandler(request),
);
