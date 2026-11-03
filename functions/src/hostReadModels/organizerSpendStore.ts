import {isDeepStrictEqual} from "node:util";
import * as admin from "firebase-admin";
import {logger} from "firebase-functions";
import type {
  HostOrganizerSpendProjectionDocument,
  OrganizerSpendTotalsDocument,
  PaymentDocument,
} from "../shared/generated/firestoreAdminTypes";
import {
  CatchSpendAmount,
  paymentSpendContribution,
  PaymentSpendContribution,
  sumCatchSpend,
  topQuartileSpend,
} from "../organizers/eventRosterInsights";

export const spendTotalsCollection = "organizerSpendTotals";
export const spendProjectionsCollection = "hostOrganizerSpendProjections";
/**
 * Accounts one totals document holds. At about 160 bytes an account (one
 * currency) 4,000 stay near 640 KB, well under Firestore's 1 MiB document
 * limit; the retired callable read at most 10,000 payments, so at most that
 * many accounts and usually far fewer.
 */
export const maxSpendAccounts = 4000;
const maxAppliedChangeIds = 100;
/** A linked account with more payments than this is not recomputed. */
export const maxAccountPayments = 500;
const documentIdPattern = /^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$/;

type AccountTotals = OrganizerSpendTotalsDocument["byUid"][string];
type TotalsState = Omit<OrganizerSpendTotalsDocument,
  "schemaVersion" | "organizerId" | "revision" | "updatedAt">;

export interface OrganizerSpendStoreDeps {
  now: () => FirebaseFirestore.Timestamp;
}

const defaultDeps: OrganizerSpendStoreDeps = {
  now: () => admin.firestore.Timestamp.now(),
};

/** Reads that run inside the caller's transaction. */
export interface SpendReader {
  get(query: FirebaseFirestore.Query): Promise<FirebaseFirestore.QuerySnapshot>;
  getAll(...refs: FirebaseFirestore.DocumentReference[]):
    Promise<FirebaseFirestore.DocumentSnapshot[]>;
}

/** The counted contribution of a payment version, keyed for comparison. */
export function spendContributionOf(
  payment: FirebaseFirestore.DocumentData | undefined
): PaymentSpendContribution {
  if (payment === undefined) return {kind: "none"};
  try {
    return paymentSpendContribution(payment as PaymentDocument);
  } catch {
    // A payment without the fields spend reads cannot count.
    return {kind: "uncomputable"};
  }
}

function emptyTotals(): TotalsState {
  return {
    byUid: {},
    uidCount: 0,
    uncomputablePaymentCount: 0,
    accountCapReached: false,
    coverage: "exact",
    appliedChangeIds: [],
  };
}

function cloneTotals(
  document: OrganizerSpendTotalsDocument | undefined
): TotalsState {
  if (document === undefined) return emptyTotals();
  return {
    byUid: Object.fromEntries(Object.entries(document.byUid).map(
      ([uid, account]) => [uid, {
        byCurrency: Object.fromEntries(Object.entries(account.byCurrency)
          .map(([currency, amount]) => [currency, {...amount}])),
        firstCompletedAtMillis: account.firstCompletedAtMillis,
        lastCompletedAtMillis: account.lastCompletedAtMillis,
      }])),
    uidCount: document.uidCount,
    uncomputablePaymentCount: document.uncomputablePaymentCount,
    accountCapReached: document.accountCapReached,
    coverage: document.coverage,
    appliedChangeIds: [...document.appliedChangeIds],
  };
}

/** Adds (+1) or removes (-1) one contribution, then restates coverage. */
export function applySpendContribution(
  totals: TotalsState,
  contribution: PaymentSpendContribution,
  sign: 1 | -1
): void {
  applyToAccounts(totals, contribution, sign);
  totals.coverage = totals.accountCapReached ||
    totals.uncomputablePaymentCount > 0 ? "partial" : "exact";
}

