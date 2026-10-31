import {createHash} from "crypto";
import {normalizeRosterPhone} from "./eventAttendees";
import {deriveEventSeatPolicy} from "./seatAuthority/firestoreAdapter";
import {SeatLedger, SeatReservation} from "./seatAuthority/seatAuthority";
import {seatIdentityAliasId, SeatIdentityAlias,
  seatIdentityValueHash, SeatVerifiedPhoneProof} from
  "./seatIdentityAuthority";

type AliasKind = SeatIdentityAlias["kind"];
const ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$/;

export interface SeatMigrationParticipation {
  eventId: string;
  organizerId: string;
  uid: string;
  status: "signedUp" | "attended" | "waitlisted" | "cancelled" |
    "deleted";
}

export interface SeatMigrationAttendee {
  id: string;
  eventId: string;
  organizerId: string;
  status: "registered" | "checkedIn" | "invited" | "waitlisted" |
    "cancelled";
  source: "catchBooking" | "hostImport" | "hostManual" | "webOtp" |
    "providerSync";
  linkedUid: string | null;
  phoneE164: string | null;
  externalReference: string | null;
  sourceRowId: string | null;
}

/** Server Auth snapshot, never a participant or importer supplied claim. */
export interface SeatMigrationVerifiedPhone {
  uid: string;
  phoneE164: string | null;
  verifiedByAuth: true;
}

export interface SeatMigrationContactOrigin {
  id: string;
  organizerId: string;
  eventId: string | null;
  sourceKind: "hostForm" | "hostImport" | "hostManual" |
    "webOtp" | "providerSync" | "catchBooking";
  sourceEntityKind: "eventAttendee" | "hostFormResponse";
  sourceEntityId: string;
  responseId: string | null;
  formId: string | null;
  originContactId: string;
  currentContactId: string;
}

export interface SeatMigrationContact {
  id: string;
  organizerId: string;
  linkedUid: string | null;
  identityState: "verified" | "unlinked" | "ambiguous";
  deleted: boolean;
  hidden: boolean;
  mergedIntoContactId: string | null;
  ambiguousCandidateContactIds: string[];
}

/** Exact reviewed conversion provenance for a form-sourced roster row. */
export interface SeatMigrationFormReceipt {
  organizerId: string;
  eventId: string;
  formId: string;
  responseId: string;
  status: "completed" | "failed" | "pending";
}

export interface SeatMigrationInput {
  eventId: string;
  organizerId: string;
  event: unknown;
  migrationRevision: number;
  asOfMillis: number;
  participations: SeatMigrationParticipation[];
  attendees: SeatMigrationAttendee[];
  verifiedPhones: SeatMigrationVerifiedPhone[];
  origins: SeatMigrationContactOrigin[];
  contacts: SeatMigrationContact[];
  formReceipts: SeatMigrationFormReceipt[];
  /** The future TX adapter must derive this from exhausted bounded queries. */
  sourceReadEvidence: {
    complete: true;
    participationRows: number;
    attendeeRows: number;
    originRows: number;
  };
}

export type SeatMigrationPlan = {
  state: "blocked";
  blockers: string[];
} | {
  state: "ready";
  blockers: [];
  ledger: SeatLedger;
  reservations: Array<{id: string; value: SeatReservation}>;
  aliases: Array<{id: string; value: SeatIdentityAlias}>;
  verifiedPhoneProofs: SeatVerifiedPhoneProof[];
};

function hash(parts: string[]): string {
  return createHash("sha256").update(parts.join("\u001f")).digest("hex");
}

function currentPhone(value: string): boolean {
  const normalized = normalizeRosterPhone(value);
  return !normalized.issue && normalized.value === value;
}

