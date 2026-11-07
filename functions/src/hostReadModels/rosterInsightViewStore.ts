import * as admin from "firebase-admin";
import {logger} from "firebase-functions";
import type {
  HostEventRosterInsightViewDocument,
  OrganizerContactDocument,
  OrganizerContactEventEdgeDocument,
  OrganizerContactTraitDocument,
  OrganizerSpendTotalsDocument,
} from "../shared/generated/firestoreAdminTypes";
import {
  buildInsightRow,
  CatchSpendAmount,
  ContactRow,
  InsightRow,
  withMemberSignal,
} from "../organizers/eventRosterInsights";
import {
  accountSpend,
  accountSpendAtCutoff,
  organizerEventIds,
  rebuildOrganizerSpend,
  SpendRebuildReport,
  spendTotalsCollection,
} from "./organizerSpendStore";
import {SourceInvalidError} from "./support/sourceInvalid";
import {planViewWrite, ViewOutcome} from "./support/viewWrite";

export const rosterInsightViewsCollection = "hostEventRosterInsightViews";
export const maxRosterAttendees = 1000;
export const maxRosterHistoryEdges = 10000;
/** A view stops being maintained this long after its event ends. */
export const rosterInsightFreezeMillis = 24 * 60 * 60 * 1000;
const firestoreInLimit = 30;
const documentIdPattern = /^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$/;

type Coverage = HostEventRosterInsightViewDocument["sourceCoverage"];

export type RosterInsightViewOutcome =
  | Extract<ViewOutcome, {kind: "removed" | "invalidSource"}>
  | {kind: "frozen"}
  | {kind: "unchanged"; revision: number; sourceCoverage: Coverage}
  | {
    kind: "written";
    revision: number;
    sourceCoverage: Exclude<Coverage, "invalidSource">;
    rows: number;
    recomputedAccounts: number;
  };

export interface RosterInsightViewStoreDeps {
  now: () => FirebaseFirestore.Timestamp;
}

const defaultDeps: RosterInsightViewStoreDeps = {
  now: () => admin.firestore.Timestamp.now(),
};

const identityStates = new Set(["unlinked", "verified", "ambiguous", "merged"]);

function isTimestamp(value: unknown): value is FirebaseFirestore.Timestamp {
  return value !== null && typeof value === "object" &&
    typeof (value as {toMillis?: unknown}).toMillis === "function";
}

const isNullableTimestamp = (value: unknown) =>
  value === null || value === undefined || isTimestamp(value);

/** The edge fields the rows read, checked. */
export function rosterEdge(
  id: string,
  data: FirebaseFirestore.DocumentData | undefined
): OrganizerContactEventEdgeDocument {
  const invalid = (detail: string) => new SourceInvalidError(
    "organizerContactEventEdges", `${id} ${detail}`);
  if (data === undefined) throw invalid("is empty.");
  if (typeof data.contactId !== "string" ||
      !documentIdPattern.test(data.contactId) ||
      typeof data.eventId !== "string" || data.eventId.length === 0) {
    throw invalid("has no contact or event.");
  }
  for (const field of ["expected", "cancelled", "checkedIn"]) {
    if (typeof data[field] !== "boolean") throw invalid(`has no ${field}.`);
  }
  for (const field of ["eventStartAt", "eventEndAt", "checkedInAt"]) {
    if (!isNullableTimestamp(data[field])) {
      throw invalid(`has an invalid ${field}.`);
    }
  }
  return {...data, eventStartAt: data.eventStartAt ?? null,
    eventEndAt: data.eventEndAt ?? null,
    checkedInAt: data.checkedInAt ?? null} as OrganizerContactEventEdgeDocument;
}

/** The contact fields the rows read, checked. */
export function rosterContact(
  id: string,
  data: FirebaseFirestore.DocumentData | undefined
): ContactRow | null {
  if (data === undefined) return null;
  const invalid = (detail: string) => new SourceInvalidError(
    "organizerContacts", `${id} ${detail}`);
  if (!identityStates.has(data.identityState)) {
    throw invalid("has an unknown identityState.");
  }
  if (!Number.isSafeInteger(data.sourceCount) || data.sourceCount < 0) {
    throw invalid("has an invalid sourceCount.");
  }
  if (data.linkedUid !== null && (typeof data.linkedUid !== "string" ||
      data.linkedUid.length === 0)) {
    throw invalid("has an invalid linkedUid.");
  }
  return {id, data: data as OrganizerContactDocument};
}

