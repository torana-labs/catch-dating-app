import * as admin from "firebase-admin";
import {onDocumentWritten} from "firebase-functions/v2/firestore";
import {isDeepStrictEqual} from "node:util";
import {
  contactPermissionRef,
  contactPermissionStatus,
  readContactPermission,
  type ContactPermission,
} from "../shared/contactPermissions";
import type {
  EventAttendeeDocument,
  EventDocument,
  OrganizerAudienceSummaryDocument,
  OrganizerContactDocument,
  OrganizerContactEventEdgeDocument,
  OrganizerContactIdentityClaimDocument,
  OrganizerContactIdentityLinkDocument,
  OrganizerContactOriginDocument,
  OrganizerContactTraitDocument,
  HostMembershipDocument,
} from "../shared/generated/firestoreAdminTypes";
import {
  attendeeIdentityEvidence,
  OrganizerAudienceContribution,
  organizerAudienceContribution,
  organizerAudienceProjectionVersion,
  organizerContactEventEdge,
  organizerContactId,
  organizerContactTraits,
  organizerIdentityClaimId,
  organizerIdentityEvidenceId,
} from "./organizerAudienceModel";
import {
  classifyCommandReceipt,
  commandReceiptRef,
  writeCommandReceipt,
} from "../shared/commandReceipts";
import {eventTitleLabel} from "../shared/eventLabels";
import {organizerContactIdentityKey} from "./organizerAudienceSecrets";
import {
  attendeeOrganizerContactOrigin,
  organizerContactOriginId,
} from "../shared/organizerContactOrigins";

import {formAdmissionContactId} from "./organizerFormAdmissionIdentity";
import {organizerContactProjectedFields} from "./organizerContactFields";
import {validateHostMembershipDocument} from
  "../shared/generated/validators/hostMembershipDocument";
import {membershipIsEntitled} from "../hostMemberships/entitlement";
import {hostMembershipId} from "../hostMemberships/ids";
import {
  isStaleSourceEvent,
  SourceVersion,
  sourceVersionOf,
} from "../shared/sourceVersion";


export interface AudienceProjectionDeps {
  firestore: () => FirebaseFirestore.Firestore;
  timestamp: () => FirebaseFirestore.Timestamp;
  identitySecret: () => string;
}

const defaultDeps: AudienceProjectionDeps = {
  firestore: () => admin.firestore(),
  timestamp: () => admin.firestore.Timestamp.now(),
  identitySecret: () => organizerContactIdentityKey.value(),
};

