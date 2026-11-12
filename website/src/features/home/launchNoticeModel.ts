import {homePageCopy as copy} from "@content/homePage";
import {websiteCities} from "@content/markets";
import type {CitySource} from "./cityChoice";
import {
  parseJoinWaitlistHttpResponse,
  type JoinWaitlistHTTPRequest,
  type JoinWaitlistHTTPResponse,
} from "../../shared/api/joinWaitlistContract";

export type LaunchNoticeReceipt = Extract<JoinWaitlistHTTPResponse, {ok: true}>;

/**
 * A typed mobile number as E.164, or null. A number without a dialling code
 * takes the market's, after dropping the trunk zero people often type.
 */
export function launchNoticePhone(input: string, dialCode: string): string | null {
  const typed = input.replace(/[\s().-]/gu, "");
  const phone = typed.startsWith("+") ? typed :
    typed.startsWith("00") ? `+${typed.slice(2)}` :
      `${dialCode}${typed.replace(/^0/u, "")}`;
  return /^\+[1-9][0-9]{7,14}$/u.test(phone) ? phone : null;
}

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
