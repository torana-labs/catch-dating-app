import type {CommercialTerms} from "../commercialTerms/terms";
import {dayMillis} from "./hostTrial";

/**
 * Pure rules for rolling billing cycles (#1126, owner 28 Oct): each host is
 * billed in arrears for rolling `commission.cycleDays`-day cycles anchored at
 * the end of its free trial, and the cap applies per cycle.
 *
 * Cycles chain: each starts where the last one billed ended, so a later change
 * to `cycleDays` changes only cycles not yet billed and never overlaps or
 * leaves a gap. Payments before `countFromMillis` (the transition from
 * calendar-month bills) are never counted again.
 */

/**
 * Calendar-month bills cover payments up to the end of October 2026, India
 * time; cycle bills never count a payment captured before this instant.
 */
export const cycleBillingEpochMillis = Date.UTC(2026, 10, 1) -
  (5 * 60 + 30) * 60 * 1000;

/** A cycle bill falls due this many days after its cycle closes. */
export const cycleBillDueDays = 15;

export interface CycleWindow {
  /** 1 for the first cycle after the trial. */
  cycleNumber: number;
  startMillis: number;
  endMillis: number;
  /** Payments are counted from here: the cycle start or the transition. */
  countFromMillis: number;
}

export interface CyclePointer {
  nextCycleNumber: number;
  nextCycleStartMillis: number;
}

/**
 * The cycle length the terms give, or null when the anchor is one this code
 * does not implement.
 * @param {CommercialTerms} terms Effective terms.
 * @return {number|null} Cycle length in millis.
 */
export function cycleLengthMillis(terms: Pick<CommercialTerms, "commission">):
  number | null {
  const {cycleDays, cycleAnchor} = terms.commission;
  if (cycleAnchor !== "trialEnd" || !Number.isInteger(cycleDays) ||
      cycleDays < 1) return null;
  return cycleDays * dayMillis;
}

/**
 * Where an organizer's first cycle bill starts. Cycles stay anchored at the
 * trial end: when the transition falls after it, the first cycle is the one
 * that contains the transition, and only payments from the transition count.
 * @param {object} input Trial end, cycle length and the transition instant.
 * @return {object} First cycle number, start and count-from instant.
 */
export function firstCycle(input: {
  trialEndsAtMillis: number; lengthMillis: number; countFromMillis: number;
}): CyclePointer & {countFromMillis: number} {
  const {trialEndsAtMillis, lengthMillis} = input;
  const countFromMillis = Math.max(trialEndsAtMillis, input.countFromMillis);
  const skipped = Math.floor((countFromMillis - trialEndsAtMillis) /
    lengthMillis);
  return {nextCycleNumber: skipped + 1,
    nextCycleStartMillis: trialEndsAtMillis + skipped * lengthMillis,
    countFromMillis};
}

/**
 * Every cycle that has closed by now, from the pointer on.
 * @param {object} input Pointer, cycle length, count-from instant and now.
 * @return {CycleWindow[]} Closed cycles, oldest first.
 */
export function closedCycles(input: {
  pointer: CyclePointer; lengthMillis: number; countFromMillis: number;
  nowMillis: number; limit?: number;
}): CycleWindow[] {
  const cycles: CycleWindow[] = [];
  let number = input.pointer.nextCycleNumber;
  let start = input.pointer.nextCycleStartMillis;
  const limit = input.limit ?? 24;
  while (start + input.lengthMillis <= input.nowMillis &&
      cycles.length < limit) {
    const end = start + input.lengthMillis;
    cycles.push({cycleNumber: number, startMillis: start, endMillis: end,
      countFromMillis: Math.max(start, input.countFromMillis)});
    number++;
    start = end;
  }
  return cycles;
}

/**
 * The cap for one cycle. A cycle that straddles the transition from monthly
 * bills has its cap reduced to the share of the cycle still to be billed, so
 * the host is never capped twice for the same days.
 * @param {number|null} capMinor The terms' cap per cycle.
 * @param {CycleWindow} cycle The cycle.
 * @return {number|null} Cap for this cycle.
 */
export function cycleCapMinor(capMinor: number | null, cycle: CycleWindow):
  number | null {
  if (capMinor === null) return null;
  const length = cycle.endMillis - cycle.startMillis;
  const billed = cycle.endMillis - cycle.countFromMillis;
  if (billed >= length) return capMinor;
  return Math.floor(capMinor * Math.max(0, billed) / length);
}

/**
 * A cycle bill's id: the organizer and the cycle's first day, India time.
 * @param {string} organizerId Organizer.
 * @param {number} startMillis Cycle start.
 * @return {string} Bill id.
 */
export function cycleBillId(organizerId: string, startMillis: number): string {
  const ist = new Date(startMillis + (5 * 60 + 30) * 60 * 1000);
  const day = `${ist.getUTCFullYear()}-` +
    `${String(ist.getUTCMonth() + 1).padStart(2, "0")}-` +
    String(ist.getUTCDate()).padStart(2, "0");
  return `${organizerId}_c${day}`;
}
