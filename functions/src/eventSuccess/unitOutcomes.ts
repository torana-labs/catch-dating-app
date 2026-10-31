import {CallableRequest, HttpsError, onCall} from
  "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import type {EventDocument} from "../shared/generated/firestoreAdminTypes";
import type {RecordEventSuccessUnitOutcomesCallablePayload} from
  "../shared/generated/recordEventSuccessUnitOutcomesCallablePayload";
import type {RecordEventSuccessUnitOutcomesCallableResponse} from
  "../shared/generated/recordEventSuccessUnitOutcomesCallableResponse";
import {
  validateRecordEventSuccessUnitOutcomesCallablePayload,
} from
  "../shared/generated/validators/recordEventSuccessUnitOutcomesInput";
import {requireAuth} from "../shared/auth";
import {appCheckCallableOptions} from "../shared/callableOptions";
import {
  eventOrganizerRef,
  isEventOrganizerManager,
  requireEventOrganizer,
} from "../shared/eventOrganizers";
import {checkRateLimit as defaultCheckRateLimit} from "../shared/rateLimit";
import {requireDoc, validateCallableWithAjv} from "../shared/validation";
import {
  EventSuccessUnitOutcome,
  eventSuccessPrimitivesFor,
} from "./formatPrimitives";

type OutcomeEntry =
  RecordEventSuccessUnitOutcomesCallablePayload["entries"][number];

export interface OutcomeRound {
  roundIndex: number;
  entries: OutcomeEntry[];
}

export interface StandingEntry {
  unitId: string;
  unitLabel: string;
  position: number;
  value: number;
  roundsRecorded: number;
}

export interface StandingRound {
  roundIndex: number;
  entries: StandingEntry[];
}

export interface UnitOutcomeState {
  unitOutcome: Exclude<EventSuccessUnitOutcome, "none">;
  revision: number;
  rounds: OutcomeRound[];
}

export interface UnitOutcomeResolution {
  replayed: boolean;
  revision: number;
  rounds: OutcomeRound[];
  standingRounds: StandingRound[];
  standings: StandingEntry[];
}

interface UnitOutcomeDeps {
  firestore: () => FirebaseFirestore.Firestore;
  serverTimestamp: () => FirebaseFirestore.FieldValue;
  checkRateLimit?: typeof defaultCheckRateLimit;
}

const defaultDeps: UnitOutcomeDeps = {
  firestore: () => admin.firestore(),
  serverTimestamp: () => admin.firestore.FieldValue.serverTimestamp(),
  checkRateLimit: defaultCheckRateLimit,
};

/** Replaces one complete outcome round and rebuilds standings snapshots. */
export function resolveUnitOutcomeUpdate(input: {
  unitOutcome: EventSuccessUnitOutcome;
  current?: UnitOutcomeState;
  expectedRevision: number;
  roundIndex: number;
  entries: OutcomeEntry[];
}): UnitOutcomeResolution {
  if (input.unitOutcome === "none") {
    throw new HttpsError(
      "failed-precondition",
      "This event format does not record unit outcomes."
    );
  }
  const entries = normalizeOutcomeEntries(input.unitOutcome, input.entries);
  const current = input.current;
  if (current != null && current.unitOutcome !== input.unitOutcome) {
    throw new HttpsError(
      "failed-precondition",
      "Saved outcomes do not match the event format."
    );
  }
  const matchingRound = current?.rounds.find(
    (round) => round.roundIndex === input.roundIndex
  );
  if (
    matchingRound != null &&
    outcomeEntriesEqual(matchingRound.entries, entries)
  ) {
    const standingRounds = buildStandingRounds(
      input.unitOutcome,
      current!.rounds
    );
    return {
      replayed: true,
      revision: current!.revision,
      rounds: current!.rounds,
      standingRounds,
      standings: standingRounds.at(-1)?.entries ?? [],
    };
  }
  const revision = current?.revision ?? 0;
  if (revision !== input.expectedRevision) {
    throw new HttpsError(
      "aborted",
      "The event standings changed on another device. Refresh and retry."
    );
  }
  if (revision >= 2147483647) {
    throw new HttpsError(
      "resource-exhausted",
      "The event standings revision limit has been reached."
    );
  }
  const existingRound = current?.rounds.some(
    (round) => round.roundIndex === input.roundIndex
  ) ?? false;
  const nextRoundIndex = current?.rounds.length === 0 || current == null ?
    0 : Math.max(...current.rounds.map((round) => round.roundIndex)) + 1;
  if (!existingRound && input.roundIndex !== nextRoundIndex) {
    throw new HttpsError(
      "failed-precondition",
      "Outcome rounds must be recorded in order. " +
      `Record round ${nextRoundIndex} ` +
      "next."
    );
  }
  const rounds = [
    ...(current?.rounds ?? []).filter(
      (round) => round.roundIndex !== input.roundIndex
    ),
    {roundIndex: input.roundIndex, entries},
  ].sort((a, b) => a.roundIndex - b.roundIndex);
  const standingRounds = buildStandingRounds(input.unitOutcome, rounds);
  return {
    replayed: false,
    revision: revision + 1,
    rounds,
    standingRounds,
    standings: standingRounds.at(-1)?.entries ?? [],
  };
}

