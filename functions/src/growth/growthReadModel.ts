import type {
  NominatorCreditDocument,
  OrganizerBillDocument,
  OrganizerGrowthFactsDocument,
  PlatformCostDocument,
} from "../shared/generated/firestoreAdminTypes";
import type {AdminGetGrowthCallableResponse as Growth} from
  "../shared/generated/adminGetGrowthCallableResponse";
import {monthOf, monthWindow, monthsBetween} from "../money/billComputation";

/**
 * Growth, computed from what Catch records: organizer growth facts (channel,
 * first nominator, dated steps), monthly bills (ticket sales and what Catch
 * earned), nominator credit and ad spend.
 */
export type GrowthRange = Growth["range"];
type Channel = OrganizerGrowthFactsDocument["channel"];

const dayMillis = 24 * 60 * 60 * 1000;
const channels: Channel[] = ["imported", "sales_associate", "partner", "guest",
  "organizer", "came_to_us", "ads"];

export interface GrowthInput {
  range: GrowthRange;
  nowMillis: number;
  facts: OrganizerGrowthFactsDocument[];
  bills: OrganizerBillDocument[];
  credits: NominatorCreditDocument[];
  costs: PlatformCostDocument[];
  organizerNames: Map<string, string>;
  personNames: Map<string, string>;
}

/**
 * When the range starts: 90 days back, the start of the month 11 months
 * back, or the beginning.
 * @param {GrowthRange} range Range.
 * @param {number} nowMillis Now.
 * @return {number} Epoch millis.
 */
export function rangeStart(range: GrowthRange, nowMillis: number): number {
  if (range === "all") return 0;
  if (range === "90d") return nowMillis - 90 * dayMillis;
  let month = monthOf(nowMillis);
  for (let i = 0; i < 11; i++) {
    month = monthOf(monthWindow(month).startMillis - 1);
  }
  return monthWindow(month).startMillis;
}

/**
 * The median of some numbers, to one decimal place.
 * @param {number[]} values Values.
 * @return {number|null} Median, or null when there are none.
 */
export function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const value = sorted.length % 2 ? sorted[mid] :
    (sorted[mid - 1] + sorted[mid]) / 2;
  return Math.round(value * 10) / 10;
}

const millis = (value: {toMillis(): number} | null | undefined) =>
  value ? value.toMillis() : null;
const sales = (bill: OrganizerBillDocument) =>
  Math.max(0, bill.sales.grossMinor - bill.sales.refundedMinor);
const billed = (bill: OrganizerBillDocument) =>
  bill.totalMinor > 0 && (bill.status === "sent" || bill.status === "paid");

/**
 * The day an organizer joined a cohort: when it was listed, or when its
 * facts were first recorded for an organizer that set itself up.
 * @param {OrganizerGrowthFactsDocument} facts Growth facts.
 * @return {number} Epoch millis.
 */
export function cohortStart(facts: OrganizerGrowthFactsDocument): number {
  return millis(facts.milestones.listedAt) ??
    millis(facts.milestones.claimedAt) ?? facts.createdAt.toMillis();
}

/**
 * Builds every Growth view for one range.
 * @param {GrowthInput} input Records and range.
 * @return {Growth} Growth.
 */
