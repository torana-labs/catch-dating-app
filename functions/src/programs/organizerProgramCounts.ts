import * as logger from "firebase-functions/logger";
import {FieldPath, FieldValue} from "firebase-admin/firestore";
import {isDeepStrictEqual} from "node:util";
import {
  commandReceiptRef,
  readCommandReceipt,
  writeCommandReceipt,
} from "../shared/commandReceipts";
import {organizerProgramViewsCollection} from "./organizerProgramViews";

/* firestore-index: programGuests (
  organizerId:ASCENDING,
  programId:ASCENDING
) */
/* firestore-index: programTravelLegs (
  organizerId:ASCENDING,
  programId:ASCENDING
) */

/**
 * The planner's list counts on organizerProgramViews: guests, guests who
 * replied and inbound journeys, with the semantics loadProgramOverviewCounts
 * gives listOrganizerPrograms. Triggers on programGuests and
 * programTravelLegs move them by the delta of each write; a full recount
 * sets them when a view is created, every night, and from the backfill.
 *
 * Each source has a fence, the read time of the recount that last set its
 * counts. A trigger whose write time (a Firestore trigger's event time is
 * the document write time) is at or before the fence was already in that
 * recount, so it changes nothing; a later write moves the count once,
 * deduplicated by a replay receipt keyed by the trigger event id. The
 * nightly recount stays the backstop for anything the deltas miss.
 */
export type OrganizerProgramCountSource = "guests" | "travelLegs";

type Data = FirebaseFirestore.DocumentData | undefined;

export interface OrganizerProgramCounts {
  guestCount: number;
  repliedGuestCount: number;
  flyingInCount: number;
}

type SourceFields = {
  counts: ReadonlyArray<keyof OrganizerProgramCounts>;
  fence: string;
};

/** The count fields each source moves, and the field holding its fence. */
const sourceFields: Record<OrganizerProgramCountSource, SourceFields> = {
  guests: {
    counts: ["guestCount", "repliedGuestCount"],
    fence: "guestCountsAsOfMicros",
  },
  travelLegs: {counts: ["flyingInCount"], fence: "flyingInCountAsOfMicros"},
};

const RECEIPT_COMMAND = "organizerProgramCounts";
const READ_LIMIT = 5000;
const RECOUNT_ATTEMPTS = 5;
const SWEEP_PAGE = 200;

const zero = (): OrganizerProgramCounts =>
  ({guestCount: 0, repliedGuestCount: 0, flyingInCount: 0});

/**
 * What one source document adds to programme [programId]'s counts: a guest
 * of the programme's organizer who is not anonymized counts once, and once
 * more as replied when its RSVP is set and not pending; an inbound journey
 * of the programme's organizer that is not a no-show counts as flying in.
 * @param {OrganizerProgramCountSource} source Which collection.
 * @param {Data} data The document, or undefined when absent.
 * @param {string} programId The programme counted.
 * @param {string} organizerId The programme's organizer.
 * @return {OrganizerProgramCounts} Its contribution.
 */
export function countContribution(source: OrganizerProgramCountSource,
  data: Data, programId: string, organizerId: string):
  OrganizerProgramCounts {
  const counts = zero();
  if (!data || data.programId !== programId ||
      data.organizerId !== organizerId) return counts;
  if (source === "guests") {
    if (data.anonymizedAt) return counts;
    counts.guestCount = 1;
    if (data.rsvpStatus && data.rsvpStatus !== "pending") {
      counts.repliedGuestCount = 1;
    }
  } else if (data.kind === "inbound" && data.readiness !== "noShow") {
    counts.flyingInCount = 1;
  }
  return counts;
}

