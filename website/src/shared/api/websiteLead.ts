import {catchPhoneE164, type CatchPhoneCountryCode} from "@catch/web-ui/phone";
import {
  parseJoinWaitlistHttpResponse,
  type JoinWaitlistHTTPRequest,
} from "./joinWaitlistContract";

/**
 * The website lead client: the short forms on the marketing pages (send me
 * the guide, book a walkthrough, refer a host, new plans in my city and so
 * on) post a typed lead to /api/join-waitlist. See "Website Leads" in
 * docs/data_contracts.md and functions/src/waitlist/websiteLead.ts.
 *
 * This module owns no copy: each outcome names its state, and the caller
 * supplies the words for it from the content layer.
 */

type LeadFields = NonNullable<JoinWaitlistHTTPRequest["lead"]>;

/** Which form a lead came from, as the contract names it. */
export type WebsiteLeadKind = NonNullable<JoinWaitlistHTTPRequest["requestKind"]>;

/** Each kind's answers: the one payload object the lead carries. */
export interface WebsiteLeadAnswers {
  guide: NonNullable<LeadFields["guide"]>;
  walkthrough: NonNullable<LeadFields["walkthrough"]>;
  demo: NonNullable<LeadFields["demo"]>;
  venue: NonNullable<LeadFields["venue"]>;
  story: NonNullable<LeadFields["story"]>;
  referral: NonNullable<LeadFields["referral"]>;
  org_contact: NonNullable<LeadFields["orgContact"]>;
  city_alerts: NonNullable<LeadFields["cityAlerts"]>;
}

/** The lead property that carries each kind's answers. */
const payloadKeys = {
  guide: "guide",
  walkthrough: "walkthrough",
  demo: "demo",
  venue: "venue",
  story: "story",
  referral: "referral",
  org_contact: "orgContact",
  city_alerts: "cityAlerts",
} as const satisfies {[Kind in WebsiteLeadKind]: keyof LeadFields};

/** Kinds the contract refuses without the person's name. */
type NamedKind = "walkthrough" | "demo" | "referral";

type CityFields = Pick<JoinWaitlistHTTPRequest,
  "city" | "cityId" | "countryIsoCode" | "citySource" | "cityOther">;

/**
 * One filled-in lead form. The number is as typed; the client normalises it.
 * `consentVersion` names the consent wording the form showed. A walkthrough,
 * demo or referral needs the person's name, and city alerts need the city.
 */
export type WebsiteLeadForm<Kind extends WebsiteLeadKind = WebsiteLeadKind> = {
  [K in Kind]: {
    readonly kind: K;
    readonly phone: string;
    readonly consentVersion: string;
    /** Set only when the form's unticked new-plans box was ticked: that box's wording, stored as its own cityNewPlans consent. */
    readonly newPlansConsentVersion?: string;
    /** The page the form is on; any query or fragment is dropped. */
    readonly sourcePage: string;
    /** Which form on the page, such as the design's form id (rc-wa). */
    readonly entry: string;
    readonly answers: WebsiteLeadAnswers[K];
    /** The hidden honeypot field's value, which people leave empty. */
    readonly honeypot?: string;
  } & (K extends NamedKind ? {readonly fullName: string} : {readonly fullName?: string})
    & (K extends "city_alerts" ? Readonly<CityFields> & {readonly city: string} : Readonly<CityFields>)
}[Kind];

/** The states a lead can fail in, which the caller words. */
export const websiteLeadProblems = ["invalid_phone", "invalid", "refresh", "changed", "busy", "failed"] as const;
export type WebsiteLeadProblem = typeof websiteLeadProblems[number];
export type WebsiteLeadMessages = Readonly<Record<WebsiteLeadProblem, string>>;

/** What happened to a submission. A send never throws. */
export type WebsiteLeadOutcome =
  | {readonly status: "sent"; readonly leadId: string | null; readonly isNew: boolean}
  | {readonly status: WebsiteLeadProblem; readonly message: string};