export function buildGrowth(input: GrowthInput): Growth {
  const {nowMillis} = input;
  const start = rangeStart(input.range, nowMillis);
  const startMonth = monthOf(start);
  const billsByOrganizer = new Map<string, OrganizerBillDocument[]>();
  for (const bill of input.bills) {
    const list = billsByOrganizer.get(bill.organizerId) ?? [];
    list.push(bill);
    billsByOrganizer.set(bill.organizerId, list);
  }
  for (const list of billsByOrganizer.values()) {
    list.sort((a, b) => a.month.localeCompare(b.month));
  }
  const paying = (organizerId: string) =>
    (billsByOrganizer.get(organizerId) ?? []).some(billed);
  const name = (organizerId: string) => input.organizerNames.get(organizerId) ??
    billsByOrganizer.get(organizerId)?.at(-1)?.organizerName ?? organizerId;
  const inRange = input.facts.filter((facts) =>
    cohortStart(facts) >= start && cohortStart(facts) <= nowMillis);

  const claimDaysOf = (facts: OrganizerGrowthFactsDocument) => {
    const claimed = millis(facts.milestones.claimedAt);
    return claimed === null ? null :
      Math.max(0, (claimed - cohortStart(facts)) / dayMillis);
  };
  const eventDaysOf = (facts: OrganizerGrowthFactsDocument) => {
    const ran = millis(facts.milestones.firstEventAt);
    return ran === null || ran > nowMillis ? null :
      Math.max(0, (ran - cohortStart(facts)) / dayMillis);
  };
  const present = (values: Array<number | null>) =>
    values.filter((value): value is number => value !== null);

  const cohortMap = new Map<string, OrganizerGrowthFactsDocument[]>();
  for (const facts of inRange) {
    const month = monthOf(cohortStart(facts));
    cohortMap.set(month, [...(cohortMap.get(month) ?? []), facts]);
  }
  const cohorts = [...cohortMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, group]) => {
      const claim = present(group.map(claimDaysOf));
      const event = present(group.map(eventDaysOf));
      return {month, listed: group.length, claimed: claim.length,
        claimMedianDays: median(claim), ranEvent: event.length,
        ranEventMedianDays: median(event),
        tooEarly: nowMillis - monthWindow(month).startMillis < 45 * dayMillis};
    });

  const allClaimDays = present(inRange.map(claimDaysOf));
  const allEventDays = present(inRange.map(eventDaysOf));
  const buckets: Growth["claimDays"] = [
    {label: "0–3", count: 0}, {label: "4–7", count: 0},
    {label: "8–14", count: 0}, {label: "15–30", count: 0},
    {label: "31+", count: 0}];
  for (const days of allClaimDays) {
    const index = days <= 3 ? 0 : days <= 7 ? 1 : days <= 14 ? 2 :
      days <= 30 ? 3 : 4;
    buckets[index].count++;
  }

  // Ticket sales per organizer in its months on Catch, by first event month.
  const currentMonth = monthOf(nowMillis);
  const salesCohorts = new Map<string, OrganizerGrowthFactsDocument[]>();
  for (const facts of input.facts) {
    const ran = millis(facts.milestones.firstEventAt);
    if (ran === null || ran > nowMillis || ran < start) continue;
    const month = monthOf(ran);
    salesCohorts.set(month, [...(salesCohorts.get(month) ?? []), facts]);
  }
  const salesByMonthOnCatch = [...salesCohorts.entries()]
    .sort(([a], [b]) => a.localeCompare(b)).map(([month, group]) => ({
      month, organizers: group.length,
      salesPerOrganizerMinor: Array.from({length: 6}, (_, index) => {
        if (monthsBetween(month, currentMonth) <= index) return null;
        const total = group.reduce((sum, facts) => sum +
          (billsByOrganizer.get(facts.organizerId) ?? [])
            .filter((bill) => monthsBetween(month, bill.month) === index)
            .reduce((billSum, bill) => billSum + sales(bill), 0), 0);
        return Math.round(total / group.length);
      })}));

  const creditsByOrganizer = new Map<string, number>();
  for (const credit of input.credits) {
    creditsByOrganizer.set(credit.organizerId,
      (creditsByOrganizer.get(credit.organizerId) ?? 0) + credit.creditMinor);
  }
  const adSpendInRange = input.costs.filter((cost) =>
    cost.month >= startMonth && cost.category.startsWith("ads_"))
    .reduce((sum, cost) => sum + cost.amountMinor, 0);
  const associates = new Set<string>();
  const partners = new Set<string>();
  const channelRows = channels.map((channel) => {
    const group = inRange.filter((facts) => facts.channel === channel);
    for (const facts of group) {
      if (facts.nominator?.role === "associate") {
        associates.add(input.personNames.get(facts.nominator.uid) ??
          facts.nominator.uid);
      }
      if (channel === "partner" && facts.nominator) {
        partners.add(facts.nominator.uid);
      }
    }
    const earnedMinor = group.reduce((sum, facts) => sum +
      (billsByOrganizer.get(facts.organizerId) ?? [])
        .filter((bill) => billed(bill) && bill.month >= startMonth)
        .reduce((billSum, bill) => billSum + bill.totalMinor, 0), 0);
    const credit = group.reduce((sum, facts) =>
      sum + (creditsByOrganizer.get(facts.organizerId) ?? 0), 0);
    const costKind: Growth["channels"][number]["costKind"] =
      channel === "ads" ? "ads" : channel === "sales_associate" ? "salaries" :
        ["partner", "guest", "organizer"].includes(channel) ? "credit" : "none";
    return {channel, listed: group.length,
      claimed: group.filter((facts) => facts.milestones.claimedAt).length,
      paying: group.filter((facts) => paying(facts.organizerId)).length,
      earnedMinor,
      costMinor: costKind === "ads" ? adSpendInRange :
        costKind === "credit" ? credit : null,
      costKind, detail: ""};
  });
  const names = [...associates].slice(0, 3);
  for (const row of channelRows) {
    row.detail = row.channel === "imported" ? "Discovery and imports" :
      row.channel === "sales_associate" ? (names.length ?
        names.join(" and ") : "Catch's sales team") :
        row.channel === "partner" ? `${partners.size} community partners` :
          row.channel === "guest" ? "Guests who nominated" :
            row.channel === "organizer" ? "Organizers who nominated" :
              row.channel === "came_to_us" ? "Website and own sign-ups" :
                "Meta and Google ads";
  }

  const claimsMap = new Map<string, number>();
  for (const facts of input.facts) {
    const claimed = millis(facts.milestones.claimedAt);
    if (claimed === null || claimed < start || claimed > nowMillis) continue;
    const month = monthOf(claimed);
    claimsMap.set(month, (claimsMap.get(month) ?? 0) + 1);
  }
  const lastMonth = monthOf(monthWindow(currentMonth).startMillis - 1);
  const meta = input.costs.find((cost) => cost.month === lastMonth &&
    cost.category === "ads_meta");

  const nominatorMap = new Map<string, OrganizerGrowthFactsDocument[]>();
  for (const facts of input.facts) {
    if (!facts.nominator) continue;
    const uid = facts.nominator.uid;
    nominatorMap.set(uid, [...(nominatorMap.get(uid) ?? []), facts]);
  }
  const nominators = [...nominatorMap.entries()].map(([uid, group]) => {
    const credits = input.credits.filter((credit) =>
      credit.nominatorUid === uid);
    const sum = (status: NominatorCreditDocument["status"]) => credits
      .filter((credit) => credit.status === status)
      .reduce((total, credit) => total + credit.creditMinor, 0);
    const organizers = group.map((facts) => {
      const latest = (billsByOrganizer.get(facts.organizerId) ?? []).at(-1);
      const credit = latest ? credits.find((entry) =>
        entry.billId === latest.billId) : undefined;
      return {organizerId: facts.organizerId, name: name(facts.organizerId),
        claimed: facts.milestones.claimedAt !== null,
        latestBill: latest ? {billId: latest.billId, month: latest.month,
          totalMinor: latest.totalMinor, status: latest.status,
          creditMinor: credit?.creditMinor ?? null} : null,
        creditMonthIndex: credit?.monthIndex ?? null};
    }).sort((a, b) => Number(!!b.latestBill) - Number(!!a.latestBill) ||
      Number(b.claimed) - Number(a.claimed)).slice(0, 50);
    return {uid, name: (input.personNames.get(uid) ?? uid).slice(0, 120),
      role: group[0].nominator!.role, nominated: group.length,
      claimed: group.filter((facts) => facts.milestones.claimedAt).length,
      paying: group.filter((facts) => paying(facts.organizerId)).length,
      paidToCatchMinor: group.reduce((total, facts) => total +
        (billsByOrganizer.get(facts.organizerId) ?? [])
          .reduce((billSum, bill) => billSum + (bill.paidMinor ?? 0), 0), 0),
      creditOwedMinor: sum("owed"), creditApprovedMinor: sum("approved"),
      creditPaidMinor: sum("paid"),
      firstNominatedAtMillis: Math.min(...group.map((facts) =>
        facts.nominator!.nominatedAt.toMillis())),
      organizers};
  }).sort((a, b) => b.creditOwedMinor - a.creditOwedMinor ||
    b.paying - a.paying || b.nominated - a.nominated);

  const factsById = new Map(input.facts.map((facts) =>
    [facts.organizerId, facts]));
  const recentFrom = monthOf(nowMillis - 90 * dayMillis);
  const priorFrom = monthOf(nowMillis - 180 * dayMillis);
  const best = [...billsByOrganizer.entries()].map(([organizerId, list]) => {
    const recent = list.filter((bill) => bill.month >= recentFrom);
    const prior = list.filter((bill) => bill.month >= priorFrom &&
      bill.month < recentFrom);
    const recentSales = recent.reduce((sum, bill) => sum + sales(bill), 0);
    const priorSales = prior.reduce((sum, bill) => sum + sales(bill), 0);
    const latest = list[list.length - 1];
    return {organizerId, name: name(organizerId),
      marketId: factsById.get(organizerId)?.marketId ?? null,
      salesMinor: recentSales,
      earnedMinor: recent.filter(billed).reduce((sum, bill) =>
        sum + bill.totalMinor, 0),
      events: recent.reduce((sum, bill) => sum + bill.sales.eventCount, 0),
      trendPercent: priorSales > 0 ?
        Math.round((recentSales - priorSales) * 100 / priorSales) : null,
      channel: factsById.get(organizerId)?.channel ?? "imported",
      payingSinceMonth: list.find((bill) => bill.status === "paid")?.month ??
        null,
      inTrial: latest.status === "free", ownTerms: latest.terms.ownTerms};
  }).filter((row) => row.salesMinor > 0 || row.earnedMinor > 0)
    .sort((a, b) => b.earnedMinor - a.earnedMinor ||
      b.salesMinor - a.salesMinor)
    .slice(0, 200);

  const firstListed = inRange.length ?
    monthOf(Math.min(...inRange.map(cohortStart))) : null;
  return {
    range: input.range, generatedAtMillis: nowMillis,
    summary: {listed: inRange.length, claimed: allClaimDays.length,
      claimMedianDays: median(allClaimDays), ranEvent: allEventDays.length,
      ranEventMedianDays: median(allEventDays),
      paying: inRange.filter((facts) => paying(facts.organizerId)).length,
      sinceMonth: firstListed},
    cohorts, claimDays: buckets, salesByMonthOnCatch,
    channels: channelRows,
    claimsByMonth: [...claimsMap.entries()].sort(([a], [b]) =>
      a.localeCompare(b)).map(([month, count]) => ({month, count})),
    adSpend: {month: lastMonth, metaMinor: meta?.amountMinor ?? null,
      metaConnected: input.costs.some((cost) => cost.source === "meta_api"),
      googleConnected: input.costs.some((cost) =>
        cost.source === "google_ads_api"),
      adClaims: inRange.filter((facts) => facts.channel === "ads" &&
        facts.milestones.claimedAt).length},
    nominators, best,
  };
}