/** The trait fields the rows read, checked. */
export function rosterTraits(
  id: string,
  data: FirebaseFirestore.DocumentData | undefined
): OrganizerContactTraitDocument | null {
  if (data === undefined) return null;
  if (!Array.isArray(data.segmentIds) ||
      data.segmentIds.some((value: unknown) => typeof value !== "string")) {
    throw new SourceInvalidError("organizerContactTraits",
      `${id} has invalid segmentIds.`);
  }
  return data as OrganizerContactTraitDocument;
}

function chunks<T>(values: T[]): T[][] {
  const result: T[][] = [];
  for (let index = 0; index < values.length; index += firestoreInLimit) {
    result.push(values.slice(index, index + firestoreInLimit));
  }
  return result;
}

interface RosterSources {
  attendeeIds: string[];
  attendeesOverCap: boolean;
  edges: Map<string, OrganizerContactEventEdgeDocument>;
  contacts: Map<string, ContactRow>;
  traits: Map<string, OrganizerContactTraitDocument>;
  history: Map<string, OrganizerContactEventEdgeDocument[]>;
  historyTruncated: boolean;
}

/** Every row source, read through the transaction. */
async function readRosterSources(
  db: FirebaseFirestore.Firestore,
  tx: FirebaseFirestore.Transaction,
  eventId: string
): Promise<RosterSources> {
  const attendeesSnap = await tx.get(db.collection("eventAttendees")
    .where("eventId", "==", eventId).limit(maxRosterAttendees + 1));
  const attendeeIds = attendeesSnap.docs.slice(0, maxRosterAttendees)
    .map((doc) => doc.id);
  const edgeSnaps = attendeeIds.length === 0 ? [] : await tx.getAll(
    ...attendeeIds.map((id) =>
      db.collection("organizerContactEventEdges").doc(id)));
  const edges = new Map(edgeSnaps.filter((snap) => snap.exists)
    .map((snap) => [snap.id, rosterEdge(snap.id, snap.data())]));
  const contactIds = [...new Set([...edges.values()]
    .map((edge) => edge.contactId))];
  const [contactSnaps, traitSnaps] = contactIds.length === 0 ? [[], []] :
    await Promise.all([
      tx.getAll(...contactIds.map((id) =>
        db.collection("organizerContacts").doc(id))),
      tx.getAll(...contactIds.map((id) =>
        db.collection("organizerContactTraits").doc(id))),
    ]);
  const contacts = new Map<string, ContactRow>();
  for (const snap of contactSnaps) {
    const contact = rosterContact(snap.id, snap.data());
    if (contact) contacts.set(snap.id, contact);
  }
  const traits = new Map<string, OrganizerContactTraitDocument>();
  for (const snap of traitSnaps) {
    const trait = rosterTraits(snap.id, snap.data());
    if (trait) traits.set(snap.id, trait);
  }
  const history = new Map<string, OrganizerContactEventEdgeDocument[]>();
  let read = 0;
  let historyTruncated = false;
  for (const ids of chunks(contactIds)) {
    if (read >= maxRosterHistoryEdges) {
      historyTruncated = true;
      break;
    }
    const remaining = maxRosterHistoryEdges - read;
    const snap = await tx.get(db.collection("organizerContactEventEdges")
      .where("contactId", "in", ids).limit(remaining + 1));
    if (snap.size > remaining) historyTruncated = true;
    for (const doc of snap.docs.slice(0, remaining)) {
      const edge = rosterEdge(doc.id, doc.data());
      history.set(edge.contactId, [...history.get(edge.contactId) ?? [], edge]);
      read++;
    }
  }
  return {attendeeIds, attendeesOverCap: attendeesSnap.size >
    maxRosterAttendees, edges, contacts, traits, history, historyTruncated};
}

/**
 * Re-evaluates hostEventRosterInsightViews/{eventId} from current sources in
 * one transaction: the event, its attendees (at most 1,001 read), their
 * current contact edges, contacts and traits, the contacts' edge history (at
 * most 10,000), and the organizer's spend totals. Catch spend comes from the
 * totals; an account whose payments straddle the cutoff is recomputed from
 * its payments. Writes only when the projection changed. A source row that
 * fails validation records invalidSource and keeps the previous rows; any
 * other error throws, so the trigger retries. An event that ended more than
 * 24 hours ago is frozen; a missing event, or one without an organizer, has
 * no view.
 */
