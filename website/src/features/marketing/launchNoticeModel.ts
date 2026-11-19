import {homePageCopy as copy} from "@content/homePage";
import {websiteCities} from "@content/markets";
import {
  parseJoinWaitlistHttpResponse,
  type JoinWaitlistHTTPRequest,
  type JoinWaitlistHTTPResponse,
} from "../../shared/api/joinWaitlistContract";

export type LaunchNoticeReceipt = Extract<JoinWaitlistHTTPResponse, {ok: true}>;

/** How the site came to its city, as the waitlist contract records it (features/home/cityChoice's CitySource). */
type CitySource = NonNullable<JoinWaitlistHTTPRequest["citySource"]>;

/** Which catalog city the notice is for, and how the site reached it. */
export interface LaunchNoticePlace {
  readonly slug: string;
  readonly source?: CitySource;
}

/**
 * The phone-only member request: the launch notice, and marketing only when
 * ticked. A listed city also sends its catalog id and country, and how the
 * site reached it, so interest counts by city; `city` keeps the label older
 * readers use.
 */
export function launchNoticeRequest(city: string, phone: string, marketing: boolean, place?: LaunchNoticePlace): JoinWaitlistHTTPRequest {
  const listed = place ? websiteCities.find((item) => item.slug === place.slug) : undefined;
  return {
    city,
    ...(listed ? {cityId: listed.id, countryIsoCode: listed.countryIsoCode, ...(place?.source ? {citySource: place.source} : {})} : {}),
    role: "member",
    website: "",
    whatsapp: {phone, launchNotice: true, marketing, consentVersion: copy.notice.consentVersion},
  };
}

/**
 * The guest app's "Get notified" request: one WhatsApp message when the app
 * is on the stores, and new plans in the city only when ticked. It is its own
 * consent purpose (appLaunchNotice), never the city-opening notice.
 */
export function appNoticeRequest(city: string, phone: string, newPlans: boolean, place?: LaunchNoticePlace): JoinWaitlistHTTPRequest {
  const base = launchNoticeRequest(city, phone, false, place);
  return {...base, whatsapp: {phone, launchNotice: true, notice: "appLaunch", newPlans, marketing: false,
    consentVersion: copy.app.notify.consentVersion}};
}

/** Posts the request to the site's waitlist route and returns the accepted receipt. */
export async function postLaunchNotice(body: JoinWaitlistHTTPRequest): Promise<LaunchNoticeReceipt> {
  const response = await fetch("/api/join-waitlist", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify(body),
  });
  const data = parseJoinWaitlistHttpResponse(await response.json().catch(() => ({})));
  if (!response.ok || !("ok" in data)) throw new Error("error" in data ? data.error : copy.notice.failed);
  return data;
}
