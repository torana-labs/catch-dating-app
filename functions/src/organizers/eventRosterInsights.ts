import {retainedNativePaymentAmount} from "../payments/paymentAmounts";
import * as admin from "firebase-admin";
import {CallableRequest, HttpsError, onCall} from
  "firebase-functions/v2/https";
import {requireAuth} from "../shared/auth";
import {appCheckCallableOptionsWithLimits} from
  "../shared/callableOptions";
import type {GetEventRosterInsightsCallablePayload} from
  "../shared/generated/getEventRosterInsightsCallablePayload";
import type {GetEventRosterInsightsCallableResponse} from
  "../shared/generated/getEventRosterInsightsCallableResponse";
import type {
  EventAttendeeDocument,
  EventDocument,
  HostEventRosterInsightViewDocument,
  OrganizerContactDocument,
  OrganizerContactEventEdgeDocument,
  OrganizerContactTraitDocument,
  PaymentDocument,
} from "../shared/generated/firestoreAdminTypes";
import {
  validateGetEventRosterInsightsCallablePayload,
} from "../shared/generated/validators/getEventRosterInsightsInput";
import {requireOrganizerManager} from
  "../shared/organizerManagerAuthority";
import {checkRateLimit} from "../shared/rateLimit";
import {requireDoc, validateCallableWithAjv} from "../shared/validation";

const maxRosterDocuments = 1000;
const maxOrganizerEvents = 1000;
const maxContactEventEdges = 10000;
const maxPaymentDocuments = 10000;
const firestoreInLimit = 30;
const dayMillis = 24 * 60 * 60 * 1000;

/** One stored roster row: never top_catch_spender, which the phone adds. */
export type InsightRow = HostEventRosterInsightViewDocument["rows"][number];
export type InsightSignal = InsightRow["signals"][number];
type LegacyInsightRow = GetEventRosterInsightsCallableResponse["rows"][number];

interface EventRosterInsightsDeps {
  firestore: () => FirebaseFirestore.Firestore;
  checkRateLimit: typeof checkRateLimit;
  timestamp: () => FirebaseFirestore.Timestamp;
}

const defaultDeps: EventRosterInsightsDeps = {
  firestore: () => admin.firestore(),
  checkRateLimit,
  timestamp: () => admin.firestore.Timestamp.now(),
};

interface AttendeeRow {
  id: string;
  data: EventAttendeeDocument;
}

interface EdgeRow {
  id: string;
  data: OrganizerContactEventEdgeDocument;
}

export interface ContactRow {
  id: string;
  data: OrganizerContactDocument;
}

export interface EventRelativeAttendanceInsight {
  signals: InsightSignal[];
  priorAttendedEventCount: number;
  priorExpectedEventCount: number;
  priorNoShowCount: number;
  lastAttendedAtMillis: number | null;
  attendanceRate: number | null;
}

export interface CatchSpendAmount {
  currency: string;
  amountMinor: number;
  paidOrderCount: number;
}

export interface CatchSpendProjection {
  byUid: Map<string, CatchSpendAmount[]>;
  topUidsByCurrency: Map<string, Set<string>>;
}

/** Requires verified identity or multi-source history before labeling. */
export function shouldExposeAttendanceInsight(contact: Pick<
  OrganizerContactDocument,
  "identityState" | "sourceCount"
>): boolean {
  if (contact.identityState === "ambiguous" ||
      contact.identityState === "merged") {
    return false;
  }
  return contact.identityState === "verified" || contact.sourceCount > 1;
}

