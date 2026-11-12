import {httpsCallable} from "firebase/functions";
import {loadAdminCallableValidators} from
  "../../../generated/validators/adminCallableValidators";
import type {AdminGetCityInterestCallablePayload} from
  "../../../generated/contracts/adminGetCityInterestCallablePayload";
import type {AdminGetCityInterestCallableResponse} from
  "../../../generated/contracts/adminGetCityInterestCallableResponse";
import {dataMode} from "../../../shared/api/dataMode";
import {functions} from "../../../shared/api/firebaseFunctions";

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

// Sample mode. Synthetic only.
export function sampleCityInterest(): CityInterest {
  const cities: CityInterest["cities"] = [
    {cityKey: "in-mh-pune", cityId: "in-mh-pune", label: "Pune", countryIsoCode: "IN", lifecycle: "waitlist",
      interest: span(184, 31, 22, 96, 61)},
    {cityKey: "in-ka-bengaluru", cityId: "in-ka-bengaluru", label: "Bengaluru", countryIsoCode: "IN", lifecycle: "waitlist",
      interest: span(143, 18, 25, 70, 52)},
    {cityKey: "in-dl-delhi-ncr", cityId: "in-dl-delhi-ncr", label: "Delhi NCR", countryIsoCode: "IN", lifecycle: "waitlist",
      interest: span(121, 20, 20, 64, 40)},
    {cityKey: "in-tg-hyderabad", cityId: "in-tg-hyderabad", label: "Hyderabad", countryIsoCode: "IN", lifecycle: "waitlist",
      interest: span(58, 6, 9, 27, 18)},
    {cityKey: "other-in", cityId: null, label: "Other (India)", countryIsoCode: "IN", lifecycle: null,
      interest: span(37, 4, 3, 15, 12)},
  ];
  const totals = cities.reduce((sum, city) => span(sum.total + city.interest.total, sum.last7 + city.interest.last7,
    sum.previous7 + city.interest.previous7, sum.last30 + city.interest.last30, sum.previous30 + city.interest.previous30),
  span(0, 0, 0, 0, 0));
  return {generatedAtMillis: Date.parse("2026-11-12T09:00:00Z"), today: "2026-11-12", totals, cities};
}
