import {onDocumentWritten} from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import {logger} from "firebase-functions";
import type {Firestore} from "firebase-admin/firestore";
import type {EventSuccessGuestHistoryDocument} from
  "../shared/generated/firestoreAdminTypes";
import {validateEventSuccessGuestHistoryDocument} from
  "../shared/generated/validators/eventSuccessGuestHistoryDocument";

/**
 * Guest game history: one `eventSuccessGuestHistory/{eventId}_{uid}` per
 * guest, projected from `eventSuccessStandings/{eventId}` whenever it is
 * written. A guest's unit is found the way the Host scoreboard names
 * units: score formats by the guest's team or table assignment (or their
 * arrival group), rank formats by the guest's pair in each rotation round.
 * Guests read only their own document; only this trigger writes.
 */

export const GUEST_HISTORY = "eventSuccessGuestHistory";
const MAX_SOURCE_DOCS = 1000;

type GuestStanding = EventSuccessGuestHistoryDocument["rounds"][number];

interface StandingEntry {
  unitId: string;
  unitLabel: string;
  position: number;
  value: number;
}

export interface StandingsSource {
  eventId: string;
  organizerId: string;
  unitOutcome: "score" | "rank";
  revision: number;
  rounds: Array<{roundIndex: number; entries: StandingEntry[]}>;
}

/** Where one guest sat: their units for every round, or by round. */
export interface GuestUnits {
  /** Units that hold for the whole night (teams, tables, groups). */
  always: Set<string>;
  /** Units for one round only (rotation pairs). */
  byRound: Map<number, Set<string>>;
}

export function guestHistoryId(eventId: string, uid: string): string {
  return `${eventId}_${uid}`;
}

/** The scoreboard's unit id rules, kept equal to the Host's. */
export function safeOutcomeUnitId(value: string): string {
  const normalized = value.replace(/[^A-Za-z0-9_-]/g, "_");
  const safe = normalized.length === 0 ? "unit" : normalized;
  return safe.length <= 120 ? safe : safe.substring(0, 120);
}

function labelKey(value: string): string {
  const normalized = value.trim().replace(/\s+/g, " ");
  const bounded = (normalized.length === 0 ? "Unit" : normalized)
    .substring(0, 80);
  return bounded.toLowerCase();
}

/**
 * Every guest's units, from assignments and the operational roster.
 * @param {Array<Record<string, unknown>>} assignments Assignment docs.
 * @param {Array<Record<string, unknown>>} attendees Attendee docs.
 * @return {Map<string, GuestUnits>} Units by guest uid.
 */
export function guestUnitsFrom(
  assignments: Array<Record<string, unknown>>,
  attendees: Array<Record<string, unknown>>
): Map<string, GuestUnits> {
  const units = new Map<string, GuestUnits>();
  const forGuest = (uid: string) => {
    let entry = units.get(uid);
    if (!entry) {
      entry = {always: new Set(), byRound: new Map()};
      units.set(uid, entry);
    }
    return entry;
  };
  for (const assignment of assignments) {
    const uid = assignment.uid;
    if (typeof uid !== "string") continue;
    const moduleId = String(assignment.moduleId ?? "");
    const unitKey = Number.isInteger(assignment.unitIndex) ?
      String(assignment.unitIndex) :
      typeof assignment.label === "string" ? assignment.label : null;
    if (unitKey !== null) {
      forGuest(uid).always.add(
        safeOutcomeUnitId(`${moduleId}_unit_${unitKey}`));
    }
    const slots = Array.isArray(assignment.rotationSlots) ?
      assignment.rotationSlots as Array<Record<string, unknown>> : [];
    for (const slot of slots) {
      const round = slot.roundIndex;
      const peer = slot.peerUid;
      if (!Number.isInteger(round) || typeof peer !== "string") continue;
      const pairKey = typeof slot.slotId === "string" ? slot.slotId :
        [uid, peer].sort().join("_");
      const unitId = safeOutcomeUnitId(`round_${round}_${pairKey}`);
      for (const member of [uid, peer]) {
        const byRound = forGuest(member).byRound;
        const set = byRound.get(round as number) ?? new Set<string>();
        set.add(unitId);
        byRound.set(round as number, set);
      }
    }
  }
  for (const attendee of attendees) {
    const uid = attendee.linkedUid;
    const group = attendee.arrivalGroup;
    if (typeof uid !== "string" || typeof group !== "string") continue;
    const key = labelKey(group);
    if (key.length === 0) continue;
    forGuest(uid).always.add(safeOutcomeUnitId(`arrival_group_${key}`));
  }
  return units;
}

