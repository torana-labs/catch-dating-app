import {CallableRequest, onCall} from
  "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import {appCheckCallableOptionsWithLimits} from
  "../shared/callableOptions";
import {requireAuth} from "../shared/auth";
import type {
  EventAttendeeDocument,
  OrganizerAudienceSummaryDocument,
  OrganizerCommunicationPreferenceDocument,
} from "../shared/generated/firestoreAdminTypes";
import type {GetOrganizerCrmSummaryCallablePayload} from
  "../shared/generated/getOrganizerCrmSummaryCallablePayload";
import type {GetOrganizerCrmSummaryCallableResponse} from
  "../shared/generated/getOrganizerCrmSummaryCallableResponse";
import {
  validateGetOrganizerCrmSummaryCallablePayload,
} from "../shared/generated/validators/getOrganizerCrmSummaryInput";
import {requireOrganizerManager} from "../shared/organizerManagerAuthority";
import {checkRateLimit} from "../shared/rateLimit";
import {requireDoc, validateCallableWithAjv} from "../shared/validation";
import {resolveOrganizerAudienceCoverage} from
  "./organizerAudienceCoverage";
import {hasCompleteOrganizerCommunicationGrant} from
  "../shared/organizerCommunicationPreferences";

const maxRosterDocuments = 2500;

interface OrganizerCrmDeps {
  firestore: () => FirebaseFirestore.Firestore;
  checkRateLimit: typeof checkRateLimit;
}

const defaultDeps: OrganizerCrmDeps = {
  firestore: () => admin.firestore(),
  checkRateLimit,
};

export interface OrganizerCrmAttendeeRow extends EventAttendeeDocument {
  id: string;
}

/** Returns aggregate CRM reachability without exposing attendee PII. */
export async function getOrganizerCrmSummaryHandler(
  request: CallableRequest<unknown>,
  deps: OrganizerCrmDeps = defaultDeps
): Promise<GetOrganizerCrmSummaryCallableResponse> {
  const actorUid = requireAuth(request);
  const data = validateCallableWithAjv<GetOrganizerCrmSummaryCallablePayload>(
    request,
    validateGetOrganizerCrmSummaryCallablePayload,
    normalizePayload
  );
  const db = deps.firestore();
  await deps.checkRateLimit(db, actorUid, "getOrganizerCrmSummary", {
    maxRequests: 30, windowMs: 60 * 1000,
  });

  await requireOrganizerManager({
    db,
    organizerId: data.organizerId,
    actorUid,
  });

  const projectedSummarySnap = await db.collection("organizerAudienceSummaries")
    .doc(data.organizerId)
    .get();
  const projectedSummary = projectedSummarySnap.exists ?
    requireDoc<OrganizerAudienceSummaryDocument>(
      projectedSummarySnap,
      "OrganizerAudienceSummaryDocument"
    ) : null;
  const sourceCoverage = await resolveOrganizerAudienceCoverage({
    db,
    organizerId: data.organizerId,
    storedCoverage: projectedSummary?.sourceCoverage,
  });
  if (projectedSummary && sourceCoverage === "exact") {
    return projectedOrganizerCrmSummary({
      ...projectedSummary,
      sourceCoverage,
    });
  }
  const [rosterSnap, preferenceSnap] = await Promise.all([
    db.collection("eventAttendees")
      .where("organizerId", "==", data.organizerId)
      .limit(maxRosterDocuments + 1)
      .get(),
    db.collection("organizerCommunicationPreferences")
      .where("organizerId", "==", data.organizerId)
      .limit(maxRosterDocuments + 1)
      .get(),
  ]);
  const truncated = rosterSnap.size > maxRosterDocuments ||
    preferenceSnap.size > maxRosterDocuments;
  const attendees = rosterSnap.docs.slice(0, maxRosterDocuments).map((doc) => ({
    id: doc.id,
    ...doc.data() as EventAttendeeDocument,
  }));
  const preferences = preferenceSnap.docs
    .slice(0, maxRosterDocuments)
    .map((doc) => doc.data() as OrganizerCommunicationPreferenceDocument);

  const rosterSummary = summarizeOrganizerCrm({
    organizerId: data.organizerId,
    attendees,
    preferences,
    truncated,
  });
  return projectedSummary === null ? rosterSummary :
    mergeOrganizerCrmSummaries(projectedSummary, rosterSummary);
}

/**
 * Keeps incomplete projection counts truthful without dropping manual CRM
 * contacts that have no attendee row. Each source is a lower bound while
 * coverage is partial, so the larger dimension is the safest visible count.
 */
export function mergeOrganizerCrmSummaries(
  projected: OrganizerAudienceSummaryDocument,
  roster: GetOrganizerCrmSummaryCallableResponse
): GetOrganizerCrmSummaryCallableResponse {
  const projectedResponse = projectedOrganizerCrmSummary(projected);
  const maximum = (
    key: keyof Pick<GetOrganizerCrmSummaryCallableResponse,
      "contactCount" | "pastAttendeeCount" | "repeatAttendeeCount" |
      "advocateCount" | "highImpactAdvocateCount" | "linkedAccountCount" |
      "importedContactCount" | "whatsappOptInCount" | "smsOptInCount">
  ) => Math.max(projectedResponse[key], roster[key]);
  return {
    ...roster,
    contactCount: maximum("contactCount"),
    pastAttendeeCount: maximum("pastAttendeeCount"),
    repeatAttendeeCount: maximum("repeatAttendeeCount"),
    advocateCount: maximum("advocateCount"),
    highImpactAdvocateCount: maximum("highImpactAdvocateCount"),
    linkedAccountCount: maximum("linkedAccountCount"),
    importedContactCount: maximum("importedContactCount"),
    whatsappOptInCount: maximum("whatsappOptInCount"),
    smsOptInCount: maximum("smsOptInCount"),
    truncated: true,
  };
}

