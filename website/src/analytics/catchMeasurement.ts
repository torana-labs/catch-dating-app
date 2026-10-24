/** Catch acquisition boundary. This module never reads the DOM or the local bus. */
export const catchMeasurementVersion = 1 as const;
export type AcquisitionForm = "member_waitlist" | "host_lead" | "host_application" | "claim";
export interface MeasurementConsent {
  version: number;
  analytics: boolean;
  marketing: boolean;
  updatedAt: string;
}

const routes = {
  "/": "home", "/host/": "host", "/host/overview/": "host_overview",
  "/host/platform/": "host_platform", "/host/planners/": "host_planners",
  "/host/clubs/": "host_clubs", "/host/directory/": "host_directory",
  "/claim/": "claim", "/host/claim/": "claim", "/host/apply/": "host_application",
  "/host/stack/": "host_stack", "/host/workflows/": "host_workflows",
} as const;
export type AcquisitionRoute = keyof typeof routes;
export function acquisitionRoute(path: string): AcquisitionRoute | null {
  if (typeof path !== "string") return null;
  const normalized = path === "/" ? path : `${path.replace(/\/$/u, "")}/`;
  return Object.hasOwn(routes, normalized) ? normalized as AcquisitionRoute : null;
}

// Closed campaign vocabulary; expand only with a reviewed campaign, never query text.
const campaignLabels: Record<string, readonly string[]> = {
  utm_source: ["google", "meta", "newsletter", "catch", "partner"],
  utm_medium: ["cpc", "paid_social", "email", "organic", "referral"],
  utm_campaign: ["launch", "launch_2026", "planner_launch", "host_acquisition_2026", "synthetic_launch"],
  utm_content: ["host_hero", "host_footer", "claim_cta", "application_cta"],
};
export function approvedCampaignLabels(values: Record<string, unknown>) {
  const safe: Record<string, string> = {};
  for (const [key, labels] of Object.entries(campaignLabels)) {
    const value = values[key];
    if (typeof value === "string" && labels.includes(value)) safe[key] = value;
  }
  return safe;
}

export type CatchAcquisitionEvent =
  | {name: "page_view"; visitId: string}
  | {name: "cta_click"; target: AcquisitionRoute}
  | {name: "acquisition_start"; form: AcquisitionForm}
  | {name: "lead_accepted"; form: Exclude<AcquisitionForm, "claim">;
      eventId: string; receipt: {ok: true; alreadyJoined: false}}
  | {name: "organizer_signup"; eventId: string;
      receipt: {authority: "organizer_account_created"; isNewAccount: true}}
  | {name: "claim_approved"; eventId: string;
      receipt: {authority: "claim_decision"; status: "approved"}}
  | {name: "organizer_activated"; eventId: string;
      receipt: {authority: "first_real_event_checkin"; firstActivation: true}}
  | {name: "purchase"; eventId: string; transactionId: string; value: number; currency: "INR";
      receipt: {authority: "catch_payment_settlement"; status: "settled"; audience: "organizer"}};

export interface SafeAcquisitionEvent {
  name: CatchAcquisitionEvent["name"];
  consent: Readonly<{analytics: true; marketing: boolean}>;
  parameters: Readonly<Record<string, string | number>>;
  attribution?: Readonly<CatchBrowserAttribution>;
}
export interface MeasurementContext {
  path: string;
  consent: MeasurementConsent | null;
  campaign?: Record<string, unknown>;
  attribution?: CatchBrowserAttribution | null;
}
const forms: readonly AcquisitionForm[] = ["member_waitlist", "host_lead", "host_application", "claim"];
const opaqueId = (id: unknown): id is string =>
  typeof id === "string" && /^(?:waitlist|host_lead|catch)_[0-9]{13}_(?:[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}|[a-z0-9]{8,24})$/u.test(id);

