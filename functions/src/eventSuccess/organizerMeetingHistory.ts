import * as admin from "firebase-admin";
import type {AssignmentHistoryInput} from "./assignmentOptimizer";

/**
 * Who met whom at an organiser's events, so a weekly event avoids last
 * week's pairs. One private document per organiser and guest; never read
 * by clients. Entries older than the window are ignored when read, and a
 * document nobody has met through for the window expires (TTL on
 * `expiresAt`).
 */
export const ORGANIZER_MEETING_HISTORY_COLLECTION = "organizerMeetingHistory";

/** How far back meetings count. */
export const MEETING_HISTORY_WINDOW_DAYS = 90;

const DAY_MS = 24 * 60 * 60 * 1000;
const WINDOW_MS = MEETING_HISTORY_WINDOW_DAYS * DAY_MS;

/** One peer in a guest's history. */
export interface OrganizerMeetingHistoryPeer {
  meetings?: number;
  partnerships?: number;
  lastMetAtMs?: number;
}

/** The stored document. */
export interface OrganizerMeetingHistoryDocument {
  organizerId?: string;
  uid?: string;
  peers?: Record<string, OrganizerMeetingHistoryPeer>;
}

/** The slot fields history reads from a published rotation assignment. */
export interface MeetingHistorySlot {
  roundIndex?: unknown;
  peerUid?: unknown;
  partnerUid?: unknown;
  opponentUids?: unknown;
}

/** A published rotation assignment. */
export interface MeetingHistoryAssignment {
  uid?: unknown;
  rotationSlots?: unknown;
}

/** Meetings one guest had at one event. */
export interface GuestMeetings {
  peers: Map<string, {meetings: number; partnerships: number}>;
}

/**
 * The document id for an organiser and guest.
 * @param {string} organizerId Organiser.
 * @param {string} uid Guest.
 * @return {string} Document id.
 */
export function organizerMeetingHistoryId(
  organizerId: string,
  uid: string
): string {
  return `${organizerId}_${uid}`;
}

/**
 * Collects who each guest met in the rounds that were published. A doubles
 * slot meets the partner and both opponents; the partner also counts as a
 * partnership.
 * @param {MeetingHistoryAssignment[]} assignments Published assignments.
 * @param {number} publishedRoundIndex Last round guests were shown.
 * @return {Map<string, GuestMeetings>} Meetings by guest.
 */
export function meetingsFromPublishedAssignments(
  assignments: MeetingHistoryAssignment[],
  publishedRoundIndex: number
): Map<string, GuestMeetings> {
  const byUid = new Map<string, GuestMeetings>();
  for (const assignment of assignments) {
    if (typeof assignment.uid !== "string") continue;
    if (!Array.isArray(assignment.rotationSlots)) continue;
    const guest = byUid.get(assignment.uid) ?? {peers: new Map()};
    for (const raw of assignment.rotationSlots as MeetingHistorySlot[]) {
      if (raw === null || typeof raw !== "object") continue;
      if (typeof raw.roundIndex !== "number" ||
          raw.roundIndex > publishedRoundIndex) {
        continue;
      }
      const partner = typeof raw.partnerUid === "string" ?
        raw.partnerUid :
        typeof raw.peerUid === "string" ? raw.peerUid : null;
      const opponents = Array.isArray(raw.opponentUids) ?
        raw.opponentUids.filter((uid): uid is string =>
          typeof uid === "string") :
        [];
      const doubles = opponents.length > 0;
      for (const peer of [partner, ...opponents]) {
        if (peer === null || peer === assignment.uid) continue;
        const entry = guest.peers.get(peer) ??
          {meetings: 0, partnerships: 0};
        entry.meetings += 1;
        if (doubles && peer === partner) entry.partnerships += 1;
        guest.peers.set(peer, entry);
      }
    }
    if (guest.peers.size > 0) byUid.set(assignment.uid, guest);
  }
  return byUid;
}

/**
 * Adds one event's meetings to the organiser's history. Increments are
 * merged without reads, so recording never races another event's write.
 * @param {object} params Inputs.
 * @param {FirebaseFirestore.Firestore} params.db Firestore.
 * @param {string} params.organizerId Organiser.
 * @param {Map<string, GuestMeetings>} params.meetings Meetings by guest.
 * @param {number} params.nowMillis Clock.
 * @return {Promise<number>} Documents written.
 */