/** Returns stable labels using only events completed before the cutoff. */
export function eventRelativeAttendanceInsight(
  edges: OrganizerContactEventEdgeDocument[],
  cutoffAtMillis: number
): EventRelativeAttendanceInsight {
  const past = edges.filter((edge) =>
    edge.eventEndAt !== null &&
    edge.eventEndAt.toMillis() < cutoffAtMillis
  );
  const expected = past.filter((edge) => edge.expected && !edge.cancelled);
  const attended = [...new Map(past
    .filter((edge) => edge.checkedIn)
    .map((edge) => [edge.eventId, edge])).values()];
  const noShows = expected.filter((edge) => !edge.checkedIn);
  const attendanceTimes = attended
    .map((edge) => edge.checkedInAt ?? edge.eventStartAt)
    .filter((value): value is FirebaseFirestore.Timestamp => value !== null)
    .map((value) => value.toMillis())
    .filter((value) => value < cutoffAtMillis)
    .sort((left, right) => left - right);
  const attendedEventCount = attended.length;
  const expectedEventCount = new Set(expected.map((edge) => edge.eventId)).size;
  const noShowCount = new Set(noShows.map((edge) => edge.eventId)).size;
  const lastAttendedAtMillis = attendanceTimes.at(-1) ?? null;
  const recent180DayCount = attendanceTimes.filter((value) =>
    cutoffAtMillis - value <= 180 * dayMillis
  ).length;
  const attendanceRate = expectedEventCount === 0 ? null :
    attendedEventCount / expectedEventCount;
  const signals: InsightSignal[] = [];
  if (attendedEventCount === 0) signals.push("first_time");
  if (attendedEventCount > 0) signals.push("returning");
  if (recent180DayCount >= 3) signals.push("regular");
  if (attendedEventCount >= 2 && lastAttendedAtMillis !== null &&
      cutoffAtMillis - lastAttendedAtMillis > 90 * dayMillis) {
    signals.push("re_engaging");
  }
  if (expectedEventCount >= 3 && attendanceRate !== null &&
      attendanceRate >= 0.8) {
    signals.push("reliable");
  }
  if (expectedEventCount >= 3 && noShowCount >= 2) {
    signals.push("needs_confirmation");
  }
  return {
    signals,
    priorAttendedEventCount: attendedEventCount,
    priorExpectedEventCount: expectedEventCount,
    priorNoShowCount: noShowCount,
    lastAttendedAtMillis,
    attendanceRate,
  };
}

/** One payment's part in Catch spend, or why it has none. */
export type PaymentSpendContribution =
  | {
    kind: "counted";
    uid: string;
    currency: string;
    amountMinor: number;
    atMillis: number;
  }
  | {kind: "uncomputable"}
  | {kind: "none"};

/**
 * Completed, non-sign-up-failed payments count at their retained amount,
 * keyed by their completion time (creation time before completion). A
 * refunded or zero amount, or an invalid currency, counts nothing; an amount
 * that cannot be computed is reported so totals can say they are partial.
 */
export function paymentSpendContribution(
  payment: PaymentDocument
): PaymentSpendContribution {
  if (payment.status !== "completed" || payment.signUpFailed) {
    return {kind: "none"};
  }
  const currency = payment.currency.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) return {kind: "none"};
  const amountMinor = retainedNativePaymentAmount(payment);
  if (amountMinor === null) return {kind: "uncomputable"};
  if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0) {
    return {kind: "none"};
  }
  return {
    kind: "counted",
    uid: payment.userId,
    currency,
    amountMinor,
    atMillis: (payment.completedAt ?? payment.createdAt).toMillis(),
  };
}

/** Sums counted contributions per uid and currency, currencies in order. */
export function sumCatchSpend(
  contributions: Iterable<PaymentSpendContribution>
): Map<string, CatchSpendAmount[]> {
  const totals = new Map<string, Map<string, CatchSpendAmount>>();
  for (const contribution of contributions) {
    if (contribution.kind !== "counted") continue;
    const byCurrency = totals.get(contribution.uid) ?? new Map();
    const prior = byCurrency.get(contribution.currency);
    byCurrency.set(contribution.currency, {
      currency: contribution.currency,
      amountMinor: (prior?.amountMinor ?? 0) + contribution.amountMinor,
      paidOrderCount: (prior?.paidOrderCount ?? 0) + 1,
    });
    totals.set(contribution.uid, byCurrency);
  }
  return new Map([...totals].map(([uid, values]) => [
    uid,
    [...values.values()].sort((left, right) =>
      left.currency.localeCompare(right.currency)
    ),
  ]));
}

/**
 * The top quartile per currency: uids with at least two paid orders, ranked
 * by amount (then uid), the top 25 per cent rounded up and at least one. The
 * threshold is the smallest amount in that set.
 */
export function topQuartileSpend(byUid: Map<string, CatchSpendAmount[]>): {
  topUidsByCurrency: Map<string, Set<string>>;
  thresholdByCurrency: Map<string, number>;
} {
  const eligibleByCurrency = new Map<string, Array<{
    uid: string;
    amountMinor: number;
  }>>();
  for (const [uid, amounts] of byUid) {
    for (const amount of amounts) {
      if (amount.paidOrderCount < 2) continue;
      const values = eligibleByCurrency.get(amount.currency) ?? [];
      values.push({uid, amountMinor: amount.amountMinor});
      eligibleByCurrency.set(amount.currency, values);
    }
  }
  const topUidsByCurrency = new Map<string, Set<string>>();
  const thresholdByCurrency = new Map<string, number>();
  for (const [currency, values] of eligibleByCurrency) {
    values.sort((left, right) =>
      right.amountMinor - left.amountMinor || left.uid.localeCompare(right.uid)
    );
    const top = values.slice(0, Math.max(1, Math.ceil(values.length * 0.25)));
    topUidsByCurrency.set(currency, new Set(top.map((value) => value.uid)));
    thresholdByCurrency.set(currency, top[top.length - 1].amountMinor);
  }
  return {topUidsByCurrency, thresholdByCurrency};
}