/** The page path the lead says it came from: the pathname alone, as the contract asks. */
export function websiteLeadSourcePage(path: string): string {
  const pathname = path.split(/[?#]/u)[0] || "/";
  return (pathname.startsWith("/") ? pathname : `/${pathname}`).slice(0, 512);
}

/** A request id for one submission: 32 hex characters, which the contract accepts. */
export function websiteLeadRequestId(random: () => string = () => globalThis.crypto.randomUUID()): string {
  return random().replace(/-/gu, "");
}

function textOrAbsent(value: string | undefined): string | undefined {
  const text = value?.trim().replace(/\s+/gu, " ");
  return text ? text : undefined;
}

/**
 * The join-waitlist body for one lead form: the requestKind, the lead's
 * shared fields with the consent purpose its kind takes (cityNewPlans for
 * city alerts, leadFollowUp otherwise), the ticked new-plans box as a second
 * cityNewPlans consent, and exactly one payload named for the kind. The phone
 * must already be E.164.
 */
export function websiteLeadRequest(form: WebsiteLeadForm, phone: string, requestId: string): JoinWaitlistHTTPRequest {
  const fullName = textOrAbsent(form.fullName);
  const city = textOrAbsent(form.city);
  const cityOther = textOrAbsent(form.cityOther);
  return {
    requestKind: form.kind,
    ...(fullName ? {fullName} : {}),
    ...(city ? {city} : {}),
    ...(form.cityId !== undefined ? {cityId: form.cityId} : {}),
    ...(form.countryIsoCode ? {countryIsoCode: form.countryIsoCode} : {}),
    ...(form.citySource ? {citySource: form.citySource} : {}),
    ...(cityOther ? {cityOther} : {}),
    website: form.honeypot ?? "",
    lead: {
      requestId,
      phone,
      consent: {purpose: form.kind === "city_alerts" ? "cityNewPlans" : "leadFollowUp", version: form.consentVersion},
      ...(form.newPlansConsentVersion && form.kind !== "city_alerts" ?
        {newPlansConsent: {purpose: "cityNewPlans" as const, version: form.newPlansConsentVersion}} : {}),
      sourcePage: websiteLeadSourcePage(form.sourcePage),
      entry: form.entry,
      [payloadKeys[form.kind]]: form.answers,
    },
  };
}

/** The site's App Check token, loaded with Firebase only when a lead is sent. */
async function siteAppCheckToken(): Promise<string | null> {
  return (await import("../../firebase")).getWebsiteAppCheckToken();
}

/** The signed-in account's ID token, loaded with Firebase Auth only when a referral is sent. */
async function siteReferrerIdToken(): Promise<string | null> {
  return (await import("../../firebase")).getWebsiteReferrerIdToken();
}

export interface WebsiteLeadSubmissionOptions {
  /** The words for each failure state, from the content layer. */
  readonly messages: WebsiteLeadMessages;
  /** The country a number typed without a dialling code is read in, such as "IN". */
  readonly phoneCountry: CatchPhoneCountryCode;
  /** Supplies the X-Firebase-AppCheck token; the site's by default. */
  readonly appCheckToken?: () => Promise<string | null>;
  /**
   * Supplies the signed-in account's Firebase ID token for a referral, sent as
   * `Authorization: Bearer` so the intake credits the referrer; null when no
   * one is signed in, and the referral goes without it. The site's by
   * default. Other kinds never ask for it.
   */
  readonly referrerIdToken?: () => Promise<string | null>;
  readonly post?: typeof fetch;
  readonly newRequestId?: () => string;
}

export interface WebsiteLeadSubmission {
  /** Sends the form. A retry of the same answers reuses its request id. */
  submit(form: WebsiteLeadForm): Promise<WebsiteLeadOutcome>;
  /** Forgets the request id, so the next send is a new lead. */
  reset(): void;
}

const problemByStatus: Readonly<Record<number, WebsiteLeadProblem>> = {
  400: "invalid",
  401: "refresh",
  409: "changed",
  429: "busy",
};

/**
 * One lead form's submissions. It makes a request id per submission and
 * keeps it while the answers stay the same, so a retry after a failure or a
 * lost response is the same lead (the backend returns its receipt) rather
 * than a second one. Changed answers are a new submission with a new id.
 * Every send carries the App Check token the lead intake requires, and a
 * referral also carries the signed-in referrer's ID token when there is one.
 */
export function createWebsiteLeadSubmission(options: WebsiteLeadSubmissionOptions): WebsiteLeadSubmission {
  const {messages, phoneCountry, appCheckToken = siteAppCheckToken, referrerIdToken = siteReferrerIdToken,
    post = (...args) => fetch(...args), newRequestId = () => websiteLeadRequestId()} = options;
  let current: {signature: string; requestId: string} | null = null;
  const problem = (status: WebsiteLeadProblem): WebsiteLeadOutcome => ({status, message: messages[status]});

  return {
    reset() {
      current = null;
    },
    async submit(form) {
      const phone = catchPhoneE164(form.phone, phoneCountry);
      if (!phone) return problem("invalid_phone");
      const signature = JSON.stringify(websiteLeadRequest(form, phone, ""));
      if (current?.signature !== signature) current = {signature, requestId: newRequestId()};
      const body = websiteLeadRequest(form, phone, current.requestId);
      const token = await appCheckToken().catch(() => null);
      const idToken = form.kind === "referral" ? await referrerIdToken().catch(() => null) : null;
      let response: Response;
      try {
        response = await post("/api/join-waitlist", {
          method: "POST",
          headers: {"Content-Type": "application/json", ...(token ? {"X-Firebase-AppCheck": token} : {}),
            ...(idToken ? {Authorization: `Bearer ${idToken}`} : {})},
          body: JSON.stringify(body),
        });
      } catch {
        return problem("failed");
      }
      if (!response.ok) {
        // The stored lead has other answers under this id; the next send starts afresh.
        if (response.status === 409) current = null;
        return problem(problemByStatus[response.status] ?? "failed");
      }
      try {
        const data = parseJoinWaitlistHttpResponse(await response.json());
        if (!("ok" in data)) return problem("failed");
        return {status: "sent", leadId: data.lead?.leadId ?? null, isNew: data.lead?.isNew ?? true};
      } catch {
        return problem("failed");
      }
    },
  };
}
