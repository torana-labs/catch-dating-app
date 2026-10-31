import {validateOrganizerMomentRunDocument} from
  "../shared/generated/validators/organizerMomentRunDocument";
import type {Query, Firestore, Transaction} from "firebase-admin/firestore";
import {
  requireMillis,
  sameScope,
  scopeId,
  type AnchorFacts,
  type GeoPoint,
  type MomentAutomationBinding,
  type MomentDefinition,
  type MomentScope,
  type RunRecord,
  type TravelFacts,
} from "./momentModel";
import type {RecipientEndpoint} from "./momentPolicy";
import {activeProgramDuties, programOwnerAuthorizationDeadline,
  programStaffGrantId} from "../shared/programAuthority";
import type {OrganizerProgramDocument, ProgramStaffGrantDocument} from
  "../shared/generated/firestoreAdminTypes";
import {
  guestTravelLeadMinutes,
  type TravelEstimateContext,
} from "./momentTravel";

/**
 * Document <-> domain boundary for the moments collections. Documents are
 * read leniently (unknown/extra fields ignored, missing required fields
 * reject the doc) so the runner keeps working across schema iterations;
 * the contract schemas own strictness once registered.
 */

export const MOMENTS_COLLECTION = "organizerMoments";
export const MOMENT_RUNS_COLLECTION = "organizerMomentRuns";
export const MOMENT_SENDS_COLLECTION = "organizerMomentSends";

export function momentFromDocument(
  data: Record<string, unknown>,
): MomentDefinition | null {
  const scope = readScope(data.scope);
  const initiation = readInitiation(data.initiation);
  const audience = readAudience(data.audience);
  const action = readAction(data.action);
  if (!scope || !initiation || !audience || !action) return null;
  const status = data.status;
  if (status !== "draft" && status !== "armed" && status !== "paused" &&
      status !== "done") return null;
  return {
    momentId: requireString(data.momentId, "momentId"),
    scope,
    name: requireString(data.name, "name"),
    initiation,
    sense: data.sense === "individual" ? "individual" : "audience",
    audience,
    action,
    status,
    approval: readApproval(data.approval),
    origin: data.origin === "systemDefault" ||
        data.origin === "formAutomation" ?
      data.origin : "organizer",
    revision: readInt(data.revision, 1),
  };
}

/** Serializes a definition for storage; scopeKind/scopeId are denormalized
 *  for list queries. */
export function momentToDocument(
  moment: MomentDefinition,
  nowMillis: number,
  isCreate: boolean,
): Record<string, unknown> {
  return {
    momentId: moment.momentId,
    scope: moment.scope,
    scopeKind: moment.scope.kind,
    scopeId: scopeId(moment.scope),
    name: moment.name,
    initiation: moment.initiation,
    sense: moment.sense,
    audience: moment.audience,
    action: moment.action,
    status: moment.status,
    approval: moment.approval,
    origin: moment.origin,
    revision: moment.revision,
    updatedAtMillis: nowMillis,
    ...(isCreate ? {createdAtMillis: nowMillis} : {}),
  };
}