/** Preserves the existing callable response while reading scalable counts. */
export function projectedOrganizerCrmSummary(
  summary: OrganizerAudienceSummaryDocument
): GetOrganizerCrmSummaryCallableResponse {
  return {
    organizerId: summary.organizerId,
    contactCount: summary.contactCount,
    pastAttendeeCount: summary.pastAttendeeCount,
    repeatAttendeeCount: summary.repeatAttendeeCount,
    advocateCount: summary.advocateCount,
    highImpactAdvocateCount: summary.highImpactAdvocateCount,
    linkedAccountCount: summary.linkedAccountCount,
    importedContactCount: summary.importedContactCount,
    whatsappOptInCount: summary.whatsappOptInCount,
    smsOptInCount: summary.smsOptInCount,
    truncated: summary.sourceCoverage !== "exact",
    readiness: {
      inApp: "currentEventOnly",
      whatsapp: "providerSetupRequired",
      sms: "providerAndDltSetupRequired",
    },
  };
}

/** Deduplicates roster history and counts only explicit channel grants. */
export function summarizeOrganizerCrm(params: {
  organizerId: string;
  attendees: OrganizerCrmAttendeeRow[];
  preferences: OrganizerCommunicationPreferenceDocument[];
  truncated: boolean;
}): GetOrganizerCrmSummaryCallableResponse {
  const uidByPhone = new Map<string, string>();
  for (const attendee of params.attendees) {
    if (attendee.phoneE164 && attendee.linkedUid) {
      uidByPhone.set(attendee.phoneE164, attendee.linkedUid);
    }
  }

  interface ContactSummary {
    linkedUid: string | null;
    hasPhone: boolean;
    imported: boolean;
    checkedInEventIds: Set<string>;
  }
  const contacts = new Map<string, ContactSummary>();
  for (const attendee of params.attendees) {
    if (attendee.status === "cancelled") continue;
    const linkedUid = attendee.linkedUid ??
      (attendee.phoneE164 ? uidByPhone.get(attendee.phoneE164) ?? null : null);
    const key = linkedUid ? `uid:${linkedUid}` : attendee.phoneE164 ?
      `phone:${attendee.phoneE164}` : attendee.email ?
        `email:${attendee.email.toLocaleLowerCase("en")}` :
        `attendee:${attendee.id}`;
    const contact = contacts.get(key) ?? {
      linkedUid,
      hasPhone: attendee.phoneE164 !== null,
      imported: false,
      checkedInEventIds: new Set<string>(),
    };
    contact.linkedUid ??= linkedUid;
    contact.hasPhone ||= attendee.phoneE164 !== null;
    contact.imported ||= attendee.source === "hostImport" ||
      attendee.source === "hostManual";
    if (attendee.status === "checkedIn") {
      contact.checkedInEventIds.add(attendee.eventId);
    }
    contacts.set(key, contact);
  }

  const preferenceByUid = new Map(
    params.preferences.map((preference) => [preference.uid, preference])
  );
  let pastAttendeeCount = 0;
  let repeatAttendeeCount = 0;
  let linkedAccountCount = 0;
  let importedContactCount = 0;
  let whatsappOptInCount = 0;
  let smsOptInCount = 0;
  for (const contact of contacts.values()) {
    const attendedCount = contact.checkedInEventIds.size;
    if (attendedCount > 0) pastAttendeeCount += 1;
    if (attendedCount > 1) repeatAttendeeCount += 1;
    if (contact.linkedUid) linkedAccountCount += 1;
    if (contact.imported) importedContactCount += 1;
    if (!contact.linkedUid || !contact.hasPhone || attendedCount === 0) {
      continue;
    }
    const preference = preferenceByUid.get(contact.linkedUid);
    if (hasCompleteOrganizerCommunicationGrant(preference, "whatsapp")) {
      whatsappOptInCount += 1;
    }
    if (hasCompleteOrganizerCommunicationGrant(preference, "sms")) {
      smsOptInCount += 1;
    }
  }

  return {
    organizerId: params.organizerId,
    contactCount: contacts.size,
    pastAttendeeCount,
    repeatAttendeeCount,
    advocateCount: 0,
    highImpactAdvocateCount: 0,
    linkedAccountCount,
    importedContactCount,
    whatsappOptInCount,
    smsOptInCount,
    truncated: params.truncated,
    readiness: {
      inApp: "currentEventOnly",
      whatsapp: "providerSetupRequired",
      sms: "providerAndDltSetupRequired",
    },
  };
}

function normalizePayload(data: unknown): unknown {
  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    return data;
  }
  const normalized = {...data} as Record<string, unknown>;
  if (typeof normalized.organizerId === "string") {
    normalized.organizerId = normalized.organizerId.trim();
  }
  return normalized;
}

export const getOrganizerCrmSummary = onCall(
  appCheckCallableOptionsWithLimits({timeoutSeconds: 60, maxInstances: 20}),
  (request) => getOrganizerCrmSummaryHandler(request)
);