/** Pure proposal; the writer must prove complete bounded source reads. */
export function planEventSeatMigration(input: SeatMigrationInput):
  SeatMigrationPlan {
  const blockers = new Set<string>();
  const block = (reason: string) => blockers.add(reason);
  if (!ID.test(input.eventId) || !ID.test(input.organizerId) ||
      !Number.isSafeInteger(input.migrationRevision) ||
      input.migrationRevision < 1 ||
      !Number.isSafeInteger(input.asOfMillis) || input.asOfMillis < 0) {
    return {state: "blocked", blockers: ["invalidMigrationScope"]};
  }
  const reads = input.sourceReadEvidence;
  if (!reads || reads.complete !== true ||
      reads.participationRows !== input.participations.length ||
      reads.attendeeRows !== input.attendees.length ||
      reads.originRows !== input.origins.length) {
    return {state: "blocked", blockers: ["sourceReadIncomplete"]};
  }
  const raw = input.event as Record<string, unknown> | null;
  if (!raw || raw.organizerId !== input.organizerId ||
      raw.organizerId !== undefined &&
        raw.organizerId !== input.organizerId) {
    return {state: "blocked", blockers: ["eventTenantConflict"]};
  }
  let policy: ReturnType<typeof deriveEventSeatPolicy> | undefined;
  try {
    policy = deriveEventSeatPolicy(raw);
  } catch {
    block("eventCapacityOrPolicyUnavailable");
  }
  const proofs = new Map<string, SeatMigrationVerifiedPhone>();
  for (const proof of input.verifiedPhones) {
    if (!ID.test(proof.uid) || proof.verifiedByAuth !== true ||
        proof.phoneE164 !== null && !currentPhone(proof.phoneE164) ||
        proofs.has(proof.uid)) {
      block("verifiedPhoneEvidenceConflict");
    } else proofs.set(proof.uid, proof);
  }
  const aliases = new Map<string, {id: string; value: SeatIdentityAlias}>();
  const occupied = new Set<string>();
  const guestKey = (id: string) => "guest_" + hash([input.eventId, id])
    .slice(0, 48);
  const uidKey = (uid: string) => "uid_" + hash([input.eventId, uid])
    .slice(0, 48);
  const addAlias = (kind: AliasKind, value: string, canonicalKey: string) => {
    if (!value || value.length > 512) {
      block("malformedSeatAlias");
      return;
    }
    const id = seatIdentityAliasId(input.eventId, kind, value);
    const existing = aliases.get(id);
    if (existing && existing.value.canonicalKey !== canonicalKey) {
      block("ambiguousSeatAlias");
      return;
    }
    aliases.set(id, {id, value: {eventId: input.eventId,
      organizerId: input.organizerId, kind,
      valueHash: seatIdentityValueHash(kind, value), canonicalKey,
      identityRevision: 1, migrationRevision: input.migrationRevision,
      state: "ready"}});
  };
  const activeUids = new Set<string>();
  for (const row of input.participations) {
    if (row.eventId !== input.eventId ||
        row.organizerId !== input.organizerId || !ID.test(row.uid) ||
        !["signedUp", "attended", "waitlisted", "cancelled", "deleted"]
          .includes(row.status)) {
      block("participationSourceConflict");
      continue;
    }
    if (row.status === "signedUp" || row.status === "attended") {
      if (activeUids.has(row.uid)) block("duplicateParticipation");
      activeUids.add(row.uid);
      occupied.add(uidKey(row.uid));
    }
    if (!proofs.has(row.uid)) block("verifiedUidEvidenceUnavailable");
    addAlias("uid", row.uid, uidKey(row.uid));
  }
  const proofRows: SeatVerifiedPhoneProof[] = [];
  for (const proof of proofs.values()) {
    addAlias("uid", proof.uid, uidKey(proof.uid));
    if (proof.phoneE164) {
      addAlias("phone", proof.phoneE164, uidKey(proof.uid));
    }
    proofRows.push({eventId: input.eventId,
      organizerId: input.organizerId, uid: proof.uid,
      phoneE164: proof.phoneE164,
      migrationRevision: input.migrationRevision, state: "current"});
  }
  const attendeeKeys = new Map<string, string>();
  const activeAttendeeByKey = new Map<string, string>();
  for (const row of input.attendees) {
    if (!ID.test(row.id) || row.eventId !== input.eventId ||
        row.organizerId !== input.organizerId ||
        !["registered", "checkedIn", "invited", "waitlisted",
          "cancelled"].includes(row.status) ||
        !["catchBooking", "hostImport", "hostManual", "webOtp",
          "providerSync"].includes(row.source)) {
      block("attendeeSourceConflict");
      continue;
    }
    if (row.status === "cancelled") continue;
    if (row.linkedUid !== null &&
        (!ID.test(row.linkedUid) || !proofs.has(row.linkedUid))) {
      block("unverifiedAttendeeLink");
      continue;
    }
    const key = row.linkedUid ? uidKey(row.linkedUid) : guestKey(row.id);
    attendeeKeys.set(row.id, key);
    addAlias("attendee", row.id, key);
    if (row.linkedUid) addAlias("uid", row.linkedUid, key);
    if (row.phoneE164 !== null) {
      if (!currentPhone(row.phoneE164)) block("malformedAttendeePhone");
      else {
        const verified = row.linkedUid && proofs.get(row.linkedUid);
        if (verified && verified.phoneE164 !== row.phoneE164) {
          block("attendeeVerifiedPhoneMismatch");
        } else addAlias("phone", row.phoneE164, key);
      }
    }
    if (row.externalReference !== null) {
      const reference = row.externalReference.trim().toLowerCase();
      if (!reference) block("malformedExternalReference");
      else addAlias("external", reference, key);
    }
    if (row.status === "registered" || row.status === "checkedIn") {
      const prior = activeAttendeeByKey.get(key);
      if (prior && prior !== row.id) block("duplicateActiveAttendee");
      activeAttendeeByKey.set(key, row.id);
      occupied.add(key);
    }
  }
  if (raw.bookedCount !== activeUids.size) block("catchCountMismatch");
  const contacts = new Map(input.contacts.map((row) => [row.id, row]));
  for (const origin of input.origins) {
    if (origin.organizerId !== input.organizerId) {
      block("foreignContactOrigin");
      continue;
    }
    if (origin.eventId !== input.eventId &&
        !(origin.eventId === null &&
          origin.sourceEntityKind === "hostFormResponse")) continue;
    if (typeof origin.id !== "string" || !ID.test(origin.id) ||
        typeof origin.originContactId !== "string" ||
        !ID.test(origin.originContactId) ||
        typeof origin.currentContactId !== "string" ||
        !ID.test(origin.currentContactId)) {
      block("contactOriginProvenanceConflict");
      continue;
    }
    let attendeeId = origin.sourceEntityKind === "eventAttendee" ?
      origin.sourceEntityId : undefined;
    if (origin.sourceEntityKind === "hostFormResponse") {
      if (origin.sourceKind !== "hostForm" ||
          origin.eventId !== null || !origin.responseId ||
          origin.sourceEntityId !== origin.responseId || !origin.formId) {
        block("formOriginConflict");
        continue;
      }
      const matching = input.attendees.filter((row) =>
        row.source === "hostManual" &&
        row.externalReference === origin.responseId &&
        row.sourceRowId === origin.responseId?.slice(0, 120));
      const receipt = input.formReceipts.find((row) =>
        row.organizerId === input.organizerId &&
        row.eventId === input.eventId &&
        row.formId === origin.formId &&
        row.responseId === origin.responseId &&
        row.status === "completed");
      if (matching.length > 1 || matching.length === 1 && !receipt) {
        block("formAdmissionProvenanceUnavailable");
      }
      attendeeId = matching.length === 1 && receipt ? matching[0].id :
        undefined;
    }
    if (!attendeeId) continue;
    const key = attendeeKeys.get(attendeeId);
    const contact = contacts.get(origin.currentContactId);
    if (!key || !ID.test(origin.id) || !contact ||
        contact.organizerId !== input.organizerId ||
        contact.deleted || contact.hidden ||
        contact.mergedIntoContactId !== null ||
        contact.identityState === "ambiguous" ||
        contact.ambiguousCandidateContactIds.length > 0) {
      block("contactSourceConflict");
      continue;
    }
    if (contact.linkedUid !== null &&
        (contact.identityState !== "verified" ||
          !proofs.has(contact.linkedUid) ||
          uidKey(contact.linkedUid) !== key)) {
      block("contactVerifiedLinkMismatch");
      continue;
    }
    addAlias("contactOrigin", origin.id, key);
    addAlias("contact", origin.currentContactId, key);
  }
  if (policy && occupied.size > policy.capacity) block("capacityExceeded");
  if (blockers.size) return {state: "blocked", blockers: [...blockers].sort()};
  const ledger: SeatLedger = {eventId: input.eventId,
    capacity: policy!.capacity, occupied: occupied.size, revision: 1,
    capacityRevision: 1, policyVersion: policy!.policyVersion,
    policyHash: policy!.policyHash,
    migrationRevision: input.migrationRevision, state: "ready"};
  const reservations = [...occupied].sort().map((canonicalKey) => ({
    id: hash([input.eventId, canonicalKey]),
    value: {eventId: input.eventId, canonicalKey, identityRevision: 1,
      active: true, revision: 1, reservedAtMillis: input.asOfMillis,
      releasedAtMillis: null} as SeatReservation,
  }));
  return {state: "ready", blockers: [], ledger, reservations,
    aliases: [...aliases.values()].sort((a, b) => a.id.localeCompare(b.id)),
    verifiedPhoneProofs: proofRows.sort((a, b) => a.uid.localeCompare(b.uid))};
}