/** Projects one canonical operational attendee into the organizer audience. */
export async function projectEventAttendeeToOrganizerAudience(
  attendeeId: string,
  before: EventAttendeeDocument | undefined,
  after: EventAttendeeDocument | undefined,
  projectionEventId?: string,
  deps: AudienceProjectionDeps = defaultDeps,
  attempt = 0
): Promise<void> {
  if (!before && !after) return;
  const db = deps.firestore();
  const edgeRef = db.collection("organizerContactEventEdges").doc(attendeeId);
  const existingEdgeSnap = await edgeRef.get();
  const existingEdge = existingEdgeSnap.data() as
    OrganizerContactEventEdgeDocument | undefined;
  const affectedContactIds = new Set<string>();
  const receiptBase = projectionEventId ?? deterministicAttendeeReceiptId(
    attendeeId,
    after ?? before!
  );

  if (!after) {
    if (!existingEdge) return;
    affectedContactIds.add(existingEdge.contactId);
    const removed = await db.runTransaction(async (tx) => {
      const [currentEdgeSnap, currentAttendeeSnap, evidenceSnap] =
        await Promise.all([
          tx.get(edgeRef),
          tx.get(db.collection("eventAttendees").doc(attendeeId)),
          tx.get(db.collection("organizerContactIdentityLinks")
            .where("attendeeId", "==", attendeeId)),
        ]);
      const current = currentEdgeSnap.data() as
        OrganizerContactEventEdgeDocument | undefined;
      if (!current || currentAttendeeSnap.exists ||
          current.sourceUpdatedAt.toMillis() > before!.updatedAt.toMillis()) {
        return null;
      }
      tx.delete(edgeRef);
      for (const evidence of evidenceSnap.docs) tx.delete(evidence.ref);
      return current.contactId;
    });
    if (removed === null) return;
    await rebuildOrganizerContact(
      removed,
      `${receiptBase}|${removed}`,
      deps
    );
    return;
  }
  if (existingEdge && existingEdge.sourceUpdatedAt.toMillis() >
      after.updatedAt.toMillis()) {
    return;
  }

  const now = deps.timestamp();
  const evidence = attendeeIdentityEvidence({
    attendee: after,
    secret: deps.identitySecret(),
  });
  const verifiedEvidence = evidence.filter((item) =>
    item.confidence === "verified" &&
      (item.kind === "uid" || item.kind === "phone")
  );
  const claimRefs = verifiedEvidence.map((item) => db
    .collection("organizerContactIdentityClaims")
    .doc(organizerIdentityClaimId(item.identityHash)));
  const admissionContactId = existingEdge ? null :
    await formAdmissionContactId({db, attendeeId, attendee: after});
  const fallbackContactId = existingEdge?.contactId ?? admissionContactId ??
    organizerContactId(after.organizerId, attendeeId);
  const proposedCandidateIds = new Set<string>();
  for (const item of verifiedEvidence) {
    const candidates = await db.collection("organizerContactIdentityLinks")
      .where("identityHash", "==", item.identityHash)
      .limit(21)
      .get();
    for (const candidate of candidates.docs) {
      const link = candidate.data() as OrganizerContactIdentityLinkDocument;
      if (link.organizerId === after.organizerId) {
        proposedCandidateIds.add(link.contactId);
      }
    }
  }
  const desiredContactId = proposedCandidateIds.size === 1 ?
    [...proposedCandidateIds][0] : fallbackContactId;
  const claimResolution = claimRefs.length === 0 ? {
    contactId: desiredContactId,
    ambiguousContactIds: proposedCandidateIds.size > 1 ?
      [...proposedCandidateIds] : [] as string[],
  } : await db.runTransaction(async (tx) => {
    const claimSnaps = await Promise.all(claimRefs.map((ref) => tx.get(ref)));
    const claimedContactIds = new Set(claimSnaps
      .filter((snap) => snap.exists)
      .map((snap) => (snap.data() as OrganizerContactIdentityClaimDocument)
        .verifiedContactId));
    const contactId = claimedContactIds.size === 1 ?
      [...claimedContactIds][0] : desiredContactId;
    const allContactIds = new Set([...claimedContactIds, contactId]);
    const conflicted = allContactIds.size > 1;
    for (let index = 0; index < claimRefs.length; index += 1) {
      const claimRef = claimRefs[index];
      const snap = claimSnaps[index];
      const existing = snap.data() as
        OrganizerContactIdentityClaimDocument | undefined;
      const claim: OrganizerContactIdentityClaimDocument = {
        organizerId: after.organizerId,
        kind: verifiedEvidence[index].kind as "uid" | "phone",
        identityHash: verifiedEvidence[index].identityHash,
        hashVersion: "hmac-sha256-v1",
        verifiedContactId: existing?.verifiedContactId ?? contactId,
        originVerifiedContactId: existing?.originVerifiedContactId ??
          existing?.verifiedContactId ?? contactId,
        state: conflicted ? "conflicted" : "verified",
        conflictingContactIds: conflicted ? [...allContactIds]
          .filter((candidate) =>
            candidate !== (existing?.verifiedContactId ?? contactId)
          ).slice(0, 20) : [],
        revision: Math.max(existing?.revision ?? 0, now.toMillis(), 1),
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      };
      if (existing) tx.set(claimRef, claim);
      else tx.create(claimRef, claim);
    }
    const proposedAmbiguities = proposedCandidateIds.size > 1 ?
      [...proposedCandidateIds].filter((candidate) => candidate !== contactId) :
      [];
    return {
      contactId,
      ambiguousContactIds: [...new Set([
        ...(conflicted ? [...allContactIds]
          .filter((candidate) => candidate !== contactId) : []),
        ...proposedAmbiguities,
      ])],
    };
  });
  const contactId = claimResolution.contactId;
  const origin = attendeeOrganizerContactOrigin({
    attendeeId,
    attendee: after,
    contactId,
    originContactId: existingEdge?.originContactId ?? contactId,
    now,
  });
  const originRef = db.collection("organizerContactOrigins").doc(
    organizerContactOriginId({
      organizerId: origin.organizerId,
      sourceKind: origin.sourceKind,
      sourceEntityKind: origin.sourceEntityKind,
      sourceEntityId: origin.sourceEntityId,
    })
  );

  if (existingEdge && existingEdge.contactId !== contactId) {
    affectedContactIds.add(existingEdge.contactId);
  }
  affectedContactIds.add(contactId);

  const eventSnap = await db.collection("events").doc(after.eventId).get();
  const event = eventSnap.data() as EventDocument | undefined;
  const existingContactRef = db.collection("organizerContacts").doc(contactId);
  const sender = {kind: "organizer" as const, organizerId: after.organizerId};
  const permissionRef = after.linkedUid === null ? null :
    contactPermissionRef(db, after.linkedUid, sender);
  const [existingContactSnap, permissionSnap, originSnap] = await Promise.all([
    existingContactRef.get(),
    permissionRef?.get() ?? Promise.resolve(null),
    originRef.get(),
  ]);
  const existingContact = existingContactSnap.data() as
    OrganizerContactDocument | undefined;
  const permission = readContactPermission(permissionSnap?.data(), sender);
  const edge = organizerContactEventEdge({
    attendeeId,
    attendee: after,
    contactId,
    eventStartAt: event?.startTime ?? null,
    eventEndAt: event?.endTime ?? null,
    eventDisplayName: event ? eventTitleLabel(event) : null,
    eventOriginMode: event?.eventOrigin?.mode ?? null,
    eventProvider: event?.eventOrigin?.provider ?? null,
    now,
    existing: existingEdge?.contactId === contactId ? existingEdge : undefined,
  });
  const contact = buildOrganizerContact({
    attendee: after,
    existing: existingContact,
    edge,
    ambiguousCandidateContactIds: claimResolution.ambiguousContactIds,
    permission,
    now,
  });
  const currentEvidenceIds = new Set(evidence.map((item) =>
    organizerIdentityEvidenceId({
      attendeeId, kind: item.kind, identityHash: item.identityHash,
    })
  ));
  const projected = await db.runTransaction(async (tx) => {
    const [currentSnap, currentEdgeSnap, currentOriginSnap,
      currentEvidenceSnap] = await Promise.all([
      tx.get(existingContactRef), tx.get(edgeRef), tx.get(originRef),
      tx.get(db.collection("organizerContactIdentityLinks")
        .where("attendeeId", "==", attendeeId)),
    ]);
    const current = currentSnap.data() as
      OrganizerContactDocument | undefined;
    const currentEdge = currentEdgeSnap.data() as
      OrganizerContactEventEdgeDocument | undefined;
    const currentOrigin = currentOriginSnap.data() as
      OrganizerContactOriginDocument | undefined;
    const observedOrigin = originSnap.data() as
      OrganizerContactOriginDocument | undefined;
    if (currentEdge && currentEdge.sourceUpdatedAt.toMillis() >
        after.updatedAt.toMillis()) return "superseded";
    if (currentEdge?.contactId !== existingEdge?.contactId ||
        currentOrigin?.currentContactId !== observedOrigin?.currentContactId ||
        current?.identityState === "merged") return "retry";
    if (current && current.organizerId !== after.organizerId) {
      return "superseded";
    }
    if (!current) tx.create(existingContactRef, contact);
    else if (current.hiddenAt == null) {
      // Preserve current manager fields and source endpoints.
      tx.update(existingContactRef, {
        ambiguousCandidateContactIds: claimResolution.ambiguousContactIds,
        ...(permission ? contactPermissionStatuses(permission,
          current.phoneE164) : {}),
        revision: Math.max(current.revision + 1, now.toMillis()),
        updatedAt: now,
      });
    }
    tx.set(edgeRef, edge);
    tx.set(originRef, currentOrigin ? {
      ...currentOrigin, currentContactId: contactId,
    } : origin);
    for (const previous of currentEvidenceSnap.docs) {
      if (!currentEvidenceIds.has(previous.id)) tx.delete(previous.ref);
    }
    for (const item of evidence) {
      const evidenceId = organizerIdentityEvidenceId({
        attendeeId, kind: item.kind, identityHash: item.identityHash,
      });
      const previous = currentEvidenceSnap.docs.find((doc) =>
        doc.id === evidenceId)?.data() as
          OrganizerContactIdentityLinkDocument | undefined;
      const link: OrganizerContactIdentityLinkDocument = {
        organizerId: after.organizerId, contactId,
        originContactId: previous?.originContactId ?? contactId,
        attendeeId, kind: item.kind, identityHash: item.identityHash,
        hashVersion: "hmac-sha256-v1", confidence: item.confidence,
        source: after.source, createdAt: after.createdAt, updatedAt: now,
      };
      tx.set(db.collection("organizerContactIdentityLinks").doc(evidenceId),
        link, {merge: true});
    }
    return "projected";
  });
  if (projected === "retry") {
    if (attempt >= 2) {
      throw new Error("Audience source ownership changed during projection.");
    }
    return projectEventAttendeeToOrganizerAudience(
      attendeeId, before, after, projectionEventId, deps, attempt + 1
    );
  }
  if (projected !== "projected") return;

  for (const affectedContactId of affectedContactIds) {
    await rebuildOrganizerContact(
      affectedContactId,
      `${receiptBase}|${affectedContactId}`,
      deps
    );
  }
}