export async function reconcileRosterInsightView(
  db: FirebaseFirestore.Firestore,
  eventId: string,
  deps: RosterInsightViewStoreDeps = defaultDeps
): Promise<RosterInsightViewOutcome> {
  const outcome = await db.runTransaction(async (tx):
    Promise<RosterInsightViewOutcome> => {
    const now = deps.now();
    const viewRef = db.collection(rosterInsightViewsCollection).doc(eventId);
    const [eventSnap, viewSnap] = await Promise.all([
      tx.get(db.collection("events").doc(eventId)),
      tx.get(viewRef),
    ]);
    const event = eventSnap.data();
    const organizerId = event?.organizerId;
    if (!event || typeof organizerId !== "string" ||
        !documentIdPattern.test(organizerId)) {
      if (viewSnap.exists) tx.delete(viewRef);
      return {kind: "removed", existed: viewSnap.exists};
    }
    const previous = viewSnap.exists ?
      viewSnap.data() as HostEventRosterInsightViewDocument : null;
    const startTime = event.startTime;
    if (!isTimestamp(startTime) || !isNullableTimestamp(event.endTime)) {
      return recordInvalid(tx, viewRef, {eventId, organizerId, previous, now,
        cutoffAtMillis: previous?.cutoffAtMillis ?? 0,
        error: new SourceInvalidError("events",
          `${eventId} has an invalid startTime or endTime.`)});
    }
    const cutoffAtMillis = startTime.toMillis();
    const endMillis = isTimestamp(event.endTime) ?
      event.endTime.toMillis() : cutoffAtMillis;
    if (endMillis + rosterInsightFreezeMillis < now.toMillis()) {
      return {kind: "frozen"};
    }
    let sources: RosterSources;
    try {
      sources = await readRosterSources(db, tx, eventId);
    } catch (error) {
      if (!(error instanceof SourceInvalidError)) throw error;
      return recordInvalid(tx, viewRef, {eventId, organizerId, previous, now,
        cutoffAtMillis, error});
    }
    const totalsSnap = await tx.get(db.collection(spendTotalsCollection)
      .doc(organizerId));
    const spend = await rosterSpend(db, tx, {organizerId, cutoffAtMillis,
      totals: totalsSnap.data() as OrganizerSpendTotalsDocument | undefined,
      uids: [...sources.contacts.values()]
        .map((contact) => contact.data.linkedUid)
        .filter((uid): uid is string => uid !== null)});
    const rows: InsightRow[] = sources.attendeeIds.map((attendeeId) =>
      withMemberSignal(buildInsightRow({
        attendeeId,
        currentEdge: sources.edges.get(attendeeId),
        contacts: sources.contacts,
        traits: sources.traits,
        history: sources.history,
        catchSpendFor: (uid) => spend.byUid.get(uid) ?? [],
        cutoffAtMillis,
      }), sources.traits, sources.contacts));
    const pending = rows.find((row) => row.availability ===
      "projectionPending");
    const incompleteSource = sources.attendeesOverCap ? "eventAttendees" :
      sources.historyTruncated ? "organizerContactEventEdges" :
        pending ? (pending.contactId === null ?
          "organizerContactEventEdges" : "organizerContacts") :
          spend.overCap ? "payments" : null;
    const sourceCoverage = incompleteSource === null ? "exact" as const :
      "partial" as const;
    const next = {organizerId, cutoffAtMillis, sourceCoverage,
      incompleteSource, rows};
    const plan = planViewWrite(previous, {schemaVersion: 1 as const, eventId,
      ...next}, now);
    if (plan.unchanged) {
      return {kind: "unchanged", revision: plan.revision, sourceCoverage};
    }
    tx.set(viewRef, plan.document);
    return {kind: "written", revision: plan.revision, sourceCoverage,
      rows: rows.length, recomputedAccounts: spend.recomputedAccounts};
  });
  // Logged once per committed evaluation, not once per transaction attempt.
  if (outcome.kind === "invalidSource") {
    logger.error("Host roster insight view read an invalid source.", {
      eventId,
      source: outcome.source,
      detail: outcome.detail,
    });
  }
  return outcome;
}

