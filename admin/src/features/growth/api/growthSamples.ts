import type {AdminGetGrowthCallablePayload} from
  "../../../generated/contracts/adminGetGrowthCallablePayload";
import type {AdminGetGrowthCallableResponse} from
  "../../../generated/contracts/adminGetGrowthCallableResponse";
import type {AdminManageNominatorCreditsCallablePayload} from
  "../../../generated/contracts/adminManageNominatorCreditsCallablePayload";
import type {AdminManageNominatorCreditsCallableResponse} from
  "../../../generated/contracts/adminManageNominatorCreditsCallableResponse";

/**
 * Sample-mode Growth, matching the AdminGrowth, AdminGrowthChannels,
 * AdminGrowthNominators and AdminGrowthBest boards. Synthetic only.
 */
type Growth = AdminGetGrowthCallableResponse;
type Credits = AdminManageNominatorCreditsCallableResponse;
const rupees = (value: number) => value * 100;
const ist = (iso: string) => Date.parse(`${iso}+05:30`);

const cohorts: Growth["cohorts"] = [
  ["2026-06", 64, 22, 11, 12, 26], ["2026-07", 71, 19, 9, 9, 21],
  ["2026-08", 88, 24, 8, 11, 19], ["2026-09", 96, 21, 7, 7, 18],
  ["2026-10", 93, 10, 6, 2, null]].map(([month, listed, claimed, claimDays,
  ranEvent, eventDays]) => ({month: String(month), listed: Number(listed),
  claimed: Number(claimed), claimMedianDays: Number(claimDays),
  ranEvent: Number(ranEvent), ranEventMedianDays: eventDays === null ? null :
    Number(eventDays), tooEarly: month === "2026-10"}));

const spend: Growth["salesByMonthOnCatch"] = [
  ["2026-06", 12, [38, 52, 61, 70, 74, null]],
  ["2026-07", 9, [31, 44, 57, 63, null, null]],
  ["2026-08", 11, [42, 58, 66, null, null, null]],
  ["2026-09", 7, [35, 49, null, null, null, null]],
  ["2026-10", 2, [29, null, null, null, null, null]],
].map(([month, organizers, values]) => ({month: String(month),
  organizers: Number(organizers),
  salesPerOrganizerMinor: (values as Array<number | null>).map((value) =>
    value === null ? null : rupees(value * 1000))}));

function organizer(name: string, id: string, claimed: boolean,
  bill: [string, number, "sent" | "paid" | "toSend", number | null] | null,
  creditMonthIndex: number | null) {
  return {organizerId: id, name, claimed,
    latestBill: bill ? {billId: `${id}_${bill[0]}`, month: bill[0],
      totalMinor: rupees(bill[1]), status: bill[2],
      creditMinor: bill[3] === null ? null : rupees(bill[3])} : null,
    creditMonthIndex};
}

