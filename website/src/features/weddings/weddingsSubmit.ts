import {createMarketingEventId, trackMarketingEvent, waitlistAnalyticsPayload} from "../../analytics";
import {
  parseJoinWaitlistHttpResponse,
  type JoinWaitlistHTTPRequest,
} from "../../shared/api/joinWaitlistContract";
import type {WeddingsApplication, WeddingsSubmit} from "./weddingsModel";

const failed = "We couldn't send your application. Please try again.";

/** The planner's WhatsApp number as E.164: the page fixes the +91 prefix. */
export function weddingsPhone(phone: string) {
  return `+91${phone.replace(/\D+/gu, "")}`;
}

/**
 * The weddings pilot application as a phone-only Host application with its
 * programme answers. The planner gives a WhatsApp number and no email.
 */
export function weddingsApplicationRequest(
  application: WeddingsApplication,
): Omit<JoinWaitlistHTTPRequest, "analytics" | "attribution" | "hostMeasurement"> {
  const destination = application.destination.trim();
  const lastTime = application.lastTime.trim();
  return {
    fullName: application.name.trim(),
    phone: weddingsPhone(application.phone),
    city: destination,
    role: "host",
    website: "",
    programme: "weddings",
    programmeApplication: {
      applicantRole: application.who,
      programmeKind: application.what,
      ...(application.company.trim() ? {planningCompany: application.company.trim()} : {}),
      city: destination,
      weddingDate: application.date,
      headcount: application.guests,
      tools: [...application.tools],
      functions: application.functions,
      hotels: application.hotels,
      teamSize: application.team,
      flyingInShare: application.flying,
      wants: [...application.wants],
      ...(lastTime ? {freeText: lastTime} : {}),
      source: application.heard,
    },
  };
}

/**
 * The intake front door for /weddings/apply/: posts to the site's waitlist
 * route. A retry of the same answers reuses its request id, so the server
 * coalesces it instead of filing a second application.
 */
export function createWeddingsSubmit(post: typeof fetch = (...args) => fetch(...args)): WeddingsSubmit {
  let last: {signature: string; eventId: string} | null = null;
  return async (application) => {
    const packet = weddingsApplicationRequest(application);
    const signature = JSON.stringify(packet);
    if (last?.signature !== signature) last = {signature, eventId: createMarketingEventId("weddings_lead")};
    const body: JoinWaitlistHTTPRequest = {...packet, ...waitlistAnalyticsPayload(last.eventId, "host")};
    const response = await post("/api/join-waitlist", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify(body),
    });
    const data = parseJoinWaitlistHttpResponse(await response.json().catch(() => ({})));
    if (!response.ok || !("ok" in data)) throw new Error("error" in data ? data.error : failed);
    last = null;
    trackMarketingEvent("generate_lead", {city: body.city, event_id: body.analytics?.eventId, form_variant: "host", lead_type: "weddings"});
  };
}

export const submitWeddingsApplication = createWeddingsSubmit();
