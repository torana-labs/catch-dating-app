import {httpsCallable} from "firebase/functions";
import {loadAdminCallableValidators} from
  "../../../generated/validators/adminCallableValidators";
import type {AdminGetCityInterestCallablePayload} from
  "../../../generated/contracts/adminGetCityInterestCallablePayload";
import type {AdminGetCityInterestCallableResponse} from
  "../../../generated/contracts/adminGetCityInterestCallableResponse";
import {dataMode} from "../../../shared/api/dataMode";
import {functions} from "../../../shared/api/firebaseFunctions";
import {generatedMarketCities} from "../../../shared/config/generated/marketCatalog";

export type CityInterest = AdminGetCityInterestCallableResponse;

/** Waitlist interest by city. */
export async function loadCityInterest(): Promise<CityInterest> {
  const payload: AdminGetCityInterestCallablePayload = {};
  if (dataMode() === "sample") {
    await new Promise((resolve) => window.setTimeout(resolve, 120));
    return sampleCityInterest();
  }
  const {validateAdminCallableRequest, validateAdminCallableResponse} =
    await loadAdminCallableValidators("adminGetCityInterest");
  validateAdminCallableRequest("adminGetCityInterest", payload);
  const response = await httpsCallable<AdminGetCityInterestCallablePayload,
    CityInterest>(functions, "adminGetCityInterest")(payload);
  validateAdminCallableResponse("adminGetCityInterest", response.data);
  return response.data;
}

const span = (total: number, last7: number, previous7: number, last30: number, previous30: number) =>
  ({total, last7, previous7, last30, previous30});

// Sample mode. Synthetic counts over the catalog's public waitlist cities.
const sampleCounts: Array<Parameters<typeof span>> = [
  [184, 31, 22, 96, 61], [143, 18, 25, 70, 52], [121, 20, 20, 64, 40], [58, 6, 9, 27, 18],
];

export function sampleCityInterest(): CityInterest {
  const waiting = generatedMarketCities.filter((city) => city.websiteListed && city.lifecycle === "waitlist")
    .slice(0, sampleCounts.length);
  const cities: CityInterest["cities"] = [
    ...waiting.map((city, index) => ({cityKey: city.marketId, cityId: city.marketId, label: city.label,
      countryIsoCode: city.countryIsoCode, lifecycle: city.lifecycle, interest: span(...sampleCounts[index]!)})),
    {cityKey: "other-in", cityId: null, label: "Other (India)", countryIsoCode: "IN", lifecycle: null,
      interest: span(37, 4, 3, 15, 12)},
  ];
  const totals = cities.reduce((sum, city) => span(sum.total + city.interest.total, sum.last7 + city.interest.last7,
    sum.previous7 + city.interest.previous7, sum.last30 + city.interest.last30, sum.previous30 + city.interest.previous30),
  span(0, 0, 0, 0, 0));
  return {generatedAtMillis: Date.parse("2026-11-12T09:00:00Z"), today: "2026-11-12", totals, cities};
}
