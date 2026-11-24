/* eslint-disable max-len */
import {logger} from "firebase-functions";
import {CallableRequest, HttpsError} from "firebase-functions/v2/https";
import type {checkRateLimit as defaultCheckRateLimit} from "../../shared/rateLimit";
import {clientAddress, limiterKey} from "../../platform/requestLimits";
import {blockedIntakePatch, checkListingSuppression, suppressionModule} from "../../listingSuppressions/registry";
import {packagedIntake, type IntakePageSource} from "../../operations/supplyIntake/runtime";
import {pageSourceFor, type PageAllowance} from "../../operations/supplyIntake/worker";

// The pieces every read of a public page shares, wherever it starts (#2058):
//
// - spendTryItReadBudget: the per-phone, per-address and whole-tool budgets a
//   try-it command spends before its first read. linkRead.ts (organizer and
//   event imports, through Supply Intake) and form import read with the same
//   numbers; each command keeps its own limiter names and daily scope, so
//   live counters carry on unchanged.
// - registryLinkSuppression and assertLinksReadable: the do-not-list check for
//   links read outside a Supply Intake request. It keys links the way Supply
//   Intake keys a request's seed links, counts a refused read on the matching
//   case, and fails closed when the registry key is unavailable.
// - withPageSource: one guarded page fetcher under the acquisition policy and
//   a monthly allowance, settled after use. Form import (instant-draft
//   allowance) and Luma claim checks (shared allowance) read through it; the
//   Supply Intake worker opens the same pageSourceFor for request reads.

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/** The numbers every try-it link read spends: reads per phone and per address an hour, and across the tool a day. */
export const TRY_IT_READ_LIMITS = Object.freeze({phonePerHour: 10, addressPerHour: 30, dailyTotal: 100});

/** A command's limiter names for the try-it read budgets. */
export interface TryItReadBudget {
  /** Reads per verified phone per hour. */
  phone: string;
  /** Reads per network address per hour. */
  address: string;
  /** Reads across the whole tool per day. */
  daily: string;
  /** The key the daily budget counts under. */
  dailyScope: string;
}

/** Spends one read from each try-it budget; throws resource-exhausted when one is spent. */
export async function spendTryItReadBudget(db: FirebaseFirestore.Firestore, checkRateLimit: typeof defaultCheckRateLimit,
  request: CallableRequest<unknown>, phone: string, budget: TryItReadBudget): Promise<void> {
  await checkRateLimit(db, limiterKey("phone", phone), budget.phone, {maxRequests: TRY_IT_READ_LIMITS.phonePerHour, windowMs: HOUR_MS});
  await checkRateLimit(db, limiterKey("ip", clientAddress(request)), budget.address, {maxRequests: TRY_IT_READ_LIMITS.addressPerHour, windowMs: HOUR_MS});
  await checkRateLimit(db, budget.dailyScope, budget.daily, {maxRequests: TRY_IT_READ_LIMITS.dailyTotal, windowMs: DAY_MS});
}

/** What the do-not-list registry says about a set of links. */
export type LinkSuppressionCheck = (urls: string[]) => Promise<"clear" | "suppressed" | "unavailable">;

/** The registry check for links read outside a Supply Intake request. */
export function registryLinkSuppression(deps: {db: () => FirebaseFirestore.Firestore; now: () => Date}): LinkSuppressionCheck {
  return async (urls) => {
    const keys = (await suppressionModule()).suppressionKeysForIntakeRequest({seed: {name: null, urls, notes: null}});
    const db = deps.db();
    return db.runTransaction(async (tx) => {
      const check = await checkListingSuppression(tx, db, keys);
      if (check.state === "suppressed") tx.update(check.match.ref, blockedIntakePatch(check.match, deps.now()));
      return check.state;
    });
  };
}

/**
 * Whether the do-not-list names these links. An unavailable registry stops
 * the read: it throws unavailable with reason suppression_unavailable.
 */
export async function linksSuppressed(check: LinkSuppressionCheck, urls: string[], commandId: string): Promise<boolean> {
  const state = await check(urls);
  if (state === "unavailable") {
    logger.error("Link read paused: the do-not-list registry key is unavailable.", {commandId});
    throw new HttpsError("unavailable", "We can't check this link right now. Try again later.",
      {reason: "suppression_unavailable"});
  }
  return state === "suppressed";
}

/**
 * Opens the guarded page fetcher under the acquisition policy and [allowance],
 * runs [read], and gives unused reservations back. While page fetching is off
 * the source captures nothing.
 */
export async function withPageSource<T>(deps: {db: () => FirebaseFirestore.Firestore; now: () => Date},
  allowance: PageAllowance, read: (source: IntakePageSource) => Promise<T>): Promise<T> {
  const runtime = await packagedIntake();
  const policy = await runtime.loadSupplyAcquisitionPolicy();
  const {source, settle} = await pageSourceFor({db: deps.db(), now: deps.now}, policy, allowance);
  try {
    return await read(source);
  } finally {
    await settle();
  }
}

/** Whether on-demand page fetching is switched on. */
export async function pageFetchEnabled(): Promise<boolean> {
  const runtime = await packagedIntake();
  return (await runtime.loadSupplyAcquisitionPolicy()).pageFetch.enabled;
}
