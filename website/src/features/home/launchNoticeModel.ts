import {homePageCopy as copy} from "@content/homePage";
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

/** The phone-only member request: the launch notice, and marketing only when ticked. */
export function launchNoticeRequest(city: string, phone: string, marketing: boolean): JoinWaitlistHTTPRequest {
  return {
    city,
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
