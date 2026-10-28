import {organizerContactVisibleFields} from "./organizerContactFields";
import {retainedNativePaymentAmount} from "../payments/paymentAmounts";
import {
  contactFilterSelection, contactFilterKey, contactMatchesFilters,
  selectedContactFilterGroups,
} from "./organizerContactFilters";
import type {ContactFilterSelection} from "./organizerContactFilters";
import {createHash} from "crypto";
import * as admin from "firebase-admin";
import {logger} from "firebase-functions";
import {CallableRequest, HttpsError, onCall} from
  "firebase-functions/v2/https";
import {requireAuth} from "../shared/auth";
import {
  appCheckCallableOptionsWithLimits,
  appCheckCallableOptionsWithSecrets,
} from
  "../shared/callableOptions";
import type {GetOrganizerContactDetailCallablePayload} from
  "../shared/generated/getOrganizerContactDetailCallablePayload";
import type {GetOrganizerContactDetailCallableResponse} from
  "../shared/generated/getOrganizerContactDetailCallableResponse";
import type {CreateOrganizerContactCallablePayload} from
  "../shared/generated/createOrganizerContactCallablePayload";
import type {CreateOrganizerContactCallableResponse} from
  "../shared/generated/createOrganizerContactCallableResponse";
import type {CreateOrganizerContactNoteCallablePayload} from
  "../shared/generated/createOrganizerContactNoteCallablePayload";
import type {ExportOrganizerContactsCallablePayload} from
  "../shared/generated/exportOrganizerContactsCallablePayload";
import type {ExportOrganizerContactsCallableResponse} from
  "../shared/generated/exportOrganizerContactsCallableResponse";
import type {MutateOrganizerContactCallablePayload} from
  "../shared/generated/mutateOrganizerContactCallablePayload";
import type {MutateOrganizerContactCallableResponse} from
  "../shared/generated/mutateOrganizerContactCallableResponse";
import type {MutateOrganizerContactNoteCallablePayload} from
  "../shared/generated/mutateOrganizerContactNoteCallablePayload";
import type {OrganizerContactNoteCallableResponse} from
  "../shared/generated/organizerContactNoteCallableResponse";
import type {OrganizerContactOutreachCallableResponse} from
  "../shared/generated/organizerContactOutreachCallableResponse";
import type {RecordOrganizerContactOutreachCallablePayload} from
  "../shared/generated/recordOrganizerContactOutreachCallablePayload";
import type {
  OrganizerAudienceSummaryDocument,
  OrganizerBroadcastSummaryDocument,
  OrganizerCampaignDocument,
  OrganizerCampaignRecipientDocument,
  OrganizerContactDocument,
  OrganizerContactChannelStateDocument,
  OrganizerContactEventEdgeDocument,
  OrganizerContactIdentityLinkDocument,
  OrganizerContactMergeReceiptDocument,
  OrganizerContactNoteDocument,
  OrganizerContactOriginDocument,
  OrganizerContactOutreachDocument,
  OrganizerContactTagVocabularyDocument,
  OrganizerContactTraitDocument,
  OrganizerCommunicationPermissionReceiptDocument,
  OrganizerCommunicationPreferenceDocument,
  OrganizerFormDocument,
  OrganizerFormResponseDocument,
  OrganizerManualSendTaskDocument,
  OrganizerWhatsappMessageDocument,
  PaymentDocument,
  EventDocument,
  MatchDocument,
  ChatMessageDocument,
} from "../shared/generated/firestoreAdminTypes";
import {eventTitleLabel} from "../shared/eventLabels";
import type {ListOrganizerContactsCallablePayload} from
  "../shared/generated/listOrganizerContactsCallablePayload";
import type {ListOrganizerContactsCallableResponse} from
  "../shared/generated/listOrganizerContactsCallableResponse";
import {
  validateExportOrganizerContactsCallablePayload,
} from "../shared/generated/validators/exportOrganizerContactsInput";
import {
  validateCreateOrganizerContactNoteCallablePayload,
} from
  "../shared/generated/validators/createOrganizerContactNoteInput";
import {
  validateCreateOrganizerContactCallablePayload,
} from "../shared/generated/validators/createOrganizerContactInput";
import {
  validateGetOrganizerContactDetailCallablePayload,
} from
  "../shared/generated/validators/getOrganizerContactDetailInput";
import {
  validateListOrganizerContactsCallablePayload,
} from "../shared/generated/validators/listOrganizerContactsInput";
import {
  validateMutateOrganizerContactCallablePayload,
} from "../shared/generated/validators/mutateOrganizerContactInput";
import {
  validateMutateOrganizerContactNoteCallablePayload,
} from
  "../shared/generated/validators/mutateOrganizerContactNoteInput";
import {
  validateRecordOrganizerContactOutreachCallablePayload,
} from
  "../shared/generated/validators/recordOrganizerContactOutreachInput";
import {requireOrganizerManager} from
  "../shared/organizerManagerAuthority";
import {checkRateLimit} from "../shared/rateLimit";
import {validateCallableWithAjv} from "../shared/validation";
import {organizerContactChannelStateId} from "./organizerCampaignModel";
import {
  organizerIdentityEvidenceId,
  organizerIdentityHash,
  organizerPastAttendeeSegmentId,
} from "./organizerAudienceModel";
import {organizerContactIdentityKey} from "./organizerAudienceSecrets";
import {
  OrganizerAudienceSourceCoverage,
  resolveOrganizerAudienceCoverage,
} from "./organizerAudienceCoverage";
import {
  formResponseOrganizerContactOrigin,
  manualOrganizerContactOrigin,
  organizerContactOriginId,
} from "../shared/organizerContactOrigins";
import {organizerCommunicationPreferenceId} from
  "../shared/organizerCommunicationPreferences";

// Creating and changing contacts share one mutation budget.
const mutateContactRateLimit = {maxRequests: 60, windowMs: 60 * 1000};
const defaultContactPageSize = 50;
const maxDetailEvents = 100;
const maxDetailNotes = 100;
const maxDetailOutreach = 100;
const maxOutreachFutureSkewMillis = 5 * 60 * 1000;
const maxDetailSends = 100;
const maxDetailMergeReceipts = 500;
const maxDetailOrigins = 50;
const maxDetailTimelineEntries = 100;
const maxDetailConversationThreads = 20;
const maxDetailReplyMessages = 100;
const maxExportContacts = 2500;
const maxContactPayments = 500;
const maxOrganizerManualTags = 20;
const maxContactManualTags = 5;
const maxSortedCandidateScan = 2500;

/**
 * Contact reads load the CRM projection and its schema validators in the same
 * Functions process. Keep enough startup headroom and cap per-instance work so
 * a transient traffic burst cannot reproduce the 256 MiB production OOM loop.
 */
export const organizerContactReadCallableLimits = {
  timeoutSeconds: 60,
  memory: "512MiB" as const,
  maxInstances: 20,
  concurrency: 20,
};

type ContactSort = NonNullable<ListOrganizerContactsCallablePayload["sort"]>;

interface OrganizerContactsDeps {
  firestore: () => FirebaseFirestore.Firestore;
  checkRateLimit: typeof checkRateLimit;
  identitySecret: () => string;
}

const defaultDeps: OrganizerContactsDeps = {
  firestore: () => admin.firestore(),
  checkRateLimit,
  identitySecret: () => organizerContactIdentityKey.value(),
};

interface ContactCursor {
  version: 2;
  filterKey?: string;
  organizerId: string;
  plan: "people" | "search" | "segment" | "manualTag";
  sort: ContactSort;
  search: string | null;
  value: string;
  contactId: string;
  segmentId: string | null;
  manualTagId: string | null;
}

/** Lists one manager's organizer contacts with indexed, opaque pagination. */
export async function listOrganizerContactsHandler(
  request: CallableRequest<unknown>,
  deps: OrganizerContactsDeps = defaultDeps
): Promise<ListOrganizerContactsCallableResponse> {
  const actorUid = requireAuth(request);
  const data = validateCallableWithAjv<ListOrganizerContactsCallablePayload>(
    request,
    validateListOrganizerContactsCallablePayload,
    normalizeListContactsPayload
  );
  const db = deps.firestore();
  await deps.checkRateLimit(db, actorUid, "listOrganizerContacts", {
    maxRequests: 60, windowMs: 60 * 1000,
  });
  await requireOrganizerManager({
    db,
    organizerId: data.organizerId,
    actorUid,
  });
  const filters = contactFilterSelection(data);
  const filterKey = data.segmentIds?.length || data.manualTagIds?.length ?
    contactFilterKey(filters) : undefined;
  const [summarySnap, tagVocabularySnap] = await Promise.all([
    db.collection("organizerAudienceSummaries").doc(data.organizerId).get(),
    db.collection("organizerContactTagVocabularies")
      .doc(data.organizerId).get(),
  ]);
  const summary = summarySnap.data() as
    OrganizerAudienceSummaryDocument | undefined;
  const sourceCoveragePromise = resolveOrganizerAudienceCoverage({
    db,
    organizerId: data.organizerId,
    storedCoverage: summary?.sourceCoverage,
  });
  const tagVocabulary = tagVocabularySnap.data() as
    OrganizerContactTagVocabularyDocument | undefined;
  const manualTagVocabulary = safeManualTagVocabulary(
    data.organizerId,
    tagVocabulary
  );
  const manualTagsById = new Map(
    manualTagVocabulary.map((tag) => [tag.tagId, tag])
  );
  const limit = data.limit ?? defaultContactPageSize;
  const search = normalizeSearch(data.query ?? null);
  const cursor = decodeContactCursor(data.cursor ?? null);
  const sort = data.sort ?? "lastSeen";
  const exactMatchCountPromise = filterKey ? Promise.resolve(null) :
    exactListContactsMatchCount({
      db,
      organizerId: data.organizerId,
      segmentId: data.segmentId ?? null,
      manualTagId: data.manualTagId ?? null,
      search,
      summary,
    });

  const sortedPage = await listSortedContactDocuments({
    filters,
    filterKey,
    db,
    organizerId: data.organizerId,
    search,
    segmentId: data.segmentId ?? null,
    manualTagId: data.manualTagId ?? null,
    sort,
    cursor,
    limit,
  });
  const contacts = sortedPage.contacts;
  const traitSnaps = contacts.length === 0 ? [] : await db.getAll(
    ...contacts.map((item) => db.collection("organizerContactTraits")
      .doc(item.id))
  );
  const traitsById = new Map(traitSnaps
    .filter((snap) => snap.exists)
    .map((snap) => [snap.id, snap.data() as OrganizerContactTraitDocument]));
  const channelSnaps = contacts.length === 0 ? [] : await db.getAll(
    ...contacts.map((item) => db.collection("organizerContactChannelStates")
      .doc(organizerContactChannelStateId(data.organizerId, item.id)))
  );
  const channelByContactId = new Map(channelSnaps
    .filter((snap) => snap.exists)
    .map((snap) => {
      const state = snap.data() as OrganizerContactChannelStateDocument;
      return [state.contactId, state] as const;
    }));
  const rows = contacts
    .map((item) => safeContactRow(
      item.id,
      item.data,
      traitsById.get(item.id),
      channelByContactId.get(item.id),
      manualTagsById
    ))
    .filter((item): item is NonNullable<typeof item> => item !== null);
  const pageRows = rows;
  const finalContact = contacts.at(-1);
  const nextCursor = sortedPage.hasMore && finalContact ?
    encodeContactCursor({
      version: 2,
      ...(filterKey ? {filterKey} : {}),
      organizerId: data.organizerId,
      plan: contactQueryPlan({
        filters,
        segmentId: data.segmentId ?? null,
        manualTagId: data.manualTagId ?? null,
        search,
      }),
      sort,
      search,
      value: sortedPage.lastValue!,
      contactId: finalContact.id,
      segmentId: data.segmentId ?? null,
      manualTagId: data.manualTagId ?? null,
    }) : null;
  const exactMatchCount = await exactMatchCountPromise;
  const countResult = listContactsMatchCountResult(
    sortedPage.matchCount ?? exactMatchCount,
    pageRows.length
  );
  const sourceCoverage = await sourceCoveragePromise;

  return {
    organizerId: data.organizerId,
    contacts: pageRows,
    nextCursor,
    ...countResult,
    manualTagVocabulary,
    sourceCoverage,
    projectionVersion: summary?.projectionVersion ?? 1,
  };
}

export function listContactsMatchCountResult(
  exactMatchCount: number | null,
  visiblePageCount: number
): Pick<ListOrganizerContactsCallableResponse,
  "matchCount" | "matchCountCoverage"> {
  return exactMatchCount === null ? {
    matchCount: visiblePageCount,
    matchCountCoverage: "atLeast",
  } : {
    matchCount: exactMatchCount,
    matchCountCoverage: "exact",
  };
}

/**
 * Partial summary totals are lower bounds and cannot label a directory exact.
 */
export function exactContactCountFromSummary(
  summary: OrganizerAudienceSummaryDocument | undefined,
): number | null {
  return summary?.sourceCoverage === "exact" ? summary.contactCount : null;
}

async function exactListContactsMatchCount(params: {
  db: FirebaseFirestore.Firestore;
  organizerId: string;
  segmentId: OrganizerContactTraitDocument["segmentIds"][number] | null;
  manualTagId: string | null;
  search: string | null;
  summary: OrganizerAudienceSummaryDocument | undefined;
}): Promise<number | null> {
  if (params.search) return null;
  if (params.manualTagId) {
    const snapshot = await params.db.collection("organizerContacts")
      .where("organizerId", "==", params.organizerId)
      .where("deletedAt", "==", null)
      .where("hiddenAt", "==", null)
      .where("manualTagIds", "array-contains", params.manualTagId)
      .count()
      .get();
    return snapshot.data().count;
  }
  const summaryCount = exactContactCountFromSummary(params.summary);
  if (!params.segmentId && summaryCount !== null) {
    return summaryCount;
  }
  if (!params.segmentId) {
    const snapshot = await params.db.collection("organizerContacts")
      .where("organizerId", "==", params.organizerId)
      .where("deletedAt", "==", null)
      .where("hiddenAt", "==", null)
      .count()
      .get();
    return snapshot.data().count;
  }
  let query = params.db.collection("organizerContactTraits")
    .where("organizerId", "==", params.organizerId);
  query = params.segmentId === organizerPastAttendeeSegmentId ?
    query.where("attendedEventCount", ">", 0) :
    query.where("segmentIds", "array-contains", params.segmentId);
  const snapshot = await query.count().get();
  return snapshot.data().count;
}

/** Creates an organizer CRM contact without inventing identity or consent. */
export async function createOrganizerContactHandler(
  request: CallableRequest<unknown>,
  deps: OrganizerContactsDeps = defaultDeps
): Promise<CreateOrganizerContactCallableResponse> {
  const actorUid = requireAuth(request);
  const data = validateCallableWithAjv<CreateOrganizerContactCallablePayload>(
    request,
    validateCreateOrganizerContactCallablePayload,
    normalizeCreateContactPayload
  );
  const db = deps.firestore();
  await deps.checkRateLimit(db, actorUid, "mutateOrganizerContact",
    mutateContactRateLimit);
  await requireOrganizerManager({db, organizerId: data.organizerId, actorUid});
  return createOrganizerContactRecord({
    db,
    organizerId: data.organizerId,
    actorUid,
    displayName: data.displayName,
    phoneE164: data.phoneE164 ?? null,
    email: data.email ?? null,
    initialNote: data.initialNote ?? null,
    identitySecret: data.phoneE164 || data.email ? deps.identitySecret() : null,
    origin: {kind: "hostManual"},
  });
}