/** Rebuilds contact fields and traits from canonical event edges. */
export async function rebuildOrganizerContact(
  contactId: string,
  summaryEventId: string,
  deps: AudienceProjectionDeps = defaultDeps
): Promise<void> {
  const db = deps.firestore();
  const contactRef = db.collection("organizerContacts").doc(contactId);
  const traitRef = db.collection("organizerContactTraits").doc(contactId);
  const contactSnap = await contactRef.get();
  const contact = contactSnap.data() as OrganizerContactDocument | undefined;
  if (!contact) return;
  const attributions = db.collection("eventInviteAttributions")
    .where("organizerId", "==", contact.organizerId)
    .where("ownerContactId", "==", contactId)
    .where("referralCredit", "==", true);
  const recentCheckIns = attributions
    .where("factKind", "==", "checkIn")
    .where("occurredAt", ">=", admin.firestore.Timestamp.fromMillis(
      deps.timestamp().toMillis() - 365 * 24 * 60 * 60 * 1000
    ));
  const [registrationCredit, registrationReversal,
    attendanceCredit, attendanceReversal,
    recentAttendanceCredit, recentAttendanceReversal] = await Promise.all([
    attributions.where("factKind", "==", "registration")
      .where("operation", "==", "credit").count().get(),
    attributions.where("factKind", "==", "registration")
      .where("operation", "==", "reversal").count().get(),
    attributions.where("factKind", "==", "checkIn")
      .where("operation", "==", "credit").count().get(),
    attributions.where("factKind", "==", "checkIn")
      .where("operation", "==", "reversal").count().get(),
    recentCheckIns.where("operation", "==", "credit").count().get(),
    recentCheckIns.where("operation", "==", "reversal").count().get(),
  ]);
  const referredRegistrationCount = Math.max(
    0,
    registrationCredit.data().count - registrationReversal.data().count
  );
  const referredCheckedInCount = Math.max(
    0,
    attendanceCredit.data().count - attendanceReversal.data().count
  );
  const referredCheckedIn365DayCount = Math.max(
    0,
    recentAttendanceCredit.data().count -
      recentAttendanceReversal.data().count
  );
  const now = deps.timestamp();
  const receiptRef = commandReceiptRef(db, "rebuildOrganizerContact",
    summaryEventId);
  const summaryRef = db.collection("organizerAudienceSummaries")
    .doc(contact.organizerId);
  await db.runTransaction(async (tx) => {
    const [currentContactSnap, edgesSnap, originsSnap, receiptSnap,
      summarySnap, traitSnap] = await Promise.all([
      tx.get(contactRef),
      tx.get(db.collection("organizerContactEventEdges")
        .where("contactId", "==", contactId)),
      tx.get(db.collection("organizerContactOrigins")
        .where("organizerId", "==", contact.organizerId)
        .where("currentContactId", "==", contactId)),
      tx.get(receiptRef), tx.get(summaryRef), tx.get(traitRef),
    ]);
    const current = currentContactSnap.data() as
      OrganizerContactDocument | undefined;
    if (classifyCommandReceipt(receiptSnap, {
      command: "rebuildOrganizerContact", nowMillis: now.toMillis(),
    }).kind !== "none" || !current ||
        current.organizerId !== contact.organizerId ||
        current.hiddenAt != null || current.identityState === "merged") return;
    const edges = edgesSnap.docs.map((doc) =>
      doc.data() as OrganizerContactEventEdgeDocument
    ).filter((edge) => edge.organizerId === current.organizerId);
    const origins = originsSnap.docs.map((doc) =>
      doc.data() as OrganizerContactOriginDocument);
    // Origins establish relationship lifetime, not field-specific disclosure.
    const hasStandaloneOrigin = origins.some((origin) =>
      origin.sourceEntityKind === "manualEntry" ||
      origin.sourceEntityKind === "hostFormResponse" ||
      origin.sourceEntityKind === "hostApplicationResponse"
    );
    const active = edges.length > 0 || hasStandaloneOrigin;
    const fields = organizerContactProjectedFields({
      contact: current, edges, hasStandaloneOrigin,
    });
    const linkedUid = [...edges].sort(compareContactEdges)
      .find((edge) => edge.linkedUid !== null)?.linkedUid ??
        (hasStandaloneOrigin ? current.linkedUid : null);
    // Paid membership is keyed by the linked account, never by phone match.
    const membership = linkedUid === null ? null :
      contactMembershipProjection((await tx.get(db
        .collection("hostMemberships")
        .doc(hostMembershipId(current.organizerId, linkedUid)))).data(),
      current.organizerId, linkedUid, now.toMillis());
    const rebuilt: OrganizerContactDocument = {
      ...current,
      ...fields,
      searchName: (current.displayNameOverride ?? fields.displayName)
        .toLocaleLowerCase("en"),
      linkedUid,
      identityState: current.ambiguousCandidateContactIds.length > 0 ?
        "ambiguous" : linkedUid !== null ? "verified" : "unlinked",
      identityConfidence: linkedUid !== null ? "verified" :
        fields.phoneE164 !== null || fields.email !== null ?
          "proposed" : "eventOnly",
      firstSeenAt: [current.firstSeenAt,
        ...edges.map((edge) => edge.sourceCreatedAt)].sort(compareTimestamp)[0],
      lastSeenAt: [current.lastSeenAt,
        ...edges.map((edge) => edge.sourceUpdatedAt)]
        .sort(compareTimestamp).at(-1)!,
      sourceCount: Math.max(origins.length, edges.length),
      revision: Math.max(current.revision + 1, now.toMillis()),
      updatedAt: now,
      deletedAt: active ? null : now,
    };
    const afterTrait = active ? organizerContactTraits({
      contactId, contact: rebuilt, edges, now,
      referredRegistrationCount, referredCheckedInCount,
      referredCheckedIn365DayCount, membership,
    }) ?? undefined : undefined;
    const beforeTrait = traitSnap.data() as
      OrganizerContactTraitDocument | undefined;
    const summary = audienceSummaryAfterDelta({
      organizerId: current.organizerId,
      existing: summarySnap.data() as
        OrganizerAudienceSummaryDocument | undefined,
      before: organizerAudienceContribution(beforeTrait),
      after: organizerAudienceContribution(afterTrait), now,
    });
    tx.set(contactRef, rebuilt);
    if (afterTrait) tx.set(traitRef, afterTrait);
    else tx.delete(traitRef);
    tx.set(summaryRef, summary);
    writeCommandReceipt(tx, receiptRef, {
      command: "rebuildOrganizerContact", retention: "trigger",
      nowMillis: now.toMillis(),
    });
  });
}

