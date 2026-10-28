import {createHash, createHmac} from "crypto";
import type {
  EventAttendeeDocument,
  OrganizerContactDocument,
  OrganizerContactEventEdgeDocument,
  OrganizerContactIdentityLinkDocument,
  OrganizerContactTraitDocument,
} from "../shared/generated/firestoreAdminTypes";

export const organizerAudienceProjectionVersion = 1;
export const organizerAudienceDefinitionVersion = 4;
export const organizerIdentityHashVersion = "hmac-sha256-v1" as const;
export const organizerPastAttendeeSegmentId = "past_attendee" as const;

export type OrganizerIdentityKind =
  OrganizerContactIdentityLinkDocument["kind"];

export interface OrganizerIdentityEvidence {
  kind: OrganizerIdentityKind;
  identityHash: string;
  confidence: OrganizerContactIdentityLinkDocument["confidence"];
}

/**
 * Matches a computed CRM segment while preserving pre-v3 trait compatibility.
 *
 * `past_attendee` was added after existing traits had already been projected,
 * so its numeric source fact remains authoritative until every document is
 * naturally recomputed. Other segments continue to use their stored ids.
 */
export function organizerContactTraitMatchesSegment(
  trait: OrganizerContactTraitDocument,
  segmentId: OrganizerContactTraitDocument["segmentIds"][number]
): boolean {
  return segmentId === organizerPastAttendeeSegmentId ?
    trait.attendedEventCount > 0 :
    trait.segmentIds.includes(segmentId);
}

/** Creates a stable, opaque contact id without using raw attendee PII. */
export function organizerContactId(
  organizerId: string,
  attendeeId: string
): string {
  return `oc_${sha256(`${organizerId}|attendee|${attendeeId}`).slice(0, 48)}`;
}

/** Creates a restricted organizer-scoped keyed identity hash. */
export function organizerIdentityHash(
  secret: string,
  organizerId: string,
  kind: OrganizerIdentityKind,
  normalizedValue: string
): string {
  if (secret.length < 32) {
    throw new Error("ORGANIZER_CONTACT_IDENTITY_KEY must be at least 32 chars");
  }
  return createHmac("sha256", secret)
    .update(`${organizerId}|${kind}|${normalizedValue}`)
    .digest("hex");
}

/** Returns identity evidence; imported endpoints remain unverified. */
export function attendeeIdentityEvidence(params: {
  attendee: EventAttendeeDocument;
  secret: string;
}): OrganizerIdentityEvidence[] {
  const {attendee, secret} = params;
  const values: Array<{
    kind: OrganizerIdentityKind;
    value: string | null;
    verified: boolean;
  }> = [
    {kind: "uid", value: attendee.linkedUid, verified: true},
    {
      kind: "phone",
      value: attendee.phoneE164,
      verified: attendee.linkedUid !== null,
    },
    {
      kind: "email",
      value: attendee.email?.trim().toLocaleLowerCase("en") ?? null,
      verified: false,
    },
  ];
  return values
    .filter((item): item is typeof item & {value: string} =>
      typeof item.value === "string" && item.value.length > 0
    )
    .map((item) => ({
      kind: item.kind,
      identityHash: organizerIdentityHash(
        secret,
        attendee.organizerId,
        item.kind,
        item.value
      ),
      confidence: item.verified ? "verified" : "proposed",
    }));
}

/** Creates a deterministic evidence document id for one attendee identity. */
export function organizerIdentityEvidenceId(params: {
  attendeeId: string;
  kind: OrganizerIdentityKind;
  identityHash: string;
}): string {
  return `ocie_${sha256(
    `${params.attendeeId}|${params.kind}|${params.identityHash}`
  ).slice(0, 48)}`;
}

/** Creates a deterministic singleton verified-identity claim id. */
export function organizerIdentityClaimId(identityHash: string): string {
  return `ocic_${identityHash.slice(0, 48)}`;
}

