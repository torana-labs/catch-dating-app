import {httpsCallable} from "firebase/functions";
import {loadAdminCallableValidators} from
  "../../../generated/validators/adminCallableValidators";
import type {AdminGetMarketplaceCallablePayload} from
  "../../../generated/contracts/adminGetMarketplaceCallablePayload";
import type {AdminGetMarketplaceCallableResponse} from
  "../../../generated/contracts/adminGetMarketplaceCallableResponse";
import {dataMode} from "../../../shared/api/dataMode";
import {functions} from "../../../shared/api/firebaseFunctions";

export type Marketplace = AdminGetMarketplaceCallableResponse;
export type MarketplaceRange = AdminGetMarketplaceCallablePayload["rangeDays"];

/** The Marketplace for a range, optionally one city. */
export async function loadMarketplace(rangeDays: MarketplaceRange,
  marketId: string | null): Promise<Marketplace> {
  const payload: AdminGetMarketplaceCallablePayload = {rangeDays, marketId};
  if (dataMode() === "sample") {
    await new Promise((resolve) => window.setTimeout(resolve, 120));
    return sampleMarketplace(payload);
  }
  const {validateAdminCallableRequest, validateAdminCallableResponse} =
    await loadAdminCallableValidators("adminGetMarketplace");
  validateAdminCallableRequest("adminGetMarketplace", payload);
  const response = await httpsCallable<AdminGetMarketplaceCallablePayload,
    Marketplace>(functions, "adminGetMarketplace")(payload);
  validateAdminCallableResponse("adminGetMarketplace", response.data);
  return response.data;
}

// Sample mode: the AdminNumbers board. Synthetic only.
export function sampleMarketplace(payload: AdminGetMarketplaceCallablePayload):
  Marketplace {
  const cities: Marketplace["cities"] = [
    {marketId: "mumbai", organizersLive: 51, eventsPerWeek: 41,
      filledPercent: 81, noShowPercent: 8, waitlisted: 212},
    {marketId: "indore", organizersLive: 13, eventsPerWeek: 7,
      filledPercent: 58, noShowPercent: 14, waitlisted: 9},
    {marketId: "pune", organizersLive: 0, eventsPerWeek: 0,
      filledPercent: null, noShowPercent: null, waitlisted: 0},
  ].filter((city) => !payload.marketId || city.marketId === payload.marketId);
  return {rangeDays: payload.rangeDays, marketId: payload.marketId,
    available: true, unavailableReason: null,
    generatedAtMillis: Date.parse("2026-11-04T09:00:00+05:30"),
    stats: {eventsThisWeek: 48, eventsLastWeek: 39, filledPercent: 78,
      noShowPercent: 9, cameBackPercent: 41},
    cities,
    guestCohorts: [["2026-07", 410, 38, 47, 52], ["2026-08", 520, 41, 50, 55],
      ["2026-09", 610, 43, 51, null], ["2026-10", 702, 36, null, null]]
      .map(([month, guests, again30, again60, again90]) => ({
        month: String(month), guests: Number(guests),
        again30Percent: again30 as number | null,
        again60Percent: again60 as number | null,
        again90Percent: again90 as number | null})),
    bookingsByWeek: [["2026-09-28", 188], ["2026-10-05", 214],
      ["2026-10-12", 241], ["2026-10-19", 265], ["2026-10-26", 312],
      ["2026-11-02", 96]].map(([weekStart, bookings], index, all) => ({
      weekStart: String(weekStart), bookings: Number(bookings),
      partial: index === all.length - 1})),
    goingQuiet: [
      {organizerId: "sample-harbor", name: "Harbor Social Club",
        marketId: "mumbai", daysSinceLastEvent: 36, eventsPerMonthBefore: 4,
        salesOwnerUid: "sample-riya", salesOwnerName: "Riya Sharma"},
      {organizerId: "sample-after-fly-indore", name: "AFTER FLY",
        marketId: "indore", daysSinceLastEvent: 41, eventsPerMonthBefore: 2.3,
        salesOwnerUid: "sample-karan", salesOwnerName: "Karan Mehta"}]};
}