export function runFromDocument(data: Record<string, unknown>): RunRecord {
  if (typeof data.runId === "string" &&
      /^travel_v1_[a-f0-9]{64}$/.test(data.runId)) {
    if (!validateOrganizerMomentRunDocument(data)) {
      throw new Error("Invalid durable travel run");
    }
    const travel = readTravelOccurrence(data.travelOccurrence)!;
    if (data.expiresAtMillis !== travel.createdAtMillis + 6 * 60 * 60_000) {
      throw new Error("Invalid travel recovery window");
    }
  }
  const status = data.status;
  if (status !== "planned" && status !== "resolving" &&
      status !== "dispatched" && status !== "skipped" &&
      status !== "superseded" && status !== "failed") {
    throw new RangeError(`Unknown run status: ${String(status)}`);
  }
  return {
    runId: requireString(data.runId, "runId"),
    momentId: requireString(data.momentId, "momentId"),
    dueAtMillis: readInt(data.dueAtMillis, 0),
    ...(typeof data.nominalDueAtMillis === "number" ?
      {nominalDueAtMillis: readInt(data.nominalDueAtMillis, 0)} : {}),
    ...(typeof data.expiresAtMillis === "number" ?
      {expiresAtMillis: readInt(data.expiresAtMillis, 0)} : {}),
    ...(data.occurrenceVersion === 2 ? {occurrenceVersion: 2 as const} : {}),
    ...(typeof data.plannedWakeAtMillis === "number" ?
      {plannedWakeAtMillis: readInt(data.plannedWakeAtMillis, 0)} : {}),
    ...(typeof data.travelPlanHash === "string" ?
      {travelPlanHash: data.travelPlanHash} : {}),
    anchorRevision: readInt(data.anchorRevision, 0),
    status,
    ...(typeof data.targetFunctionId === "string" ?
      {targetFunctionId: data.targetFunctionId} : {}),
    ...(typeof data.subjectId === "string" ?
      {subjectId: data.subjectId} : {}),
    ...(data.travelOccurrence !== undefined ?
      {travelOccurrence: readTravelOccurrence(data.travelOccurrence)} : {}),
    ...(data.automation && typeof data.automation === "object" ?
      {automation: readRunAutomation(data.automation)} : {}),
  };
}

function readTravelOccurrence(value: unknown): RunRecord["travelOccurrence"] {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Invalid travel occurrence");
  }
  const data = value as Record<string, unknown>;
  const keys = ["momentRevision", "occurredAtMillis", "createdAtMillis"];
  if (Object.keys(data).length !== keys.length || keys.some((key) =>
    !Number.isSafeInteger(data[key]) || (data[key] as number) < 0) ||
    (data.createdAtMillis as number) < (data.occurredAtMillis as number)) {
    throw new Error("Invalid travel occurrence");
  }
  return {momentRevision: data.momentRevision as number,
    occurredAtMillis: data.occurredAtMillis as number,
    createdAtMillis: data.createdAtMillis as number};
}

/** The occurrence binding written by the automation handoff; absent on
 *  every other run kind. */
function readRunAutomation(raw: unknown): RunRecord["automation"] {
  if (typeof raw !== "object" || raw === null) return undefined;
  const data = raw as Record<string, unknown>;
  const eventKind = data.eventKind;
  if (typeof data.ruleId !== "string" ||
      typeof data.actionId !== "string" ||
      typeof data.sourceId !== "string" ||
      typeof data.contactId !== "string" ||
      typeof data.deliveryMessageId !== "string" ||
      (eventKind !== "submitted" && eventKind !== "withdrawn" &&
        eventKind !== "applicationAccepted" && eventKind !== "eventAttended") ||
      !Number.isSafeInteger(data.ruleRevision) ||
      !Number.isSafeInteger(data.occurredAtMillis) ||
      !Number.isSafeInteger(data.dueAtMillis)) {
    return undefined;
  }
  return {
    ruleId: data.ruleId,
    ruleRevision: data.ruleRevision as number,
    actionId: data.actionId,
    eventKind,
    sourceId: data.sourceId,
    occurredAtMillis: data.occurredAtMillis as number,
    dueAtMillis: data.dueAtMillis as number,
    contactId: data.contactId,
    deliveryMessageId: data.deliveryMessageId,
  };
}

// --- Facts -----------------------------------------------------------------

/**
 * Assembles the AnchorFacts a moment plans/fires against. Program scopes
 * read organizerPrograms + programFunctions + programTravelLegs; event
 * scopes read the events doc; organizer scopes synthesize a minimal scope
 * row from the organizers doc (companion moments have no anchors — the
 * fields exist only so fire-time dispositions and timezone defaults can
 * evaluate). A non-active scope reports `cancelled` so fire-time
 * dispositions fail closed.
 */