/** Aggregates completed, non-refunded Catch payments and top-quartile UIDs. */
export function catchSpendProjection(
  payments: PaymentDocument[],
  cutoffAtMillis: number
): CatchSpendProjection {
  const byUid = sumCatchSpend(payments.map(paymentSpendContribution)
    .filter((contribution) => contribution.kind !== "counted" ||
      contribution.atMillis <= cutoffAtMillis));
  return {byUid, topUidsByCurrency: topQuartileSpend(byUid).topUidsByCurrency};
}

/** Builds manager-only event-relative roster insights. */
export async function getEventRosterInsightsHandler(
  request: CallableRequest<unknown>,
  deps: EventRosterInsightsDeps = defaultDeps
): Promise<GetEventRosterInsightsCallableResponse> {
  const actorUid = requireAuth(request);
  const data = validateCallableWithAjv<GetEventRosterInsightsCallablePayload>(
    request,
    validateGetEventRosterInsightsCallablePayload,
    normalizePayload
  );
  const db = deps.firestore();
  await deps.checkRateLimit(db, actorUid, "getEventRosterInsights", {
    maxRequests: 60, windowMs: 60 * 1000,
  });
  const eventSnap = await db.collection("events").doc(data.eventId).get();
  if (!eventSnap.exists) throw new HttpsError("not-found", "Event not found.");
  const event = requireDoc<EventDocument>(eventSnap, "EventDocument");
  const organizerId = event.organizerId;
  await requireOrganizerManager({db, organizerId, actorUid});

  const attendeeSnap = await db.collection("eventAttendees")
    .where("eventId", "==", data.eventId)
    .limit(maxRosterDocuments + 1)
    .get();
  const attendees: AttendeeRow[] = attendeeSnap.docs
    .slice(0, maxRosterDocuments)
    .map((doc) => ({
      id: doc.id,
      data: doc.data() as EventAttendeeDocument,
    }));
  const currentEdges = attendees.length === 0 ? [] : await db.getAll(
    ...attendees.map((attendee) =>
      db.collection("organizerContactEventEdges").doc(attendee.id)
    )
  );
  const currentEdgeByAttendeeId = new Map(currentEdges
    .filter((snap) => snap.exists)
    .map((snap) => [
      snap.id,
      snap.data() as OrganizerContactEventEdgeDocument,
    ]));
  const contactIds = [...new Set([...currentEdgeByAttendeeId.values()]
    .map((edge) => edge.contactId))];
  const [contacts, traits, historyResult, organizerEvents] = await Promise.all([
    getContactRows(db, contactIds),
    getTraits(db, contactIds),
    getHistoricalEdges(db, contactIds),
    getOrganizerEvents(db, organizerId),
  ]);
  const paymentResult = await getOrganizerPayments(
    db,
    organizerEvents.rows.map((row) => row.id)
  );
  const cutoffAtMillis = event.startTime.toMillis();
  const spend = paymentResult.truncated || organizerEvents.truncated ? null :
    catchSpendProjection(paymentResult.rows, cutoffAtMillis);
  const rows = attendees.map((attendee) => {
    const edge = currentEdgeByAttendeeId.get(attendee.id);
    const row = buildInsightRow({
      attendeeId: attendee.id,
      currentEdge: edge,
      contacts,
      traits,
      history: historyResult.byContactId,
      catchSpendFor: (uid) => spend?.byUid.get(uid) ?? [],
      cutoffAtMillis,
    });
    const linkedUid = edge === undefined ? null :
      contacts.get(edge.contactId)?.data.linkedUid ?? null;
    return withLegacyTopSpenderSignal(data.includeHostMembership ?
      withMemberSignal(row, traits, contacts) : row, linkedUid, spend);
  });
  const projectionPending = rows.some((row) =>
    row.availability === "projectionPending"
  );
  return {
    eventId: data.eventId,
    organizerId,
    cutoffAtMillis,
    sourceCoverage: attendeeSnap.size > maxRosterDocuments ||
      historyResult.truncated || projectionPending ?
      "partial" : "exact",
    spendCoverage: spend === null ? "insufficientData" : "catchPaymentsOnly",
    rows,
    computedAtMillis: deps.timestamp().toMillis(),
  };
}

