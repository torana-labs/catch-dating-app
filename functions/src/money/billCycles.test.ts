import assert from "node:assert/strict";
import test from "node:test";
import {testCommercialTerms} from "../commercialTerms/testFixture";
import {
  closedCycles,
  cycleBillId,
  cycleBillingEpochMillis,
  cycleCapMinor,
  cycleLengthMillis,
  firstCycle,
} from "./billCycles";
import {dayMillis} from "./hostTrial";
import {billDueAtMillis} from "./organizerBills";

const length = 30 * dayMillis;
const trialEnd = Date.UTC(2026, 10, 9, 6, 30); // 9 Nov 2026, 12:00 IST

test("cycles are cycleDays long and only anchored at trial end", () => {
  assert.equal(cycleLengthMillis(testCommercialTerms()), length);
  const terms = testCommercialTerms();
  assert.equal(cycleLengthMillis({commission: {...terms.commission,
    cycleDays: 15}}), 15 * dayMillis);
  assert.equal(cycleLengthMillis({commission: {...terms.commission,
    cycleAnchor: "calendarMonth" as "trialEnd"}}), null);
});

test("the first cycle starts at trial end when the trial ended after the " +
  "move from monthly bills", () => {
  assert.deepEqual(firstCycle({trialEndsAtMillis: trialEnd,
    lengthMillis: length, countFromMillis: cycleBillingEpochMillis}),
  {nextCycleNumber: 1, nextCycleStartMillis: trialEnd,
    countFromMillis: trialEnd});
});

test("a trial that ended before the move keeps its anchor and starts with " +
  "the cycle that straddles the move", () => {
  const ended = Date.UTC(2026, 8, 20); // 20 Sep: cycles 20 Sep, 20 Oct, ...
  const first = firstCycle({trialEndsAtMillis: ended, lengthMillis: length,
    countFromMillis: cycleBillingEpochMillis});
  assert.equal(first.nextCycleNumber, 2);
  assert.equal(first.nextCycleStartMillis, ended + length);
  assert.equal(first.countFromMillis, cycleBillingEpochMillis);
});

test("closed cycles chain from the pointer and stop before the open one",
  () => {
    const cycles = closedCycles({pointer: {nextCycleNumber: 1,
      nextCycleStartMillis: trialEnd}, lengthMillis: length,
    countFromMillis: trialEnd, nowMillis: trialEnd + 2 * length + 5});
    assert.deepEqual(cycles.map((cycle) => [cycle.cycleNumber,
      cycle.startMillis, cycle.endMillis]), [
      [1, trialEnd, trialEnd + length],
      [2, trialEnd + length, trialEnd + 2 * length]]);
    assert.deepEqual(closedCycles({pointer: {nextCycleNumber: 1,
      nextCycleStartMillis: trialEnd}, lengthMillis: length,
    countFromMillis: trialEnd, nowMillis: trialEnd + length - 1}), []);
  });

test("the cap applies per cycle and is prorated only for the straddling " +
  "cycle", () => {
  const full = {cycleNumber: 1, startMillis: 0, endMillis: length,
    countFromMillis: 0};
  assert.equal(cycleCapMinor(1_000_000, full), 1_000_000);
  assert.equal(cycleCapMinor(null, full), null);
  // 9 of 30 days were already billed by a calendar-month bill.
  assert.equal(cycleCapMinor(1_000_000, {...full,
    countFromMillis: 9 * dayMillis}), 700_000);
});

test("cycle bill ids name the cycle's first day in India time", () => {
  // 18:30 UTC on 9 Nov is midnight on 10 Nov in India.
  assert.equal(cycleBillId("org", Date.UTC(2026, 10, 9, 18, 30)),
    "org_c2026-11-10");
  // The bill document's id pattern accepts it.
  assert.match(cycleBillId("org", trialEnd), new RegExp(
    "^[A-Za-z0-9][A-Za-z0-9_-]{0,179}_" +
    "(c[0-9]{4}-[0-9]{2}-[0-9]{2}|[0-9]{4}-[0-9]{2})$", "u"));
});

test("a cycle bill falls due 15 days after its cycle closes, never less " +
  "than a week after sending", () => {
  const cycleBill = {periodKind: "cycle", periodEndMillis: trialEnd,
    month: "2026-11"} as Parameters<typeof billDueAtMillis>[0];
  assert.equal(billDueAtMillis(cycleBill, trialEnd + dayMillis, 15),
    trialEnd + 15 * dayMillis);
  assert.equal(billDueAtMillis(cycleBill, trialEnd + 14 * dayMillis, 15),
    trialEnd + 21 * dayMillis);
  // A calendar-month bill keeps the money settings' due day.
  const monthBill = {month: "2026-10", periodEndMillis: 0} as
    Parameters<typeof billDueAtMillis>[0];
  assert.equal(billDueAtMillis(monthBill, 0, 15),
    cycleBillingEpochMillis + 15 * dayMillis - 1);
});
