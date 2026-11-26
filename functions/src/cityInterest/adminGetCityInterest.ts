import * as admin from "firebase-admin";
import {HttpsError, type CallableRequest} from
  "firebase-functions/v2/https";
import {canonicalMarkets} from "../locations/marketConfig";
import {checkRateLimit} from "../shared/rateLimit";
import type {CityInterestDocument} from
  "../shared/generated/firestoreAdminTypes";
import type {AdminGetCityInterestCallablePayload as Payload} from
  "../shared/generated/adminGetCityInterestCallablePayload";
import type {AdminGetCityInterestCallableResponse as Result} from
  "../shared/generated/adminGetCityInterestCallableResponse";
import {validateAdminGetCityInterestCallablePayload} from
  "../shared/generated/validators/adminGetCityInterestInput";
import {validateAdminGetCityInterestCallableResponse} from
  "../shared/generated/validators/adminGetCityInterestOutput";
import {CITY_INTEREST_COLLECTION, utcDay} from "./cityInterest";
import {
  callableWithLimits,
  type CallableContext,
  type CallableSpec,
  runCallable,
} from "../platform/callables/callable";
import {adminRoles} from "../platform/callables/policies";
import type {AdminContext} from "../platform/adminAuth";

type Window = Result["totals"];
const dayMillis = 24 * 60 * 60 * 1000;

/**
 * Sums a city's first requests over its windows, ending today (UTC).
 * @param {Record<string, number>} daily First requests by UTC day.
 * @param {number} total All first requests.
 * @param {number} nowMillis Now.
 * @return {Window} The windows.
 */
export function interestWindow(daily: Record<string, number>, total: number,
  nowMillis: number): Window {
  const day = (offset: number) =>
    utcDay(new Date(nowMillis - offset * dayMillis));
  const sum = (from: number, to: number) => {
    let count = 0;
    for (let offset = from; offset < to; offset += 1) {
      count += daily[day(offset)] ?? 0;
    }
    return count;
  };
  return {total, last7: sum(0, 7), previous7: sum(7, 14),
    last30: sum(0, 30), previous30: sum(30, 60)};
}

/**
 * Interest by city from the counter documents: catalog cities by label,
 * the rest as their country's Other, busiest first.
 * @param {CityInterestDocument[]} documents The cityInterest documents.
 * @param {number} nowMillis Now.
 * @return {Result} The response.
 */
export function buildCityInterest(documents: CityInterestDocument[],
  nowMillis: number): Result {
  const cities = documents.map((document) => {
    const market = canonicalMarkets.find((entry) =>
      entry.marketId === document.cityId);
    const country = document.countryIsoCode ?
      canonicalMarkets.find((entry) =>
        entry.countryIsoCode === document.countryIsoCode)?.countryName ??
        document.countryIsoCode : null;
    return {
      cityKey: document.cityKey,
      cityId: document.cityId ?? null,
      label: market?.label ?? (country ? `Other (${country})` : "Other"),
      countryIsoCode: document.countryIsoCode ?? null,
      lifecycle: market?.lifecycle ?? null,
      interest: interestWindow(document.daily ?? {}, document.total ?? 0,
        nowMillis),
    };
  }).sort((left, right) => right.interest.total - left.interest.total ||
    left.label.localeCompare(right.label));
  const totals = cities.reduce<Window>((sum, city) => ({
    total: sum.total + city.interest.total,
    last7: sum.last7 + city.interest.last7,
    previous7: sum.previous7 + city.interest.previous7,
    last30: sum.last30 + city.interest.last30,
    previous30: sum.previous30 + city.interest.previous30,
  }), {total: 0, last7: 0, previous7: 0, last30: 0, previous30: 0});
  return {generatedAtMillis: nowMillis, today: utcDay(new Date(nowMillis)),
    totals, cities};
}

/**
 * An admin reads waitlist interest by city.
 * Policy: ["admin", "adminOwner"] as const (STR-10).
 * @return {CallableSpec} The callable.
 */
export function adminGetCityInterestSpec():
  CallableSpec<Payload, AdminContext, Result> {
  return {
    name: "adminGetCityInterest",
    policy: adminRoles(["admin", "adminOwner"] as const),
    input: validateAdminGetCityInterestCallablePayload,
    handle: (context) => adminGetCityInterestWork(context),
  };
}

/** The deployed path of adminGetCityInterest, for tests. */
export function adminGetCityInterestHandler(
  request: CallableRequest<unknown>):
  Promise<Result> {
  return runCallable(adminGetCityInterestSpec(), request);
}

async function adminGetCityInterestWork(
  {actor}: CallableContext<Payload, AdminContext>):
  Promise<Result> {
  const db = admin.firestore();
  await checkRateLimit(db, actor.uid, "adminGetCityInterest",
    {maxRequests: 30, windowMs: 60 * 1000});
  // One document per city: a few hundred at most.
  const snapshot = await db.collection(CITY_INTEREST_COLLECTION)
    .limit(500).get();
  const result = buildCityInterest(snapshot.docs.map((doc) =>
    doc.data() as CityInterestDocument), Date.now());
  if (!validateAdminGetCityInterestCallableResponse(result)) {
    throw new HttpsError("internal", "Interest by city could not be read.");
  }
  return result;
}

export const adminGetCityInterest = callableWithLimits(
  {timeoutSeconds: 60, maxInstances: 5},
  adminGetCityInterestSpec());