/**
 * One attendee's stored row: availability, event-relative attendance before
 * the cutoff, trait labels and Catch spend for the contact's linked account.
 * It never labels top_catch_spender; the phone adds it from the organizer's
 * thresholds. Pure; the caller reads every source.
 */
export function buildInsightRow(params: {
  attendeeId: string;
  currentEdge?: OrganizerContactEventEdgeDocument;
  contacts: Map<string, ContactRow>;
  traits: Map<string, OrganizerContactTraitDocument>;
  history: Map<string, OrganizerContactEventEdgeDocument[]>;
  catchSpendFor: (uid: string) => CatchSpendAmount[];
  cutoffAtMillis: number;
}): InsightRow {
  const edge = params.currentEdge;
  if (!edge) return unavailableRow(params.attendeeId, "projectionPending");
  const contact = params.contacts.get(edge.contactId)?.data;
  if (!contact) {
    return unavailableRow(
      params.attendeeId,
      "projectionPending",
      edge.contactId
    );
  }
  if (contact.identityState === "ambiguous" ||
      contact.identityState === "merged") {
    return unavailableRow(
      params.attendeeId,
      "ambiguousIdentity",
      edge.contactId
    );
  }
  if (!shouldExposeAttendanceInsight(contact)) {
    return unavailableRow(
      params.attendeeId,
      "insufficientHistory",
      edge.contactId
    );
  }
  const attendance = eventRelativeAttendanceInsight(
    params.history.get(edge.contactId) ?? [edge],
    params.cutoffAtMillis
  );
  const signals: InsightSignal[] = [...attendance.signals];
  const traits = params.traits.get(edge.contactId);
  if (traits?.segmentIds.includes("advocate")) signals.push("advocate");
  if (traits?.segmentIds.includes("high_impact_advocate")) {
    signals.push("high_impact_advocate");
  }
  const catchSpend = contact.linkedUid === null ? [] :
    params.catchSpendFor(contact.linkedUid);
  if (catchSpend.length > 0) signals.push("known_catch_spender");
  return {
    attendeeId: params.attendeeId,
    contactId: edge.contactId,
    availability: "ready",
    ...attendance,
    signals: [...new Set(signals)],
    catchSpend,
  };
}

/** The retired callable's label, from a cutoff-bounded spend projection. */
function withLegacyTopSpenderSignal(
  row: InsightRow,
  linkedUid: string | null,
  spend: CatchSpendProjection | null
): LegacyInsightRow {
  if (linkedUid === null || spend === null || !row.catchSpend.some((amount) =>
    spend.topUidsByCurrency.get(amount.currency)?.has(linkedUid))) {
    return row;
  }
  const signals: LegacyInsightRow["signals"] = [...row.signals];
  signals.splice(signals.indexOf("known_catch_spender") + 1, 0,
    "top_catch_spender");
  return {...row, signals};
}

export function unavailableRow(
  attendeeId: string,
  availability: InsightRow["availability"],
  contactId: string | null = null
): InsightRow {
  return {
    attendeeId,
    contactId,
    availability,
    signals: [],
    priorAttendedEventCount: 0,
    priorExpectedEventCount: 0,
    priorNoShowCount: 0,
    lastAttendedAtMillis: null,
    attendanceRate: null,
    catchSpend: [],
  };
}

async function getContactRows(
  db: FirebaseFirestore.Firestore,
  contactIds: string[]
): Promise<Map<string, ContactRow>> {
  const snaps = contactIds.length === 0 ? [] : await db.getAll(
    ...contactIds.map((contactId) =>
      db.collection("organizerContacts").doc(contactId)
    )
  );
  return new Map(snaps.filter((snap) => snap.exists).map((snap) => [
    snap.id,
    {id: snap.id, data: snap.data() as OrganizerContactDocument},
  ]));
}

async function getTraits(
  db: FirebaseFirestore.Firestore,
  contactIds: string[]
): Promise<Map<string, OrganizerContactTraitDocument>> {
  const snaps = contactIds.length === 0 ? [] : await db.getAll(
    ...contactIds.map((contactId) =>
      db.collection("organizerContactTraits").doc(contactId)
    )
  );
  return new Map(snaps.filter((snap) => snap.exists).map((snap) => [
    snap.id,
    snap.data() as OrganizerContactTraitDocument,
  ]));
}