export type OrganizerContactCreationOrigin =
  | {kind: "hostManual"}
  | {
    kind: "hostFormResponse" | "hostApplicationResponse";
    formId: string;
    responseId: string;
    observedAt: FirebaseFirestore.Timestamp;
  };

/** Creates one optionally deterministic organizer-only CRM record. */
export interface OrganizerContactRecordInput {
  db: FirebaseFirestore.Firestore;
  organizerId: string;
  actorUid: string;
  displayName: string;
  phoneE164: string | null;
  email: string | null;
  initialNote: string | null;
  identitySecret: string | null;
  origin: OrganizerContactCreationOrigin;
  contactId?: string;
  now?: FirebaseFirestore.Timestamp;
}


export async function createOrganizerContactRecord(
  params: OrganizerContactRecordInput
): Promise<CreateOrganizerContactCallableResponse> {
  const initialSourceCoverage = await resolveOrganizerAudienceCoverage({
    db: params.db, organizerId: params.organizerId, storedCoverage: null,
  });
  return params.db.runTransaction((transaction) =>
    createOrganizerContactInTransaction({...params, transaction,
      initialSourceCoverage}));
}

/** Shared writer lets admission commit the contact and review atomically. */
export async function createOrganizerContactInTransaction(
  params: OrganizerContactRecordInput & {
    transaction: FirebaseFirestore.Transaction;
    initialSourceCoverage: OrganizerAudienceSummaryDocument["sourceCoverage"];
  }
): Promise<CreateOrganizerContactCallableResponse> {
  const now = params.now ?? admin.firestore.Timestamp.now();
  const {transaction: tx, initialSourceCoverage} = params;
  const contactRef = params.contactId ?
    params.db.collection("organizerContacts").doc(params.contactId) :
    params.db.collection("organizerContacts").doc();
  const traitRef = params.db.collection("organizerContactTraits")
    .doc(contactRef.id);
  const summaryRef = params.db.collection("organizerAudienceSummaries")
    .doc(params.organizerId);
  const identityEvidenceId = params.origin.kind === "hostManual" ?
    manualContactEvidenceAttendeeId(contactRef.id) :
    formContactEvidenceId(params.origin.responseId);
  const origin = params.origin.kind === "hostManual" ?
    manualOrganizerContactOrigin({
      organizerId: params.organizerId,
      contactId: contactRef.id,
      actorUid: params.actorUid,
      now,
    }) :
    formResponseOrganizerContactOrigin({
      organizerId: params.organizerId,
      contactId: contactRef.id,
      formId: params.origin.formId,
      responseId: params.origin.responseId,
      actorUid: params.actorUid,
      observedAt: params.origin.observedAt,
      now,
    });
  if (params.origin.kind === "hostApplicationResponse") {
    origin.sourceEntityKind = "hostApplicationResponse";
  }
  const originRef = params.db.collection("organizerContactOrigins").doc(
    organizerContactOriginId({
      organizerId: origin.organizerId,
      sourceKind: origin.sourceKind,
      sourceEntityKind: origin.sourceEntityKind,
      sourceEntityId: origin.sourceEntityId,
    })
  );
  const revision = Math.max(1, now.toMillis());
  const trait: OrganizerContactTraitDocument = {
    organizerId: params.organizerId,
    contactId: contactRef.id,
    expectedEventCount: 0,
    attendedEventCount: 0,
    cancelledEventCount: 0,
    noShowCount: 0,
    importedEventCount: 0,
    referredRegistrationCount: 0,
    referredCheckedInCount: 0,
    referredCheckedIn365DayCount: 0,
    linkedAccount: false,
    firstSeenAt: now,
    lastSeenAt: now,
    firstAttendedAt: null,
    lastAttendedAt: null,
    attendanceRate: null,
    segmentIds: ["new_to_organizer"],
    definitionVersion: 2,
    whatsappStatus: "unknown",
    smsStatus: "unknown",
    sourceCoverage: "exact",
    projectionVersion: 1,
    computedAt: now,
  };
  const contact: OrganizerContactDocument = {
    organizerId: params.organizerId,
    displayName: params.displayName,
    displayNameOverride: null,
    searchName: params.displayName.toLocaleLowerCase("en"),
    linkedUid: null,
    phoneE164: params.phoneE164,
    email: params.email,
    identityState: "unlinked",
    identityConfidence: params.phoneE164 || params.email ? "proposed" :
      "eventOnly",
    primarySource: params.origin.kind === "hostManual" ?
      "hostManual" : "hostForm",
    ambiguousCandidateContactIds: [],
    firstSeenAt: now,
    lastSeenAt: now,
    sourceCount: 1,
    whatsappStatus: "unknown",
    smsStatus: "unknown",
    manualTagIds: [],
    revision,
    mergedIntoContactId: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    hiddenAt: null,
    hiddenBy: null,
    hiddenTraitSnapshot: null,
  };
  const identityLinks = proposedContactIdentityLinks({
    db: params.db,
    organizerId: params.organizerId,
    contactId: contactRef.id,
    evidenceId: identityEvidenceId,
    source: params.origin.kind === "hostManual" ? "hostManual" : "hostForm",
    phoneE164: params.phoneE164,
    email: params.email,
    secret: params.identitySecret,
    now,
  });
  const initialNoteRef = params.initialNote ?
    params.db.collection("organizerContactNotes").doc() : null;
  const initialNote: OrganizerContactNoteDocument | null =
    params.initialNote ? {
      organizerId: params.organizerId,
      contactId: contactRef.id,
      authorUid: params.actorUid,
      body: params.initialNote,
      revision,
      createdAt: now,
      updatedAt: now,
      updatedByUid: params.actorUid,
    } : null;

  const [summarySnap, contactSnap, originSnap] = await Promise.all([
    tx.get(summaryRef),
    tx.get(contactRef),
    tx.get(originRef),
  ]);
  if (contactSnap.exists) {
    const existing = contactSnap.data() as OrganizerContactDocument;
    if (existing.organizerId !== params.organizerId) {
      throw new HttpsError("already-exists", "Contact identity is in use.");
    }
    if (existing.deletedAt !== null || existing.hiddenAt !== null ||
        existing.mergedIntoContactId !== null) {
      throw new HttpsError("failed-precondition",
        "Contact is no longer active.");
    }
    if (!originSnap.exists) {
      tx.create(originRef, origin);
      tx.update(contactRef, {
        sourceCount: admin.firestore.FieldValue.increment(1),
        updatedAt: now,
        revision: Math.max(existing.revision + 1, revision),
      });
    }
    return {
      organizerId: params.organizerId, contactId: contactRef.id,
      displayName: existing.displayNameOverride ?? existing.displayName,
      revision: originSnap.exists ? existing.revision :
        Math.max(existing.revision + 1, revision),
    };
  }
  tx.create(contactRef, contact);
  tx.create(traitRef, trait);
  tx.create(originRef, origin);
  for (const link of identityLinks) tx.create(link.ref, link.data);
  if (initialNoteRef && initialNote) tx.create(initialNoteRef, initialNote);
  tx.set(summaryRef, summaryWithTrait(
    params.organizerId,
    summarySnap.data() as OrganizerAudienceSummaryDocument | undefined,
    trait,
    now,
    initialSourceCoverage,
  ));

  return {
    organizerId: params.organizerId,
    contactId: contactRef.id,
    displayName: params.displayName,
    revision,
  };
}

/** Returns one manager-only contact record and its bounded event timeline. */
export async function getOrganizerContactDetailHandler(
  request: CallableRequest<unknown>,
  deps: OrganizerContactsDeps = defaultDeps
): Promise<GetOrganizerContactDetailCallableResponse> {
  const actorUid = requireAuth(request);
  const data = validateCallableWithAjv<
    GetOrganizerContactDetailCallablePayload
  >(
    request,
    validateGetOrganizerContactDetailCallablePayload,
    normalizeContactDetailPayload
  );
  const includeHistory = data.includeHistory !== false;
  const historyQuery = <T>(read: () => Promise<T>): Promise<T | null> =>
    includeHistory ? read() : Promise.resolve(null);
  const db = deps.firestore();
  await deps.checkRateLimit(db, actorUid, "getOrganizerContactDetail", {
    maxRequests: 60, windowMs: 60 * 1000,
  });
  await requireOrganizerManager({
    db,
    organizerId: data.organizerId,
    actorUid,
  });
  const contactRef = db.collection("organizerContacts").doc(data.contactId);
  const traitRef = db.collection("organizerContactTraits").doc(data.contactId);
  const channelRef = db.collection("organizerContactChannelStates").doc(
    organizerContactChannelStateId(data.organizerId, data.contactId)
  );
  const [
    contactSnap,
    traitSnap,
    eventSnap,
    channelSnap,
    noteSnap,
    recipientSnap,
    broadcastSnap,
    tagVocabularySnap,
    mergeReceiptSnap,
    originSnap,
    manualSendTaskSnap,
    whatsappMessageSnap,
    outreachSnap,
  ] = await Promise.all([
    contactRef.get(),
    traitRef.get(),
    db.collection("organizerContactEventEdges")
      .where("contactId", "==", data.contactId)
      .orderBy("eventStartAt", "desc")
      .limit(maxDetailEvents + 1)
      .get(),
    channelRef.get(),
    optionalContactQuery(
      db.collection("organizerContactNotes")
        .where("organizerId", "==", data.organizerId)
        .where("contactId", "==", data.contactId)
        .orderBy("createdAt", "desc")
        .orderBy(admin.firestore.FieldPath.documentId(), "desc")
        .limit(maxDetailNotes + 1)
        .get(),
      "notes",
      data.organizerId,
      data.contactId
    ),
    historyQuery(() => optionalContactQuery(
      db.collection("organizerCampaignRecipients")
        .where("organizerId", "==", data.organizerId)
        .where("contactId", "==", data.contactId)
        .orderBy("createdAt", "desc")
        .orderBy(admin.firestore.FieldPath.documentId(), "desc")
        .limit(maxDetailSends + 1)
        .get(),
      "campaign sends",
      data.organizerId,
      data.contactId
    )),
    historyQuery(() => optionalContactQuery(
      db.collection("organizerBroadcastSummaries")
        .where("recipientContactIds", "array-contains", data.contactId)
        .get(),
      "announcement sends",
      data.organizerId,
      data.contactId
    )),
    db.collection("organizerContactTagVocabularies")
      .doc(data.organizerId).get(),
    historyQuery(() => db.collection("organizerContactMergeReceipts")
      .where("organizerId", "==", data.organizerId)
      .where("survivorContactId", "==", data.contactId)
      .orderBy("createdAt", "desc")
      .orderBy(admin.firestore.FieldPath.documentId(), "desc")
      .limit(maxDetailMergeReceipts)
      .get()),
    optionalContactQuery(
      db.collection("organizerContactOrigins")
        .where("organizerId", "==", data.organizerId)
        .where("currentContactId", "==", data.contactId)
        .orderBy("observedAt", "desc")
        .orderBy(admin.firestore.FieldPath.documentId(), "desc")
        .limit(maxDetailOrigins + 1)
        .get(),
      "contact provenance",
      data.organizerId,
      data.contactId
    ),
    historyQuery(() => optionalContactQuery(
      db.collection("organizerManualSendTasks")
        .where("organizerId", "==", data.organizerId)
        .where("contactId", "==", data.contactId)
        .orderBy("updatedAt", "desc")
        .orderBy(admin.firestore.FieldPath.documentId(), "desc")
        .limit(maxDetailSends + 1)
        .get(),
      "manual sends",
      data.organizerId,
      data.contactId
    )),
    historyQuery(() => optionalContactQuery(
      db.collection("organizerWhatsappMessages")
        .where("organizerId", "==", data.organizerId)
        .where("contactId", "==", data.contactId)
        .orderBy("occurredAt", "desc")
        .orderBy(admin.firestore.FieldPath.documentId(), "desc")
        .limit(maxDetailReplyMessages + 1)
        .get(),
      "managed WhatsApp replies",
      data.organizerId,
      data.contactId
    )),
    historyQuery(() => optionalContactQuery(
      db.collection("organizerContactOutreach")
        .where("organizerId", "==", data.organizerId)
        .where("contactId", "==", data.contactId)
        .orderBy("occurredAt", "desc")
        .orderBy(admin.firestore.FieldPath.documentId(), "desc")
        .limit(maxDetailOutreach + 1)
        .get(),
      "contact outreach",
      data.organizerId,
      data.contactId
    )),
  ]);
  const contact = contactSnap.data() as OrganizerContactDocument | undefined;
  const traits = traitSnap.data() as OrganizerContactTraitDocument | undefined;
  if (!contact || contact.organizerId !== data.organizerId ||
      contact.deletedAt !== null || contact.hiddenAt != null ||
      contact.identityState === "merged" ||
      !traits || traits.organizerId !== data.organizerId) {
    throw new HttpsError("not-found", "Audience contact not found.");
  }
  const eventDocuments = eventSnap.docs.slice(0, maxDetailEvents)
    .map((doc) => doc.data() as OrganizerContactEventEdgeDocument);
  const uniqueEventIds = [
    ...new Set(eventDocuments.map((edge) => edge.eventId)),
  ];
  const [hydratedEventSnaps, revenueResult, permission] = await Promise.all([
    uniqueEventIds.length === 0 ? Promise.resolve([]) : db.getAll(
      ...uniqueEventIds.map((eventId) => db.collection("events").doc(eventId))
    ),
    contactRevenue({
      db,
      contact,
      eventEdges: eventDocuments,
      eventHistoryTruncated: eventSnap.size > maxDetailEvents,
    }),
    contactWhatsappPermission({
      db,
      organizerId: data.organizerId,
      contact,
      traits,
    }),
  ]);
  const hydratedEvents = new Map(hydratedEventSnaps
    .filter((snapshot) => snapshot.exists)
    .map((snapshot) => [
      snapshot.id,
      snapshot.data() as EventDocument,
    ]));
  const events = eventDocuments.map((doc) => eventDetailRow(
    doc,
    revenueResult.byEvent.get(doc.eventId) ?? [],
    hydratedEvents.get(doc.eventId),
  ));
  const originDocuments = (originSnap?.docs ?? [])
    .slice(0, maxDetailOrigins)
    .map((document) => ({
      id: document.id,
      data: document.data() as OrganizerContactOriginDocument,
    }))
    .filter((origin) => origin.data.organizerId === data.organizerId &&
      origin.data.currentContactId === data.contactId);
  const provenance = await hydrateContactProvenance({
    db,
    organizerId: data.organizerId,
    origins: originDocuments,
    hydratedEvents,
  });
  const tagVocabulary = safeManualTagVocabulary(
    data.organizerId,
    tagVocabularySnap.data() as
      OrganizerContactTagVocabularyDocument | undefined
  );
  const manualTagsById = new Map(
    tagVocabulary.map((tag) => [tag.tagId, tag])
  );
  const notes = (noteSnap?.docs ?? []).slice(0, maxDetailNotes)
    .map((doc) => noteDetailRow(
      doc.id,
      doc.data() as OrganizerContactNoteDocument
    ))
    .filter((note): note is NonNullable<typeof note> => note !== null);
  const campaignSendsResult = recipientSnap === null ? null :
    await optionalContactHistory(
      contactCampaignSendHistory({
        db,
        organizerId: data.organizerId,
        recipientDocuments: recipientSnap.docs.slice(0, maxDetailSends).map(
          (doc) => ({
            id: doc.id,
            data: doc.data() as OrganizerCampaignRecipientDocument,
          })
        ),
      }),
      "campaign send hydration",
      data.organizerId,
      data.contactId
    );
  const campaignSends = campaignSendsResult ?? [];
  const broadcastSends = contactBroadcastSendHistory({
    organizerId: data.organizerId,
    contactId: data.contactId,
    summaries: (broadcastSnap?.docs ?? []).map((doc) =>
      doc.data() as OrganizerBroadcastSummaryDocument),
  });
  const allSends = [...campaignSends, ...broadcastSends].sort(
    (left, right) => sendHistoryMillis(right) - sendHistoryMillis(left),
  );
  const sends = allSends.slice(0, maxDetailSends);
  const manualSendTasks = (manualSendTaskSnap?.docs ?? [])
    .slice(0, maxDetailSends)
    .map((document) => document.data() as OrganizerManualSendTaskDocument)
    .filter((task) => task.organizerId === data.organizerId &&
      task.contactId === data.contactId);
  const whatsappMessages = (whatsappMessageSnap?.docs ?? [])
    .slice(0, maxDetailReplyMessages)
    .map((document) => document.data() as OrganizerWhatsappMessageDocument)
    .filter((message) => message.organizerId === data.organizerId &&
      message.contactId === data.contactId);
  const outreach = (outreachSnap?.docs ?? [])
    .slice(0, maxDetailOutreach)
    .map((document) => ({
      id: document.id,
      data: document.data() as OrganizerContactOutreachDocument,
    }))
    .filter((record) => record.data.organizerId === data.organizerId &&
      record.data.contactId === data.contactId);
  const catchRepliesResult = await historyQuery(() => optionalContactQuery(
    contactCatchReplyTimeline({
      db,
      organizerId: data.organizerId,
      linkedUid: contact.linkedUid,
    }),
    "Catch conversation replies",
    data.organizerId,
    data.contactId
  ));
  const formTimeline = includeHistory ? await contactFormTimeline({
    db,
    organizerId: data.organizerId,
    origins: originDocuments,
    formTitles: provenance.formTitles,
  }) : {entries: [], unavailable: true, truncated: false};
  const timelineResult = buildContactTimeline({
    forms: formTimeline.entries,
    events: includeHistory ? events : [],
    sends,
    manualSendTasks,
    whatsappMessages,
    catchReplies: catchRepliesResult?.entries ?? [],
    formsCoverage: originSnap === null || formTimeline.unavailable ?
      "unavailable" : originSnap.size > maxDetailOrigins ||
        formTimeline.truncated || traits.sourceCoverage !== "exact" ?
        "partial" : "exact",
    eventsCoverage: !includeHistory ? "unavailable" :
      eventSnap.size > maxDetailEvents ||
      traits.sourceCoverage !== "exact" ? "partial" : "exact",
    sendsCoverage: recipientSnap === null || broadcastSnap === null ||
      campaignSendsResult === null || manualSendTaskSnap === null ?
      "unavailable" : (recipientSnap.size > maxDetailSends ||
        allSends.length > maxDetailSends ||
        manualSendTaskSnap.size > maxDetailSends) ? "partial" : "exact",
    repliesCoverage: whatsappMessageSnap === null ||
      catchRepliesResult === null ? "unavailable" : "partial",
    repliesTruncated: (whatsappMessageSnap?.size ?? 0) >
      maxDetailReplyMessages || (catchRepliesResult?.truncated ?? false),
    outreach,
    outreachCoverage: outreachSnap === null ? "unavailable" :
      outreachSnap.size > maxDetailOutreach ? "partial" : "exact",
  });
  const activeMerges = await activeMergeRows({
    db,
    organizerId: data.organizerId,
    receipts: (mergeReceiptSnap?.docs ?? []).map((document) => ({
      id: document.id,
      data: document.data() as OrganizerContactMergeReceiptDocument,
    })),
  });
  return {
    historyLoaded: includeHistory,
    organizerId: data.organizerId,
    contactId: data.contactId,
    ...organizerContactVisibleFields(contact),
    linkedAccount: contact.linkedUid !== null,
    identityState: activeIdentityState(contact.identityState),
    identityConfidence: contact.identityConfidence,
    contactDetailsEditable: manualContactDetailsEditable(contact),
    ambiguousCandidateContactIds: contact.ambiguousCandidateContactIds,
    whatsappAdminSuppressed:
      (channelSnap.data() as OrganizerContactChannelStateDocument | undefined)
        ?.adminSuppressed === true,
    whatsappPermission: permission,
    origins: provenance.origins,
    originsTruncated: (originSnap?.size ?? 0) > maxDetailOrigins,
    traits: {
      expectedEventCount: traits.expectedEventCount,
      attendedEventCount: traits.attendedEventCount,
      cancelledEventCount: traits.cancelledEventCount,
      noShowCount: traits.noShowCount,
      importedEventCount: traits.importedEventCount,
      attendanceRate: traits.attendanceRate,
      segmentIds: traits.segmentIds,
      whatsappStatus: traits.whatsappStatus,
      smsStatus: traits.smsStatus,
      sourceCoverage: traits.sourceCoverage,
      ...(traits.membership ? {membership: traits.membership} : {}),
    },
    revenue: revenueResult.revenue,
    events,
    eventsTruncated: eventSnap.size > maxDetailEvents,
    manualTags: manualTagsForContact(contact, manualTagsById),
    manualTagVocabulary: tagVocabulary,
    notes,
    notesTruncated: (noteSnap?.size ?? 0) > maxDetailNotes,
    notesCoverage: noteSnap === null ? "unavailable" : "exact",
    sends,
    sendsTruncated:
      (recipientSnap?.size ?? 0) > maxDetailSends ||
      allSends.length > maxDetailSends,
    sendsCoverage:
      recipientSnap === null || broadcastSnap === null ||
      campaignSendsResult === null ? "unavailable" : "exact",
    timeline: timelineResult.timeline,
    timelineTruncated: timelineResult.truncated,
    timelineCoverage: timelineResult.coverage,
    activeMerges,
    revision: contact.revision,
  };
}