/**
 * How one write moves programme [programId]'s counts: what the document
 * adds after it, less what it added before. Adds, removals, anonymizing, an
 * RSVP leaving or entering pending, a journey entering or leaving no-show
 * and a move between programmes or organizers all fall out of this.
 * @param {OrganizerProgramCountSource} source Which collection.
 * @param {Data} before The document before the write.
 * @param {Data} after The document after the write.
 * @param {string} programId The programme counted.
 * @param {string} organizerId The programme's organizer.
 * @return {OrganizerProgramCounts} The change of each count.
 */
export function countDelta(source: OrganizerProgramCountSource,
  before: Data, after: Data, programId: string, organizerId: string):
  OrganizerProgramCounts {
  const was = countContribution(source, before, programId, organizerId);
  const is = countContribution(source, after, programId, organizerId);
  return {
    guestCount: is.guestCount - was.guestCount,
    repliedGuestCount: is.repliedGuestCount - was.repliedGuestCount,
    flyingInCount: is.flyingInCount - was.flyingInCount,
  };
}

const isZero = (delta: OrganizerProgramCounts) =>
  delta.guestCount === 0 && delta.repliedGuestCount === 0 &&
  delta.flyingInCount === 0;

/** The programmes a write touches: the one it left and the one it is in. */
export function countedProgramIds(before: Data, after: Data): string[] {
  return [...new Set([before?.programId, after?.programId].filter(
    (id): id is string => typeof id === "string" && id.length > 0))];
}

/**
 * Microseconds since the epoch of an RFC 3339 instant, keeping the
 * fraction Date.parse drops.
 * @param {string} time The instant, as a trigger's event time.
 * @return {number|null} Microseconds, or null when it does not parse.
 */
export function rfc3339Micros(time: string): number | null {
  const match = /^(.+T\d{2}:\d{2}:\d{2})(?:\.(\d+))?(Z|[+-]\d{2}:\d{2})$/i
    .exec(time);
  if (!match) return null;
  const millis = Date.parse(`${match[1]}${match[3]}`);
  if (Number.isNaN(millis)) return null;
  return millis * 1000 + Number((match[2] ?? "").padEnd(6, "0").slice(0, 6));
}

/** Microseconds since the epoch of a Firestore timestamp. */
export function timestampMicros(value: {seconds: number;
  nanoseconds: number}): number {
  return value.seconds * 1_000_000 + Math.floor(value.nanoseconds / 1000);
}

export type CountWriteOutcome = "unchanged" | "applied" | "replayed" |
  "skipped";

/**
 * Moves the counts of the programmes one source write touches, once per
 * trigger event. A view that does not exist, has no counts yet, or was
 * recounted at or after the write is left alone.
 * @param {FirebaseFirestore.Firestore} db Firestore.
 * @param {object} write The trigger's write.
 * @return {Promise<CountWriteOutcome>} What happened.
 */