/** Maps one canonical attendee into a rebuildable organizer event edge. */
export function organizerContactEventEdge(params: {
  attendeeId: string;
  attendee: EventAttendeeDocument;
  contactId: string;
  eventStartAt: FirebaseFirestore.Timestamp | null;
  eventEndAt: FirebaseFirestore.Timestamp | null;
  eventDisplayName: string | null;
  eventOriginMode: "catchNative" | "externalCompanion" | null;
  eventProvider: OrganizerContactEventEdgeDocument["eventProvider"];
  now: FirebaseFirestore.Timestamp;
  existing?: OrganizerContactEventEdgeDocument;
}): OrganizerContactEventEdgeDocument {
  const {attendee, existing} = params;
  const expected = attendee.status === "invited" ||
    attendee.status === "registered" || attendee.status === "checkedIn";
  return {
    organizerId: attendee.organizerId,
    contactId: params.contactId,
    originContactId: existing?.originContactId ?? params.contactId,
    eventId: attendee.eventId,
    attendeeId: params.attendeeId,
    displayName: attendee.displayName,
    eventDisplayName: params.eventDisplayName,
    eventOriginMode: params.eventOriginMode,
    eventProvider: params.eventProvider,
    linkedUid: attendee.linkedUid,
    phoneE164: attendee.phoneE164,
    email: normalizeEmail(attendee.email),
    source: attendee.source,
    status: attendee.status,
    expected,
    registered: attendee.status === "registered" ||
      attendee.status === "checkedIn",
    cancelled: attendee.status === "cancelled",
    checkedIn: attendee.status === "checkedIn",
    eventStartAt: params.eventStartAt,
    eventEndAt: params.eventEndAt,
    registeredAt: attendee.registeredAt,
    cancelledAt: attendee.cancelledAt,
    checkedInAt: attendee.checkedInAt,
    revenueAmountMinor: attendee.revenueAmountMinor ?? null,
    revenueCurrency: attendee.revenueCurrency ?? null,
    revenueSource: attendee.revenueSource ?? null,
    revenueAllocation: attendee.revenueAllocation ?? null,
    revenueOrderReference: attendee.revenueOrderReference ?? null,
    inviteLinkId: attendee.inviteLinkId ?? null,
    inviteCapturedAt: attendee.inviteCapturedAt ?? null,
    sourceCreatedAt: attendee.createdAt,
    sourceUpdatedAt: attendee.updatedAt,
    revision: Math.max(
      existing?.revision ?? 0,
      attendee.updatedAt.toMillis(),
      1
    ),
    createdAt: existing?.createdAt ?? params.now,
    updatedAt: params.now,
  };
}