type ContactTimelineEntry =
  GetOrganizerContactDetailCallableResponse["timeline"][number];
type ContactReplyTimelineEntry = Extract<
  ContactTimelineEntry,
  {kind: "reply"}
>;
type ContactHistoryCoverage =
  GetOrganizerContactDetailCallableResponse["timelineCoverage"]["forms"];

interface HydratedContactProvenance {
  origins: GetOrganizerContactDetailCallableResponse["origins"];
  formTitles: Map<string, string>;
}

async function hydrateContactProvenance(params: {
  db: FirebaseFirestore.Firestore;
  organizerId: string;
  origins: Array<{id: string; data: OrganizerContactOriginDocument}>;
  hydratedEvents: Map<string, EventDocument>;
}): Promise<HydratedContactProvenance> {
  const formIds = [...new Set(params.origins
    .map((origin) => origin.data.formId)
    .filter((formId): formId is string => formId !== null))];
  const missingEventIds = [...new Set(params.origins
    .map((origin) => origin.data.eventId)
    .filter((eventId): eventId is string => eventId !== null &&
      !params.hydratedEvents.has(eventId)))];
  const [formSnapshots, eventSnapshots] = await Promise.all([
    formIds.length === 0 ? Promise.resolve([]) : optionalContactQuery(
      params.db.getAll(...formIds.map((formId) =>
        params.db.collection("organizerForms").doc(formId))),
      "provenance forms",
      params.organizerId,
      params.origins[0]?.data.currentContactId ?? "unknown"
    ).then((snapshots) => snapshots ?? []),
    missingEventIds.length === 0 ? Promise.resolve([]) : optionalContactQuery(
      params.db.getAll(...missingEventIds.map((eventId) =>
        params.db.collection("events").doc(eventId))),
      "provenance events",
      params.organizerId,
      params.origins[0]?.data.currentContactId ?? "unknown"
    ).then((snapshots) => snapshots ?? []),
  ]);
  const forms = new Map(formSnapshots
    .filter((snapshot) => snapshot.exists)
    .map((snapshot) => [
      snapshot.id,
      snapshot.data() as OrganizerFormDocument,
    ] as const)
    .filter(([, form]) => form.organizerId === params.organizerId));
  const formTitles = new Map([...forms.entries()]
    .map(([formId, form]) => [formId, form.title] as const));
  const events = new Map(params.hydratedEvents);
  for (const snapshot of eventSnapshots) {
    const event = snapshot.data() as EventDocument | undefined;
    if (event?.organizerId === params.organizerId) {
      events.set(snapshot.id, event);
    }
  }
  return {
    origins: params.origins.map((origin) => ({
      originId: origin.id,
      sourceKind: origin.data.sourceKind,
      sourceEntityKind: origin.data.sourceEntityKind,
      formId: origin.data.formId,
      formTitle: origin.data.formId === null ? null :
        formTitles.get(origin.data.formId) ?? null,
      eventId: origin.data.eventId,
      eventTitle: origin.data.eventId === null ? null :
        events.has(origin.data.eventId) ?
          eventTitleLabel(events.get(origin.data.eventId)!) : null,
      observedAtMillis: origin.data.observedAt.toMillis(),
    })),
    formTitles,
  };
}

async function contactWhatsappPermission(params: {
  db: FirebaseFirestore.Firestore;
  organizerId: string;
  contact: OrganizerContactDocument;
  traits: OrganizerContactTraitDocument;
}): Promise<GetOrganizerContactDetailCallableResponse["whatsappPermission"]> {
  const unavailable = {
    status: params.traits.whatsappStatus,
    evidenceStatus: "unavailable" as const,
    receiptId: null,
    source: null,
    sourceFormId: null,
    sourceFormTitle: null,
    decisionAtMillis: null,
    identityStrength: null,
  };
  if (params.contact.linkedUid === null) return unavailable;
  const preferenceSnapshot = await optionalContactQuery(
    params.db.collection("organizerCommunicationPreferences")
      .doc(organizerCommunicationPreferenceId(
        params.organizerId,
        params.contact.linkedUid
      )).get(),
    "WhatsApp permission projection",
    params.organizerId,
    params.contact.linkedUid
  );
  const preference = preferenceSnapshot?.data() as
    OrganizerCommunicationPreferenceDocument | undefined;
  if (!preference || preference.organizerId !== params.organizerId ||
      preference.uid !== params.contact.linkedUid) {
    return unavailable;
  }
  const channel = preference.whatsapp;
  const purposes: NonNullable<
    GetOrganizerContactDetailCallableResponse["whatsappPermission"]["purposes"]
  > = {};
  for (const purpose of ["eventOperations", "marketing"] as const) {
    const scoped = preference.whatsappPurposes?.[purpose];
    if (!scoped) continue;
    const scopedReceipt = scoped.currentReceiptId === null ? null :
      await optionalContactQuery(
        params.db.collection("organizerCommunicationPermissionReceipts")
          .doc(scoped.currentReceiptId).get(),
        "WhatsApp purpose receipt", params.organizerId,
        params.contact.linkedUid
      );
    const evidence = scopedReceipt?.data() as
      OrganizerCommunicationPermissionReceiptDocument | undefined;
    const belongsToContact = evidence?.organizerId === params.organizerId &&
      evidence.uid === params.contact.linkedUid &&
      evidence.channel === "whatsapp";
    const completeGrant = scoped.status === "optedIn" &&
      scoped.evidenceStatus === "complete" && belongsToContact &&
      evidence?.decision === "optedIn" && evidence.purpose === purpose &&
      evidence.endpointE164 === scoped.endpointE164 &&
      evidence.sourceResponseId === scoped.sourceResponseId &&
      evidence.source === scoped.source &&
      evidence.termsVersion === scoped.termsVersion &&
      evidence.evidenceStatus === "complete" &&
      typeof evidence.consentCopyHash === "string" &&
      /^[a-f0-9]{64}$/u.test(evidence.consentCopyHash) &&
      evidence.grantedAt !== null &&
      evidence.revokedAt === null;
    const broadStop = channel.status === "optedOut" &&
      channel.updatedAt && (!scoped.updatedAt ||
        channel.updatedAt.toMillis() >= scoped.updatedAt.toMillis());
    const stopped = scoped.status === "optedOut" || broadStop;
    purposes[purpose] = {
      status: stopped ? "optedOut" : completeGrant ? "optedIn" : "unknown",
      evidenceStatus: stopped || completeGrant ? "complete" : "incomplete",
      receiptId: belongsToContact ? scoped.currentReceiptId : null,
      decisionAtMillis: scoped.updatedAt?.toMillis() ?? null,
      deliveryAvailable: false,
    };
  }
  const receiptSnapshot = channel.currentReceiptId === null ? null :
    await optionalContactQuery(
      params.db.collection("organizerCommunicationPermissionReceipts")
        .doc(channel.currentReceiptId).get(),
      "WhatsApp permission receipt",
      params.organizerId,
      params.contact.linkedUid
    );
  const receipt = receiptSnapshot?.data() as
    OrganizerCommunicationPermissionReceiptDocument | undefined;
  const validReceipt = receipt && receipt.organizerId === params.organizerId &&
    receipt.uid === params.contact.linkedUid && receipt.channel === "whatsapp" ?
    receipt : null;
  const sourceFormId = validReceipt?.sourceFormId ?? null;
  const formSnapshot = sourceFormId === null ? null :
    await optionalContactQuery(
      params.db.collection("organizerForms").doc(sourceFormId).get(),
      "permission source form",
      params.organizerId,
      params.contact.linkedUid
    );
  const form = formSnapshot?.data() as OrganizerFormDocument | undefined;
  const decisionAt = validReceipt?.decision === "optedOut" ?
    validReceipt.revokedAt : validReceipt?.grantedAt;
  return {
    status: channel.status,
    evidenceStatus: channel.evidenceStatus,
    receiptId: validReceipt ? channel.currentReceiptId : null,
    source: validReceipt?.source ?? channel.source,
    sourceFormId,
    sourceFormTitle: form?.organizerId === params.organizerId ?
      form.title : null,
    decisionAtMillis: decisionAt?.toMillis() ??
      channel.updatedAt?.toMillis() ?? null,
    identityStrength: validReceipt?.identityStrength ?? null,
    purposes,
  };
}