export async function loadAnchorFacts(
  db: Firestore,
  scope: MomentScope,
): Promise<AnchorFacts | null> {
  if (scope.kind === "organizer") {
    const doc = await db.collection("organizers").doc(scope.organizerId)
      .get();
    if (!doc.exists) return null;
    const data = doc.data() as Record<string, unknown>;
    return {
      scope: {
        startsAtMillis: readTimestamp(data.createdAt) ?? 0,
        endsAtMillis: null,
        rsvpDeadlineAtMillis: null,
        revision: readInt(data.revision, 0),
        messagingEnabled: true,
        cancelled: data.archived === true || data.status === "archived",
        organizerId: scope.organizerId,
      },
      functions: {},
      travelLegs: {},
    };
  }
  if (scope.kind === "event") {
    const doc = await db.collection("events").doc(scope.eventId).get();
    if (!doc.exists) return null;
    const data = doc.data() as Record<string, unknown>;
    const start = readTimestamp(data.startTime);
    if (start === null) return null;
    return {
      scope: {
        startsAtMillis: start,
        endsAtMillis: readTimestamp(data.endTime),
        // Events have no RSVP deadline; the anchor stays program-only.
        rsvpDeadlineAtMillis: null,
        revision: readInt(data.revision, 0),
        messagingEnabled: true,
        cancelled: data.status !== "active",
        timeZone: readString(data.timezone) ?? undefined,
        organizerId: readString(data.organizerId) ??
          readString(data.organizerId),
      },
      functions: {},
      travelLegs: {},
    };
  }
  const program = await db.collection("organizerPrograms")
    .doc(scope.programId).get();
  if (!program.exists) return null;
  const pdata = program.data() as Record<string, unknown>;
  const startsAt = readTimestamp(pdata.startsAt);
  if (startsAt === null) return null;
  const capabilities = Array.isArray(pdata.capabilities) ?
    pdata.capabilities : [];
  const functions = await db.collection("programFunctions")
    .where("programId", "==", scope.programId).get();
  const legs = await db.collection("programTravelLegs")
    .where("programId", "==", scope.programId).get();
  return {
    scope: {
      startsAtMillis: startsAt,
      endsAtMillis: readTimestamp(pdata.endsAt),
      rsvpDeadlineAtMillis: readTimestamp(pdata.rsvpDeadlineAt),
      revision: readInt(pdata.revision, 0),
      messagingEnabled: capabilities.includes("messaging"),
      cancelled: pdata.status !== "active",
      timeZone: readString(pdata.timezone) ?? undefined,
      organizerId: readString(pdata.organizerId),
    },
    functions: Object.fromEntries(functions.docs.map((doc) => {
      const fn = doc.data() as Record<string, unknown>;
      return [doc.id, {
        startsAtMillis: readTimestamp(fn.startsAt) ?? 0,
        endsAtMillis: readTimestamp(fn.endsAt) ?? 0,
        revision: readInt(fn.revision, 0),
        cancelled: fn.status === "cancelled",
        venueLocation: readGeoPoint(fn.venueLocation),
      }];
    })),
    travelLegs: Object.fromEntries(legs.docs.map((doc) => {
      const leg = doc.data() as Record<string, unknown>;
      // The moment anchor follows the leg's effective departure time:
      // an operator-supplied curb time wins over the scheduled arrival.
      return [doc.id, {
        atMillis: readTimestamp(leg.manualCurbAt) ??
          readTimestamp(leg.scheduledArrivalAt) ?? 0,
        revision: readInt(leg.revision, 0),
      }];
    })),
  };
}

/**
 * Geography behind distance-aware leads: which groups are pinned to a
 * hotel and where those hotels sit. Loaded lazily — only armed program
 * moments whose audience carries `travelTimeLead` pay the two reads.
 */
export async function loadTravelFacts(
  db: Firestore,
  programId: string,
): Promise<TravelFacts> {
  const [groups, hotels] = await Promise.all([
    db.collection("programGuestGroups")
      .where("programId", "==", programId).get(),
    db.collection("programHotels")
      .where("programId", "==", programId).get(),
  ]);
  const groupHotelIds: Record<string, string> = {};
  for (const doc of groups.docs) {
    const hotelId = (doc.data() as Record<string, unknown>).hotelId;
    if (typeof hotelId === "string" && hotelId.length > 0) {
      groupHotelIds[doc.id] = hotelId;
    }
  }
  const hotelLocations: Record<string, GeoPoint> = {};
  for (const doc of hotels.docs) {
    const data = doc.data() as Record<string, unknown>;
    if (typeof data.latitude === "number" &&
        typeof data.longitude === "number") {
      hotelLocations[doc.id] = {
        latitude: data.latitude,
        longitude: data.longitude,
      };
    }
  }
  return {groupHotelIds, hotelLocations};
}