/** Records Host-authored outcome facts and rebuilds the attendee projection. */
export async function recordEventSuccessUnitOutcomesHandler(
  request: CallableRequest<unknown>,
  deps: UnitOutcomeDeps = defaultDeps
): Promise<RecordEventSuccessUnitOutcomesCallableResponse> {
  const uid = requireAuth(request);
  const payload =
    validateCallableWithAjv<RecordEventSuccessUnitOutcomesCallablePayload>(
      request,
      validateRecordEventSuccessUnitOutcomesCallablePayload
    );
  const db = deps.firestore();
  await deps.checkRateLimit?.(db, uid, "recordEventSuccessUnitOutcomes", {
    maxRequests: 30, windowMs: 60 * 1000,
  });
  const eventRef = db.collection("events").doc(payload.eventId);
  const eventSnap = await eventRef.get();
  if (!eventSnap.exists) {
    throw new HttpsError("not-found", "Event not found.");
  }
  const event = requireDoc<EventDocument>(eventSnap, "EventDocument");
  const organizerSnap = await eventOrganizerRef(db, event).get();
  const organizer = requireEventOrganizer(organizerSnap, event);
  if (!isEventOrganizerManager(organizer, event, uid)) {
    throw new HttpsError(
      "permission-denied",
      "Only an organizer manager can record event outcomes."
    );
  }
  const unitOutcome = eventSuccessPrimitivesFor(event.eventFormat).unitOutcome;
  const outcomeRef = db.collection("eventSuccessUnitOutcomes")
    .doc(payload.eventId);
  const standingsRef = db.collection("eventSuccessStandings")
    .doc(payload.eventId);

  return db.runTransaction(async (transaction) => {
    const [outcomeSnap, standingsSnap] = await Promise.all([
      transaction.get(outcomeRef),
      transaction.get(standingsRef),
    ]);
    const current = outcomeSnap.exists ?
      unitOutcomeState(outcomeSnap.data()) :
      undefined;
    if (outcomeSnap.exists && current == null) {
      throw new HttpsError(
        "failed-precondition",
        "Saved event outcomes are malformed and cannot be replaced safely."
      );
    }
    const resolution = resolveUnitOutcomeUpdate({
      unitOutcome,
      current,
      expectedRevision: payload.expectedRevision,
      roundIndex: payload.roundIndex,
      entries: payload.entries,
    });
    if (resolution.replayed) {
      return {
        replayed: true,
        revision: resolution.revision,
        standingCount: resolution.standings.length,
      };
    }
    const now = deps.serverTimestamp();
    const identity = {
      eventId: payload.eventId,
      organizerId: event.organizerId,
      ...(event.organizerId != null ? {organizerId: event.organizerId} : {}),
    };
    transaction.set(outcomeRef, {
      ...identity,
      unitOutcome,
      revision: resolution.revision,
      rounds: resolution.rounds,
      createdAt: outcomeSnap.exists ? outcomeSnap.data()!.createdAt : now,
      updatedAt: now,
    });
    if (unitOutcome === "score" || unitOutcome === "rank") {
      transaction.set(standingsRef, {
        ...identity,
        unitOutcome,
        revision: resolution.revision,
        latestRoundIndex: resolution.standingRounds.at(-1)!.roundIndex,
        rounds: resolution.standingRounds,
        entries: resolution.standings,
        createdAt: standingsSnap.exists ? standingsSnap.data()!.createdAt : now,
        updatedAt: now,
      });
    } else if (standingsSnap.exists) {
      transaction.delete(standingsRef);
    }
    return {
      replayed: false,
      revision: resolution.revision,
      standingCount: resolution.standings.length,
    };
  });
}