async function contactFormTimeline(params: {
  db: FirebaseFirestore.Firestore;
  organizerId: string;
  origins: Array<{id: string; data: OrganizerContactOriginDocument}>;
  formTitles: Map<string, string>;
}): Promise<{
  entries: ContactTimelineEntry[];
  truncated: boolean;
  unavailable: boolean;
}> {
  const responseOrigins = params.origins.filter((origin) =>
    origin.data.sourceKind === "hostForm" &&
    origin.data.sourceEntityKind === "hostFormResponse" &&
    origin.data.formId !== null && origin.data.responseId !== null);
  const responseIds = [...new Set(responseOrigins
    .map((origin) => origin.data.responseId!))];
  if (responseIds.length === 0) {
    return {entries: [], truncated: false, unavailable: false};
  }
  const snapshots = await optionalContactQuery(
    params.db.getAll(...responseIds.map((responseId) =>
      params.db.collection("organizerFormResponses").doc(responseId))),
    "form response timeline",
    params.organizerId,
    params.origins[0]?.data.currentContactId ?? "unknown"
  );
  if (snapshots === null) {
    return {entries: [], truncated: false, unavailable: true};
  }
  const entries: ContactTimelineEntry[] = [];
  for (const snapshot of snapshots) {
    const response = snapshot.data() as
      OrganizerFormResponseDocument | undefined;
    if (!response || response.organizerId !== params.organizerId) continue;
    const answeredQuestionCount = response.answerSnapshots.filter((answer) =>
      answer.answer !== null && (!Array.isArray(answer.answer) ||
        answer.answer.length > 0) && answer.answer !== "").length;
    entries.push({
      kind: "form",
      timelineId: timelineEntryId("form-submitted", snapshot.id),
      responseId: snapshot.id,
      formId: response.formId,
      formTitle: params.formTitles.get(response.formId) ?? null,
      action: "submitted",
      answeredQuestionCount,
      occurredAtMillis: response.submittedAt.toMillis(),
    });
    if (response.status === "withdrawn" && response.withdrawnAt !== null) {
      entries.push({
        kind: "form",
        timelineId: timelineEntryId("form-withdrawn", snapshot.id),
        responseId: snapshot.id,
        formId: response.formId,
        formTitle: params.formTitles.get(response.formId) ?? null,
        action: "withdrawn",
        answeredQuestionCount,
        occurredAtMillis: response.withdrawnAt.toMillis(),
      });
    }
  }
  const sorted = entries.sort(compareTimelineEntries);
  return {
    entries: sorted.slice(0, maxDetailTimelineEntries),
    truncated: sorted.length > maxDetailTimelineEntries,
    unavailable: false,
  };
}

async function contactCatchReplyTimeline(params: {
  db: FirebaseFirestore.Firestore;
  organizerId: string;
  linkedUid: string | null;
}): Promise<{entries: ContactReplyTimelineEntry[]; truncated: boolean}> {
  if (params.linkedUid === null) return {entries: [], truncated: false};
  const matchSnapshot = await params.db.collection("matches")
    .where("organizerId", "==", params.organizerId)
    .where("conversationType", "==", "clubHostInquiry")
    .where("participantIds", "array-contains", params.linkedUid)
    .orderBy("lastMessageAt", "desc")
    .orderBy(admin.firestore.FieldPath.documentId(), "desc")
    .limit(maxDetailConversationThreads + 1)
    .get();
  const matches = matchSnapshot.docs.slice(0, maxDetailConversationThreads)
    .map((document) => ({
      id: document.id,
      data: document.data() as MatchDocument,
    }))
    .filter((match) => match.data.organizerId === params.organizerId &&
      match.data.conversationType === "clubHostInquiry" &&
      match.data.participantIds.includes(params.linkedUid!));
  const perMatch = await Promise.all(matches.map(async (match) => {
    const snapshot = await params.db.collection("matches").doc(match.id)
      .collection("messages")
      .orderBy("sentAt", "desc")
      .limit(maxDetailReplyMessages + 1)
      .get();
    return {
      match,
      truncated: snapshot.size > maxDetailReplyMessages,
      messages: snapshot.docs.slice(0, maxDetailReplyMessages),
    };
  }));
  const entries = perMatch.flatMap(({match, messages}) => messages
    .map((document): ContactReplyTimelineEntry | null => {
      const message = document.data() as ChatMessageDocument;
      const bodyPreview = message.text.trim().slice(0, 300);
      if (bodyPreview.length === 0) return null;
      return {
        kind: "reply",
        timelineId: timelineEntryId(
          "catch-reply",
          `${match.id}:${document.id}`
        ),
        transport: "catchChat",
        direction: message.senderId === params.linkedUid ?
          "inbound" : "outbound",
        bodyPreview,
        threadId: match.id,
        occurredAtMillis: message.sentAt?.toMillis() ??
          match.data.createdAt.toMillis(),
      };
    })
    .filter((entry): entry is ContactReplyTimelineEntry => entry !== null))
    .sort(compareTimelineEntries);
  return {
    entries: entries.slice(0, maxDetailReplyMessages),
    truncated: matchSnapshot.size > maxDetailConversationThreads ||
      perMatch.some((result) => result.truncated) ||
      entries.length > maxDetailReplyMessages,
  };
}

export function buildContactTimeline(params: {
  forms: ContactTimelineEntry[];
  events: GetOrganizerContactDetailCallableResponse["events"];
  sends: NonNullable<GetOrganizerContactDetailCallableResponse["sends"]>;
  manualSendTasks: OrganizerManualSendTaskDocument[];
  whatsappMessages: OrganizerWhatsappMessageDocument[];
  catchReplies: ContactReplyTimelineEntry[];
  outreach: Array<{id: string; data: OrganizerContactOutreachDocument}>;
  formsCoverage: ContactHistoryCoverage;
  eventsCoverage: ContactHistoryCoverage;
  sendsCoverage: ContactHistoryCoverage;
  repliesCoverage: ContactHistoryCoverage;
  repliesTruncated: boolean;
  outreachCoverage: ContactHistoryCoverage;
}): {
  timeline: GetOrganizerContactDetailCallableResponse["timeline"];
  truncated: boolean;
  coverage: GetOrganizerContactDetailCallableResponse["timelineCoverage"];
} {
  const events: ContactTimelineEntry[] = params.events.map((event) => ({
    kind: "event",
    timelineId: timelineEntryId(
      "event",
      `${event.eventId}:${event.attendeeId}`
    ),
    eventId: event.eventId,
    eventName: event.displayName,
    status: event.status,
    checkedIn: event.checkedIn,
    eventOriginMode: event.eventOriginMode,
    eventProvider: event.eventProvider,
    occurredAtMillis: event.checkedInAtMillis ?? event.cancelledAtMillis ??
      event.registeredAtMillis ?? event.eventStartAtMillis ?? 0,
  }));
  const sends: ContactTimelineEntry[] = params.sends.map((send) =>
    send.kind === "campaign" ? {
      kind: "send",
      timelineId: timelineEntryId("campaign", send.campaignId),
      sendKind: "campaign",
      name: send.name,
      status: send.deliveryStatus,
      deliveryMode: "api",
      observation: "providerReceipt",
      referenceId: send.campaignId,
      occurredAtMillis: send.updatedAtMillis,
    } : {
      kind: "send",
      timelineId: timelineEntryId("announcement", send.broadcastId),
      sendKind: "announcement",
      name: send.eventName,
      status: send.deliveryStatus,
      deliveryMode: "inCatch",
      observation: "catchActivity",
      referenceId: send.broadcastId,
      occurredAtMillis: send.sentAtMillis,
    });
  const manualSends: ContactTimelineEntry[] = params.manualSendTasks.map(
    (task) => ({
      kind: "send",
      timelineId: timelineEntryId("manual-handoff", task.taskId),
      sendKind: "manualHandoff",
      name: task.displayNameSnapshot,
      status: task.status,
      deliveryMode: "byHand",
      observation: manualSendObservation(task),
      referenceId: task.taskId,
      occurredAtMillis: manualSendOccurredAt(task),
    }));
  const whatsappReplies: ContactReplyTimelineEntry[] =
    params.whatsappMessages.map((message) => ({
      kind: "reply",
      timelineId: timelineEntryId("whatsapp-reply", message.messageId),
      transport: "managedWhatsapp",
      direction: message.direction,
      bodyPreview: message.body.trim().slice(0, 300),
      threadId: message.threadId,
      occurredAtMillis: message.occurredAt.toMillis(),
    }));
  const outreach: ContactTimelineEntry[] = params.outreach.map(
    (record) => ({
      kind: "outreach",
      timelineId: timelineEntryId("outreach", record.id),
      channel: record.data.channel,
      outcome: record.data.outcome,
      notePreview: record.data.note === undefined ? null :
        record.data.note.trim().slice(0, 300),
      occurredAtMillis: record.data.occurredAt.toMillis(),
    }));
  const combined = [
    ...params.forms,
    ...events,
    ...sends,
    ...manualSends,
    ...whatsappReplies,
    ...params.catchReplies,
    ...outreach,
  ].sort(compareTimelineEntries);
  return {
    timeline: combined.slice(0, maxDetailTimelineEntries),
    truncated: combined.length > maxDetailTimelineEntries ||
      params.formsCoverage === "partial" ||
      params.eventsCoverage === "partial" ||
      params.sendsCoverage === "partial" || params.repliesTruncated ||
      params.outreachCoverage === "partial",
    coverage: {
      forms: params.formsCoverage,
      events: params.eventsCoverage,
      sends: params.sendsCoverage,
      replies: params.repliesCoverage,
      outreach: params.outreachCoverage,
      replyObservation: "catchAndManagedWhatsappOnly",
    },
  };
}

function manualSendObservation(
  task: OrganizerManualSendTaskDocument
): Extract<ContactTimelineEntry, {kind: "send"}>["observation"] {
  if (task.status === "hostMarkedSent") return "hostAssertion";
  if (task.status === "handoffOpened") return "hostOpened";
  return "notSent";
}

function manualSendOccurredAt(task: OrganizerManualSendTaskDocument): number {
  return task.hostMarkedSentAt?.toMillis() ?? task.openedAt?.toMillis() ??
    task.skippedAt?.toMillis() ?? task.cancelledAt?.toMillis() ??
    task.supersededAt?.toMillis() ?? task.updatedAt.toMillis();
}

function compareTimelineEntries(
  left: ContactTimelineEntry,
  right: ContactTimelineEntry
): number {
  return right.occurredAtMillis - left.occurredAtMillis ||
    right.timelineId.localeCompare(left.timelineId);
}

function timelineEntryId(kind: string, sourceId: string): string {
  return `${kind}_${createHash("sha256").update(sourceId)
    .digest("hex").slice(0, 40)}`;
}

async function activeMergeRows(params: {
  db: FirebaseFirestore.Firestore;
  organizerId: string;
  receipts: Array<{
    id: string;
    data: OrganizerContactMergeReceiptDocument;
  }>;
}): Promise<GetOrganizerContactDetailCallableResponse["activeMerges"]> {
  const reversedReceiptIds = new Set(params.receipts
    .filter((receipt) => receipt.data.organizerId === params.organizerId &&
      receipt.data.operation === "unmerge" &&
      receipt.data.reversalOfReceiptId !== null)
    .map((receipt) => receipt.data.reversalOfReceiptId!));
  const activeReceipts = params.receipts.filter((receipt) =>
    receipt.data.organizerId === params.organizerId &&
    receipt.data.operation === "merge" &&
    !reversedReceiptIds.has(receipt.id)
  ).slice(0, 50);
  return Promise.all(activeReceipts.map(async (receipt) => {
    const sourceSnapshot = await params.db.collection("organizerContacts")
      .doc(receipt.data.sourceContactId).get();
    const source = sourceSnapshot.data() as
      OrganizerContactDocument | undefined;
    return {
      mergeReceiptId: receipt.id,
      sourceContactId: receipt.data.sourceContactId,
      sourceDisplayName: source?.organizerId === params.organizerId ?
        effectiveDisplayName(source) : "Merged customer",
      evidence: receipt.data.evidence,
      conflicts: receipt.data.conflicts,
      movedFactCount: receipt.data.movedEdgeCount +
        receipt.data.movedIdentityEvidenceCount +
        receipt.data.movedClaimCount +
        (receipt.data.movedOriginCount ?? 0),
      mergedAtMillis: receipt.data.createdAt.toMillis(),
    };
  }));
}

async function contactRevenue(params: {
  db: FirebaseFirestore.Firestore;
  contact: OrganizerContactDocument;
  eventEdges: OrganizerContactEventEdgeDocument[];
  eventHistoryTruncated: boolean;
}): Promise<ContactRevenueResult> {
  const reportedFacts = params.eventEdges
    .map(reportedRevenueFact)
    .filter((fact): fact is RevenueFact => fact !== null);
  const eventIds = new Set(params.eventEdges.map((edge) => edge.eventId));
  if (params.contact.linkedUid === null ||
      params.contact.identityState !== "verified") {
    return summarizeContactRevenueFacts({
      facts: reportedFacts,
      coverage: params.contact.identityState === "ambiguous" ||
        params.eventHistoryTruncated ? "partial" : "exact",
    });
  }
  const paymentsSnap = await params.db.collection("payments")
    .where("userId", "==", params.contact.linkedUid)
    .limit(maxContactPayments + 1)
    .get();
  const paymentFacts = contactPaymentRevenueFacts(
    paymentsSnap.docs.slice(0, maxContactPayments)
      .map((paymentSnap) => paymentSnap.data() as PaymentDocument),
    eventIds,
  );
  const paidEventIds = new Set(paymentFacts.map((fact) => fact.eventId));
  return summarizeContactRevenueFacts({
    facts: [
      ...paymentFacts,
      ...reportedFacts.filter((fact) => !paidEventIds.has(fact.eventId)),
    ],
    coverage:
      paymentsSnap.size > maxContactPayments || params.eventHistoryTruncated ?
        "partial" : "exact",
  });
}

type RevenueSource = "catchPayment" | "hostImport" | "hostEstimate" |
  "providerOrder" | "hostAttested";

interface RevenueFact {
  eventId: string;
  currency: string;
  amountMinor: number;
  source: RevenueSource;
  factCount: number;
  allocation: "perAttendee" | "sharedOrder";
}

interface ContactRevenueResult {
  revenue: GetOrganizerContactDetailCallableResponse["revenue"];
  byEvent: Map<
    string,
    GetOrganizerContactDetailCallableResponse["events"][number]["revenues"]
  >;
}

function reportedRevenueFact(
  edge: OrganizerContactEventEdgeDocument
): RevenueFact | null {
  const amountMinor = edge.revenueAmountMinor ?? null;
  const currency = edge.revenueCurrency?.trim().toUpperCase() ?? null;
  const source = edge.revenueSource ?? null;
  if (!Number.isSafeInteger(amountMinor) || amountMinor === null ||
      amountMinor <= 0 || currency === null || !/^[A-Z]{3}$/.test(currency) ||
      source === null) return null;
  return {
    eventId: edge.eventId,
    currency,
    amountMinor,
    source,
    factCount: 1,
    allocation: edge.revenueAllocation ?? "perAttendee",
  };
}

function contactPaymentRevenueFacts(
  payments: PaymentDocument[],
  eventIds: Set<string>,
): RevenueFact[] {
  const facts: RevenueFact[] = [];
  for (const payment of payments) {
    if (!eventIds.has(payment.eventId) ||
        payment.status !== "completed" || payment.signUpFailed) continue;
    const amountMinor = retainedNativePaymentAmount(payment);
    const currency = payment.currency.trim().toUpperCase();
    if (amountMinor === null || !Number.isSafeInteger(amountMinor) ||
        amountMinor <= 0 ||
        !/^[A-Z]{3}$/.test(currency)) continue;
    facts.push({
      eventId: payment.eventId,
      currency,
      amountMinor,
      source: "catchPayment",
      factCount: 1,
      allocation: "perAttendee",
    });
  }
  return facts;
}

/** Aggregates completed Catch payments and organizer-reported event facts. */
export function summarizeContactRevenue(
  payments: PaymentDocument[],
  eventIds: Set<string>,
  coverage: "exact" | "partial"
): GetOrganizerContactDetailCallableResponse["revenue"] {
  return summarizeContactRevenueFacts({
    facts: contactPaymentRevenueFacts(payments, eventIds),
    coverage,
  }).revenue;
}