const nominators: Growth["nominators"] = [
  {uid: "sample-neha", name: "Neha Kulkarni", role: "partner", nominated: 14,
    claimed: 6, paying: 3, paidToCatchMinor: rupees(19_920),
    creditOwedMinor: rupees(1_400), creditApprovedMinor: 0,
    creditPaidMinor: rupees(560),
    firstNominatedAtMillis: ist("2026-08-04T10:00:00"), organizers: [
      organizer("Afterfly", "sample-afterfly", true,
        ["2026-10", 10_000, "paid", 1_000], 1),
      organizer("Lantern Lane Social", "sample-lantern", true,
        ["2026-10", 6_400, "sent", null], 2),
      organizer("Small World", "sample-small-world", true,
        ["2026-10", 4_000, "paid", 400], 1),
      organizer("Sunday Table", "sample-sunday-table", true, null, null)]},
  {uid: "sample-riya", name: "Riya Sharma", role: "associate", nominated: 61,
    claimed: 22, paying: 5, paidToCatchMinor: rupees(41_200),
    creditOwedMinor: 0, creditApprovedMinor: 0, creditPaidMinor: 0,
    firstNominatedAtMillis: ist("2026-06-02T10:00:00"), organizers: [
      organizer("Bhag Club", "sample-bhag", true,
        ["2026-10", 2_900, "paid", null], null)]},
  {uid: "sample-karan", name: "Karan Mehta", role: "associate", nominated: 35,
    claimed: 12, paying: 2, paidToCatchMinor: rupees(12_400),
    creditOwedMinor: 0, creditApprovedMinor: 0, creditPaidMinor: 0,
    firstNominatedAtMillis: ist("2026-06-10T10:00:00"), organizers: []},
  {uid: "sample-aditya", name: "Aditya Rao", role: "guest", nominated: 6,
    claimed: 2, paying: 1, paidToCatchMinor: rupees(3_800),
    creditOwedMinor: rupees(380), creditApprovedMinor: 0, creditPaidMinor: 0,
    firstNominatedAtMillis: ist("2026-09-12T10:00:00"), organizers: []},
  {uid: "sample-meher", name: "Meher Bhatt", role: "organizer", nominated: 4,
    claimed: 2, paying: 0, paidToCatchMinor: 0, creditOwedMinor: 0,
    creditApprovedMinor: 0, creditPaidMinor: 0,
    firstNominatedAtMillis: ist("2026-09-20T10:00:00"), organizers: []},
];

const best: Growth["best"] = [
  ["sample-afterfly", "Afterfly", "mumbai", 390_000, 19_500, 11, 61, "partner",
    "2026-10", false, false],
  ["sample-lantern", "Lantern Lane Social", "mumbai", 480_000, 19_200, 27, 24,
    "sales_associate", "2026-08", false, true],
  ["sample-padel", "Mumbai Padel Social", "mumbai", 310_000, 15_500, 19, 0,
    "imported", "2026-09", false, false],
  ["sample-bhag", "Bhag Club", "mumbai", 160_000, 8_000, 14, 12,
    "sales_associate", "2026-09", false, false],
  ["sample-harbor", "Harbor Social Club", "mumbai", 90_000, 4_500, 6, -38,
    "came_to_us", "2026-08", false, false],
  ["sample-seaside", "Seaside Sessions", "mumbai", 30_000, 0, 3, null, "ads",
    null, true, false],
].map(([organizerId, name, marketId, sales, earned, events, trend, channel,
  since, inTrial, ownTerms]) => ({organizerId: String(organizerId),
  name: String(name), marketId: String(marketId),
  salesMinor: rupees(Number(sales)), earnedMinor: rupees(Number(earned)),
  events: Number(events), trendPercent: trend === null ? null : Number(trend),
  channel: channel as Growth["best"][number]["channel"],
  payingSinceMonth: since === null ? null : String(since),
  inTrial: Boolean(inTrial), ownTerms: Boolean(ownTerms)}));

/**
 * Sample adminGetGrowth.
 * @param {AdminGetGrowthCallablePayload} payload Request.
 * @return {Growth} Growth.
 */