// --- Recipients --------------------------------------------------------------

export interface ResolvedRecipient {
  /** Stable idempotency key (household:, guest:, uid:, contact: prefixed). */
  recipientKey: string;
  endpoint: RecipientEndpoint;
  householdId: string | null;
  /** Minutes this recipient's due shifts early under `travelTimeLead`;
   *  absent when the moment does not use distance-aware leads. */
  travelLeadMinutes?: number;
}

export interface RecipientResolution {
  recipients: ResolvedRecipient[];
  suppressedNoEndpoint: number;
}

/**
 * Resolves a moment audience against live documents at fire time. Consent
 * and endpoint facts are attached later by the policy pass — this is the
 * set-of-recipients step only.
 */
export async function resolveMomentRecipients(
  db: Firestore,
  moment: MomentDefinition,
  run: RunRecord,
  nowMillis: number,
  travel?: TravelEstimateContext | null,
): Promise<RecipientResolution> {
  const {audience, scope} = moment;
  switch (audience.kind) {
  case "subject": {
    // The triggering fact names the subject. Program triggers point at a
    // travel leg (leg -> guest -> phone); organizer-scope automation runs
    // point at the CRM contact the handoff resolved.
    const subject = run.subjectId;
    if (!subject) return {recipients: [], suppressedNoEndpoint: 0};
    if (scope.kind === "organizer") {
      // A merge moves the send to the surviving contact — the same
      // identity the delivery claim re-derives from the source event.
      let contactId = subject;
      let data: Record<string, unknown> | undefined;
      for (let hop = 0; hop < 10; hop += 1) {
        const snap = await db.collection("organizerContacts").doc(contactId)
          .get();
        data = snap.data() as Record<string, unknown> | undefined;
        const mergedInto = typeof data?.mergedIntoContactId === "string" ?
          data.mergedIntoContactId : null;
        if (!mergedInto || mergedInto === contactId) break;
        contactId = mergedInto;
      }
      const phone = typeof data?.phoneE164 === "string" ?
        data.phoneE164 : null;
      if (!data || data.deletedAt != null || data.hiddenAt != null ||
          data.organizerId !== scope.organizerId || !phone) {
        return {recipients: [], suppressedNoEndpoint: 1};
      }
      return {recipients: [{
        recipientKey: `contact:${contactId}`,
        endpoint: {kind: "phone", e164: phone},
        householdId: null,
      }], suppressedNoEndpoint: 0};
    }
    if (scope.kind !== "program") {
      return {recipients: [], suppressedNoEndpoint: 0};
    }
    const leg = await db.collection("programTravelLegs").doc(subject).get();
    if (!leg.exists) return {recipients: [], suppressedNoEndpoint: 0};
    const legData = leg.data() as Record<string, unknown>;
    const guestId = typeof legData.guestId === "string" ?
      legData.guestId : null;
    if (!guestId) return {recipients: [], suppressedNoEndpoint: 1};
    return guestsToRecipients(
      await guestsByIds(db, scope.programId, [guestId]));
  }
  case "functionGuests": {
    if (scope.kind !== "program") {
      return {recipients: [], suppressedNoEndpoint: 0};
    }
    const joinRows = await db.collection("programFunctionGuests")
      .where("programId", "==", scope.programId)
      .where("functionId", "==", audience.functionId).get();
    const invited = new Map<string, string>();
    for (const row of joinRows.docs) {
      const data = row.data() as Record<string, unknown>;
      if (data.invited !== true) continue;
      if (typeof data.guestId === "string") {
        invited.set(data.guestId,
          typeof data.rsvpStatus === "string" ? data.rsvpStatus : "pending");
      }
    }
    const guests = await guestsByIds(db, scope.programId, [...invited.keys()]);
    const eligible = guests.filter((guest) =>
      (audience.rsvp as ReadonlyArray<string>).includes(
        invited.get(guest.guestId) ?? "pending"));
    return dedupeGuests(eligible, audience.householdDedupe, travel);
  }
  case "households": {
    if (scope.kind !== "program") {
      return {recipients: [], suppressedNoEndpoint: 0};
    }
    const households = await db.collection("programHouseholds")
      .where("programId", "==", scope.programId).get();
    const recipients: ResolvedRecipient[] = [];
    let suppressedNoEndpoint = 0;
    for (const doc of households.docs) {
      const data = doc.data() as Record<string, unknown>;
      if (audience.rsvpPendingOnly &&
          !await householdHasPendingMember(db, scope.programId, doc.id)) {
        continue;
      }
      const phone = typeof data.primaryPhoneE164 === "string" ?
        data.primaryPhoneE164 : null;
      if (!phone) {
        suppressedNoEndpoint += 1;
        continue;
      }
      recipients.push({
        recipientKey: `household:${doc.id}`,
        endpoint: {kind: "phone", e164: phone},
        householdId: doc.id,
      });
    }
    return {recipients, suppressedNoEndpoint};
  }
  case "staffDuty": {
    const recipients = await db.runTransaction(async (tx) => {
      const grants = await staffGrantsFor(db, scope, tx);
      const program = scope.kind === "program" ?
        (await tx.get(db.collection("organizerPrograms").doc(scope.programId)))
          .data() as OrganizerProgramDocument | undefined : undefined;
      const recipients: ResolvedRecipient[] = [];
      for (const doc of grants.docs) {
        const data = doc.data() as Record<string, unknown>;
        if (data.status !== "active" || data.revokedAt != null ||
            data.revokedBy != null) continue;
        if (scope.kind === "program") {
          const grant = data as unknown as ProgramStaffGrantDocument;
          if (!program || typeof grant.uid !== "string" ||
              programMomentStaffDeadline(program, grant, doc.id,
                scope.programId, grant.uid, audience, nowMillis) === null ||
              (await tx.get(db.collection("deletedUsers").doc(grant.uid)))
                .exists) continue;
        } else if (!(Array.isArray(data.duties) ? data.duties : [])
          .some((duty) => momentDutyMatches(duty, audience))) continue;
        const uid = typeof data.uid === "string" ? data.uid : null;
        if (!uid) continue;
        recipients.push({
          recipientKey: `uid:${uid}`,
          endpoint: {kind: "uid", uid, fcmToken: null},
          householdId: null,
        });
      }
      return recipients;
    });
    return hydrateFcmTokens(db, {recipients, suppressedNoEndpoint: 0});
  }
  case "eventParticipants": {
    if (scope.kind !== "event") {
      return {recipients: [], suppressedNoEndpoint: 0};
    }
    const participations = await db.collection("eventParticipations")
      .where("eventId", "==", scope.eventId).get();
    const recipients: ResolvedRecipient[] = [];
    for (const doc of participations.docs) {
      const data = doc.data() as Record<string, unknown>;
      if (data.deletedAt != null || data.cancelledAt != null) continue;
      if (!(audience.statuses as ReadonlyArray<string>).includes(
        String(data.status))) continue;
      const uid = typeof data.uid === "string" ? data.uid : null;
      if (!uid) continue;
      recipients.push({
        recipientKey: `uid:${uid}`,
        endpoint: {kind: "uid", uid, fcmToken: null},
        householdId: null,
      });
    }
    return hydrateFcmTokens(db, {recipients, suppressedNoEndpoint: 0});
  }
  }
}