export function summarizeContactRevenueFacts(params: {
  facts: RevenueFact[];
  coverage: "exact" | "partial";
}): ContactRevenueResult {
  const totals = new Map<string, {
    amountMinor: number;
    factCount: number;
    sources: Map<RevenueSource, {amountMinor: number; factCount: number}>;
  }>();
  const eventTotals = new Map<string, Map<string, RevenueFact>>();
  for (const fact of params.facts) {
    const total = totals.get(fact.currency) ?? {
      amountMinor: 0,
      factCount: 0,
      sources: new Map(),
    };
    total.amountMinor += fact.amountMinor;
    total.factCount += fact.factCount;
    const source = total.sources.get(fact.source) ?? {
      amountMinor: 0,
      factCount: 0,
    };
    source.amountMinor += fact.amountMinor;
    source.factCount += fact.factCount;
    total.sources.set(fact.source, source);
    totals.set(fact.currency, total);

    const event = eventTotals.get(fact.eventId) ?? new Map();
    const eventKey = `${fact.currency}|${fact.source}|${fact.allocation}`;
    const prior = event.get(eventKey);
    event.set(eventKey, prior ? {
      ...prior,
      amountMinor: prior.amountMinor + fact.amountMinor,
      factCount: prior.factCount + fact.factCount,
    } : fact);
    eventTotals.set(fact.eventId, event);
  }
  return {
    revenue: {
      coverage: params.coverage,
      amounts: [...totals.entries()]
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([currency, total]) => ({
          currency,
          amountMinor: total.amountMinor,
          factCount: total.factCount,
          sources: [...total.sources.entries()]
            .sort(([left], [right]) => left.localeCompare(right))
            .map(([source, value]) => ({source, ...value})),
        })),
    },
    byEvent: new Map([...eventTotals.entries()].map(([eventId, facts]) => [
      eventId,
      [...facts.values()].map((fact) => ({
        currency: fact.currency,
        amountMinor: fact.amountMinor,
        source: fact.source,
        factCount: fact.factCount,
        allocation: fact.allocation,
      })),
    ])),
  };
}

/** Appends preserve existing tags and never create vocabulary entries. */
export async function addExistingOrganizerContactTag(params: {
  db: FirebaseFirestore.Firestore;
  organizerId: string;
  contactId: string;
  tagId: string;
  actorUid: string;
  now: FirebaseFirestore.Timestamp;
}): Promise<void> {
  await requireOrganizerManager(params);
  const contactRef = params.db
    .collection("organizerContacts")
    .doc(params.contactId);
  const vocabularyRef = params.db
    .collection("organizerContactTagVocabularies")
    .doc(params.organizerId);
  await params.db.runTransaction(async (tx) => {
    const contact = (await tx.get(contactRef)).data() as
      | OrganizerContactDocument
      | undefined;
    const vocabulary = (await tx.get(vocabularyRef)).data() as
      | OrganizerContactTagVocabularyDocument
      | undefined;
    if (
      !contact ||
      contact.organizerId !== params.organizerId ||
      contact.deletedAt ||
      contact.hiddenAt ||
      contact.mergedIntoContactId ||
      !vocabulary?.tags.some((tag) => tag.tagId === params.tagId)
    ) {
      throw new HttpsError(
        "failed-precondition",
        "Contact or tag is unavailable.",
      );
    }
    const manualTagIds = [
      ...new Set([...(contact.manualTagIds ?? []), params.tagId]),
    ];
    if (manualTagIds.length > 5) {
      throw new HttpsError(
        "failed-precondition",
        "Maximum contact tags reached.",
      );
    }
    if ((contact.manualTagIds ?? []).includes(params.tagId)) return;
    tx.update(contactRef, {
      manualTagIds,
      revision: contact.revision + 1,
      updatedAt: params.now,
    });
  });
}

/** Corrects an organizer label, suppresses marketing, or hides a CRM row. */
export async function mutateOrganizerContactHandler(
  request: CallableRequest<unknown>,
  deps: OrganizerContactsDeps = defaultDeps
): Promise<MutateOrganizerContactCallableResponse> {
  const actorUid = requireAuth(request);
  assertManualTagInputCap(request.data);
  const data = validateCallableWithAjv<MutateOrganizerContactCallablePayload>(
    request,
    validateMutateOrganizerContactCallablePayload,
    normalizeContactMutationPayload
  );
  const db = deps.firestore();
  await deps.checkRateLimit(db, actorUid, "mutateOrganizerContact",
    mutateContactRateLimit);
  await requireOrganizerManager({db, organizerId: data.organizerId, actorUid});
  const contactRef = db.collection("organizerContacts").doc(data.contactId);
  const channelRef = db.collection("organizerContactChannelStates").doc(
    organizerContactChannelStateId(data.organizerId, data.contactId)
  );
  return db.runTransaction(async (tx) => {
    const traitRef = db.collection("organizerContactTraits")
      .doc(data.contactId);
    const summaryRef = db.collection("organizerAudienceSummaries")
      .doc(data.organizerId);
    const tagVocabularyRef = db.collection("organizerContactTagVocabularies")
      .doc(data.organizerId);
    const [
      contactSnap,
      channelSnap,
      traitSnap,
      summarySnap,
      tagVocabularySnap,
    ] =
      await Promise.all([
        tx.get(contactRef),
        tx.get(channelRef),
        tx.get(traitRef),
        tx.get(summaryRef),
        tx.get(tagVocabularyRef),
      ]);
    const contact = contactSnap.data() as OrganizerContactDocument | undefined;
    if (!contact || contact.organizerId !== data.organizerId ||
        contact.deletedAt !== null || contact.identityState === "merged") {
      throw new HttpsError("not-found", "Audience contact not found.");
    }
    if (contact.revision !== data.expectedRevision) {
      throw new HttpsError(
        "aborted",
        "This contact changed on another device. Reload it and try again."
      );
    }
    const now = admin.firestore.Timestamp.now();
    const revision = Math.max(contact.revision + 1, now.toMillis());
    const patch: FirebaseFirestore.UpdateData<OrganizerContactDocument> = {
      revision,
      updatedAt: now,
    };
    if (Object.prototype.hasOwnProperty.call(data, "displayNameOverride")) {
      patch.displayNameOverride = data.displayNameOverride ?? null;
      patch.searchName = (data.displayNameOverride ?? contact.displayName)
        .toLocaleLowerCase("en");
    }
    const updatesPhone = Object.prototype.hasOwnProperty.call(
      data,
      "phoneE164"
    );
    const updatesEmail = Object.prototype.hasOwnProperty.call(data, "email");
    if ((updatesPhone || updatesEmail) &&
        !manualContactDetailsEditable(contact)) {
      throw new HttpsError(
        "failed-precondition",
        "Only unlinked contacts added by your team can change contact details."
      );
    }
    const nextPhone = updatesPhone ? data.phoneE164 ?? null :
      contact.phoneE164;
    const nextEmail = updatesEmail ? data.email ?? null : contact.email;
    if ((updatesPhone || updatesEmail) &&
        manualContactHasIdentityEndpoint(contact) &&
        !manualContactHasIdentityEndpoint({
          phoneE164: nextPhone,
          email: nextEmail,
        })) {
      throw new HttpsError(
        "failed-precondition",
        "Keep at least one phone number or email address."
      );
    }
    if (updatesPhone) patch.phoneE164 = nextPhone;
    if (updatesEmail) patch.email = nextEmail;
    if (updatesPhone || updatesEmail) {
      patch.identityConfidence = nextPhone || nextEmail ? "proposed" :
        "eventOnly";
      updateManualContactIdentityLinks({
        tx,
        db,
        organizerId: data.organizerId,
        contactId: data.contactId,
        priorPhoneE164: contact.phoneE164,
        nextPhoneE164: nextPhone,
        priorEmail: contact.email,
        nextEmail,
        secret: deps.identitySecret(),
        now,
      });
    }
    const existingTagVocabulary = tagVocabularySnap.data() as
      OrganizerContactTagVocabularyDocument | undefined;
    let manualTags = manualTagsForContact(
      contact,
      new Map(safeManualTagVocabulary(
        data.organizerId,
        existingTagVocabulary
      ).map((tag) => [tag.tagId, tag]))
    );
    if (data.manualTags) {
      const resolved = resolveManualTags({
        organizerId: data.organizerId,
        labels: data.manualTags,
        vocabulary: existingTagVocabulary,
        actorUid,
        now,
      });
      patch.manualTagIds = resolved.manualTags.map((tag) => tag.tagId);
      manualTags = resolved.manualTags;
      tx.set(tagVocabularyRef, resolved.vocabulary);
    }
    if (typeof data.hidden === "boolean") {
      patch.hiddenAt = data.hidden ? now : null;
      patch.hiddenBy = data.hidden ? actorUid : null;
      const trait = traitSnap.data() as
        OrganizerContactTraitDocument | undefined;
      const hiddenSnapshot = contact.hiddenTraitSnapshot ?? trait ?? null;
      patch.hiddenTraitSnapshot = data.hidden ? hiddenSnapshot : null;
      if (data.hidden && trait) {
        const summary = summarySnap.data() as
          OrganizerAudienceSummaryDocument | undefined;
        tx.set(summaryRef, summaryWithoutTrait(
          data.organizerId,
          summary,
          trait,
          now
        ));
        tx.delete(traitRef);
      } else if (!data.hidden && hiddenSnapshot) {
        const summary = summarySnap.data() as
          OrganizerAudienceSummaryDocument | undefined;
        tx.set(summaryRef, summaryWithTrait(
          data.organizerId,
          summary,
          hiddenSnapshot,
          now
        ));
        tx.set(traitRef, {...hiddenSnapshot, computedAt: now});
      }
    }
    tx.update(contactRef, patch);
    const priorChannel = channelSnap.data() as
      OrganizerContactChannelStateDocument | undefined;
    let whatsappAdminSuppressed =
      priorChannel?.adminSuppressed === true;
    if (typeof data.whatsappAdminSuppressed === "boolean") {
      whatsappAdminSuppressed = data.whatsappAdminSuppressed;
      if (data.whatsappAdminSuppressed) {
        tx.set(channelRef, {
          organizerId: data.organizerId,
          contactId: data.contactId,
          channel: "whatsapp",
          endpointHash: hashEndpoint(contact.phoneE164 ?? ""),
          suppressionStatus: priorChannel?.suppressionStatus ?? "none",
          suppressionSource: priorChannel?.suppressionSource ?? null,
          adminSuppressed: true,
          campaignAcceptedCount: priorChannel?.campaignAcceptedCount ?? 0,
          lastCampaignAcceptedAt: priorChannel?.lastCampaignAcceptedAt ?? null,
          lastInboundAt: priorChannel?.lastInboundAt ?? null,
          lastReplyAt: priorChannel?.lastReplyAt ?? null,
          createdAt: priorChannel?.createdAt ?? now,
          updatedAt: now,
        } satisfies OrganizerContactChannelStateDocument);
      } else if (priorChannel?.adminSuppressed === true) {
        tx.update(channelRef, {
          adminSuppressed: false,
          updatedAt: now,
        });
      }
    }
    const displayNameOverride = Object.prototype.hasOwnProperty.call(
      data,
      "displayNameOverride"
    ) ? data.displayNameOverride ?? null : contact.displayNameOverride ?? null;
    const hidden = typeof data.hidden === "boolean" ?
      data.hidden : contact.hiddenAt != null;
    return {
      organizerId: data.organizerId,
      contactId: data.contactId,
      displayName: displayNameOverride ?? contact.displayName,
      displayNameOverride,
      whatsappAdminSuppressed,
      hidden,
      manualTags,
      revision,
    };
  });
}

/** Appends an author-stamped note to one active organizer contact. */
export async function createOrganizerContactNoteHandler(
  request: CallableRequest<unknown>,
  deps: OrganizerContactsDeps = defaultDeps
): Promise<OrganizerContactNoteCallableResponse> {
  const actorUid = requireAuth(request);
  const data = validateCallableWithAjv<
    CreateOrganizerContactNoteCallablePayload
  >(
    request,
    validateCreateOrganizerContactNoteCallablePayload,
    normalizeContactNotePayload
  );
  const db = deps.firestore();
  await deps.checkRateLimit(db, actorUid, "createOrganizerContactNote", {
    maxRequests: 30, windowMs: 60 * 1000,
  });
  await requireOrganizerManager({db, organizerId: data.organizerId, actorUid});
  const contactRef = db.collection("organizerContacts").doc(data.contactId);
  const noteRef = db.collection("organizerContactNotes").doc();
  const now = admin.firestore.Timestamp.now();
  const note: OrganizerContactNoteDocument = {
    organizerId: data.organizerId,
    contactId: data.contactId,
    authorUid: actorUid,
    body: data.body,
    revision: Math.max(1, now.toMillis()),
    createdAt: now,
    updatedAt: now,
    updatedByUid: actorUid,
  };
  await db.runTransaction(async (tx) => {
    const contactSnap = await tx.get(contactRef);
    const contact = contactSnap.data() as OrganizerContactDocument | undefined;
    assertActiveOrganizerContact(contact, data.organizerId);
    tx.create(noteRef, note);
  });
  return organizerContactNoteResponse(noteRef.id, note);
}

/** Optimistically edits note text while retaining its original author stamp. */
export async function mutateOrganizerContactNoteHandler(
  request: CallableRequest<unknown>,
  deps: OrganizerContactsDeps = defaultDeps
): Promise<OrganizerContactNoteCallableResponse> {
  const actorUid = requireAuth(request);
  const data = validateCallableWithAjv<
    MutateOrganizerContactNoteCallablePayload
  >(
    request,
    validateMutateOrganizerContactNoteCallablePayload,
    normalizeContactNotePayload
  );
  const db = deps.firestore();
  await deps.checkRateLimit(db, actorUid, "mutateOrganizerContactNote", {
    maxRequests: 60, windowMs: 60 * 1000,
  });
  await requireOrganizerManager({db, organizerId: data.organizerId, actorUid});
  const contactRef = db.collection("organizerContacts").doc(data.contactId);
  const noteRef = db.collection("organizerContactNotes").doc(data.noteId);
  return db.runTransaction(async (tx) => {
    const [contactSnap, noteSnap] = await Promise.all([
      tx.get(contactRef),
      tx.get(noteRef),
    ]);
    const contact = contactSnap.data() as OrganizerContactDocument | undefined;
    assertActiveOrganizerContact(contact, data.organizerId);
    const note = noteSnap.data() as OrganizerContactNoteDocument | undefined;
    if (!note || note.organizerId !== data.organizerId ||
        note.contactId !== data.contactId) {
      throw new HttpsError("not-found", "Contact note not found.");
    }
    if (note.revision !== data.expectedRevision) {
      throw new HttpsError(
        "aborted",
        "This note changed on another device. Reload it and try again."
      );
    }
    const now = admin.firestore.Timestamp.now();
    const updated: OrganizerContactNoteDocument = {
      ...note,
      body: data.body,
      revision: Math.max(note.revision + 1, now.toMillis()),
      updatedAt: now,
      updatedByUid: actorUid,
    };
    tx.update(noteRef, {
      body: updated.body,
      revision: updated.revision,
      updatedAt: updated.updatedAt,
      updatedByUid: updated.updatedByUid,
    });
    return organizerContactNoteResponse(data.noteId, updated);
  });
}