function applyToAccounts(
  totals: TotalsState,
  contribution: PaymentSpendContribution,
  sign: 1 | -1
): void {
  if (contribution.kind === "uncomputable") {
    totals.uncomputablePaymentCount =
      Math.max(0, totals.uncomputablePaymentCount + sign);
  } else if (contribution.kind === "counted") {
    let account: AccountTotals | undefined = totals.byUid[contribution.uid];
    if (sign > 0) {
      if (account === undefined) {
        if (totals.uidCount >= maxSpendAccounts) {
          totals.accountCapReached = true;
          return;
        }
        account = {byCurrency: {},
          firstCompletedAtMillis: contribution.atMillis,
          lastCompletedAtMillis: contribution.atMillis};
        totals.byUid[contribution.uid] = account;
        totals.uidCount++;
      }
      const prior = account.byCurrency[contribution.currency];
      account.byCurrency[contribution.currency] = {
        amountMinor: (prior?.amountMinor ?? 0) + contribution.amountMinor,
        paidOrderCount: (prior?.paidOrderCount ?? 0) + 1,
      };
      account.firstCompletedAtMillis =
        Math.min(account.firstCompletedAtMillis, contribution.atMillis);
      account.lastCompletedAtMillis =
        Math.max(account.lastCompletedAtMillis, contribution.atMillis);
    } else {
      const prior = account?.byCurrency[contribution.currency];
      if (account === undefined || prior === undefined) return;
      const amountMinor = prior.amountMinor - contribution.amountMinor;
      const paidOrderCount = prior.paidOrderCount - 1;
      if (amountMinor > 0 && paidOrderCount > 0) {
        account.byCurrency[contribution.currency] =
          {amountMinor, paidOrderCount};
      } else {
        delete account.byCurrency[contribution.currency];
      }
      if (Object.keys(account.byCurrency).length === 0) {
        delete totals.byUid[contribution.uid];
        totals.uidCount = Math.max(0, totals.uidCount - 1);
      }
    }
  }
}

/** One account's spend as roster rows carry it, currencies in order. */
export function accountSpend(account: AccountTotals): CatchSpendAmount[] {
  return Object.entries(account.byCurrency)
    .map(([currency, amount]) => ({currency, ...amount}))
    .sort((left, right) => left.currency.localeCompare(right.currency));
}

/** The thresholds the phone labels top spenders by; none when partial. */
export function spendProjectionFields(totals: Pick<TotalsState,
  "byUid" | "coverage">): Pick<HostOrganizerSpendProjectionDocument,
  "topQuartileThresholdByCurrency" | "spendCoverage"> {
  if (totals.coverage !== "exact") {
    return {topQuartileThresholdByCurrency: {},
      spendCoverage: "insufficientData"};
  }
  const byUid = new Map(Object.entries(totals.byUid)
    .map(([uid, account]) => [uid, accountSpend(account)]));
  return {
    topQuartileThresholdByCurrency: Object.fromEntries([
      ...topQuartileSpend(byUid).thresholdByCurrency,
    ].sort(([left], [right]) => left.localeCompare(right))),
    spendCoverage: "catchPaymentsOnly",
  };
}

/** Writes the totals and, when its fields changed, the projection. */
function writeSpend(
  tx: FirebaseFirestore.Transaction,
  db: FirebaseFirestore.Firestore,
  params: {
    organizerId: string;
    totals: TotalsState;
    totalsRevision: number;
    projectionSnap: FirebaseFirestore.DocumentSnapshot;
    now: FirebaseFirestore.Timestamp;
  }
): {projectionChanged: boolean} {
  const document: OrganizerSpendTotalsDocument = {
    schemaVersion: 1,
    organizerId: params.organizerId,
    ...params.totals,
    revision: params.totalsRevision,
    updatedAt: params.now,
  };
  tx.set(db.collection(spendTotalsCollection).doc(params.organizerId),
    document);
  const previous = params.projectionSnap.data() as
    HostOrganizerSpendProjectionDocument | undefined;
  const fields = spendProjectionFields(params.totals);
  if (previous !== undefined && isDeepStrictEqual({
    topQuartileThresholdByCurrency: previous.topQuartileThresholdByCurrency,
    spendCoverage: previous.spendCoverage,
  }, fields)) {
    return {projectionChanged: false};
  }
  const projection: HostOrganizerSpendProjectionDocument = {
    schemaVersion: 1,
    organizerId: params.organizerId,
    ...fields,
    revision: (previous?.revision ?? 0) + 1,
    evaluatedAt: params.now,
  };
  tx.set(params.projectionSnap.ref, projection);
  return {projectionChanged: true};
}

export interface PaymentSpendChange {
  /** The trigger event id; a redelivered event is applied once. */
  changeId: string;
  before?: FirebaseFirestore.DocumentData;
  after?: FirebaseFirestore.DocumentData;
}