function recordInvalid(
  tx: FirebaseFirestore.Transaction,
  viewRef: FirebaseFirestore.DocumentReference,
  params: {
    eventId: string;
    organizerId: string;
    previous: HostEventRosterInsightViewDocument | null;
    now: FirebaseFirestore.Timestamp;
    cutoffAtMillis: number;
    error: SourceInvalidError;
  }
): RosterInsightViewOutcome {
  const previous = params.previous;
  const unchanged = previous !== null &&
    previous.sourceCoverage === "invalidSource" &&
    previous.incompleteSource === params.error.source &&
    previous.organizerId === params.organizerId;
  const revision = (previous?.revision ?? 0) + (unchanged ? 0 : 1);
  if (!unchanged) {
    const document: HostEventRosterInsightViewDocument = {
      schemaVersion: 1,
      eventId: params.eventId,
      organizerId: params.organizerId,
      cutoffAtMillis: params.cutoffAtMillis,
      sourceCoverage: "invalidSource",
      incompleteSource: params.error.source,
      rows: previous?.rows ?? [],
      revision,
      evaluatedAt: params.now,
    };
    tx.set(viewRef, document);
  }
  return {kind: "invalidSource", source: params.error.source,
    detail: params.error.detail, revision, written: !unchanged};
}

/**
 * Catch spend for each linked account on the roster, at or before the
 * cutoff. Partial totals give no spend at all, as the retired callable gave
 * none when its payment read was truncated. An account whose counted
 * payments all completed at or before the cutoff takes its totals as they
 * are; one whose first counted payment is after the cutoff has none; only
 * an account with payments on both sides is recomputed from its payments.
 */
async function rosterSpend(
  db: FirebaseFirestore.Firestore,
  tx: FirebaseFirestore.Transaction,
  params: {
    organizerId: string;
    cutoffAtMillis: number;
    totals: OrganizerSpendTotalsDocument | undefined;
    uids: string[];
  }
): Promise<{
  byUid: Map<string, CatchSpendAmount[]>;
  overCap: boolean;
  recomputedAccounts: number;
}> {
  const byUid = new Map<string, CatchSpendAmount[]>();
  let overCap = false;
  let recomputedAccounts = 0;
  if (params.totals?.coverage !== "exact") {
    // No totals yet means no counted payment yet: nothing to show either.
    return {byUid, overCap, recomputedAccounts};
  }
  for (const uid of new Set(params.uids)) {
    const account = params.totals.byUid[uid];
    if (account === undefined ||
        account.firstCompletedAtMillis > params.cutoffAtMillis) continue;
    if (account.lastCompletedAtMillis <= params.cutoffAtMillis) {
      byUid.set(uid, accountSpend(account));
      continue;
    }
    recomputedAccounts++;
    const result = await accountSpendAtCutoff(db, tx, {
      organizerId: params.organizerId, uid,
      cutoffAtMillis: params.cutoffAtMillis});
    if (result.kind === "overCap") {
      overCap = true;
    } else if (result.catchSpend.length > 0) {
      byUid.set(uid, result.catchSpend);
    }
  }
  return {byUid, overCap, recomputedAccounts};
}

export interface RosterInsightBackfillReport {
  spend: SpendRebuildReport;
  events: number;
  outcomes: Record<RosterInsightViewOutcome["kind"], number>;
}

/**
 * Explicit organizer scope: rebuilds the organizer's spend totals and
 * projection, then every view for its events not yet frozen. Without apply
 * it only reports what the rebuild would write and counts the events.
 */
export async function backfillRosterInsights(
  db: FirebaseFirestore.Firestore,
  organizerId: string,
  apply: boolean,
  deps: RosterInsightViewStoreDeps = defaultDeps
): Promise<RosterInsightBackfillReport> {
  const spend = await rebuildOrganizerSpend(db, organizerId, apply, deps);
  const outcomes: RosterInsightBackfillReport["outcomes"] = {
    removed: 0, frozen: 0, unchanged: 0, written: 0, invalidSource: 0,
  };
  let events = 0;
  for await (const event of organizerEventIds(db, organizerId)) {
    events++;
    if (apply) {
      outcomes[(await reconcileRosterInsightView(db, event.id, deps)).kind]++;
    }
  }
  return {spend, events, outcomes};
}