/**
 * Appends a manager-asserted outreach attempt to one active organizer
 * contact. The record is a host assertion, not a provider receipt: channel
 * outcomes describe what the manager reports happened.
 */
export async function recordOrganizerContactOutreachHandler(
  request: CallableRequest<unknown>,
  deps: OrganizerContactsDeps = defaultDeps
): Promise<OrganizerContactOutreachCallableResponse> {
  const actorUid = requireAuth(request);
  const data = validateCallableWithAjv<
    RecordOrganizerContactOutreachCallablePayload
  >(
    request,
    validateRecordOrganizerContactOutreachCallablePayload,
    normalizeContactOutreachPayload
  );
  const db = deps.firestore();
  await deps.checkRateLimit(db, actorUid, "recordOrganizerContactOutreach", {
    maxRequests: 60, windowMs: 60 * 1000,
  });
  await requireOrganizerManager({db, organizerId: data.organizerId, actorUid});
  const contactRef = db.collection("organizerContacts").doc(data.contactId);
  const outreachRef = db.collection("organizerContactOutreach").doc();
  const now = admin.firestore.Timestamp.now();
  const occurredAtMillis = data.occurredAtMillis ?? now.toMillis();
  if (occurredAtMillis > now.toMillis() + maxOutreachFutureSkewMillis) {
    throw new HttpsError(
      "invalid-argument",
      "Outreach attempts cannot be recorded in the future."
    );
  }
  const outreach: OrganizerContactOutreachDocument = {
    organizerId: data.organizerId,
    contactId: data.contactId,
    authorUid: actorUid,
    channel: data.channel,
    outcome: data.outcome,
    ...(data.note !== undefined ? {note: data.note} : {}),
    occurredAt: admin.firestore.Timestamp.fromMillis(occurredAtMillis),
    revision: Math.max(1, now.toMillis()),
    createdAt: now,
    updatedAt: now,
    updatedByUid: actorUid,
  };
  await db.runTransaction(async (tx) => {
    const contactSnap = await tx.get(contactRef);
    const contact = contactSnap.data() as OrganizerContactDocument | undefined;
    assertActiveOrganizerContact(contact, data.organizerId);
    tx.create(outreachRef, outreach);
  });
  return organizerContactOutreachResponse(outreachRef.id, outreach);
}

/** Returns a bounded export instead of exposing bulk Firestore PII. */
export async function exportOrganizerContactsHandler(
  request: CallableRequest<unknown>,
  deps: OrganizerContactsDeps = defaultDeps
): Promise<ExportOrganizerContactsCallableResponse> {
  const actorUid = requireAuth(request);
  const data = validateCallableWithAjv<ExportOrganizerContactsCallablePayload>(
    request,
    validateExportOrganizerContactsCallablePayload,
    normalizeExportPayload
  );
  const db = deps.firestore();
  await deps.checkRateLimit(db, actorUid, "exportOrganizerContacts", {
    maxRequests: 10, windowMs: 60 * 60 * 1000,
  });
  await requireOrganizerManager({db, organizerId: data.organizerId, actorUid});
  const filters = contactFilterSelection(data);
  const [page, summarySnap] = await Promise.all([
    listSortedContactDocuments({
      db, organizerId: data.organizerId, filters,
      search: normalizeSearch(data.query ?? null),
      segmentId: data.segmentId ?? null,
      manualTagId: data.manualTagId ?? null,
      sort: "lastSeen", cursor: null, limit: maxExportContacts,
    }),
    db.collection("organizerAudienceSummaries").doc(data.organizerId).get(),
  ]);
  const traitSnaps = page.contacts.length === 0 ? [] : await db.getAll(
    ...page.contacts.map((doc) => db.collection("organizerContactTraits")
      .doc(doc.id))
  );
  const rows = page.contacts.map((doc, index) => ({
    id: doc.id,
    contact: doc.data,
    trait: traitSnaps[index].data() as
      OrganizerContactTraitDocument | undefined,
  })).filter((row) => row.trait?.organizerId === data.organizerId);
  const header = [
    "contact_id", "display_name", "phone_e164", "email",
    "identity_state", "expected_events", "attended_events", "no_shows",
    "attendance_rate", "segments", "whatsapp_permission", "source_coverage",
  ];
  const csv = [header, ...rows.map(({id, contact, trait}) => {
    const fields = organizerContactVisibleFields(contact);
    return [
      id,
      fields.displayName,
      fields.phoneE164 ?? "",
      fields.email ?? "",
      contact.identityState,
      String(trait!.expectedEventCount),
      String(trait!.attendedEventCount),
      String(trait!.noShowCount),
    trait!.attendanceRate === null ? "" : String(trait!.attendanceRate),
    trait!.segmentIds.join("|"),
    trait!.whatsappStatus,
      trait!.sourceCoverage,
    ];
  })].map((row) => row.map(csvCell).join(",")).join("\r\n") + "\r\n";
  const summary = summarySnap.data() as
    OrganizerAudienceSummaryDocument | undefined;
  const sourceCoverage = await resolveOrganizerAudienceCoverage({
    db,
    organizerId: data.organizerId,
    storedCoverage: summary?.sourceCoverage,
  });
  const generatedAt = admin.firestore.Timestamp.now();
  return {
    organizerId: data.organizerId,
    fileName: `catch-audience-${safeFilePart(data.organizerId)}-` +
      `${generatedAt.toDate().toISOString().slice(0, 10)}.csv`,
    csv,
    rowCount: rows.length,
    truncated: page.hasMore,
    generatedAtMillis: generatedAt.toMillis(),
    sourceCoverage,
  };
}

interface ContactDocumentRow {
  id: string;
  data: OrganizerContactDocument;
}

interface SortedContactPage {
  contacts: ContactDocumentRow[];
  hasMore: boolean;
  lastValue: string | null;
  matchCount?: number;
}

async function listSortedContactDocuments(params: {
  filters: ContactFilterSelection;
  filterKey?: string;
  db: FirebaseFirestore.Firestore;
  organizerId: string;
  search: string | null;
  segmentId: OrganizerContactTraitDocument["segmentIds"][number] | null;
  manualTagId: string | null;
  sort: ContactSort;
  cursor: ContactCursor | null;
  limit: number;
}): Promise<SortedContactPage> {
  const plan = contactQueryPlan(params);
  assertCursorPlan(
    params.cursor,
    plan,
    params.organizerId,
    params.search,
    params.segmentId,
    params.manualTagId,
    params.sort,
    params.filterKey
  );
  const unfiltered = params.filters.segmentIds.length === 0 &&
    params.filters.manualTagIds.length === 0;
  const directContactSort = unfiltered &&
    (!params.search || params.sort === "name") &&
    params.sort !== "mostAttended";
  if (directContactSort) return listDirectContactSort(params);
  if (unfiltered && !params.search &&
      params.sort === "mostAttended") {
    return listDirectAttendanceSort(params);
  }
  return listBoundedFilteredSort(params);
}

async function listDirectContactSort(params: {
  db: FirebaseFirestore.Firestore;
  organizerId: string;
  search: string | null;
  sort: ContactSort;
  cursor: ContactCursor | null;
  limit: number;
}): Promise<SortedContactPage> {
  let baseQuery: FirebaseFirestore.Query = params.db
    .collection("organizerContacts")
    .where("organizerId", "==", params.organizerId)
    .where("deletedAt", "==", null);
  if (params.sort === "name") {
    baseQuery = baseQuery.orderBy("searchName").orderBy(
      admin.firestore.FieldPath.documentId()
    );
    if (params.search) {
      baseQuery = baseQuery.startAt(params.search)
        .endAt(`${params.search}\uf8ff`);
    }
  } else {
    baseQuery = baseQuery.orderBy("lastSeenAt", "desc").orderBy(
      admin.firestore.FieldPath.documentId(), "desc"
    );
  }
  const eligible: ContactDocumentRow[] = [];
  let scanned = 0;
  let scanValue = params.cursor?.value ?? null;
  let scanContactId = params.cursor?.contactId ?? null;
  while (eligible.length <= params.limit) {
    const remaining = maxSortedCandidateScan + 1 - scanned;
    if (remaining <= 0) throwSortScanLimit();
    const batchLimit = Math.min(
      Math.max(params.limit + 1, 100),
      remaining + 1
    );
    let pageQuery = baseQuery;
    if (scanValue !== null && scanContactId !== null) {
      pageQuery = params.sort === "name" ?
        pageQuery.startAfter(scanValue, scanContactId) :
        pageQuery.startAfter(
          admin.firestore.Timestamp.fromMillis(Number(scanValue)),
          scanContactId
        );
    }
    const snapshot = await pageQuery.limit(batchLimit).get();
    const allowed = snapshot.docs.slice(0, remaining);
    const rows = allowed.map((document) => ({
      id: document.id,
      data: document.data() as OrganizerContactDocument,
    }));
    eligible.push(...rows.filter((contact) =>
      contact.data.hiddenAt == null &&
      contact.data.identityState !== "merged"
    ));
    scanned += allowed.length;
    if (eligible.length > params.limit) break;
    if (snapshot.size > allowed.length) throwSortScanLimit();
    if (snapshot.size < batchLimit || allowed.length === 0) break;
    const lastScanned = rows.at(-1)!;
    scanValue = contactSortValue(lastScanned, undefined, params.sort);
    scanContactId = lastScanned.id;
  }
  const selected = eligible.slice(0, params.limit);
  const last = selected.at(-1);
  return {
    contacts: selected,
    hasMore: eligible.length > params.limit,
    lastValue: last ? contactSortValue(last, undefined, params.sort) : null,
  };
}

async function listDirectAttendanceSort(params: {
  db: FirebaseFirestore.Firestore;
  organizerId: string;
  cursor: ContactCursor | null;
  limit: number;
}): Promise<SortedContactPage> {
  const baseQuery: FirebaseFirestore.Query = params.db
    .collection("organizerContactTraits")
    .where("organizerId", "==", params.organizerId)
    .orderBy("attendedEventCount", "desc")
    .orderBy(admin.firestore.FieldPath.documentId(), "desc");
  const eligible: Array<{
    contact: ContactDocumentRow;
    trait: OrganizerContactTraitDocument;
  }> = [];
  let scanned = 0;
  let scanValue = params.cursor?.value ?? null;
  let scanContactId = params.cursor?.contactId ?? null;
  while (eligible.length <= params.limit) {
    const remaining = maxSortedCandidateScan - scanned;
    if (remaining <= 0) throwSortScanLimit();
    const batchLimit = Math.min(
      Math.max(params.limit + 1, 100),
      remaining + 1
    );
    let pageQuery = baseQuery;
    if (scanValue !== null && scanContactId !== null) {
      pageQuery = pageQuery.startAfter(Number(scanValue), scanContactId);
    }
    const snapshot = await pageQuery.limit(batchLimit).get();
    const allowed = snapshot.docs.slice(0, remaining).map((document) => ({
      id: document.id,
      data: document.data() as OrganizerContactTraitDocument,
    }));
    const contacts = await getContactsById(
      params.db,
      allowed.map((row) => row.id)
    );
    const byId = new Map(contacts.map((contact) => [contact.id, contact]));
    eligible.push(...allowed.map((trait) => {
      const contact = byId.get(trait.id);
      return contact ? {contact, trait: trait.data} : null;
    }).filter((row): row is NonNullable<typeof row> => row !== null));
    scanned += allowed.length;
    if (eligible.length > params.limit) break;
    if (snapshot.size > allowed.length) throwSortScanLimit();
    if (snapshot.size < batchLimit || allowed.length === 0) break;
    const lastScanned = allowed.at(-1)!;
    scanValue = String(lastScanned.data.attendedEventCount);
    scanContactId = lastScanned.id;
  }
  const selected = eligible.slice(0, params.limit);
  const last = selected.at(-1);
  return {
    contacts: selected.map((row) => row.contact),
    hasMore: eligible.length > params.limit,
    lastValue: last ? String(last.trait.attendedEventCount) : null,
  };
}

function throwSortScanLimit(): never {
  throw new HttpsError(
    "resource-exhausted",
    "This audience is too large to sort. Narrow the filters."
  );
}

async function listBoundedFilteredSort(params: {
  filters: ContactFilterSelection;
  filterKey?: string;
  db: FirebaseFirestore.Firestore;
  organizerId: string;
  search: string | null;
  segmentId: OrganizerContactTraitDocument["segmentIds"][number] | null;
  manualTagId: string | null;
  sort: ContactSort;
  cursor: ContactCursor | null;
  limit: number;
}): Promise<SortedContactPage> {
  let candidateQuery: FirebaseFirestore.Query;
  let candidatesAreTraits = false;
  const groups = selectedContactFilterGroups(params.filters);
  // Any single selected facet is a superset of the final intersection.
  // past_attendee is derived from counts, so cannot seed an array query.
  const indexedGroup = groups.find((group) => !group.includes("past_attendee"));
  const pastOnly = groups.some((group) =>
    group.length === 1 && group[0] === "past_attendee");
  if (indexedGroup || pastOnly) {
    candidatesAreTraits = true;
    candidateQuery = params.db.collection("organizerContactTraits")
      .where("organizerId", "==", params.organizerId);
    candidateQuery = indexedGroup ? candidateQuery
      .where("segmentIds", "array-contains-any", indexedGroup)
      .orderBy(admin.firestore.FieldPath.documentId()) : candidateQuery
      .where("attendedEventCount", ">", 0).orderBy("attendedEventCount");
  } else {
    candidateQuery = params.db.collection("organizerContacts")
      .where("organizerId", "==", params.organizerId)
      .where("deletedAt", "==", null);
    if (params.filters.manualTagIds.length > 0) {
      candidateQuery = candidateQuery
        .where("hiddenAt", "==", null)
        .where("manualTagIds", "array-contains-any",
          params.filters.manualTagIds)
        .orderBy(admin.firestore.FieldPath.documentId());
    } else if (params.search) {
      candidateQuery = candidateQuery.orderBy("searchName")
        .orderBy(admin.firestore.FieldPath.documentId())
        .startAt(params.search).endAt(`${params.search}\uf8ff`);
    } else {
      candidateQuery = candidateQuery.orderBy(
        admin.firestore.FieldPath.documentId()
      );
    }
  }
  const candidateSnapshot = await candidateQuery
    .limit(maxSortedCandidateScan + 1).get();
  if (candidateSnapshot.size > maxSortedCandidateScan) {
    throw new HttpsError(
      "resource-exhausted",
      "This filtered audience is too large to sort. Narrow the filters."
    );
  }
  const candidateIds = candidateSnapshot.docs.map((document) => document.id);
  const [contactRows, traitSnapshots] = await Promise.all([
    candidatesAreTraits ? getContactsById(params.db, candidateIds) :
      Promise.resolve(candidateSnapshot.docs.map((document) => ({
        id: document.id,
        data: document.data() as OrganizerContactDocument,
      }))),
    candidateIds.length === 0 ? Promise.resolve([]) : params.db.getAll(
      ...candidateIds.map((contactId) => params.db
        .collection("organizerContactTraits").doc(contactId))
    ),
  ]);
  const traitsById = new Map(traitSnapshots
    .filter((snapshot) => snapshot.exists)
    .map((snapshot) => [
      snapshot.id,
      snapshot.data() as OrganizerContactTraitDocument,
    ]));
  const eligible = contactRows.filter((contact) => {
    const trait = traitsById.get(contact.id);
    return trait?.organizerId === params.organizerId &&
      contact.data.organizerId === params.organizerId &&
      contact.data.deletedAt === null && contact.data.hiddenAt == null &&
      contact.data.identityState !== "merged" &&
      (!params.search || contact.data.searchName.startsWith(params.search)) &&
      contactMatchesFilters(params.filters, contact.data.manualTagIds ?? [],
        trait?.organizerId === params.organizerId ? trait : undefined);
  });
  eligible.sort((left, right) => compareContactSortRows(
    left,
    right,
    traitsById,
    params.sort
  ));
  const afterCursor = eligible.filter((contact) => contactIsAfterCursor(
    contact,
    traitsById.get(contact.id),
    params.sort,
    params.cursor
  ));
  const selected = afterCursor.slice(0, params.limit);
  const last = selected.at(-1);
  return {
    matchCount: eligible.length,
    contacts: selected,
    hasMore: afterCursor.length > selected.length,
    lastValue: last ? contactSortValue(
      last,
      traitsById.get(last.id),
      params.sort
    ) : null,
  };
}

