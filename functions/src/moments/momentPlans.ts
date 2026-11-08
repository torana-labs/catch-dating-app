import type {Firestore} from "firebase-admin/firestore";
import {MOMENT_RUNS_COLLECTION} from "./momentDocuments";
import {
  planAnchorFor,
  type MomentDefinition,
  type MomentPlanAnchor,
} from "./momentModel";

/**
 * The planner board's view of each moment in one scope: what it is tied
 * to, how many messages it has sent, when it runs next, and its board
 * state. Derived on read from `organizerMomentRuns`; nothing is stored.
 */
export type MomentPlanState =
  "draft" | "planned" | "next" | "sent" | "paused" | "done";

export interface MomentPlanSummary {
  momentId: string;
  anchor: MomentPlanAnchor;
  sentCount: number;
  nextRunAtMillis: number | null;
  state: MomentPlanState;
}

/** Firestore `in` accepts at most 30 values. */
const IN_CHUNK = 30;

interface RunTally {
  sent: number;
  nextDueAtMillis: number | null;
}

/** Sums sends and finds the earliest planned run per moment. */
export async function tallyMomentRuns(
  db: Firestore,
  momentIds: ReadonlyArray<string>,
): Promise<Map<string, RunTally>> {
  const tallies = new Map<string, RunTally>();
  for (let i = 0; i < momentIds.length; i += IN_CHUNK) {
    const chunk = momentIds.slice(i, i + IN_CHUNK);
    const snap = await db.collection(MOMENT_RUNS_COLLECTION)
      .where("momentId", "in", chunk)
      .get();
    for (const doc of snap.docs) {
      const data = doc.data() as Record<string, unknown>;
      const momentId = data.momentId;
      if (typeof momentId !== "string") continue;
      const tally = tallies.get(momentId) ??
        {sent: 0, nextDueAtMillis: null};
      if (data.status === "dispatched" &&
          Number.isSafeInteger(data.sent) && (data.sent as number) > 0) {
        tally.sent += data.sent as number;
      }
      if (data.status === "planned" &&
          Number.isSafeInteger(data.dueAtMillis)) {
        const due = data.dueAtMillis as number;
        tally.nextDueAtMillis = tally.nextDueAtMillis === null ?
          due : Math.min(tally.nextDueAtMillis, due);
      }
      tallies.set(momentId, tally);
    }
  }
  return tallies;
}

/** Board summaries in the order of [moments]. The armed moment with the
 *  soonest planned run is `next`; ties break on momentId. */
export function summarizeMomentPlans(
  moments: ReadonlyArray<MomentDefinition>,
  tallies: ReadonlyMap<string, RunTally>,
): MomentPlanSummary[] {
  let nextId: string | null = null;
  let nextAt = Number.POSITIVE_INFINITY;
  for (const moment of moments) {
    const due = tallies.get(moment.momentId)?.nextDueAtMillis ?? null;
    if (moment.status !== "armed" || due === null) continue;
    if (due < nextAt || (due === nextAt && nextId !== null &&
        moment.momentId < nextId)) {
      nextAt = due;
      nextId = moment.momentId;
    }
  }
  return moments.map((moment) => {
    const tally = tallies.get(moment.momentId);
    const sentCount = tally?.sent ?? 0;
    const nextRunAtMillis = moment.status === "armed" ?
      tally?.nextDueAtMillis ?? null : null;
    return {
      momentId: moment.momentId,
      anchor: planAnchorFor(moment),
      sentCount,
      nextRunAtMillis,
      state: stateFor(moment, sentCount, nextRunAtMillis, nextId),
    };
  });
}

function stateFor(
  moment: MomentDefinition,
  sentCount: number,
  nextRunAtMillis: number | null,
  nextId: string | null,
): MomentPlanState {
  switch (moment.status) {
  case "draft":
    return "draft";
  case "paused":
    return "paused";
  case "done":
    return sentCount > 0 ? "sent" : "done";
  case "armed":
    if (moment.momentId === nextId) return "next";
    if (nextRunAtMillis === null && sentCount > 0) return "sent";
    return "planned";
  }
}

/** Reads runs for [moments] and returns their board summaries. */
export async function loadMomentPlans(
  db: Firestore,
  moments: ReadonlyArray<MomentDefinition>,
): Promise<MomentPlanSummary[]> {
  if (moments.length === 0) return [];
  const tallies = await tallyMomentRuns(
    db, moments.map((moment) => moment.momentId));
  return summarizeMomentPlans(moments, tallies);
}