/** Reads users/{uid}.fcmToken so the policy layer can suppress recipients
 *  with no push endpoint and the sender does not re-read the user doc. */
async function hydrateFcmTokens(
  db: Firestore,
  resolution: RecipientResolution,
): Promise<RecipientResolution> {
  const uidEndpoints = resolution.recipients
    .filter((r) => r.endpoint.kind === "uid");
  if (uidEndpoints.length === 0) return resolution;
  const snaps = await Promise.all(uidEndpoints.map((r) =>
    db.collection("users")
      .doc((r.endpoint as {uid: string}).uid).get()));
  snaps.forEach((snap, index) => {
    const data = snap.data() as Record<string, unknown> | undefined;
    const token = typeof data?.fcmToken === "string" &&
      data.fcmToken.length > 0 ? data.fcmToken : null;
    (uidEndpoints[index].endpoint as {fcmToken: string | null})
      .fcmToken = token;
  });
  return resolution;
}

interface GuestRow {
  guestId: string;
  householdId: string | null;
  phoneE164: string | null;
  groupIds: string[];
}

async function guestsByIds(
  db: Firestore,
  programId: string,
  guestIds: ReadonlyArray<string>,
): Promise<GuestRow[]> {
  if (guestIds.length === 0) return [];
  const snap = await db.collection("programGuests")
    .where("programId", "==", programId).get();
  const wanted = new Set(guestIds);
  return snap.docs
    .filter((doc) => wanted.has(doc.id))
    .map((doc) => {
      const data = doc.data() as Record<string, unknown>;
      return {
        guestId: doc.id,
        householdId: typeof data.householdId === "string" ?
          data.householdId : null,
        phoneE164: typeof data.phoneE164 === "string" ?
          data.phoneE164 : null,
        groupIds: Array.isArray(data.groupIds) ?
          data.groupIds.filter((id): id is string =>
            typeof id === "string") : [],
      };
    });
}