/**
 * The CRM statuses one contact gets from a person's contact permission for
 * its organizer: the marketing answer at the contact's own phone, so only an
 * effective grant for that number counts as opted in.
 */
export function contactPermissionStatuses(
  permission: ContactPermission | null,
  phoneE164: string | null): Pick<OrganizerContactDocument,
    "whatsappStatus" | "smsStatus"> {
  return {
    whatsappStatus: contactPermissionStatus(permission, "whatsapp:marketing",
      phoneE164),
    smsStatus: contactPermissionStatus(permission, "sms:marketing",
      phoneE164),
  };
}

/**
 * Writes one person's effective WhatsApp and SMS status onto each of their
 * verified contacts for that organizer. The status never comes from a trigger
 * payload: each contact's transaction re-reads the contact permission, so a
 * late delivery of an older opt-in cannot overwrite a newer opt-out. An event
 * older than the permission's current updateTime writes nothing; the newer
 * event (retried until it succeeds) owns the status.
 * @return {Promise<string[]>} Ids of the contacts it updated.
 */
export async function applyOrganizerCommunicationStatuses(params: {
  organizerId: string;
  uid: string;
  eventVersion?: SourceVersion;
}, deps: AudienceProjectionDeps = defaultDeps): Promise<string[]> {
  const {organizerId, uid, eventVersion} = params;
  const db = deps.firestore();
  const sender = {kind: "organizer" as const, organizerId};
  const permissionRef = contactPermissionRef(db, uid, sender);
  const contactsSnap = await db.collection("organizerContacts")
    .where("organizerId", "==", organizerId)
    .where("linkedUid", "==", uid)
    .get();
  const updated: string[] = [];
  for (const doc of contactsSnap.docs) {
    const wrote = await db.runTransaction(async (tx) => {
      const [permissionSnap, contactSnap] = await Promise.all([
        tx.get(permissionRef), tx.get(doc.ref),
      ]);
      if (isStaleSourceEvent(permissionSnap, eventVersion)) return false;
      const contact = contactSnap.data() as OrganizerContactDocument |
        undefined;
      if (!contact || contact.organizerId !== organizerId ||
          contact.linkedUid !== uid) return false;
      const permission = readContactPermission(permissionSnap.data(),
        sender);
      const now = deps.timestamp();
      tx.update(doc.ref, {
        ...contactPermissionStatuses(permission, contact.phoneE164),
        revision: Math.max(contact.revision + 1, now.toMillis()),
        updatedAt: now,
      });
      return true;
    });
    if (wrote) updated.push(doc.id);
  }
  return updated;
}