export async function applyOrganizerProgramCountWrite(
  db: FirebaseFirestore.Firestore,
  write: {
    source: OrganizerProgramCountSource;
    eventId: string;
    eventTime: string;
    before: Data;
    after: Data;
    nowMillis?: number;
  }): Promise<CountWriteOutcome> {
  const {source, before, after} = write;
  const programIds = countedProgramIds(before, after);
  // Without reads: when neither the programme nor the organizer moved, a
  // delta of zero against the document's own organizer is zero against any
  // view's (a view of another organizer counts neither side).
  const organizerId = after?.organizerId ?? before?.organizerId;
  if (programIds.length === 1 && before?.organizerId === after?.organizerId &&
      before?.programId === after?.programId &&
      typeof organizerId === "string" &&
      isZero(countDelta(source, before, after, programIds[0], organizerId))) {
    return "unchanged";
  }
  if (programIds.length === 0) return "unchanged";
  let writeMicros = rfc3339Micros(write.eventTime);
  if (writeMicros === null) {
    // Treated as after every fence; the nightly recount repairs a
    // double count.
    logger.warn("Programme count write time does not parse.",
      {eventId: write.eventId, eventTime: write.eventTime});
    writeMicros = Number.MAX_SAFE_INTEGER;
  }
  const fields = sourceFields[source];
  const nowMillis = write.nowMillis ?? Date.now();
  const receiptRef = commandReceiptRef(db, RECEIPT_COMMAND, write.eventId);
  return db.runTransaction(async (tx) => {
    const receipt = await readCommandReceipt(tx, receiptRef,
      {command: RECEIPT_COMMAND, nowMillis});
    if (receipt.kind !== "none") return "replayed";
    const views = await Promise.all(programIds.map((programId) => tx.get(
      db.collection(organizerProgramViewsCollection).doc(programId))));
    const updates: Array<[FirebaseFirestore.DocumentReference,
      Record<string, FirebaseFirestore.FieldValue>]> = [];
    for (const view of views) {
      const data = view.data();
      if (!data || typeof data.organizerId !== "string") continue;
      const fence = data[fields.fence];
      if (typeof fence !== "number" || writeMicros <= fence) continue;
      const delta = countDelta(source, before, after, view.id,
        data.organizerId);
      const patch: Record<string, FirebaseFirestore.FieldValue> = {};
      for (const field of fields.counts) {
        if (delta[field] !== 0) {
          patch[field] = FieldValue.increment(delta[field]);
        }
      }
      if (Object.keys(patch).length > 0) updates.push([view.ref, patch]);
    }
    if (updates.length === 0) return "skipped";
    for (const [ref, patch] of updates) tx.update(ref, patch);
    writeCommandReceipt(tx, receiptRef, {
      command: RECEIPT_COMMAND, retention: "trigger", nowMillis,
    });
    return "applied";
  });
}

export type RecountOutcome =
  | {kind: "noView"}
  | {kind: "tooLarge"}
  | {kind: "busy"}
  | {kind: "current"; counts: OrganizerProgramCounts}
  | {kind: "written" | "drift"; before: Partial<OrganizerProgramCounts>;
      counts: OrganizerProgramCounts};

const readTimeMicros = (snap: FirebaseFirestore.QuerySnapshot,
  fallback: number) => {
  const readTime = (snap as {readTime?: {seconds: number;
    nanoseconds: number}}).readTime;
  return readTime ? timestampMicros(readTime) : fallback;
};

const storedCounts = (data: FirebaseFirestore.DocumentData) => {
  const counts: Partial<OrganizerProgramCounts> = {};
  for (const field of ["guestCount", "repliedGuestCount",
    "flyingInCount"] as const) {
    if (typeof data[field] === "number") counts[field] = data[field];
  }
  return counts;
};

/**
 * Recounts one programme from its guests and journeys and writes the counts
 * with each source's fence when they differ or were never set. It commits
 * only if the view did not change since it was read, so a delta applied
 * during the recount is never lost; a busy view is left to the next run.
 * More than 5,000 guests or journeys keeps the old counts.
 * @param {FirebaseFirestore.Firestore} db Firestore.
 * @param {string} programId The programme.
 * @param {object} options dryRun reports without writing.
 * @return {Promise<RecountOutcome>} What the recount found or did.
 */
