import {cityAlertsCopy as copy} from "@content/discovery/cityAlerts";
import {websiteCities} from "@content/markets";
import {
  parseJoinWaitlistHttpResponse,
  type JoinWaitlistHTTPRequest,
  type JoinWaitlistHTTPResponse,
} from "../../shared/api/joinWaitlistContract";
import type {DiscoveryFormatKey} from "./discoveryTypes";

type LeadRequest = NonNullable<JoinWaitlistHTTPRequest["lead"]>;
/** A format chip of the city_alerts lead: what kinds of plan the person wants to hear about. */
export type CityAlertInterest = NonNullable<LeadRequest["cityAlerts"]>["interests"][number];
export type CityAlertReceipt = Extract<JoinWaitlistHTTPResponse, {ok: true}>;

/**
 * The lead's interest for each city-by-format page. Racket sports share one
 * chip; outdoors has none in the contract, so its page sends no interest
 * (an empty list is valid) rather than a wrong one.
 */
export const cityAlertInterestByFormat: Readonly<Record<DiscoveryFormatKey, CityAlertInterest | null>> = {
  runClubs: "runs",
  racketSports: "courts",
  pickleball: "courts",
  padel: "courts",
  tennis: "courts",
  badminton: "courts",
  supperClubs: "dinners",
  quizNights: "quizzes",
  nightlife: "nights_out",
  studios: "fitness",
  workshops: "workshops",
  bookClubs: "books",
  outdoors: null,
};

/** The interests for a set of formats, each once, in the contract's order. */
export function cityAlertInterests(formats: readonly DiscoveryFormatKey[]): CityAlertInterest[] {
  const chosen = new Set(formats.map((format) => cityAlertInterestByFormat[format]).filter((item): item is CityAlertInterest => item !== null));
  const order: CityAlertInterest[] = ["runs", "courts", "dinners", "quizzes", "nights_out", "fitness", "workshops", "books"];
  return order.filter((interest) => chosen.has(interest));
}

/** The capture band's anchor, which every page's "Get notified" action points at. */
export const cityAlertsAnchor = "notify";

/** Where the form sits: the page path without query or fragment, and which form on it. */
export interface CityAlertPlace {
  readonly citySlug: string;
  readonly cityLabel: string;
  readonly sourcePage: string;
  readonly entry: string;
}

/** The path the lead says it came from: the pathname alone, as the contract asks. */
export function cityAlertSourcePage(pathname: string): string {
  const path = pathname.split(/[?#]/u)[0] || "/";
  return path.startsWith("/") ? path.slice(0, 512) : `/${path}`.slice(0, 512);
}

/**
 * The city_alerts website lead: the WhatsApp number, the cityNewPlans consent
 * and its wording's version, the page and form, and the interests. A listed
 * city also sends its catalog id and country so the lead counts by city.
 * `website` is the honeypot every website form sends empty.
 */
export function cityAlertRequest(place: CityAlertPlace, phone: string, requestId: string,
  interests: readonly CityAlertInterest[]): JoinWaitlistHTTPRequest {
  const listed = websiteCities.find((item) => item.slug === place.citySlug);
  return {
    requestKind: "city_alerts",
    city: place.cityLabel,
    ...(listed ? {cityId: listed.id, countryIsoCode: listed.countryIsoCode} : {}),
    website: "",
    lead: {
      requestId,
      phone,
      consent: {purpose: "cityNewPlans", version: copy.consentVersion},
      sourcePage: place.sourcePage,
      entry: place.entry,
      cityAlerts: {interests: [...interests]},
    },
  };
}

/**
 * A request id for one submission, reused if the same submission is retried
 * so the backend returns the same lead. 32 hex characters fit the contract.
 */
export function cityAlertRequestId(random: () => string = () => globalThis.crypto.randomUUID()): string {
  return random().replace(/-/gu, "");
}

/** Supplies the App Check token the lead endpoint asks for, or null where the site has none. */
export type CityAlertAppCheck = () => Promise<string | null>;

/** Posts the lead to the site's waitlist route and returns the accepted receipt. */
export async function postCityAlert(body: JoinWaitlistHTTPRequest, appCheck?: CityAlertAppCheck): Promise<CityAlertReceipt> {
  const token = appCheck ? await appCheck().catch(() => null) : null;
  const response = await fetch("/api/join-waitlist", {
    method: "POST",
    headers: {"Content-Type": "application/json", ...(token ? {"X-Firebase-AppCheck": token} : {})},
    body: JSON.stringify(body),
  });
  const data = parseJoinWaitlistHttpResponse(await response.json().catch(() => ({})));
  if (!response.ok || !("ok" in data)) throw new Error("error" in data ? data.error : copy.failed);
  return data;
}