/**
 * Applies a person's organizer contact permission to every verified UID
 * contact, then rebuilds each updated contact. The payload only names the
 * person and the sender; the status is re-read from the permission. Catch's
 * own permission has no CRM contacts.
 */
export async function projectContactPermission(
  uid: string,
  senderKey: string,
  before: ContactPermission | undefined,
  after: ContactPermission | undefined,
  eventVersion?: SourceVersion,
  projectionEventId?: string,
  deps: AudienceProjectionDeps = defaultDeps
): Promise<void> {
  const permission = after ?? before;
  if (!permission || permission.senderKind !== "organizer" ||
      senderKey !== `organizer_${permission.senderId}`) return;
  const organizerId = permission.senderId;
  const receiptBase = projectionEventId ??
    `permission:${organizerId}:${uid}:${permission.updatedAt.toMillis()}`;
  const updated = await applyOrganizerCommunicationStatuses({
    organizerId,
    uid,
    eventVersion,
  }, deps);
  for (const contactId of updated) {
    await rebuildOrganizerContact(
      contactId,
      `${receiptBase}|${contactId}`,
      deps
    );
  }
}

/** Applies one trait contribution exactly once to the summary. */
export async function applyOrganizerAudienceSummaryDelta(
  eventId: string,
  before: OrganizerContactTraitDocument | undefined,
  after: OrganizerContactTraitDocument | undefined,
  deps: AudienceProjectionDeps = defaultDeps
): Promise<void> {
  const organizerId = after?.organizerId ?? before?.organizerId;
  if (!organizerId) return;
  const db = deps.firestore();
  const now = deps.timestamp();
  const receiptRef = commandReceiptRef(db, "applyOrganizerAudienceSummaryDelta",
    eventId);
  const summaryRef = db.collection("organizerAudienceSummaries")
    .doc(organizerId);
  const beforeContribution = organizerAudienceContribution(before);
  const afterContribution = organizerAudienceContribution(after);
  await db.runTransaction(async (tx) => {
    const [receiptSnap, summarySnap] = await Promise.all([
      tx.get(receiptRef),
      tx.get(summaryRef),
    ]);
    if (classifyCommandReceipt(receiptSnap, {
      command: "applyOrganizerAudienceSummaryDelta",
      nowMillis: now.toMillis(),
    }).kind !== "none") return;
    const existing = summarySnap.data() as
      OrganizerAudienceSummaryDocument | undefined;
    const summary = audienceSummaryAfterDelta({
      organizerId,
      existing,
      before: beforeContribution,
      after: afterContribution,
      now,
    });
    tx.set(summaryRef, summary);
    writeCommandReceipt(tx, receiptRef, {
      command: "applyOrganizerAudienceSummaryDelta", retention: "trigger",
      nowMillis: now.toMillis(),
    });
  });
}