export function sampleGrowth(payload: AdminGetGrowthCallablePayload): Growth {
  return {range: payload.range, generatedAtMillis: ist("2026-11-04T09:00:00"),
    summary: {listed: 412, claimed: 96, claimMedianDays: 9, ranEvent: 41,
      ranEventMedianDays: 23, paying: 18, sinceMonth: "2026-06"},
    cohorts, claimDays: [{label: "0–3", count: 18}, {label: "4–7", count: 31},
      {label: "8–14", count: 26}, {label: "15–30", count: 14},
      {label: "31+", count: 7}],
    salesByMonthOnCatch: spend,
    channels: [
      {channel: "imported", listed: 214, claimed: 31, paying: 6,
        earnedMinor: rupees(21_400), costMinor: null, costKind: "none",
        detail: "Insider, Luma, District"},
      {channel: "sales_associate", listed: 96, claimed: 34, paying: 7,
        earnedMinor: rupees(28_900), costMinor: null, costKind: "salaries",
        detail: "Riya Sharma and Karan Mehta"},
      {channel: "partner", listed: 38, claimed: 14, paying: 3,
        earnedMinor: rupees(12_600), costMinor: rupees(1_260),
        costKind: "credit", detail: "4 community partners"},
      {channel: "came_to_us", listed: 41, claimed: 11, paying: 2,
        earnedMinor: rupees(6_800), costMinor: null, costKind: "none",
        detail: "Website and own sign-ups"},
      {channel: "ads", listed: 23, claimed: 6, paying: 0, earnedMinor: 0,
        costMinor: rupees(48_200), costKind: "ads",
        detail: "Meta and Google ads"}],
    claimsByMonth: [["2026-06", 22], ["2026-07", 19], ["2026-08", 24],
      ["2026-09", 21], ["2026-10", 10], ["2026-11", 2]].map(([month,
      count]) => ({month: String(month), count: Number(count)})),
    adSpend: {month: "2026-10", metaMinor: rupees(48_200),
      metaConnected: true, googleConnected: false, adClaims: 6},
    nominators, best};
}

let credits: Credits["credits"] = [
  ["sample-afterfly", "Afterfly", 10_000, 1_000, 1],
  ["sample-small-world", "Small World", 4_000, 400, 1],
].map(([organizerId, organizerName, paid, credit, monthIndex]) => ({
  schemaVersion: 1 as const, creditId: `${organizerId}_2026-10`,
  billId: `${organizerId}_2026-10`, organizerId: String(organizerId),
  organizerName: String(organizerName), nominatorUid: "sample-neha",
  nominatorRole: "partner" as const, billMonth: "2026-10",
  monthIndex: Number(monthIndex), billPaidMinor: rupees(Number(paid)),
  rateBasisPoints: 1000, creditMinor: rupees(Number(credit)),
  status: "owed" as const, approvedAtMillis: null, approvedByUid: null,
  paidAtMillis: null, paidByUid: null,
  createdAtMillis: ist("2026-11-03T10:00:00"),
  updatedAtMillis: ist("2026-11-03T10:00:00")}));

/**
 * Sample adminManageNominatorCredits, with the minimum payout rule.
 * @param {AdminManageNominatorCreditsCallablePayload} payload Request.
 * @return {Credits} Ledger.
 */
export function sampleNominatorCredits(
  payload: AdminManageNominatorCreditsCallablePayload): Credits {
  const minimum = rupees(500);
  if (payload.action !== "list") {
    const from = payload.action === "approve" ? "owed" : "approved";
    const mine = credits.filter((credit) =>
      credit.nominatorUid === payload.nominatorUid && credit.status === from);
    const sum = mine.reduce((total, credit) => total + credit.creditMinor, 0);
    if (!mine.length) throw new Error(`This nominator has no ${from} credit.`);
    if (payload.action === "approve" && sum < minimum) {
      throw new Error("Credit under the minimum payout rolls over to next " +
        "month.");
    }
    credits = credits.map((credit) => mine.includes(credit) ? {...credit,
      status: payload.action === "approve" ? "approved" : "paid",
      updatedAtMillis: Date.now()} : credit);
  }
  const byNominator = new Map<string, Credits["nominators"][number]>();
  for (const credit of credits) {
    const row = byNominator.get(credit.nominatorUid) ?? {
      nominatorUid: credit.nominatorUid, nominatorRole: credit.nominatorRole,
      owedMinor: 0, approvedMinor: 0, paidMinor: 0, payable: false,
      organizerCount: 0};
    if (credit.status === "owed") row.owedMinor += credit.creditMinor;
    if (credit.status === "approved") row.approvedMinor += credit.creditMinor;
    if (credit.status === "paid") row.paidMinor += credit.creditMinor;
    row.organizerCount++;
    row.payable = row.owedMinor >= minimum;
    byNominator.set(credit.nominatorUid, row);
  }
  return {minimumPayoutMinor: minimum, nominators: [...byNominator.values()],
    credits};
}