function compareContactSortRows(
  left: ContactDocumentRow,
  right: ContactDocumentRow,
  traitsById: ReadonlyMap<string, OrganizerContactTraitDocument>,
  sort: ContactSort
): number {
  const leftValue = contactSortValue(left, traitsById.get(left.id), sort);
  const rightValue = contactSortValue(right, traitsById.get(right.id), sort);
  if (leftValue !== rightValue) {
    return sort === "name" ? leftValue.localeCompare(rightValue) :
      Number(rightValue) - Number(leftValue);
  }
  return sort === "name" ? left.id.localeCompare(right.id) :
    right.id.localeCompare(left.id);
}

function contactIsAfterCursor(
  contact: ContactDocumentRow,
  trait: OrganizerContactTraitDocument | undefined,
  sort: ContactSort,
  cursor: ContactCursor | null
): boolean {
  if (!cursor) return true;
  const value = contactSortValue(contact, trait, sort);
  if (value === cursor.value) {
    return sort === "name" ?
      contact.id.localeCompare(cursor.contactId) > 0 :
      contact.id.localeCompare(cursor.contactId) < 0;
  }
  return sort === "name" ? value.localeCompare(cursor.value) > 0 :
    Number(value) < Number(cursor.value);
}

function contactSortValue(
  contact: ContactDocumentRow,
  trait: OrganizerContactTraitDocument | undefined,
  sort: ContactSort
): string {
  if (sort === "name") return contact.data.searchName;
  if (sort === "mostAttended") {
    return String(trait?.attendedEventCount ?? 0);
  }
  return String(contact.data.lastSeenAt.toMillis());
}

function contactQueryPlan(params: {
  filters?: ContactFilterSelection;
  search: string | null;
  segmentId: string | null;
  manualTagId: string | null;
}): ContactCursor["plan"] {
  if (params.segmentId || params.filters?.segmentIds.length) return "segment";
  if (params.manualTagId || params.filters?.manualTagIds.length) {
    return "manualTag";
  }
  return params.search ? "search" : "people";
}

async function getContactsById(
  db: FirebaseFirestore.Firestore,
  contactIds: string[]
): Promise<ContactDocumentRow[]> {
  if (contactIds.length === 0) return [];
  const snapshots = await db.getAll(...contactIds.map((contactId) =>
    db.collection("organizerContacts").doc(contactId)
  ));
  return snapshots.filter((snap) => snap.exists).map((snap) => ({
    id: snap.id,
    data: snap.data() as OrganizerContactDocument,
  })).filter((item) => item.data.deletedAt === null &&
    item.data.hiddenAt == null &&
    item.data.identityState !== "merged");
}

function safeContactRow(
  contactId: string,
  contact: OrganizerContactDocument,
  traits: OrganizerContactTraitDocument | undefined,
  channelState: OrganizerContactChannelStateDocument | undefined,
  manualTagsById: ReadonlyMap<string, ManualTagRow>
): ListOrganizerContactsCallableResponse["contacts"][number] | null {
  if (!traits || traits.organizerId !== contact.organizerId ||
      contact.identityState === "merged" || contact.hiddenAt != null) {
    return null;
  }
  const fields = organizerContactVisibleFields(contact);
  return {
    contactId,
    displayName: fields.displayName,
    phoneE164: fields.phoneE164,
    email: fields.email,
    identityState: activeIdentityState(contact.identityState),
    identityConfidence: contact.identityConfidence,
    ambiguousCandidateCount: contact.ambiguousCandidateContactIds.length,
    attendedEventCount: traits.attendedEventCount,
    expectedEventCount: traits.expectedEventCount,
    lastAttendedAtMillis: traits.lastAttendedAt?.toMillis() ?? null,
    segmentIds: traits.segmentIds,
    manualTags: manualTagsForContact(contact, manualTagsById),
    whatsappStatus: traits.whatsappStatus,
    whatsappAdminSuppressed:
      channelState?.adminSuppressed === true,
    smsStatus: traits.smsStatus,
    sourceCoverage: traits.sourceCoverage,
    revision: contact.revision,
    ...(traits.membership ? {membership: traits.membership} : {}),
  };
}

type ManualTagRow = NonNullable<
  GetOrganizerContactDetailCallableResponse["manualTags"]
>[number];

function safeManualTagVocabulary(
  organizerId: string,
  vocabulary: OrganizerContactTagVocabularyDocument | undefined
): ManualTagRow[] {
  if (!vocabulary || vocabulary.organizerId !== organizerId) return [];
  return vocabulary.tags.slice(0, maxOrganizerManualTags).map((tag) => ({
    tagId: tag.tagId,
    label: tag.label,
  }));
}

function manualTagsForContact(
  contact: OrganizerContactDocument,
  manualTagsById: ReadonlyMap<string, ManualTagRow>
): ManualTagRow[] {
  return (contact.manualTagIds ?? [])
    .slice(0, maxContactManualTags)
    .map((tagId) => manualTagsById.get(tagId))
    .filter((tag): tag is ManualTagRow => tag !== undefined);
}

export function resolveManualTags(params: {
  organizerId: string;
  labels: string[];
  vocabulary: OrganizerContactTagVocabularyDocument | undefined;
  actorUid: string;
  now: FirebaseFirestore.Timestamp;
}): {
  vocabulary: OrganizerContactTagVocabularyDocument;
  manualTags: ManualTagRow[];
} {
  if (params.labels.length > maxContactManualTags) {
    throw new HttpsError(
      "invalid-argument",
      "A contact can have at most 5 manual tags."
    );
  }
  if (params.vocabulary &&
      params.vocabulary.organizerId !== params.organizerId) {
    throw new HttpsError(
      "failed-precondition",
      "The organizer tag vocabulary is invalid."
    );
  }
  const tags = [...(params.vocabulary?.tags ?? [])];
  const byNormalizedLabel = new Map(
    tags.map((tag) => [tag.normalizedLabel, tag])
  );
  const desired = new Map<string, string>();
  for (const rawLabel of params.labels) {
    const label = normalizeManualTagLabel(rawLabel);
    desired.set(label.toLocaleLowerCase("en"), label);
  }
  if (desired.size > maxContactManualTags) {
    throw new HttpsError(
      "invalid-argument",
      "A contact can have at most 5 manual tags."
    );
  }
  const manualTags = [...desired.entries()].map(([normalizedLabel, label]) => {
    const existing = byNormalizedLabel.get(normalizedLabel);
    if (existing) return {tagId: existing.tagId, label: existing.label};
    const created = {
      tagId: manualTagId(params.organizerId, normalizedLabel),
      label,
      normalizedLabel,
      createdByUid: params.actorUid,
      createdAt: params.now,
    } satisfies OrganizerContactTagVocabularyDocument["tags"][number];
    tags.push(created);
    byNormalizedLabel.set(normalizedLabel, created);
    return {tagId: created.tagId, label: created.label};
  });
  if (tags.length > maxOrganizerManualTags) {
    throw new HttpsError(
      "failed-precondition",
      "An organizer can have at most 20 manual tags."
    );
  }
  return {
    vocabulary: {
      organizerId: params.organizerId,
      tags,
      updatedAt: params.now,
    },
    manualTags,
  };
}

function manualTagId(organizerId: string, normalizedLabel: string): string {
  return createHash("sha256")
    .update(`${organizerId}\u0000${normalizedLabel}`)
    .digest("hex")
    .slice(0, 32);
}

function normalizeManualTagLabel(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function noteDetailRow(
  noteId: string,
  note: OrganizerContactNoteDocument
): NonNullable<GetOrganizerContactDetailCallableResponse["notes"]>[number] |
  null {
  if (!note.body.trim()) return null;
  return {
    noteId,
    body: note.body,
    authorUid: note.authorUid,
    createdAtMillis: note.createdAt.toMillis(),
    updatedAtMillis: note.updatedAt.toMillis(),
    revision: note.revision,
  };
}

async function contactCampaignSendHistory(params: {
  db: FirebaseFirestore.Firestore;
  organizerId: string;
  recipientDocuments: Array<{
    id: string;
    data: OrganizerCampaignRecipientDocument;
  }>;
}): Promise<NonNullable<
  GetOrganizerContactDetailCallableResponse["sends"]
>> {
  const recipients = params.recipientDocuments.filter(
    (row) => row.data.organizerId === params.organizerId
  );
  if (recipients.length === 0) return [];
  const campaignIds = [...new Set(
    recipients.map((row) => row.data.campaignId)
  )];
  const campaignSnapshots = await params.db.getAll(
    ...campaignIds.map((campaignId) => params.db
      .collection("organizerCampaigns").doc(campaignId))
  );
  const campaigns = new Map(campaignSnapshots
    .filter((snapshot) => snapshot.exists)
    .map((snapshot) => [
      snapshot.id,
      snapshot.data() as OrganizerCampaignDocument,
    ]));
  return recipients.map(({data: recipient}) => {
    const campaign = campaigns.get(recipient.campaignId);
    if (!campaign || campaign.organizerId !== params.organizerId) return null;
    return {
      kind: "campaign" as const,
      campaignId: recipient.campaignId,
      name: campaign.name,
      messageClass: campaign.messageClass,
      deliveryStatus: recipient.status,
      createdAtMillis: recipient.createdAt.toMillis(),
      sentAtMillis: recipient.sentAt?.toMillis() ?? null,
      updatedAtMillis: recipient.updatedAt.toMillis(),
    };
  }).filter((row): row is NonNullable<typeof row> => row !== null);
}

function contactBroadcastSendHistory(params: {
  organizerId: string;
  contactId: string;
  summaries: OrganizerBroadcastSummaryDocument[];
}): NonNullable<GetOrganizerContactDetailCallableResponse["sends"]> {
  return params.summaries
    .filter((summary) =>
      summary.organizerId === params.organizerId &&
      summary.recipientContactIds.includes(params.contactId))
    .map((summary) => ({
      kind: "announcement" as const,
      broadcastId: summary.broadcastId,
      eventId: summary.eventId,
      eventName: summary.eventName,
      audience: summary.audience,
      deliveryStatus: summary.recipientDeliveryStates[params.contactId] ??
        "failed",
      sentAtMillis: summary.sentAt.toMillis(),
      partialFailure: summary.partialFailure,
    }));
}

function sendHistoryMillis(
  row: NonNullable<GetOrganizerContactDetailCallableResponse["sends"]>[number]
): number {
  return row.kind === "campaign" ? row.updatedAtMillis : row.sentAtMillis;
}

function organizerContactNoteResponse(
  noteId: string,
  note: OrganizerContactNoteDocument
): OrganizerContactNoteCallableResponse {
  return {
    organizerId: note.organizerId,
    contactId: note.contactId,
    noteId,
    body: note.body,
    authorUid: note.authorUid,
    createdAtMillis: note.createdAt.toMillis(),
    updatedAtMillis: note.updatedAt.toMillis(),
    revision: note.revision,
  };
}

function organizerContactOutreachResponse(
  outreachId: string,
  outreach: OrganizerContactOutreachDocument
): OrganizerContactOutreachCallableResponse {
  return {
    organizerId: outreach.organizerId,
    contactId: outreach.contactId,
    outreachId,
    channel: outreach.channel,
    outcome: outreach.outcome,
    note: outreach.note ?? null,
    authorUid: outreach.authorUid,
    occurredAtMillis: outreach.occurredAt.toMillis(),
    createdAtMillis: outreach.createdAt.toMillis(),
    updatedAtMillis: outreach.updatedAt.toMillis(),
    revision: outreach.revision,
  };
}

function assertActiveOrganizerContact(
  contact: OrganizerContactDocument | undefined,
  organizerId: string
): asserts contact is OrganizerContactDocument {
  if (!contact || contact.organizerId !== organizerId ||
      contact.deletedAt !== null || contact.hiddenAt != null ||
      contact.identityState === "merged") {
    throw new HttpsError("not-found", "Audience contact not found.");
  }
}

function eventDetailRow(
  edge: OrganizerContactEventEdgeDocument,
  revenues:
    GetOrganizerContactDetailCallableResponse["events"][number]["revenues"],
  event?: EventDocument,
): GetOrganizerContactDetailCallableResponse["events"][number] {
  const millis = (value: FirebaseFirestore.Timestamp | null) =>
    value?.toMillis() ?? null;
  return {
    eventId: edge.eventId,
    attendeeId: edge.attendeeId,
    displayName: event ? eventTitleLabel(event) :
      edge.eventDisplayName ?? "Event",
    eventOriginMode: event?.eventOrigin?.mode ??
      edge.eventOriginMode ?? "unknown",
    eventProvider: event?.eventOrigin?.provider ?? edge.eventProvider ?? null,
    source: edge.source,
    status: edge.status,
    expected: edge.expected,
    registered: edge.registered,
    cancelled: edge.cancelled,
    checkedIn: edge.checkedIn,
    eventStartAtMillis: millis(edge.eventStartAt),
    eventEndAtMillis: millis(edge.eventEndAt),
    registeredAtMillis: millis(edge.registeredAt),
    cancelledAtMillis: millis(edge.cancelledAt),
    checkedInAtMillis: millis(edge.checkedInAt),
    revenues,
  };
}

function activeIdentityState(
  state: OrganizerContactDocument["identityState"]
): "unlinked" | "verified" | "ambiguous" {
  if (state === "merged") {
    throw new HttpsError("not-found", "Audience contact not found.");
  }
  return state;
}

function normalizeSearch(value: string | null): string | null {
  const normalized = value?.trim().toLocaleLowerCase("en") ?? "";
  return normalized.length === 0 ? null : normalized;
}

function normalizeContactMutationPayload(data: unknown): unknown {
  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    return data;
  }
  const normalized = {...data} as Record<string, unknown>;
  for (const field of ["organizerId", "contactId"]) {
    if (typeof normalized[field] === "string") {
      normalized[field] = normalized[field].trim();
    }
  }
  if (typeof normalized.displayNameOverride === "string") {
    normalized.displayNameOverride = normalized.displayNameOverride
      .trim().replace(/\s+/g, " ");
  }
  if (typeof normalized.phoneE164 === "string") {
    normalized.phoneE164 = normalizeManualPhone(normalized.phoneE164);
  }
  if (typeof normalized.email === "string") {
    normalized.email = normalizeManualEmail(normalized.email);
  }
  if (Array.isArray(normalized.manualTags)) {
    normalized.manualTags = normalized.manualTags.map((tag) =>
      typeof tag === "string" ? normalizeManualTagLabel(tag) : tag
    );
  }
  return normalized;
}