export const recordEventSuccessUnitOutcomes = onCall(
  appCheckCallableOptions,
  (request) => recordEventSuccessUnitOutcomesHandler(request)
);

function normalizeOutcomeEntries(
  unitOutcome: Exclude<EventSuccessUnitOutcome, "none">,
  entries: OutcomeEntry[]
): OutcomeEntry[] {
  const seen = new Set<string>();
  const normalized = entries.map((entry) => {
    const unitId = entry.unitId.trim();
    const unitLabel = entry.unitLabel.trim();
    if (unitId.length === 0 || unitLabel.length === 0 || seen.has(unitId)) {
      throw new HttpsError(
        "invalid-argument",
        "Outcome entries require unique unit ids and non-empty labels."
      );
    }
    seen.add(unitId);
    if (unitOutcome === "completion" && "completed" in entry) {
      return {unitId, unitLabel, completed: entry.completed};
    }
    if (
      unitOutcome === "score" &&
      "score" in entry &&
      Number.isFinite(entry.score)
    ) {
      return {unitId, unitLabel, score: entry.score};
    }
    if (
      unitOutcome === "rank" &&
      "rank" in entry &&
      Number.isInteger(entry.rank)
    ) {
      return {unitId, unitLabel, rank: entry.rank};
    }
    throw new HttpsError(
      "invalid-argument",
      `Outcome entries must match the ${unitOutcome} format.`
    );
  });
  if (unitOutcome === "rank") {
    const ranks = normalized.map((entry) => (entry as {rank: number}).rank)
      .sort((a, b) => a - b);
    if (ranks.some((rank, index) => rank !== index + 1)) {
      throw new HttpsError(
        "invalid-argument",
        "Rank outcomes must form one complete ordering from 1 to the " +
        "unit count."
      );
    }
  }
  return normalized.sort((a, b) => a.unitId.localeCompare(b.unitId));
}

function buildStandingRounds(
  unitOutcome: Exclude<EventSuccessUnitOutcome, "none">,
  rounds: OutcomeRound[]
): StandingRound[] {
  if (unitOutcome === "completion") return [];
  const roundsRecorded = new Map<string, number>();
  const scores = new Map<string, {unitLabel: string; value: number}>();
  return rounds.map((round) => {
    for (const entry of round.entries) {
      roundsRecorded.set(
        entry.unitId,
        (roundsRecorded.get(entry.unitId) ?? 0) + 1
      );
      if (unitOutcome === "score") {
        const score = (entry as {score: number}).score;
        scores.set(entry.unitId, {
          unitLabel: entry.unitLabel,
          value: (scores.get(entry.unitId)?.value ?? 0) + score,
        });
      }
    }
    const ordered = unitOutcome === "score" ?
      [...scores.entries()].map(([unitId, value]) => ({
        unitId,
        unitLabel: value.unitLabel,
        value: value.value,
        roundsRecorded: roundsRecorded.get(unitId)!,
      })).sort((a, b) =>
        b.value - a.value || a.unitId.localeCompare(b.unitId)
      ) :
      round.entries.map((entry) => ({
        unitId: entry.unitId,
        unitLabel: entry.unitLabel,
        value: (entry as {rank: number}).rank,
        roundsRecorded: roundsRecorded.get(entry.unitId)!,
      })).sort((a, b) =>
        a.value - b.value || a.unitId.localeCompare(b.unitId)
      );
    return {
      roundIndex: round.roundIndex,
      entries: ordered.map((entry, index) => ({
        ...entry,
        position: index + 1,
      })),
    };
  });
}

function unitOutcomeState(data: FirebaseFirestore.DocumentData | undefined):
  UnitOutcomeState | undefined {
  if (data == null ||
      (data.unitOutcome !== "completion" &&
       data.unitOutcome !== "score" &&
       data.unitOutcome !== "rank") ||
      !Number.isInteger(data.revision) ||
      !Array.isArray(data.rounds)) {
    return undefined;
  }
  return {
    unitOutcome: data.unitOutcome,
    revision: data.revision,
    rounds: data.rounds as OutcomeRound[],
  };
}

function outcomeEntriesEqual(a: OutcomeEntry[], b: OutcomeEntry[]): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