export type SpendChangeOutcome =
  | {kind: "unchanged"}
  | {kind: "unresolved"; eventId: string | null}
  | {kind: "duplicate"; organizerId: string}
  | {
    kind: "applied";
    organizerId: string;
    revision: number;
    coverage: OrganizerSpendTotalsDocument["coverage"];
    projectionChanged: boolean;
  };

/**
 * Applies one payment write to its organizer's totals and projection: the
 * organizer comes from the payment's event; the old contribution is removed
 * and the new one added in one transaction. A payment whose event is gone or
 * has no organizer counts for no one, as the retired callable read payments
 * through the organizer's events.
 */
export async function applyPaymentSpendChange(
  db: FirebaseFirestore.Firestore,
  change: PaymentSpendChange,
  deps: OrganizerSpendStoreDeps = defaultDeps
): Promise<SpendChangeOutcome[]> {
  const before = spendContributionOf(change.before);
  const after = spendContributionOf(change.after);
  // A create or delete has one side; that side's event is the payment's.
  const beforeEventId = change.before === undefined ?
    eventIdOf(change.after) : eventIdOf(change.before);
  const afterEventId = change.after === undefined ?
    eventIdOf(change.before) : eventIdOf(change.after);
  if (beforeEventId === afterEventId) {
    if (isDeepStrictEqual(before, after)) return [{kind: "unchanged"}];
    return [await applyToEvent(db, change.changeId, beforeEventId,
      before, after, deps)];
  }
  // A payment never moves between events; if one did, each side is its own
  // change against its own organizer.
  return [
    await applyToEvent(db, `${change.changeId}:before`, beforeEventId,
      before, {kind: "none"}, deps),
    await applyToEvent(db, `${change.changeId}:after`, afterEventId,
      {kind: "none"}, after, deps),
  ];
}

async function applyToEvent(
  db: FirebaseFirestore.Firestore,
  changeId: string,
  eventId: string | null,
  before: PaymentSpendContribution,
  after: PaymentSpendContribution,
  deps: OrganizerSpendStoreDeps
): Promise<SpendChangeOutcome> {
  if (eventId === null) return {kind: "unresolved", eventId};
  if (before.kind === "none" && after.kind === "none") {
    return {kind: "unchanged"};
  }
  const outcome = await db.runTransaction(async (tx):
    Promise<SpendChangeOutcome> => {
    const eventSnap = await tx.get(db.collection("events").doc(eventId));
    const organizerId = eventSnap.data()?.organizerId;
    if (typeof organizerId !== "string" ||
        !documentIdPattern.test(organizerId)) {
      return {kind: "unresolved", eventId};
    }
    const [totalsSnap, projectionSnap] = await Promise.all([
      tx.get(db.collection(spendTotalsCollection).doc(organizerId)),
      tx.get(db.collection(spendProjectionsCollection).doc(organizerId)),
    ]);
    const previous = totalsSnap.data() as
      OrganizerSpendTotalsDocument | undefined;
    if (previous?.appliedChangeIds.includes(changeId)) {
      return {kind: "duplicate", organizerId};
    }
    const totals = cloneTotals(previous);
    applySpendContribution(totals, before, -1);
    applySpendContribution(totals, after, 1);
    totals.appliedChangeIds =
      [...totals.appliedChangeIds, changeId].slice(-maxAppliedChangeIds);
    const revision = (previous?.revision ?? 0) + 1;
    const {projectionChanged} = writeSpend(tx, db, {organizerId, totals,
      totalsRevision: revision, projectionSnap, now: deps.now()});
    return {kind: "applied", organizerId, revision,
      coverage: totals.coverage, projectionChanged};
  });
  if (outcome.kind === "unresolved") {
    logger.warn("A payment's event has no organizer; it counts for no one.", {
      eventId,
    });
  }
  return outcome;
}

function eventIdOf(payment: FirebaseFirestore.DocumentData | undefined):
  string | null {
  const eventId = payment?.eventId;
  return typeof eventId === "string" && documentIdPattern.test(eventId) ?
    eventId : null;
}

export type AccountSpendResult =
  | {kind: "exact"; catchSpend: CatchSpendAmount[]}
  | {kind: "overCap"};