/** One guest's history from the standings and where they sat. */
export function guestHistoryFor(
  standings: StandingsSource,
  uid: string,
  units: GuestUnits,
  nowMillis: number
): EventSuccessGuestHistoryDocument {
  const rounds: GuestStanding[] = [];
  for (const round of [...standings.rounds]
    .sort((a, b) => a.roundIndex - b.roundIndex)) {
    const roundUnits = units.byRound.get(round.roundIndex);
    const entry = round.entries.find((candidate) =>
      units.always.has(candidate.unitId) ||
      (roundUnits?.has(candidate.unitId) ?? false));
    if (!entry) continue;
    rounds.push({
      roundIndex: round.roundIndex,
      unitId: entry.unitId,
      unitLabel: entry.unitLabel,
      position: entry.position,
      value: entry.value,
      first: entry.position === 1,
    });
  }
  return {
    eventId: standings.eventId,
    organizerId: standings.organizerId,
    uid,
    unitOutcome: standings.unitOutcome,
    standingsRevision: standings.revision,
    rounds,
    finalStanding: rounds.length === 0 ? null : rounds[rounds.length - 1],
    updatedAtMs: nowMillis,
  };
}

/** Rebuilds every guest's history for one event's standings. */
export async function projectGuestHistory(
  db: Firestore,
  standings: StandingsSource,
  nowMillis: number
): Promise<number> {
  const [assignmentSnap, attendeeSnap] = await Promise.all([
    db.collection("eventSuccessAssignments")
      .where("eventId", "==", standings.eventId)
      .limit(MAX_SOURCE_DOCS).get(),
    db.collection("eventAttendees")
      .where("eventId", "==", standings.eventId)
      .limit(MAX_SOURCE_DOCS).get(),
  ]);
  const units = guestUnitsFrom(
    assignmentSnap.docs.map((doc) => doc.data()),
    attendeeSnap.docs.map((doc) => doc.data()));
  const batch = db.batch();
  let written = 0;
  for (const [uid, guestUnits] of units) {
    if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$/.test(uid)) continue;
    const history = guestHistoryFor(standings, uid, guestUnits, nowMillis);
    if (history.rounds.length === 0) continue;
    if (!validateEventSuccessGuestHistoryDocument(history)) {
      logger.warn("Skipped an invalid guest history", {
        eventId: standings.eventId,
      });
      continue;
    }
    batch.set(db.collection(GUEST_HISTORY)
      .doc(guestHistoryId(standings.eventId, uid)), history);
    written += 1;
    if (written >= 450) break;
  }
  if (written > 0) await batch.commit();
  return written;
}

/** Reads a standings document as the projection needs it, or null. */
export function standingsSource(
  eventId: string,
  data: Record<string, unknown> | undefined
): StandingsSource | null {
  if (!data || (data.unitOutcome !== "score" && data.unitOutcome !== "rank") ||
      typeof data.organizerId !== "string" || !Array.isArray(data.rounds)) {
    return null;
  }
  return {
    eventId,
    organizerId: data.organizerId,
    unitOutcome: data.unitOutcome,
    revision: Number.isInteger(data.revision) ? data.revision as number : 0,
    rounds: data.rounds as StandingsSource["rounds"],
  };
}

export const onEventSuccessStandingsWritten = onDocumentWritten(
  "eventSuccessStandings/{eventId}",
  async (event) => {
    const source = standingsSource(event.params.eventId,
      event.data?.after.data());
    if (source === null) return;
    await projectGuestHistory(admin.firestore(), source, Date.now());
  }
);