/** Rebuilds explainable CRM traits from a single contact's event edges. */
export function organizerContactTraits(params: {
  contactId: string;
  contact: OrganizerContactDocument;
  edges: OrganizerContactEventEdgeDocument[];
  now: FirebaseFirestore.Timestamp;
  referredRegistrationCount?: number;
  referredCheckedInCount?: number;
  referredCheckedIn365DayCount?: number;
  /** The linked account's paid membership with this organizer, if any. */
  membership?: NonNullable<OrganizerContactTraitDocument["membership"]> | null;
}): OrganizerContactTraitDocument | null {
  const {contact, edges, now} = params;
  if (contact.deletedAt !== null || contact.identityState === "merged") {
    return null;
  }
  const expected = edges.filter((edge) => edge.expected && !edge.cancelled);
  const attended = edges.filter((edge) => edge.checkedIn);
  const cancelled = edges.filter((edge) => edge.cancelled);
  const noShows = expected.filter((edge) =>
    !edge.checkedIn && edge.eventEndAt !== null &&
      edge.eventEndAt.toMillis() < now.toMillis()
  );
  const imported = edges.filter((edge) =>
    edge.source === "hostImport" || edge.source === "hostManual"
  );
  const attendanceTimes = attended
    .map((edge) => edge.checkedInAt ?? edge.eventStartAt)
    .filter((value): value is FirebaseFirestore.Timestamp => value !== null)
    .sort(compareTimestamp);
  const firstSeenAt = edges
    .map((edge) => edge.sourceCreatedAt)
    .sort(compareTimestamp)[0] ?? contact.firstSeenAt;
  const lastSeenAt = edges
    .map((edge) => edge.sourceUpdatedAt)
    .sort(compareTimestamp)
    .at(-1) ?? contact.lastSeenAt;
  const segmentIds: OrganizerContactTraitDocument["segmentIds"] = [];
  if (attended.length === 0) segmentIds.push("new_to_organizer");
  if (attended.length >= 1) segmentIds.push(organizerPastAttendeeSegmentId);
  if (attended.length === 1) segmentIds.push("first_time_attendee");
  if (attended.length >= 2) segmentIds.push("repeat_attendee");

  const nowMillis = now.toMillis();
  const recent180DayCount = attendanceTimes.filter((time) =>
    nowMillis - time.toMillis() <= 180 * 24 * 60 * 60 * 1000
  ).length;
  const lastAttendedAt = attendanceTimes.at(-1) ?? null;
  const dayMillis = 24 * 60 * 60 * 1000;
  const attendedWithin = (days: number) => attendanceTimes.filter((time) =>
    nowMillis - time.toMillis() <= days * dayMillis).length;
  const attended30DayCount = attendedWithin(30);
  const attended60DayCount = attendedWithin(60);
  if (recent180DayCount >= 3) segmentIds.push("regular");
  if (attended.length >= 2 && lastAttendedAt !== null &&
      nowMillis - lastAttendedAt.toMillis() > 90 * 24 * 60 * 60 * 1000) {
    segmentIds.push("lapsed_regular");
  }
  const attendanceRate = expected.length === 0 ? null :
    attended.length / expected.length;
  if (expected.length >= 3 && attendanceRate !== null &&
      attendanceRate >= 0.8) {
    segmentIds.push("reliable_attendee");
  }
  if (expected.length >= 3 && noShows.length >= 2) {
    segmentIds.push("needs_confirmation");
  }
  const referredRegistrationCount = params.referredRegistrationCount ?? 0;
  const referredCheckedInCount = params.referredCheckedInCount ?? 0;
  const referredCheckedIn365DayCount =
    params.referredCheckedIn365DayCount ?? referredCheckedInCount;
  if (referredRegistrationCount > 0 || referredCheckedInCount > 0) {
    segmentIds.push("advocate");
  }
  if (referredCheckedIn365DayCount >= 3) {
    segmentIds.push("high_impact_advocate");
  }
  // Paid membership segments (definition version 4).
  const membership = params.membership ?? null;
  const activeMember = membership?.entitled === true;
  if (activeMember) segmentIds.push("active_member");
  if (membership?.status === "expired") segmentIds.push("lapsed_member");
  if (activeMember && attended30DayCount === 0) {
    segmentIds.push("member_no_recent_attendance");
  }
  if (!activeMember && attended60DayCount >= 4) {
    segmentIds.push("frequent_non_member");
  }
  if (contact.whatsappStatus === "optedIn" && contact.phoneE164 !== null) {
    segmentIds.push("whatsapp_reachable");
  }
  if (contact.smsStatus === "optedIn" && contact.phoneE164 !== null) {
    segmentIds.push("sms_reachable");
  }

  return {
    organizerId: contact.organizerId,
    contactId: params.contactId,
    expectedEventCount: expected.length,
    attendedEventCount: attended.length,
    cancelledEventCount: cancelled.length,
    noShowCount: noShows.length,
    importedEventCount: imported.length,
    referredRegistrationCount,
    referredCheckedInCount,
    referredCheckedIn365DayCount,
    linkedAccount: contact.linkedUid !== null,
    firstSeenAt,
    lastSeenAt,
    firstAttendedAt: attendanceTimes[0] ?? null,
    lastAttendedAt,
    attendanceRate,
    segmentIds,
    membership,
    attended30DayCount,
    attended60DayCount,
    definitionVersion: organizerAudienceDefinitionVersion,
    whatsappStatus: contact.whatsappStatus,
    smsStatus: contact.smsStatus,
    sourceCoverage: edges.every((edge) => edge.eventEndAt !== null) ?
      "exact" : "partial",
    projectionVersion: organizerAudienceProjectionVersion,
    computedAt: now,
  };
}

export interface OrganizerAudienceContribution {
  contactCount: number;
  pastAttendeeCount: number;
  repeatAttendeeCount: number;
  linkedAccountCount: number;
  importedContactCount: number;
  advocateCount: number;
  highImpactAdvocateCount: number;
  whatsappOptInCount: number;
  smsOptInCount: number;
}

/** Returns the summary contribution of one trait document. */
export function organizerAudienceContribution(
  trait: OrganizerContactTraitDocument | undefined
): OrganizerAudienceContribution {
  return {
    contactCount: trait ? 1 : 0,
    pastAttendeeCount: trait && trait.attendedEventCount > 0 ? 1 : 0,
    repeatAttendeeCount: trait && trait.attendedEventCount > 1 ? 1 : 0,
    linkedAccountCount: trait?.linkedAccount ? 1 : 0,
    importedContactCount: trait && trait.importedEventCount > 0 ? 1 : 0,
    advocateCount: trait && (trait.referredRegistrationCount > 0 ||
      trait.referredCheckedInCount > 0) ? 1 : 0,
    highImpactAdvocateCount: trait &&
      trait.referredCheckedIn365DayCount >= 3 ? 1 : 0,
    whatsappOptInCount: trait?.whatsappStatus === "optedIn" ? 1 : 0,
    smsOptInCount: trait?.smsStatus === "optedIn" ? 1 : 0,
  };
}

function normalizeEmail(email: string | null): string | null {
  const normalized = email?.trim().toLocaleLowerCase("en") ?? "";
  return normalized.length === 0 ? null : normalized;
}

function compareTimestamp(
  left: FirebaseFirestore.Timestamp,
  right: FirebaseFirestore.Timestamp
): number {
  return left.toMillis() - right.toMillis();
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}