/** Rebuild every property, including for untyped JS callers. Unknown fields disappear. */
export function safeAcquisitionEvent(input: CatchAcquisitionEvent, context: MeasurementContext): SafeAcquisitionEvent | null {
  if (!input || typeof input !== "object") return null;
  const path = acquisitionRoute(context.path);
  if (!path || path === "/" || context.consent?.version !== 4 || context.consent.analytics !== true) return null;
  const parameters: Record<string, string | number> = {
    contract_version: catchMeasurementVersion,
    page_path: path,
    // Fixed origin/title; never document.title, referrer, search, hash, or arbitrary host.
    page_location: `https://catchdates.com${path}`,
    page_title: "Catch",
    page_name: routes[path],
    audience: "organizer",
    ...approvedCampaignLabels(context.campaign ?? {}),
  };
  switch (input.name) {
    case "page_view":
      if (!opaqueId(input.visitId)) return null;
      break;
    case "cta_click":
      if (!acquisitionRoute(input.target)) return null;
      parameters.cta_target = acquisitionRoute(input.target)!;
      break;
    case "acquisition_start":
      if (!forms.includes(input.form) || input.form === "member_waitlist") return null;
      parameters.form = input.form;
      parameters.audience = "organizer";
      break;
    case "lead_accepted":
      if (!opaqueId(input.eventId) || !forms.includes(input.form) || input.form === "member_waitlist" || (input.form as string) === "claim" ||
          input.receipt?.ok !== true || input.receipt.alreadyJoined !== false) return null;
      parameters.event_id = input.eventId;
      parameters.form = input.form;
      parameters.audience = "organizer";
      break;
    case "organizer_signup":
      if (!opaqueId(input.eventId) || input.receipt?.authority !== "organizer_account_created" ||
          input.receipt.isNewAccount !== true) return null;
      parameters.event_id = input.eventId;
      parameters.audience = "organizer";
      break;
    case "claim_approved":
      if (!opaqueId(input.eventId) || input.receipt?.authority !== "claim_decision" ||
          input.receipt.status !== "approved") return null;
      parameters.event_id = input.eventId;
      parameters.audience = "organizer";
      break;
    case "organizer_activated":
      if (!opaqueId(input.eventId) || input.receipt?.authority !== "first_real_event_checkin" ||
          input.receipt.firstActivation !== true) return null;
      parameters.event_id = input.eventId;
      parameters.audience = "organizer";
      break;
    case "purchase":
      if (!opaqueId(input.eventId) || !opaqueId(input.transactionId) || input.currency !== "INR" ||
          !Number.isFinite(input.value) || input.value <= 0 || input.value > 10_000_000 ||
          input.receipt?.authority !== "catch_payment_settlement" || input.receipt.status !== "settled" ||
          input.receipt.audience !== "organizer") return null;
      parameters.event_id = input.eventId;
      parameters.transaction_id = input.transactionId;
      parameters.value = input.value;
      parameters.currency = input.currency;
      parameters.audience = "organizer";
      break;
    default: return null;
  }
  return {name: input.name, consent: Object.freeze({analytics: true, marketing: context.consent.marketing === true}),
    parameters: Object.freeze(parameters),
    ...(safeBrowserAttribution(context.attribution, context.consent.marketing) ?
      {attribution: Object.freeze(safeBrowserAttribution(context.attribution, context.consent.marketing)!)} : {})};
}

export interface CatchProviderSession {
  send(event: SafeAcquisitionEvent): void;
  destroy(): void;
}
export type CatchProviderTransport = (provider: "google" | "meta") => CatchProviderSession;
export const catchProviderDefaults = Object.freeze({google: false, meta: false});

/** Only injected controlled transports can run. No diagnostic bus, arbitrary globals or replay queue. */
export function createCatchMeasurementController(transport?: CatchProviderTransport) {
  const sessions = new Map<"google" | "meta", CatchProviderSession>();
  const observed = new Set<string>();
  let context: MeasurementContext = {path: "", consent: null};
  function destroy() {
    for (const session of sessions.values()) {
      try { session.destroy(); } catch { /* Optional telemetry cannot block the page. */ }
    }
    sessions.clear();
  }
  function update(next: MeasurementContext) {
    const previous = context;
    context = next;
    if (previous.path !== next.path || previous.consent?.updatedAt !== next.consent?.updatedAt) destroy();
    const allowed = acquisitionRoute(next.path) && next.path !== "/" && next.consent?.version === 4;
    for (const provider of ["google", "meta"] as const) {
      const permitted = allowed && next.consent?.analytics === true &&
        (provider === "google" || next.consent.marketing === true);
      if (!permitted && sessions.has(provider)) {
        try { sessions.get(provider)!.destroy(); } catch { /* Optional telemetry. */ }
        sessions.delete(provider);
      }
      if (permitted && transport && !sessions.has(provider)) {
        try { sessions.set(provider, transport(provider)); } catch { /* No retry backlog. */ }
      }
    }
  }
  function track(input: CatchAcquisitionEvent) {
    const event = safeAcquisitionEvent(input, context);
    if (!event) return false;
    const id = input.name === "page_view" ? input.visitId : event.parameters.event_id;
    // One business receipt can never become two separately named outcomes.
    const keys = id ? [String(id)] : [];
    if (input.name === "purchase") keys.push(`transaction:${input.transactionId}`);
    if (keys.some((key) => observed.has(key)) || observed.size + keys.length > 4096) return false;
    for (const key of keys) observed.add(key);
    for (const session of sessions.values()) {
      try { session.send(event); } catch { /* Failed delivery is dropped, never replayed. */ }
    }
    return true;
  }
  return {update, track, destroy};
}