export async function recountOrganizerProgram(
  db: FirebaseFirestore.Firestore, programId: string,
  options: {dryRun?: boolean; nowMicros?: () => number} = {}):
  Promise<RecountOutcome> {
  const ref = db.collection(organizerProgramViewsCollection).doc(programId);
  const nowMicros = options.nowMicros ?? (() => Date.now() * 1000);
  for (let attempt = 0; attempt < RECOUNT_ATTEMPTS; attempt++) {
    const view = await ref.get();
    const data = view.data();
    if (!data || typeof data.organizerId !== "string") return {kind: "noView"};
    const organizerId = data.organizerId;
    const read = (collection: string) => db.collection(collection)
      .where("organizerId", "==", organizerId)
      .where("programId", "==", programId).limit(READ_LIMIT + 1).get();
    const fallback = nowMicros();
    const [guests, legs] = await Promise.all([read("programGuests"),
      read("programTravelLegs")]);
    if (guests.size > READ_LIMIT || legs.size > READ_LIMIT) {
      logger.warn("Programme counts kept: too many guests or journeys.",
        {programId, guests: guests.size, legs: legs.size});
      return {kind: "tooLarge"};
    }
    const counts = zero();
    const add = (source: OrganizerProgramCountSource,
      snap: FirebaseFirestore.QuerySnapshot) => {
      for (const doc of snap.docs) {
        const one = countContribution(source, doc.data(), programId,
          organizerId);
        counts.guestCount += one.guestCount;
        counts.repliedGuestCount += one.repliedGuestCount;
        counts.flyingInCount += one.flyingInCount;
      }
    };
    add("guests", guests);
    add("travelLegs", legs);
    const before = storedCounts(data);
    const fenced = typeof data.guestCountsAsOfMicros === "number" &&
      typeof data.flyingInCountAsOfMicros === "number";
    if (fenced && isDeepStrictEqual(before, counts)) {
      return {kind: "current", counts};
    }
    if (options.dryRun) return {kind: "drift", before, counts};
    const committed = await db.runTransaction(async (tx) => {
      const current = await tx.get(ref);
      if (!isDeepStrictEqual(current.data(), data)) return false;
      tx.update(ref, {
        ...counts,
        guestCountsAsOfMicros: readTimeMicros(guests, fallback),
        flyingInCountAsOfMicros: readTimeMicros(legs, fallback),
      });
      return true;
    });
    if (committed) return {kind: "written", before, counts};
  }
  logger.warn("Programme counts left for the next recount: the view kept " +
    "changing.", {programId});
  return {kind: "busy"};
}

export interface RecountSummary {
  scanned: number;
  written: number;
  drift: number;
  current: number;
  tooLarge: number;
  busy: number;
  noView: number;
  /** Programmes not reached before the deadline. */
  stoppedEarly: boolean;
  changes: Array<{programId: string; before: Partial<OrganizerProgramCounts>;
    counts: OrganizerProgramCounts}>;
}

/**
 * Recounts every programme view, a page at a time in id order: the nightly
 * backstop and the backfill.
 * @param {FirebaseFirestore.Firestore} db Firestore.
 * @param {object} options dryRun reports without writing; deadlineMillis
 *   stops before a page that would start after it.
 * @return {Promise<RecountSummary>} What was found and written.
 */
export async function recountAllOrganizerPrograms(
  db: FirebaseFirestore.Firestore,
  options: {dryRun?: boolean; deadlineMillis?: number;
    nowMillis?: () => number} = {}): Promise<RecountSummary> {
  const nowMillis = options.nowMillis ?? Date.now;
  const summary: RecountSummary = {scanned: 0, written: 0, drift: 0,
    current: 0, tooLarge: 0, busy: 0, noView: 0, stoppedEarly: false,
    changes: []};
  let after: string | null = null;
  for (;;) {
    if (options.deadlineMillis !== undefined &&
        nowMillis() >= options.deadlineMillis) {
      summary.stoppedEarly = true;
      break;
    }
    let query = db.collection(organizerProgramViewsCollection)
      .orderBy(FieldPath.documentId()).limit(SWEEP_PAGE);
    if (after !== null) query = query.startAfter(after);
    const page = await query.get();
    for (const doc of page.docs) {
      summary.scanned += 1;
      const outcome = await recountOrganizerProgram(db, doc.id,
        {dryRun: options.dryRun});
      summary[outcome.kind] += 1;
      if (outcome.kind === "written" || outcome.kind === "drift") {
        summary.changes.push({programId: doc.id, before: outcome.before,
          counts: outcome.counts});
      }
    }
    if (page.size < SWEEP_PAGE) break;
    after = page.docs[page.docs.length - 1].id;
  }
  return summary;
}