function travelLeadOf(
  guest: GuestRow,
  travel: TravelEstimateContext | null | undefined,
): {travelLeadMinutes: number} | Record<string, never> {
  if (!travel) return {};
  return {travelLeadMinutes: guestTravelLeadMinutes(guest.groupIds, travel)};
}

function guestsToRecipients(
  guests: GuestRow[],
  travel?: TravelEstimateContext | null,
): RecipientResolution {
  const recipients: ResolvedRecipient[] = [];
  let suppressedNoEndpoint = 0;
  for (const guest of guests) {
    if (!guest.phoneE164) {
      suppressedNoEndpoint += 1;
      continue;
    }
    recipients.push({
      recipientKey: `guest:${guest.guestId}`,
      endpoint: {kind: "phone", e164: guest.phoneE164},
      householdId: guest.householdId,
      ...travelLeadOf(guest, travel),
    });
  }
  return {recipients, suppressedNoEndpoint};
}

function dedupeGuests(
  guests: GuestRow[],
  householdDedupe: boolean,
  travel?: TravelEstimateContext | null,
): RecipientResolution {
  if (!householdDedupe) return guestsToRecipients(guests, travel);
  const byKey = new Map<string, GuestRow>();
  let suppressedNoEndpoint = 0;
  for (const guest of guests) {
    const key = guest.householdId === null ?
      `guest:${guest.guestId}` : `household:${guest.householdId}`;
    const existing = byKey.get(key);
    if (existing === undefined ||
        (existing.phoneE164 === null && guest.phoneE164 !== null)) {
      byKey.set(key, guest);
    }
  }
  const recipients: ResolvedRecipient[] = [];
  for (const [key, guest] of byKey) {
    if (!guest.phoneE164) {
      suppressedNoEndpoint += 1;
      continue;
    }
    recipients.push({
      recipientKey: key,
      endpoint: {kind: "phone", e164: guest.phoneE164},
      householdId: guest.householdId,
      // The deduped representative's hotel stands in for the household —
      // members of one household overwhelmingly stay together, and the
      // max-per-guest rule keeps the estimate conservative either way.
      ...travelLeadOf(guest, travel),
    });
  }
  recipients.sort((a, b) => a.recipientKey.localeCompare(b.recipientKey));
  return {recipients, suppressedNoEndpoint};
}

async function householdHasPendingMember(
  db: Firestore,
  programId: string,
  householdId: string,
): Promise<boolean> {
  const guests = await db.collection("programGuests")
    .where("programId", "==", programId)
    .where("householdId", "==", householdId).get();
  return guests.docs.some((doc) =>
    (doc.data() as Record<string, unknown>).rsvpStatus === "pending");
}