/** Closed browser context. The consented server intake uses a separate explicit
 * projection; this object never belongs in the diagnostic bus. */
export interface CatchBrowserAttribution {
  clientId: string;
  sessionId: number;
  gclid?: string;
  gbraid?: string;
  wbraid?: string;
  fbclid?: string;
  fbclidCapturedAt?: number;
}
interface StoredContext extends CatchBrowserAttribution {
  createdAt: number;
  consentRevision: string;
  lastSeenAt: number;
}
export const catchAttributionKey = "catch_acquisition_context_v2";
export const catchAttributionMaxAgeMs = 30 * 24 * 60 * 60 * 1000;
const clickKeys = ["gclid", "gbraid", "wbraid", "fbclid"] as const;
const clickId = (value: unknown): value is string => typeof value === "string" &&
  /^[A-Za-z0-9_-]{10,512}$/u.test(value);

/** Rebuild stored/message values; no arbitrary query keys, URLs or identifiers. */
export function safeBrowserAttribution(value: unknown, marketing: boolean): CatchBrowserAttribution | null {
  if (!value || typeof value !== "object") return null;
  const input = value as Record<string, unknown>;
  if (typeof input.clientId !== "string" || !/^\d{1,10}\.\d{10}$/u.test(input.clientId) ||
      !Number.isSafeInteger(input.sessionId) || Number(input.sessionId) < 1_000_000_000 ||
      Number(input.sessionId) > 9_999_999_999) return null;
  const result: CatchBrowserAttribution = {clientId: input.clientId, sessionId: Number(input.sessionId)};
  if (marketing) for (const key of clickKeys) if (clickId(input[key])) result[key] = input[key];
  if (result.fbclid && Number.isSafeInteger(input.fbclidCapturedAt) && Number(input.fbclidCapturedAt) > 0) {
    result.fbclidCapturedAt = Number(input.fbclidCapturedAt);
  }
  return result;
}

export function browserAttribution(input: {
  enabled: boolean; path: string; search: string; consent: MeasurementConsent | null;
  storage: Pick<Storage, "getItem" | "setItem" | "removeItem">;
  now: number; random: () => number;
}): CatchBrowserAttribution | null {
  const {storage, consent, now} = input;
  const clear = () => { try { storage.removeItem(catchAttributionKey); } catch { /* Optional storage. */ } };
  // No collection before the reviewed transport is activated, or under old copy.
  if (!input.enabled || !acquisitionRoute(input.path) || input.path === "/" || consent?.version !== 4 || !consent.analytics) {
    clear(); return null;
  }
  try {
    const stored = JSON.parse(storage.getItem(catchAttributionKey) ?? "null") as StoredContext | null;
    const age = stored ? now - stored.createdAt : NaN;
    const valid = stored && stored.consentRevision === consent.updatedAt && Number.isFinite(age) &&
      age >= 0 && age < catchAttributionMaxAgeMs ? safeBrowserAttribution(stored, consent.marketing) : null;
    const context: StoredContext = valid ? {...valid, createdAt: stored!.createdAt, consentRevision: consent.updatedAt,
      lastSeenAt: now, sessionId: Number.isFinite(stored!.lastSeenAt) && now - stored!.lastSeenAt < 30 * 60 * 1000 ?
        valid.sessionId : Math.floor(now / 1000)} : {
      clientId: `${input.random() >>> 0}.${Math.floor(now / 1000)}`,
      sessionId: Math.floor(now / 1000), createdAt: now, lastSeenAt: now, consentRevision: consent.updatedAt,
    };
    // Read identifiers only after explicit marketing permission. New Google ad
    // touches replace the previous Google touch; Meta is retained independently.
    if (consent.marketing) {
      const params = new URLSearchParams(input.search);
      const google = clickKeys.filter(key => key !== "fbclid" && clickId(params.get(key)));
      if (google.length) {
        delete context.gclid; delete context.gbraid; delete context.wbraid;
        for (const key of google) context[key] = params.get(key)!;
      }
      const metaClick = params.get("fbclid");
      if (clickId(metaClick) && metaClick !== context.fbclid) {
        context.fbclid = metaClick;
        context.fbclidCapturedAt = now;
      }
    }
    storage.setItem(catchAttributionKey, JSON.stringify(context));
    return safeBrowserAttribution(context, consent.marketing);
  } catch { clear(); return null; }
}