export async function recordOrganizerMeetingHistory(params: {
  db: FirebaseFirestore.Firestore;
  organizerId: string;
  meetings: Map<string, GuestMeetings>;
  nowMillis: number;
}): Promise<number> {
  const entries = [...params.meetings.entries()];
  const expiresAt = admin.firestore.Timestamp.fromMillis(
    params.nowMillis + WINDOW_MS
  );
  for (let start = 0; start < entries.length; start += 400) {
    const batch = params.db.batch();
    for (const [uid, guest] of entries.slice(start, start + 400)) {
      const peers: Record<string, Record<string, unknown>> = {};
      for (const [peer, counts] of guest.peers) {
        peers[peer] = {
          meetings: admin.firestore.FieldValue.increment(counts.meetings),
          ...(counts.partnerships > 0 ? {
            partnerships: admin.firestore.FieldValue.increment(
              counts.partnerships
            ),
          } : {}),
          lastMetAtMs: params.nowMillis,
        };
      }
      batch.set(
        params.db.collection(ORGANIZER_MEETING_HISTORY_COLLECTION)
          .doc(organizerMeetingHistoryId(params.organizerId, uid)),
        {
          organizerId: params.organizerId,
          uid,
          peers,
          expiresAt,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        {merge: true}
      );
    }
    await batch.commit();
  }
  return entries.length;
}

/**
 * Turns stored history into the engine's history input for tonight's
 * roster: meetings within the window between two people both here.
 * @param {OrganizerMeetingHistoryDocument[]} documents Stored history.
 * @param {Set<string>} rosterUids Tonight's eligible guests.
 * @param {number} nowMillis Clock.
 * @return {AssignmentHistoryInput | undefined} History, or undefined when
 *   nobody here has met before.
 */
export function historyInputFromDocuments(
  documents: OrganizerMeetingHistoryDocument[],
  rosterUids: Set<string>,
  nowMillis: number
): AssignmentHistoryInput | undefined {
  const meetings: Record<string, number> = {};
  const partnerships: Record<string, number> = {};
  for (const document of documents) {
    const uid = document.uid;
    if (typeof uid !== "string" || !rosterUids.has(uid)) continue;
    for (const [peer, entry] of Object.entries(document.peers ?? {})) {
      if (peer === uid || !rosterUids.has(peer)) continue;
      if (typeof entry?.lastMetAtMs !== "number" ||
          nowMillis - entry.lastMetAtMs > WINDOW_MS) {
        continue;
      }
      const key = [uid, peer].sort().join("__");
      // Both guests' documents hold the same meeting; keep the larger.
      meetings[key] = Math.max(meetings[key] ?? 0,
        positiveInteger(entry.meetings));
      const partnered = positiveInteger(entry.partnerships);
      if (partnered > 0) {
        partnerships[key] = Math.max(partnerships[key] ?? 0, partnered);
      }
    }
  }
  if (Object.keys(meetings).length === 0) return undefined;
  return {
    pairMeetingCounts: meetings,
    ...(Object.keys(partnerships).length > 0 ?
      {partnerCounts: partnerships} : {}),
  };
}

/**
 * Loads the organiser's recent history for tonight's roster.
 * @param {FirebaseFirestore.Firestore} db Firestore.
 * @param {string | undefined} organizerId Organiser.
 * @param {string[]} uids Tonight's eligible guests.
 * @param {number} nowMillis Clock.
 * @return {Promise<AssignmentHistoryInput | undefined>} History.
 */
export async function loadOrganizerMeetingHistory(
  db: FirebaseFirestore.Firestore,
  organizerId: string | undefined,
  uids: string[],
  nowMillis: number
): Promise<AssignmentHistoryInput | undefined> {
  if (!organizerId || uids.length < 2) return undefined;
  const refs = uids.map((uid) =>
    db.collection(ORGANIZER_MEETING_HISTORY_COLLECTION)
      .doc(organizerMeetingHistoryId(organizerId, uid)));
  const snaps = await db.getAll(...refs);
  const documents = snaps
    .filter((snap) => snap.exists)
    .map((snap) => snap.data() as OrganizerMeetingHistoryDocument);
  return historyInputFromDocuments(documents, new Set(uids), nowMillis);
}

/**
 * Records the meetings of a completed event's published rotations.
 * @param {FirebaseFirestore.Firestore} db Firestore.
 * @param {object} params Inputs.
 * @param {string} params.eventId Event.
 * @param {string} params.organizerId Organiser.
 * @param {number} params.publishedRoundIndex Last published round.
 * @param {number} params.nowMillis Clock.
 * @return {Promise<number>} Guests recorded.
 */
export async function recordCompletedEventMeetings(
  db: FirebaseFirestore.Firestore,
  params: {
    eventId: string;
    organizerId: string;
    publishedRoundIndex: number;
    nowMillis: number;
  }
): Promise<number> {
  if (params.publishedRoundIndex < 0) return 0;
  const snap = await db.collection("eventSuccessAssignments")
    .where("eventId", "==", params.eventId)
    .where("moduleId", "==", "guided_rotations")
    .get();
  const meetings = meetingsFromPublishedAssignments(
    snap.docs.map((doc) => doc.data() as MeetingHistoryAssignment),
    params.publishedRoundIndex
  );
  return recordOrganizerMeetingHistory({
    db,
    organizerId: params.organizerId,
    meetings,
    nowMillis: params.nowMillis,
  });
}

/**
 * A count read from storage, or zero.
 * @param {unknown} value Stored value.
 * @return {number} Non-negative integer.
 */
function positiveInteger(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ?
    Math.floor(value) :
    0;
}
