/* eslint-disable max-len */
// The per-programme daily token ledger. Like the sales provider attempts
// (providerAttempt.ts), the run's intent and its budget reservation commit
// in one transaction before any model call, no I/O happens inside the
// transaction, an existing intent is never resubmitted, and completion
// settles the reservation to the tokens actually used in one commit.

import {
  PROGRAM_ASSISTANT_RUNS,
  requireValidRun,
  type ProgramAssistantRun,
} from "./runs";
import {validateProgramAssistantBudgetDocument} from
  "../../shared/generated/validators/programAssistantBudgetDocument";

export const PROGRAM_ASSISTANT_BUDGETS = "programAssistantBudgets";
/** Used when the programme's settings name no dailyTokenBudget. */
export const DEFAULT_DAILY_TOKEN_BUDGET = 200_000;
const MAX_DAILY_TOKEN_BUDGET = 5_000_000;

export interface ProgramAssistantBudget {
  programId: string;
  organizerId: string;
  day: string;
  tokenCap: number;
  reservedTokens: number;
  consumedTokens: number;
  runCount: number;
  updatedAtMillis: number;
}

export function normalizeDailyTokenBudget(value: unknown): number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ?
    Math.min(value, MAX_DAILY_TOKEN_BUDGET) : DEFAULT_DAILY_TOKEN_BUDGET;
}

export function budgetDocId(programId: string, day: string): string {
  return `${programId}_${day}`;
}

function requireValidBudget(row: ProgramAssistantBudget): ProgramAssistantBudget {
  if (!validateProgramAssistantBudgetDocument(row)) {
    throw new Error("Assistant budget does not satisfy its contract.");
  }
  return row;
}

export type Reservation =
  | {kind: "reserved"; run: ProgramAssistantRun}
  | {kind: "exists"; run: ProgramAssistantRun}
  | {kind: "exhausted"; run: ProgramAssistantRun};

/**
 * Creates the run as an intent and reserves [run.reservedTokens] on the
 * day's ledger, or, when that would pass [tokenCap], records the run as
 * escalated (budgetExhausted) with nothing reserved. An existing run is
 * returned untouched: a retried trigger never calls the model twice.
 */
export async function reserveRun(db: FirebaseFirestore.Firestore,
  intent: ProgramAssistantRun, tokenCap: number): Promise<Reservation> {
  const runRef = db.collection(PROGRAM_ASSISTANT_RUNS).doc(intent.runId);
  const budgetRef = db.collection(PROGRAM_ASSISTANT_BUDGETS)
    .doc(budgetDocId(intent.programId, intent.budgetDay));
  return db.runTransaction(async (tx) => {
    const [runSnap, budgetSnap] = await Promise.all([tx.get(runRef), tx.get(budgetRef)]);
    if (runSnap.exists) {
      return {kind: "exists", run: runSnap.data() as ProgramAssistantRun};
    }
    const prior = budgetSnap.data() as ProgramAssistantBudget | undefined;
    const budget: ProgramAssistantBudget = prior ?? {programId: intent.programId,
      organizerId: intent.organizerId, day: intent.budgetDay, tokenCap,
      reservedTokens: 0, consumedTokens: 0, runCount: 0, updatedAtMillis: 0};
    const used = budget.reservedTokens + budget.consumedTokens;
    if (used + intent.reservedTokens > tokenCap) {
      const run = requireValidRun({...intent, status: "escalated",
        reason: "budgetExhausted", reservedTokens: 0});
      tx.create(runRef, run);
      return {kind: "exhausted", run};
    }
    const run = requireValidRun({...intent, status: "intent", reason: null});
    tx.set(budgetRef, requireValidBudget({...budget, tokenCap,
      reservedTokens: budget.reservedTokens + intent.reservedTokens,
      runCount: budget.runCount + 1, updatedAtMillis: intent.createdAtMillis}));
    tx.create(runRef, run);
    return {kind: "reserved", run};
  });
}

export type RunOutcome = Pick<ProgramAssistantRun, "status" | "reason" |
  "inputTokens" | "outputTokens" | "attempts" | "providerStatus" | "latencyMillis"> & {
  /** Tokens to settle on the ledger; the reservation when billing is uncertain. */
  consumedTokens: number;
};

/**
 * Settles an intent: releases its reservation, adds what was consumed and
 * records the outcome. A run that is no longer an intent is left alone.
 */
export async function completeRun(db: FirebaseFirestore.Firestore,
  runId: string, outcome: RunOutcome, nowMillis: number): Promise<ProgramAssistantRun> {
  const runRef = db.collection(PROGRAM_ASSISTANT_RUNS).doc(runId);
  return db.runTransaction(async (tx) => {
    const runSnap = await tx.get(runRef);
    const run = runSnap.data() as ProgramAssistantRun | undefined;
    if (!run) throw new Error("Assistant run is missing.");
    if (run.status !== "intent") return run;
    const budgetRef = db.collection(PROGRAM_ASSISTANT_BUDGETS)
      .doc(budgetDocId(run.programId, run.budgetDay));
    const budget = (await tx.get(budgetRef)).data() as ProgramAssistantBudget | undefined;
    const {consumedTokens, ...fields} = outcome;
    const next = requireValidRun({...run, ...fields, updatedAtMillis: nowMillis});
    if (budget) {
      tx.set(budgetRef, requireValidBudget({...budget,
        reservedTokens: Math.max(0, budget.reservedTokens - run.reservedTokens),
        consumedTokens: budget.consumedTokens + Math.max(0, consumedTokens),
        updatedAtMillis: nowMillis}));
    }
    tx.set(runRef, next);
    return next;
  });
}

/** Records a run that never reached the model (no reservation), once. */
export async function recordRun(db: FirebaseFirestore.Firestore,
  run: ProgramAssistantRun): Promise<{created: boolean; run: ProgramAssistantRun}> {
  const ref = db.collection(PROGRAM_ASSISTANT_RUNS).doc(run.runId);
  return db.runTransaction(async (tx) => {
    const prior = await tx.get(ref);
    if (prior.exists) return {created: false, run: prior.data() as ProgramAssistantRun};
    const stored = requireValidRun({...run, reservedTokens: 0});
    tx.create(ref, stored);
    return {created: true, run: stored};
  });
}

/** Tokens left today for the preview response. */
export async function remainingTokens(db: FirebaseFirestore.Firestore,
  programId: string, day: string, tokenCap: number): Promise<number> {
  const snap = await db.collection(PROGRAM_ASSISTANT_BUDGETS)
    .doc(budgetDocId(programId, day)).get();
  const row = snap.data() as ProgramAssistantBudget | undefined;
  return Math.max(0, tokenCap - (row ? row.reservedTokens + row.consumedTokens : 0));
}
