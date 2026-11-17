import {getMarketingConsent} from "../analytics.ts";
import type {ManagePublicEventCheckoutCallablePayload} from "../shared/contracts/generated/managePublicEventCheckoutCallablePayload";
import {
  catchAttributionKey,
  catchAttributionMaxAgeMs,
  safeBrowserAttribution,
  type MeasurementConsent,
} from "./catchMeasurement.ts";

type PrepareCommand = Extract<ManagePublicEventCheckoutCallablePayload, {action: "prepare"}>;
type CheckoutAdContext = NonNullable<PrepareCommand["adContext"]>;

const fbpPattern = /^fb\.[0-9]\.[0-9]{10,13}\.[0-9]{1,20}$/u;
const fbcPattern = /^fb\.[0-9]\.[0-9]{10,13}\.[A-Za-z0-9_-]{10,512}$/u;

function cookieValue(cookie: string, name: string): string | undefined {
  for (const part of cookie.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return rest.join("=");
  }
  return undefined;
}

/**
 * The ad-click context a checkout may carry (docs/ads_conversion_spec.md,
 * Payload and attribution). Only under a current marketing choice; only the
 * stored click identifiers and Meta's own first-party cookies. Undefined when
 * there is nothing to send, so the request stays unchanged.
 */
export function checkoutAdContext(input: {
  consent: MeasurementConsent | null;
  storage: Pick<Storage, "getItem"> | null;
  cookie: string;
  now: number;
}): CheckoutAdContext | undefined {
  const {consent} = input;
  if (!consent?.analytics || !consent.marketing) return undefined;
  const result: CheckoutAdContext = {};
  try {
    const stored = JSON.parse(input.storage?.getItem(catchAttributionKey) ?? "null") as
      {createdAt?: unknown; consentRevision?: unknown} | null;
    const age = stored && typeof stored.createdAt === "number" ? input.now - stored.createdAt : NaN;
    const click = stored && stored.consentRevision === consent.updatedAt && age >= 0 &&
      age < catchAttributionMaxAgeMs ? safeBrowserAttribution(stored, true) : null;
    if (click?.gclid) result.gclid = click.gclid;
    if (click?.gbraid) result.gbraid = click.gbraid;
    if (click?.wbraid) result.wbraid = click.wbraid;
    if (click?.fbclid) {
      result.fbclid = click.fbclid;
      if (click.fbclidCapturedAt && click.fbclidCapturedAt <= input.now) {
        result.fbclidCapturedAtMillis = click.fbclidCapturedAt;
      }
    }
  } catch {
    // Optional storage: a bad or blocked value sends no click identifiers.
  }
  const fbp = cookieValue(input.cookie, "_fbp");
  if (fbp && fbpPattern.test(fbp)) result.fbp = fbp;
  const fbc = cookieValue(input.cookie, "_fbc");
  if (fbc && fbcPattern.test(fbc)) result.fbc = fbc;
  return Object.keys(result).length > 0 ? result : undefined;
}

/** The current browser's checkout ad context, read at the moment of prepare. */
export function currentCheckoutAdContext(): CheckoutAdContext | undefined {
  let storage: Pick<Storage, "getItem"> | null = null;
  try {
    storage = window.localStorage;
  } catch {
    storage = null;
  }
  return checkoutAdContext({
    consent: getMarketingConsent(),
    storage,
    cookie: typeof document === "undefined" ? "" : document.cookie,
    now: Date.now(),
  });
}