function normalizeContactNotePayload(data: unknown): unknown {
  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    return data;
  }
  const normalized = {...data} as Record<string, unknown>;
  for (const field of ["organizerId", "contactId", "noteId"]) {
    if (typeof normalized[field] === "string") {
      normalized[field] = normalized[field].trim();
    }
  }
  if (typeof normalized.body === "string") {
    normalized.body = normalized.body.trim();
  }
  return normalized;
}

function normalizeContactOutreachPayload(data: unknown): unknown {
  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    return data;
  }
  const normalized = {...data} as Record<string, unknown>;
  for (const field of ["organizerId", "contactId"]) {
    if (typeof normalized[field] === "string") {
      normalized[field] = normalized[field].trim();
    }
  }
  if (typeof normalized.note === "string") {
    const trimmed = normalized.note.trim();
    if (trimmed.length === 0) {
      delete normalized.note;
    } else {
      normalized.note = trimmed;
    }
  }
  return normalized;
}

function assertManualTagInputCap(data: unknown): void {
  if (typeof data !== "object" || data === null || Array.isArray(data)) return;
  const manualTags = (data as Record<string, unknown>).manualTags;
  if (Array.isArray(manualTags) && manualTags.length > maxContactManualTags) {
    throw new HttpsError(
      "invalid-argument",
      "A contact can have at most 5 manual tags."
    );
  }
}

function normalizeCreateContactPayload(data: unknown): unknown {
  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    return data;
  }
  const normalized = {...data} as Record<string, unknown>;
  if (typeof normalized.organizerId === "string") {
    normalized.organizerId = normalized.organizerId.trim();
  }
  if (typeof normalized.displayName === "string") {
    normalized.displayName = normalized.displayName.trim().replace(/\s+/g, " ");
  }
  if (typeof normalized.phoneE164 === "string") {
    normalized.phoneE164 = normalizeManualPhone(normalized.phoneE164);
  }
  if (typeof normalized.email === "string") {
    normalized.email = normalizeManualEmail(normalized.email);
  }
  if (typeof normalized.initialNote === "string") {
    normalized.initialNote = normalized.initialNote.trim();
  }
  return normalized;
}

function normalizeManualPhone(value: string): string {
  return value.trim().replace(/[()\s-]+/g, "");
}

function normalizeManualEmail(value: string): string {
  return value.trim().toLocaleLowerCase("en");
}

export function manualContactDetailsEditable(
  contact: Pick<OrganizerContactDocument, "primarySource" | "identityState">
): boolean {
  return contact.primarySource === "hostManual" &&
    contact.identityState === "unlinked";
}

export function manualContactHasIdentityEndpoint(
  contact: {phoneE164: string | null; email: string | null}
): boolean {
  return Boolean(contact.phoneE164 || contact.email);
}

function manualContactEvidenceAttendeeId(contactId: string): string {
  return `manual_${contactId}`;
}

function formContactEvidenceId(responseId: string): string {
  return `form_${responseId}`;
}

interface ManualIdentityLink {
  ref: FirebaseFirestore.DocumentReference;
  data: OrganizerContactIdentityLinkDocument;
}

function proposedContactIdentityLinks(params: {
  db: FirebaseFirestore.Firestore;
  organizerId: string;
  contactId: string;
  evidenceId: string;
  source: OrganizerContactIdentityLinkDocument["source"];
  phoneE164: string | null;
  email: string | null;
  secret: string | null;
  now: FirebaseFirestore.Timestamp;
}): ManualIdentityLink[] {
  const endpoints = [
    {kind: "phone" as const, value: params.phoneE164},
    {kind: "email" as const, value: params.email},
  ].filter((item): item is {kind: "phone" | "email"; value: string} =>
    item.value !== null
  );
  if (endpoints.length === 0) return [];
  if (!params.secret) {
    throw new Error("Proposed contact identity evidence requires a secret.");
  }
  return endpoints.map((endpoint) => {
    const identityHash = organizerIdentityHash(
      params.secret!,
      params.organizerId,
      endpoint.kind,
      endpoint.value
    );
    const identityLinkId = organizerIdentityEvidenceId({
      attendeeId: params.evidenceId,
      kind: endpoint.kind,
      identityHash,
    });
    return {
      ref: params.db.collection("organizerContactIdentityLinks")
        .doc(identityLinkId),
      data: {
        organizerId: params.organizerId,
        contactId: params.contactId,
        originContactId: params.contactId,
        attendeeId: params.evidenceId,
        kind: endpoint.kind,
        identityHash,
        hashVersion: "hmac-sha256-v1",
        confidence: "proposed",
        source: params.source,
        createdAt: params.now,
        updatedAt: params.now,
      },
    };
  });
}

function updateManualContactIdentityLinks(params: {
  tx: FirebaseFirestore.Transaction;
  db: FirebaseFirestore.Firestore;
  organizerId: string;
  contactId: string;
  priorPhoneE164: string | null;
  nextPhoneE164: string | null;
  priorEmail: string | null;
  nextEmail: string | null;
  secret: string;
  now: FirebaseFirestore.Timestamp;
}): void {
  const attendeeId = manualContactEvidenceAttendeeId(params.contactId);
  const changed = [
    {
      kind: "phone" as const,
      prior: params.priorPhoneE164,
      next: params.nextPhoneE164,
    },
    {kind: "email" as const, prior: params.priorEmail, next: params.nextEmail},
  ].filter((item) => item.prior !== item.next);
  for (const item of changed) {
    if (item.prior) {
      const priorHash = organizerIdentityHash(
        params.secret,
        params.organizerId,
        item.kind,
        item.prior
      );
      params.tx.delete(params.db.collection("organizerContactIdentityLinks")
        .doc(organizerIdentityEvidenceId({
          attendeeId,
          kind: item.kind,
          identityHash: priorHash,
        })));
    }
    if (item.next) {
      const identityHash = organizerIdentityHash(
        params.secret,
        params.organizerId,
        item.kind,
        item.next
      );
      const ref = params.db.collection("organizerContactIdentityLinks")
        .doc(organizerIdentityEvidenceId({
          attendeeId,
          kind: item.kind,
          identityHash,
        }));
      params.tx.create(ref, {
        organizerId: params.organizerId,
        contactId: params.contactId,
        originContactId: params.contactId,
        attendeeId,
        kind: item.kind,
        identityHash,
        hashVersion: "hmac-sha256-v1",
        confidence: "proposed",
        source: "hostManual",
        createdAt: params.now,
        updatedAt: params.now,
      } satisfies OrganizerContactIdentityLinkDocument);
    }
  }
}

async function optionalContactQuery<T>(
  operation: Promise<T>,
  section: string,
  organizerId: string,
  contactId: string
): Promise<T | null> {
  try {
    return await operation;
  } catch (error) {
    logger.warn("Optional organizer contact history was unavailable.", {
      section,
      organizerId,
      contactId,
      code: error instanceof Error ? error.name : "unknown",
    });
    return null;
  }
}

async function optionalContactHistory<T>(
  operation: Promise<T[]>,
  section: string,
  organizerId: string,
  contactId: string
): Promise<T[] | null> {
  return optionalContactQuery(operation, section, organizerId, contactId);
}

function normalizeExportPayload(data: unknown): unknown {
  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    return data;
  }
  const normalized = {...data} as Record<string, unknown>;
  for (const field of ["organizerId", "segmentId", "manualTagId", "query"]) {
    if (typeof normalized[field] === "string") {
      normalized[field] = normalized[field].trim();
    }
  }
  return normalized;
}

function effectiveDisplayName(contact: OrganizerContactDocument): string {
  return organizerContactVisibleFields(contact).displayName;
}

function hashEndpoint(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function csvCell(value: string): string {
  const protectedValue = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(protectedValue) ?
    `"${protectedValue.replace(/"/g, "\"\"")}"` : protectedValue;
}

function safeFilePart(value: string): string {
  return value.toLocaleLowerCase("en")
    .replace(/[^a-z0-9_-]+/g, "-").slice(0, 80) || "organizer";
}

function summaryWithoutTrait(
  organizerId: string,
  summary: OrganizerAudienceSummaryDocument | undefined,
  trait: OrganizerContactTraitDocument,
  now: FirebaseFirestore.Timestamp
): OrganizerAudienceSummaryDocument {
  return summaryAfterTraitDelta(organizerId, summary, trait, -1, now);
}

function summaryWithTrait(
  organizerId: string,
  summary: OrganizerAudienceSummaryDocument | undefined,
  trait: OrganizerContactTraitDocument,
  now: FirebaseFirestore.Timestamp,
  defaultSourceCoverage: OrganizerAudienceSourceCoverage = "partial",
): OrganizerAudienceSummaryDocument {
  return summaryAfterTraitDelta(
    organizerId,
    summary,
    trait,
    1,
    now,
    defaultSourceCoverage,
  );
}

function summaryAfterTraitDelta(
  organizerId: string,
  summary: OrganizerAudienceSummaryDocument | undefined,
  trait: OrganizerContactTraitDocument,
  direction: 1 | -1,
  now: FirebaseFirestore.Timestamp,
  defaultSourceCoverage: OrganizerAudienceSourceCoverage = "partial",
): OrganizerAudienceSummaryDocument {
  const value = (current: number | undefined, applies: boolean) => Math.max(
    0,
    (current ?? 0) + (applies ? direction : 0)
  );
  return {
    organizerId,
    contactCount: value(summary?.contactCount, true),
    pastAttendeeCount: value(summary?.pastAttendeeCount,
      trait.attendedEventCount > 0),
    repeatAttendeeCount: value(summary?.repeatAttendeeCount,
      trait.attendedEventCount >= 2),
    linkedAccountCount: value(summary?.linkedAccountCount,
      trait.linkedAccount),
    importedContactCount: value(summary?.importedContactCount,
      trait.importedEventCount > 0),
    advocateCount: value(summary?.advocateCount,
      trait.referredCheckedInCount > 0),
    highImpactAdvocateCount: value(summary?.highImpactAdvocateCount,
      trait.referredCheckedIn365DayCount >= 3),
    whatsappOptInCount: value(summary?.whatsappOptInCount,
      trait.whatsappStatus === "optedIn"),
    smsOptInCount: value(summary?.smsOptInCount,
      trait.smsStatus === "optedIn"),
    sourceCoverage: summary?.sourceCoverage === "exact" ?
      "exact" : defaultSourceCoverage,
    projectionVersion: summary?.projectionVersion ?? 1,
    computedAt: now,
  };
}

export function encodeContactCursor(cursor: ContactCursor): string {
  return Buffer.from(JSON.stringify(cursor)).toString("base64url");
}

export function decodeContactCursor(
  value: string | null
): ContactCursor | null {
  if (!value) return null;
  try {
    const cursor = JSON.parse(
      Buffer.from(value, "base64url").toString("utf8")
    ) as Partial<ContactCursor>;
    if (cursor.version !== 2 || typeof cursor.organizerId !== "string" ||
      cursor.organizerId.length === 0 || !cursor.plan ||
      !["people", "search", "segment", "manualTag"]
        .includes(cursor.plan) || typeof cursor.value !== "string" ||
      typeof cursor.contactId !== "string" || cursor.contactId.length === 0 ||
      !cursor.sort || !["lastSeen", "mostAttended", "name"]
      .includes(cursor.sort) ||
      !(typeof cursor.search === "string" || cursor.search === null) ||
      !(typeof cursor.segmentId === "string" || cursor.segmentId === null) ||
      !(cursor.filterKey === undefined ||
        (typeof cursor.filterKey === "string" &&
        /^[a-f0-9]{64}$/.test(cursor.filterKey))) ||
      !(typeof cursor.manualTagId === "string" ||
        cursor.manualTagId === null)) {
      throw new Error();
    }
    if (cursor.sort !== "name" &&
        (!Number.isSafeInteger(Number(cursor.value)) ||
          Number(cursor.value) < 0)) throw new Error();
    return cursor as ContactCursor;
  } catch {
    throw new HttpsError("invalid-argument", "Audience cursor is invalid.");
  }
}

export const mutateOrganizerContact = onCall(
  appCheckCallableOptionsWithSecrets(
    [organizerContactIdentityKey],
    {timeoutSeconds: 60, maxInstances: 20}
  ),
  (request) => mutateOrganizerContactHandler(request)
);

export const createOrganizerContact = onCall(
  appCheckCallableOptionsWithSecrets(
    [organizerContactIdentityKey],
    {timeoutSeconds: 60, maxInstances: 20}
  ),
  (request) => createOrganizerContactHandler(request)
);

export const createOrganizerContactNote = onCall(
  appCheckCallableOptionsWithLimits({timeoutSeconds: 60, maxInstances: 20}),
  (request) => createOrganizerContactNoteHandler(request)
);

export const mutateOrganizerContactNote = onCall(
  appCheckCallableOptionsWithLimits({timeoutSeconds: 60, maxInstances: 20}),
  (request) => mutateOrganizerContactNoteHandler(request)
);

export const recordOrganizerContactOutreach = onCall(
  appCheckCallableOptionsWithLimits({timeoutSeconds: 60, maxInstances: 20}),
  (request) => recordOrganizerContactOutreachHandler(request)
);

export const exportOrganizerContacts = onCall(
  appCheckCallableOptionsWithLimits({timeoutSeconds: 120, maxInstances: 10}),
  (request) => exportOrganizerContactsHandler(request)
);

function assertCursorPlan(
  cursor: ContactCursor | null,
  plan: ContactCursor["plan"],
  organizerId: string,
  search: string | null,
  segmentId: string | null,
  manualTagId: string | null,
  sort: ContactSort,
  filterKey?: string
): void {
  if (cursor && (cursor.plan !== plan ||
      cursor.organizerId !== organizerId || cursor.search !== search ||
      cursor.segmentId !== segmentId || cursor.manualTagId !== manualTagId ||
      cursor.sort !== sort || cursor.filterKey !== filterKey)) {
    throw new HttpsError(
      "invalid-argument",
      "Audience cursor does not match the selected filters and sort order."
    );
  }
}

function normalizeListContactsPayload(value: unknown): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const input = value as Record<string, unknown>;
  return {
    ...input,
    organizerId: normalizeString(input.organizerId),
    cursor: normalizeNullableString(input.cursor),
    query: normalizeNullableString(input.query),
    segmentId: normalizeNullableString(input.segmentId),
    manualTagId: normalizeNullableString(input.manualTagId),
    sort: normalizeString(input.sort),
  };
}

function normalizeContactDetailPayload(value: unknown): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const input = value as Record<string, unknown>;
  return {
    ...input,
    organizerId: normalizeString(input.organizerId),
    contactId: normalizeString(input.contactId),
  };
}

function normalizeString(value: unknown): unknown {
  return typeof value === "string" ? value.trim() : value;
}

function normalizeNullableString(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const normalized = value.trim();
  return normalized.length === 0 ? null : normalized;
}

export const listOrganizerContacts = onCall(
  appCheckCallableOptionsWithLimits(organizerContactReadCallableLimits),
  (request) => listOrganizerContactsHandler(request)
);

export const getOrganizerContactDetail = onCall(
  appCheckCallableOptionsWithLimits(organizerContactReadCallableLimits),
  (request) => getOrganizerContactDetailHandler(request)
);
