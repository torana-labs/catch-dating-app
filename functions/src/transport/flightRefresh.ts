import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";

import type {ProgramTravelLegDocument} from
  "../shared/generated/firestoreAdminTypes";
import {
  fetchFlightStatus,
  FlightStatusSnapshot,
} from "./aeroDataBox";

import {
  flightRefreshTier, TIER_DELAY_MILLIS,
  timestampMillis, toTimestamp,
} from "./flightRefreshPolicy";
import {flightIdentity, flightInstanceKey, snapshotMatchesLeg} from
  "./flightIdentity";
import {nextRevision} from "../shared/programAuthority";

const RETRY_BACKOFF_MILLIS = 15 * 60 * 1000;
const NO_MATCH_BACKOFF_MILLIS = 6 * 60 * 60 * 1000;

/**
 * Provider write-back rules: enrichment never clears an observed or
 * provider-confirmed landing, terminal statuses only propagate while the leg
 * has not landed, and a snapshot that is not 'landed' cannot regress a leg
 * the provider already landed.
 */
export function applyFlightSnapshot(
  leg: ProgramTravelLegDocument,
  snapshot: FlightStatusSnapshot,
  nowMillis: number,
): Partial<ProgramTravelLegDocument> {
  const patch: Partial<ProgramTravelLegDocument> = {
    flightRefreshedAt: admin.firestore.Timestamp.fromMillis(nowMillis),
  };
  if (snapshot.arrivalTerminal) {
    patch.arrivalTerminal = snapshot.arrivalTerminal;
  }
  // The planner's scheduled instant anchors flight identity. Provider
  // estimates must not move it to another day's flight.
  patch.flightProviderUpdatedAt = toTimestamp(snapshot.providerUpdatedAtMillis);
  patch.flightInstanceId = flightInstanceKey(leg);

  const legHasLanded = leg.actualArrivalAt != null ||
    leg.flightStatus === "landed";
  if (snapshot.status === "landed" && snapshot.actualArrivalMillis != null) {
    if (!legHasLanded) {
      patch.actualArrivalAt =
        admin.firestore.Timestamp.fromMillis(snapshot.actualArrivalMillis);
    }
    patch.flightStatus = "landed";
  } else if (legHasLanded) {
    // A stale provider response cannot un-land a flight.
    patch.flightStatus = "landed";
  } else if (
    (snapshot.status === "cancelled" || snapshot.status === "diverted") ||
    !(leg.flightStatus === "landed")
  ) {
    patch.flightStatus = snapshot.status;
  }
  if (snapshot.estimatedArrivalMillis != null && !legHasLanded) {
    patch.estimatedArrivalAt =
      admin.firestore.Timestamp.fromMillis(snapshot.estimatedArrivalMillis);
  }
  return patch;
}

export interface FlightRefreshDeps {
  now: () => Date;
  pilotLegIds?: readonly string[];
  allowsLeg?: (programId: string, legId: string) => boolean;
  apiKey: () => string;
  fetchStatus: typeof fetchFlightStatus;
  /** Webhook subscription plumbing; omitted in tests and dry contexts. */
  syncAlert?: (
    legRef: FirebaseFirestore.DocumentReference,
  ) => Promise<void>;
}

export type RefreshOutcome =
  | "updated" | "settled" | "no-match" | "failed";

export async function refreshTravelLeg(
  db: FirebaseFirestore.Firestore,
  legId: string,
  deps: FlightRefreshDeps,
): Promise<RefreshOutcome> {
  const legRef = db.collection("programTravelLegs").doc(legId);
  const legSnap = await legRef.get();
  const leg = legSnap.data() as ProgramTravelLegDocument | undefined;
  if (!leg || deps.allowsLeg?.(leg.programId, legId) === false) {
    return "settled";
  }
  const nowMillis = deps.now().getTime();
  const tier = flightRefreshTier(leg, nowMillis);
  await deps.syncAlert?.(legRef);
  if (tier === "settled") {
    await rescheduleFlight(legRef, leg, nowMillis, null);
    return "settled";
  }

  const programSnap = await db.collection("organizerPrograms")
    .doc(leg.programId).get();
  const timezone =
    (programSnap.data() as {timezone?: string} | undefined)?.timezone ??
      "UTC";
  const arrivalMillis = timestampMillis(leg.scheduledArrivalAt);
  if (arrivalMillis == null || !leg.destinationIata) {
    await rescheduleFlight(legRef, leg, nowMillis, NO_MATCH_BACKOFF_MILLIS);
    return "no-match";
  }
  const dateLocal = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date(arrivalMillis));

  let snapshot: FlightStatusSnapshot | null;
  try {
    snapshot = await deps.fetchStatus({
      flightNumber: leg.flightNumber!,
      dateLocal,
      scheduledArrivalMillis: arrivalMillis,
      destinationIata: leg.destinationIata,
      originIata: leg.originIata,
      apiKey: deps.apiKey(),
    });
  } catch (error) {
    logger.warn("Flight status refresh failed", {
      legId, flightNumber: leg.flightNumber,
      error: error instanceof Error ? error.message : String(error),
    });
    await rescheduleFlight(legRef, leg, nowMillis, RETRY_BACKOFF_MILLIS);
    return "failed";
  }

  if (!snapshot || !snapshotMatchesLeg(leg, snapshot)) {
    await rescheduleFlight(legRef, leg, nowMillis, NO_MATCH_BACKOFF_MILLIS);
    return "no-match";
  }
  const written = await writeFlightSnapshot(legRef, leg, snapshot, nowMillis);
  if (!written) {
    await rescheduleFlight(legRef, leg, nowMillis, TIER_DELAY_MILLIS[tier]);
    return "no-match";
  }
  const nextTier = flightRefreshTier(written, nowMillis);
  if (nextTier !== tier) {
    await deps.syncAlert?.(legRef);
  }
  return "updated";
}