async function getHistoricalEdges(
  db: FirebaseFirestore.Firestore,
  contactIds: string[]
): Promise<{
  byContactId: Map<string, OrganizerContactEventEdgeDocument[]>;
  truncated: boolean;
}> {
  const rows: EdgeRow[] = [];
  let truncated = false;
  for (const ids of chunks(contactIds)) {
    if (rows.length >= maxContactEventEdges) {
      truncated = true;
      break;
    }
    const snap = await db.collection("organizerContactEventEdges")
      .where("contactId", "in", ids)
      .limit(maxContactEventEdges - rows.length + 1)
      .get();
    const remaining = maxContactEventEdges - rows.length;
    rows.push(...snap.docs.slice(0, remaining).map((doc): EdgeRow => ({
      id: doc.id,
      data: doc.data() as OrganizerContactEventEdgeDocument,
    })));
    if (snap.size > remaining) truncated = true;
  }
  const byContactId = new Map<string, OrganizerContactEventEdgeDocument[]>();
  for (const row of rows) {
    const values = byContactId.get(row.data.contactId) ?? [];
    values.push(row.data);
    byContactId.set(row.data.contactId, values);
  }
  return {byContactId, truncated};
}

async function getOrganizerEvents(
  db: FirebaseFirestore.Firestore,
  organizerId: string
): Promise<{rows: Array<{id: string}>; truncated: boolean}> {
  const [canonical, compatibility] = await Promise.all([
    db.collection("events").where("organizerId", "==", organizerId)
      .limit(maxOrganizerEvents + 1).get(),
    db.collection("events").where("organizerId", "==", organizerId)
      .limit(maxOrganizerEvents + 1).get(),
  ]);
  const rows = new Map<string, {id: string}>();
  for (const snap of [canonical, compatibility]) {
    for (const doc of snap.docs.slice(0, maxOrganizerEvents)) {
      rows.set(doc.id, {id: doc.id});
    }
  }
  return {
    rows: [...rows.values()].slice(0, maxOrganizerEvents),
    truncated: canonical.size > maxOrganizerEvents ||
      compatibility.size > maxOrganizerEvents ||
      rows.size > maxOrganizerEvents,
  };
}

async function getOrganizerPayments(
  db: FirebaseFirestore.Firestore,
  eventIds: string[]
): Promise<{rows: PaymentDocument[]; truncated: boolean}> {
  const rows: PaymentDocument[] = [];
  let truncated = false;
  for (const ids of chunks(eventIds)) {
    if (rows.length >= maxPaymentDocuments) {
      truncated = true;
      break;
    }
    const snap = await db.collection("payments")
      .where("eventId", "in", ids)
      .limit(maxPaymentDocuments - rows.length + 1)
      .get();
    const remaining = maxPaymentDocuments - rows.length;
    rows.push(...snap.docs.slice(0, remaining)
      .map((doc) => doc.data() as PaymentDocument));
    if (snap.size > remaining) truncated = true;
  }
  return {rows, truncated};
}

function chunks<T>(values: T[]): T[][] {
  const result: T[][] = [];
  for (let index = 0; index < values.length; index += firestoreInLimit) {
    result.push(values.slice(index, index + firestoreInLimit));
  }
  return result;
}

function normalizePayload(data: unknown): unknown {
  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    return data;
  }
  const normalized = {...data} as Record<string, unknown>;
  if (typeof normalized.eventId === "string") {
    normalized.eventId = normalized.eventId.trim();
  }
  return normalized;
}

export const getEventRosterInsights = onCall(
  appCheckCallableOptionsWithLimits({timeoutSeconds: 60, maxInstances: 20}),
  (request) => getEventRosterInsightsHandler(request)
);

/**
 * Paid members are badged at check-in even before they have enough history
 * for attendance insights; ambiguous or merged identities stay unlabeled.
 */
export function withMemberSignal(row: InsightRow,
  traits: Map<string, OrganizerContactTraitDocument>,
  contacts: Map<string, ContactRow>): InsightRow {
  if (row.contactId === null ||
      !["ready", "insufficientHistory"].includes(row.availability)) return row;
  const identity = contacts.get(row.contactId)?.data.identityState;
  if (identity === "ambiguous" || identity === "merged") return row;
  if (!traits.get(row.contactId)?.segmentIds.includes("active_member")) {
    return row;
  }
  return {...row, signals: [...new Set([...row.signals, "member" as const])]};
}