async function staffGrantsFor(
  db: Firestore,
  scope: MomentScope,
  transaction: Transaction,
): Promise<FirebaseFirestore.QuerySnapshot> {
  // Organizer scope admits subject audiences only — a staffDuty audience
  // here is unreachable by model validation, so resolve to an empty
  // grant set rather than mis-scoping the staff query.
  if (scope.kind === "organizer") {
    return transaction.get(db.collection("eventStaffGrants")
      .where("eventId", "==", ""));
  }
  const collection = scope.kind === "program" ?
    "programStaffGrants" : "eventStaffGrants";
  let query: Query = db.collection(collection);
  if (scope.kind === "program") {
    query = query.where("programId", "==", scope.programId);
  } else {
    query = query.where("eventId", "==", scope.eventId);
  }
  return transaction.get(query);
}

// --- Readers -----------------------------------------------------------------
// Exported so callable handlers parse payloads through the same lenient
// readers as stored documents — one shape, one grammar.

export function readScope(raw: unknown): MomentScope | null {
  if (typeof raw !== "object" || raw === null) return null;
  const data = raw as Record<string, unknown>;
  if (data.kind === "event" && typeof data.eventId === "string") {
    return {kind: "event", eventId: data.eventId};
  }
  if (data.kind === "program" && typeof data.programId === "string") {
    return {kind: "program", programId: data.programId};
  }
  if (data.kind === "organizer" && typeof data.organizerId === "string") {
    return {kind: "organizer", organizerId: data.organizerId};
  }
  return null;
}

export function readInitiation(
  raw: unknown,
): MomentDefinition["initiation"] | null {
  if (typeof raw !== "object" || raw === null) return null;
  const data = raw as Record<string, unknown>;
  switch (data.kind) {
  case "manual":
    return {kind: "manual"};
  case "scheduled":
    return {kind: "scheduled", atMillis: readInt(data.atMillis, 0)};
  case "anchored":
    return {
      kind: "anchored",
      anchorKind: data.anchorKind as never,
      anchorId: typeof data.anchorId === "string" ? data.anchorId : null,
      offsetMinutes: readInt(data.offsetMinutes, 0),
      offsetDays: readInt(data.offsetDays, 0),
      offsetMonths: readInt(data.offsetMonths, 0),
    };
  case "triggered":
    return {
      kind: "triggered",
      triggerKind: data.triggerKind as never,
      functionId: typeof data.functionId === "string" ?
        data.functionId : null,
      automation: readAutomationBinding(data.automation),
    };
  default:
    return null;
  }
}

function readAutomationBinding(
  raw: unknown,
): MomentAutomationBinding | null {
  if (typeof raw !== "object" || raw === null) return null;
  const data = raw as Record<string, unknown>;
  if (typeof data.ruleId !== "string" ||
      typeof data.actionId !== "string" ||
      typeof data.recipeCampaignId !== "string" ||
      !Number.isSafeInteger(data.ruleRevision) ||
      !Number.isSafeInteger(data.recipeRevision)) {
    return null;
  }
  return {
    ruleId: data.ruleId,
    ruleRevision: data.ruleRevision as number,
    actionId: data.actionId,
    recipeCampaignId: data.recipeCampaignId,
    recipeRevision: data.recipeRevision as number,
  };
}

export function readAudience(
  raw: unknown,
): MomentDefinition["audience"] | null {
  if (typeof raw !== "object" || raw === null) return null;
  const data = raw as Record<string, unknown>;
  switch (data.kind) {
  case "subject":
    return {kind: "subject"};
  case "eventParticipants":
    return {
      kind: "eventParticipants",
      statuses: Array.isArray(data.statuses) ?
        data.statuses as never : ["signedUp"],
    };
  case "functionGuests":
    return {
      kind: "functionGuests",
      functionId: String(data.functionId ?? ""),
      rsvp: Array.isArray(data.rsvp) ? data.rsvp as never : ["attending"],
      householdDedupe: data.householdDedupe !== false,
      travelTimeLead: data.travelTimeLead === true,
    };
  case "households":
    return {kind: "households", rsvpPendingOnly: data.rsvpPendingOnly === true};
  case "staffDuty":
    return {
      kind: "staffDuty",
      duty: String(data.duty ?? ""),
      scopeIds: Array.isArray(data.scopeIds) ?
        data.scopeIds as string[] : null,
    };
  default:
    return null;
  }
}