/** Keep cleanup runnable after landing until the provider is unsubscribed. */
function nextCursor(leg: ProgramTravelLegDocument,
  nowMillis: number, delay: number | null) {
  const lifecycle = leg.flightAlertSubscriptionId ||
    leg.flightAlertFlightNumber || leg.flightAlertLease;
  const next = delay == null ? lifecycle ? RETRY_BACKOFF_MILLIS : null : delay;
  return toTimestamp(next == null ? null : nowMillis +
    (lifecycle ? Math.min(next, RETRY_BACKOFF_MILLIS) : next));
}

async function rescheduleFlight(
  ref: FirebaseFirestore.DocumentReference,
  original: ProgramTravelLegDocument,
  nowMillis: number,
  delay: number | null,
): Promise<void> {
  await ref.firestore.runTransaction(async (tx) => {
    const current = (await tx.get(ref)).data() as
      ProgramTravelLegDocument | undefined;
    if (!current || flightIdentity(current) !== flightIdentity(original) ||
        timestampMillis(current.flightRefreshedAt) !==
          timestampMillis(original.flightRefreshedAt)) return;
    const settled = flightRefreshTier(current, nowMillis) === "settled";
    tx.update(ref, {flightNextRefreshAt:
      nextCursor(current, nowMillis, settled ? null : delay)});
  });
}

/** Merge each observation against current state under a transaction. */
export async function writeFlightSnapshot(
  ref: FirebaseFirestore.DocumentReference,
  original: ProgramTravelLegDocument,
  snapshot: FlightStatusSnapshot,
  nowMillis: number,
): Promise<ProgramTravelLegDocument | null> {
  return ref.firestore.runTransaction(async (tx) => {
    const current = (await tx.get(ref)).data() as
      ProgramTravelLegDocument | undefined;
    if (!current || flightIdentity(current) !== flightIdentity(original) ||
        !snapshotMatchesLeg(current, snapshot)) return null;
    const observed = snapshot.providerUpdatedAtMillis;
    const lastObserved = timestampMillis(current.flightProviderUpdatedAt);
    if (observed == null || observed > nowMillis + 300_000 ||
        (snapshot.actualArrivalMillis ?? 0) > nowMillis + 300_000 ||
        (lastObserved != null && observed <= lastObserved)) {
      return null;
    }
    const patch = applyFlightSnapshot(current, snapshot, nowMillis);
    const merged = {...current, ...patch};
    patch.flightNextRefreshAt = nextCursor(merged, nowMillis,
      TIER_DELAY_MILLIS[flightRefreshTier(merged, nowMillis)]);
    patch.updatedAt = toTimestamp(Math.max(nowMillis,
      timestampMillis(current.updatedAt) ?? 0))!;
    patch.revision = nextRevision(current.revision, patch.updatedAt);
    tx.update(ref, patch);
    return {...current, ...patch};
  });
}

export async function refreshDueFlightLegs(
  db: FirebaseFirestore.Firestore,
  deps: FlightRefreshDeps,
  limit = 50,
): Promise<{updated: number; skipped: number; failed: number}> {
  const nowMillis = deps.now().getTime();
  // Exact pilot targets avoid scanning unrelated programs or starving the
  // pilot behind older non-pilot cursors. No new Firestore index is needed.
  const due = deps.pilotLegIds ? {docs: (await Promise.all(
    deps.pilotLegIds.map((id) => db.collection("programTravelLegs")
      .doc(id).get()))).filter((doc) => {
    const next = timestampMillis(doc.data()?.flightNextRefreshAt);
    return next != null && next <= nowMillis;
  })} : await db.collection("programTravelLegs")
    .where("flightNextRefreshAt", "<=",
      admin.firestore.Timestamp.fromMillis(nowMillis))
    .orderBy("flightNextRefreshAt")
    .limit(limit)
    .get();
  let updated = 0;
  let skipped = 0;
  let failed = 0;
  const started = Date.now();
  for (const doc of due.docs) {
    if (Date.now() - started > 240_000) break;
    const outcome = await refreshTravelLeg(db, doc.id, deps);
    if (outcome === "updated") updated++;
    else if (outcome === "failed") failed++;
    else skipped++;
  }
  return {updated, skipped, failed};
}