/** Recomputes one organizer summary from indexed trait aggregations. */
export async function rebuildOrganizerAudienceSummary(
  organizerId: string,
  sourceCoverage: OrganizerAudienceSummaryDocument["sourceCoverage"],
  deps: Pick<AudienceProjectionDeps, "firestore" | "timestamp"> = defaultDeps
): Promise<OrganizerAudienceSummaryDocument> {
  const db = deps.firestore();
  const traits = db.collection("organizerContactTraits")
    .where("organizerId", "==", organizerId);
  const [
    contactCount,
    pastAttendeeCount,
    repeatAttendeeCount,
    linkedAccountCount,
    importedContactCount,
    advocateCount,
    highImpactAdvocateCount,
    whatsappOptInCount,
    smsOptInCount,
  ] = await Promise.all([
    traits.count().get(),
    traits.where("attendedEventCount", ">", 0).count().get(),
    traits.where("attendedEventCount", ">", 1).count().get(),
    traits.where("linkedAccount", "==", true).count().get(),
    traits.where("importedEventCount", ">", 0).count().get(),
    traits.where("segmentIds", "array-contains", "advocate").count().get(),
    traits.where("referredCheckedIn365DayCount", ">=", 3).count().get(),
    traits.where("whatsappStatus", "==", "optedIn").count().get(),
    traits.where("smsStatus", "==", "optedIn").count().get(),
  ]);
  const summary: OrganizerAudienceSummaryDocument = {
    organizerId,
    contactCount: contactCount.data().count,
    pastAttendeeCount: pastAttendeeCount.data().count,
    repeatAttendeeCount: repeatAttendeeCount.data().count,
    linkedAccountCount: linkedAccountCount.data().count,
    importedContactCount: importedContactCount.data().count,
    advocateCount: advocateCount.data().count,
    highImpactAdvocateCount: highImpactAdvocateCount.data().count,
    whatsappOptInCount: whatsappOptInCount.data().count,
    smsOptInCount: smsOptInCount.data().count,
    sourceCoverage,
    projectionVersion: organizerAudienceProjectionVersion,
    computedAt: deps.timestamp(),
  };
  await db.collection("organizerAudienceSummaries").doc(organizerId)
    .set(summary);
  return summary;
}