export function readAction(
  raw: unknown,
): MomentDefinition["action"] | null {
  if (typeof raw !== "object" || raw === null) return null;
  const data = raw as Record<string, unknown>;
  switch (data.kind) {
  case "sendTemplate":
    return {
      kind: "sendTemplate",
      connectionId: String(data.connectionId ?? ""),
      templateId: String(data.templateId ?? ""),
      variables: typeof data.variables === "object" &&
        data.variables !== null ?
        data.variables as Readonly<Record<string, string>> : {},
    };
  case "push":
    return {
      kind: "push",
      notificationType: String(data.notificationType ?? ""),
      preferenceKey: String(data.preferenceKey ?? ""),
    };
  case "staffAttention":
    return {
      kind: "staffAttention",
      duty: String(data.duty ?? ""),
      severity: data.severity === "urgent" || data.severity === "warning" ?
        data.severity : "info",
      titleTemplate: String(data.titleTemplate ?? ""),
    };
  default:
    return null;
  }
}

function readApproval(
  raw: unknown,
): MomentDefinition["approval"] {
  if (typeof raw !== "object" || raw === null) return null;
  const data = raw as Record<string, unknown>;
  if (typeof data.approvedByUid !== "string") return null;
  return {
    approvedByUid: data.approvedByUid,
    approvedAtMillis: readInt(data.approvedAtMillis, 0),
  };
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ?
    value : null;
}

/** Accepts the contract's `{latitude, longitude}` venue object and
 *  Firestore GeoPoint instances alike. */
function readGeoPoint(value: unknown): GeoPoint | null {
  if (typeof value !== "object" || value === null) return null;
  const row = value as Record<string, unknown>;
  if (typeof row.latitude === "number" && typeof row.longitude === "number") {
    return {latitude: row.latitude, longitude: row.longitude};
  }
  return null;
}

function requireString(value: unknown, field: string): string {
  const text = readString(value);
  if (text === null) {
    throw new RangeError(`Moment document ${field} must be non-empty.`);
  }
  return text;
}

function readInt(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isSafeInteger(value) ?
    value : fallback;
}

function readTimestamp(value: unknown): number | null {
  if (typeof value === "number") return value;
  if (typeof value === "object" && value !== null &&
      "toMillis" in value) {
    return (value as {toMillis: () => number}).toMillis();
  }
  return null;
}

export {sameScope, scopeId, requireMillis};

/** Same duty/scope predicate for audience resolution and delivery claims. */
function momentDutyMatches(duty: unknown,
  audience: {duty: string; scopeIds: ReadonlyArray<string> | null}): boolean {
  if (typeof duty !== "object" || duty === null) return false;
  const row = duty as Record<string, unknown>;
  if (row.duty !== audience.duty) return false;
  if (audience.scopeIds === null) return true;
  const scoped = [
    ...(Array.isArray(row.functionIds) ? row.functionIds as string[] : []),
    ...(Array.isArray(row.pickupPointIds) ?
      row.pickupPointIds as string[] : []),
    ...(Array.isArray(row.hotelIds) ? row.hotelIds as string[] : []),
  ];
  return audience.scopeIds.some((id) => scoped.includes(id));
}

/** Latest instant this exact recipient duty remains authorized. */
export function programMomentStaffDeadline(
  program: OrganizerProgramDocument, grant: ProgramStaffGrantDocument,
  grantId: string, programId: string, uid: string,
  audience: {duty: string; scopeIds: ReadonlyArray<string> | null},
  now: number,
): number | null {
  if (!uid || grant.programId !== programId || grant.uid !== uid ||
      grant.organizerId !== program.organizerId ||
      grantId !== programStaffGrantId(programId, uid)) return null;
  const ownerDeadline = programOwnerAuthorizationDeadline(program, grant);
  if (ownerDeadline === null) return null;
  const matching = activeProgramDuties(grant, now)
    .filter((duty) => momentDutyMatches(duty, audience));
  if (matching.length === 0) return null;
  return Math.min(ownerDeadline,
    Math.max(...matching.map((duty) => duty.expiresAtMillis)));
}
