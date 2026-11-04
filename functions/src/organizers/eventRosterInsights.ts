import {retainedNativePaymentAmount} from "../payments/paymentAmounts";
import type {
  HostEventRosterInsightViewDocument,
  OrganizerContactDocument,
  OrganizerContactEventEdgeDocument,
  OrganizerContactTraitDocument,
  PaymentDocument,
} from "../shared/generated/firestoreAdminTypes";

const dayMillis = 24 * 60 * 60 * 1000;

/** One stored roster row: never top_catch_spender, which the phone adds. */
export type InsightRow = HostEventRosterInsightViewDocument["rows"][number];
export type InsightSignal = InsightRow["signals"][number];

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