export function audienceSummaryAfterDelta(params: {
  organizerId: string;
  existing?: OrganizerAudienceSummaryDocument;
  before: OrganizerAudienceContribution;
  after: OrganizerAudienceContribution;
  now: FirebaseFirestore.Timestamp;
}): OrganizerAudienceSummaryDocument {
  const value = (field: keyof OrganizerAudienceContribution) => Math.max(
    0,
    (params.existing?.[field] ?? 0) - params.before[field] +
      params.after[field]
  );
  return {
    organizerId: params.organizerId,
    contactCount: value("contactCount"),
    pastAttendeeCount: value("pastAttendeeCount"),
    repeatAttendeeCount: value("repeatAttendeeCount"),
    linkedAccountCount: value("linkedAccountCount"),
    importedContactCount: value("importedContactCount"),
    advocateCount: value("advocateCount"),
    highImpactAdvocateCount: value("highImpactAdvocateCount"),
    whatsappOptInCount: value("whatsappOptInCount"),
    smsOptInCount: value("smsOptInCount"),
    sourceCoverage: params.existing?.sourceCoverage ?? "partial",
    projectionVersion: organizerAudienceProjectionVersion,
    computedAt: params.now,
  };
}

function buildOrganizerContact(params: {
  attendee: EventAttendeeDocument;
  existing?: OrganizerContactDocument;
  edge: OrganizerContactEventEdgeDocument;
  ambiguousCandidateContactIds: string[];
  permission?: ContactPermission | null;
  now: FirebaseFirestore.Timestamp;
}): OrganizerContactDocument {
  const {attendee, existing, edge, now} = params;
  const linked = attendee.linkedUid !== null;
  return {
    organizerId: attendee.organizerId,
    displayName: attendee.displayName,
    searchName: (existing?.displayNameOverride ?? attendee.displayName)
      .toLocaleLowerCase("en"),
    linkedUid: attendee.linkedUid ?? existing?.linkedUid ?? null,
    phoneE164: attendee.phoneE164 ?? existing?.phoneE164 ?? null,
    email: edge.email ?? existing?.email ?? null,
    identityState: params.ambiguousCandidateContactIds.length > 0 ?
      "ambiguous" : linked ? "verified" : "unlinked",
    identityConfidence: linked ? "verified" :
      attendee.phoneE164 !== null || attendee.email !== null ?
        "proposed" : "eventOnly",
    primarySource: existing?.primarySource ?? attendee.source,
    ambiguousCandidateContactIds: params.ambiguousCandidateContactIds,
    firstSeenAt: existing?.firstSeenAt ?? attendee.createdAt,
    lastSeenAt: attendee.updatedAt,
    sourceCount: existing?.sourceCount ?? 1,
    ...(params.permission ? contactPermissionStatuses(params.permission,
      attendee.phoneE164 ?? existing?.phoneE164 ?? null) : {
      whatsappStatus: existing?.whatsappStatus ?? "unknown",
      smsStatus: existing?.smsStatus ?? "unknown",
    }),
    revision: Math.max(existing?.revision ?? 0, now.toMillis(), 1),
    mergedIntoContactId: existing?.mergedIntoContactId ?? null,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    deletedAt: null,
    manualTagIds: existing?.manualTagIds ?? [],
    displayNameOverride: existing?.displayNameOverride ?? null,
    hiddenAt: existing?.hiddenAt ?? null,
    hiddenBy: existing?.hiddenBy ?? null,
    hiddenTraitSnapshot: existing?.hiddenTraitSnapshot ?? null,
  };
}

function compareContactEdges(
  left: OrganizerContactEventEdgeDocument,
  right: OrganizerContactEventEdgeDocument
): number {
  const identityDifference = Number(right.linkedUid !== null) -
    Number(left.linkedUid !== null);
  if (identityDifference !== 0) return identityDifference;
  return right.sourceUpdatedAt.toMillis() - left.sourceUpdatedAt.toMillis();
}

function compareTimestamp(
  left: FirebaseFirestore.Timestamp,
  right: FirebaseFirestore.Timestamp
): number {
  return left.toMillis() - right.toMillis();
}