/**
 * One linked account's Catch spend for an organizer at or before a cutoff,
 * from its payments (at most 500) and their events, read through the
 * caller's transaction. Used only when the cutoff falls inside the bounds
 * the totals keep for the account.
 */
export async function accountSpendAtCutoff(
  db: FirebaseFirestore.Firestore,
  reader: SpendReader,
  params: {organizerId: string; uid: string; cutoffAtMillis: number}
): Promise<AccountSpendResult> {
  const snapshot = await reader.get(db.collection("payments")
    .where("userId", "==", params.uid)
    .limit(maxAccountPayments + 1));
  if (snapshot.size > maxAccountPayments) return {kind: "overCap"};
  const payments = snapshot.docs.map((doc) => doc.data() as PaymentDocument);
  const eventIds = [...new Set(payments.map((payment) => payment.eventId)
    .filter((eventId) => documentIdPattern.test(eventId)))];
  const events = eventIds.length === 0 ? [] : await reader.getAll(
    ...eventIds.map((eventId) => db.collection("events").doc(eventId)));
  const organizerEvents = new Set(events
    .filter((snap) => snap.data()?.organizerId === params.organizerId)
    .map((snap) => snap.id));
  const contributions = payments
    .filter((payment) => organizerEvents.has(payment.eventId))
    .map(spendContributionOf)
    .filter((contribution) => contribution.kind === "counted" &&
      contribution.uid === params.uid &&
      contribution.atMillis <= params.cutoffAtMillis);
  return {kind: "exact",
    catchSpend: sumCatchSpend(contributions).get(params.uid) ?? []};
}

export const organizerPageSize = 100;
const paymentPageSize = 500;

/** Every event id of an organizer, in pages of 100. */
export async function* organizerEventIds(
  db: FirebaseFirestore.Firestore,
  organizerId: string
): AsyncGenerator<{id: string; data: FirebaseFirestore.DocumentData}> {
  let cursor: FirebaseFirestore.QueryDocumentSnapshot | undefined;
  do {
    let query = db.collection("events")
      .where("organizerId", "==", organizerId)
      .orderBy(admin.firestore.FieldPath.documentId())
      .limit(organizerPageSize);
    if (cursor) query = query.startAfter(cursor);
    const page = await query.get();
    for (const doc of page.docs) yield {id: doc.id, data: doc.data()};
    cursor = page.size === organizerPageSize ? page.docs.at(-1) : undefined;
  } while (cursor);
}

export interface SpendRebuildReport {
  events: number;
  payments: number;
  uidCount: number;
  coverage: OrganizerSpendTotalsDocument["coverage"];
  written: boolean;
}

/**
 * Rebuilds an organizer's totals and projection from a paged scan of its
 * events and each event's payments. Without apply it only reports what it
 * would write.
 */
export async function rebuildOrganizerSpend(
  db: FirebaseFirestore.Firestore,
  organizerId: string,
  apply: boolean,
  deps: OrganizerSpendStoreDeps = defaultDeps
): Promise<SpendRebuildReport> {
  const totals = emptyTotals();
  let events = 0;
  let payments = 0;
  for await (const event of organizerEventIds(db, organizerId)) {
    events++;
    let cursor: FirebaseFirestore.QueryDocumentSnapshot | undefined;
    do {
      let query = db.collection("payments")
        .where("eventId", "==", event.id)
        .orderBy(admin.firestore.FieldPath.documentId())
        .limit(paymentPageSize);
      if (cursor) query = query.startAfter(cursor);
      const page = await query.get();
      for (const doc of page.docs) {
        payments++;
        applySpendContribution(totals, spendContributionOf(doc.data()), 1);
      }
      cursor = page.size === paymentPageSize ? page.docs.at(-1) : undefined;
    } while (cursor);
  }
  if (apply) {
    await db.runTransaction(async (tx) => {
      const [totalsSnap, projectionSnap] = await Promise.all([
        tx.get(db.collection(spendTotalsCollection).doc(organizerId)),
        tx.get(db.collection(spendProjectionsCollection).doc(organizerId)),
      ]);
      const previous = totalsSnap.data() as
        OrganizerSpendTotalsDocument | undefined;
      writeSpend(tx, db, {organizerId, totals,
        totalsRevision: (previous?.revision ?? 0) + 1, projectionSnap,
        now: deps.now()});
    });
  }
  return {events, payments, uidCount: totals.uidCount,
    coverage: totals.coverage, written: apply};
}