function deterministicAttendeeReceiptId(
  attendeeId: string,
  attendee: EventAttendeeDocument
): string {
  return `attendee:${attendeeId}:${attendee.updatedAt.toMillis()}:` +
    `${attendee.status}:${attendee.linkedUid ?? "unlinked"}`;
}

// Retried: many roster rows for one organizer written together (a roster
// import, a copy-forward) contend on the organizer's audience documents, and
// an aborted transaction would otherwise drop that row's contact edge. Each
// run is idempotent: receipts are keyed by the event id and a stale write is
// ignored by sourceUpdatedAt.
export const onEventAttendeeAudienceProjected = onDocumentWritten(
  {
    document: "eventAttendees/{attendeeId}",
    secrets: [organizerContactIdentityKey],
    retry: true,
  },
  async (event) => {
    const before = event.data?.before.data() as
      EventAttendeeDocument | undefined;
    const after = event.data?.after.data() as
      EventAttendeeDocument | undefined;
    await projectEventAttendeeToOrganizerAudience(
      event.params.attendeeId,
      before,
      after,
      event.id
    );
  }
);

// Retried: the status is re-read from the contact permission in each
// contact's transaction, stale events write nothing, and rebuild receipts
// are keyed by the event id, so a rerun is idempotent. It keeps its name from
// when organizer consent lived in organizerCommunicationPreferences
// (issue #2460), so moving the source adds no Function.
export const onOrganizerCommunicationPreferenceAudienceProjected =
  onDocumentWritten(
    {document: "users/{uid}/contactPermissions/{senderKey}", retry: true},
    async (event) => {
      const before = event.data?.before.data() as
        ContactPermission | undefined;
      const after = event.data?.after.data() as
        ContactPermission | undefined;
      await projectContactPermission(
        event.params.uid,
        event.params.senderKey,
        before,
        after,
        sourceVersionOf(event.data?.after),
        event.id
      );
    }
  );

/** CRM view of a validated paid membership; anything else reads as none. */
export function contactMembershipProjection(raw: unknown, organizerId: string,
  uid: string, nowMillis: number):
  NonNullable<OrganizerContactTraitDocument["membership"]> | null {
  if (!validateHostMembershipDocument(raw) || raw.organizerId !== organizerId ||
      raw.uid !== uid) return null;
  return {planId: raw.planId, planName: raw.planName, status: raw.status,
    memberSinceMillis: raw.memberSinceMillis,
    entitled: membershipIsEntitled(raw, nowMillis)};
}

/** Rebuilds every contact linked to a member after their membership moves. */
export async function projectHostMembershipToContacts(params: {
  organizerId: string; uid: string; projectionEventId: string;
}, deps: AudienceProjectionDeps = defaultDeps): Promise<number> {
  const db = deps.firestore();
  const contacts = await db.collection("organizerContacts")
    .where("organizerId", "==", params.organizerId)
    .where("linkedUid", "==", params.uid)
    .limit(20).get();
  for (const doc of contacts.docs) {
    await rebuildOrganizerContact(doc.id,
      `${params.projectionEventId}|${doc.id}`, deps);
  }
  return contacts.size;
}

const SAVINGS_FIELDS = ["savedInPaise", "memberPricedBookings"];

/**
 * Whether a membership write changed only the savings totals the benefit-use
 * trigger keeps, which no contact trait reads.
 * @param {FirebaseFirestore.DocumentData|undefined} before The old document.
 * @param {FirebaseFirestore.DocumentData|undefined} after The new document.
 * @return {boolean} True when nothing but the totals changed.
 */
export function onlySavingsChanged(
  before: FirebaseFirestore.DocumentData | undefined,
  after: FirebaseFirestore.DocumentData | undefined): boolean {
  if (!before || !after) return false;
  const strip = (data: FirebaseFirestore.DocumentData) => Object.fromEntries(
    Object.entries(data).filter(([key]) => !SAVINGS_FIELDS.includes(key)));
  return isDeepStrictEqual(strip(before), strip(after));
}

export const onHostMembershipAudienceProjected = onDocumentWritten(
  "hostMemberships/{membershipId}",
  async (event) => {
    if (onlySavingsChanged(event.data?.before.data(),
      event.data?.after.data())) return;
    const membership = (event.data?.after.data() ??
      event.data?.before.data()) as HostMembershipDocument | undefined;
    if (!membership?.organizerId || !membership.uid) return;
    await projectHostMembershipToContacts({
      organizerId: membership.organizerId, uid: membership.uid,
      projectionEventId: `hostMembership:${event.id}`});
  }
);
