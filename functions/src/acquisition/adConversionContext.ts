import * as admin from "firebase-admin";
import {logger} from "firebase-functions";
import type {CallableRequest} from "firebase-functions/v2/https";
import type {ManagePublicEventCheckoutCallablePayload} from
  "../shared/generated/managePublicEventCheckoutCallablePayload";

/** Server-only ad-click context per checkout (docs/ads_conversion_spec.md). */
export const AD_CONVERSION_CONTEXTS = "adConversionContexts";

/** The longest click-through window Meta or Google accepts for a conversion. */
export const AD_CONVERSION_CONTEXT_TTL_MILLIS = 90 * 24 * 60 * 60 * 1000;

type PrepareCommand = Extract<
  ManagePublicEventCheckoutCallablePayload,
  {action: "prepare"}
>;
export type AdClickContext = NonNullable<PrepareCommand["adContext"]>;

/** The caller's network identity as the callable saw it. */
export interface AdClientIdentity {
  clientIpAddress: string | null;
  clientUserAgent: string | null;
}

const ipPattern = /^[0-9A-Fa-f:.]{2,64}$/u;
// eslint-disable-next-line no-control-regex
const userAgentPattern = /^[^\u0000-\u001f\u007f]{1,512}$/u;

/** Reads IP and user agent from the callable request; malformed values are
 * dropped rather than stored. The first x-forwarded-for hop is the client. */
export function adClientIdentity(
  request: Pick<CallableRequest<unknown>, "rawRequest">,
): AdClientIdentity {
  const raw = request.rawRequest;
  const forwarded = raw?.get?.("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded || raw?.ip || null;
  const agent = raw?.get?.("user-agent")?.trim() || null;
  return {
    clientIpAddress: ip && ipPattern.test(ip) ? ip : null,
    clientUserAgent: agent && userAgentPattern.test(agent) ? agent : null,
  };
}

/** Builds the stored record. Pure, so the shape is tested without Firestore. */
export function adConversionContextRecord(input: {
  paymentId: string;
  uid: string;
  eventId: string;
  organizerId: string;
  click: AdClickContext;
  client: AdClientIdentity;
  nowMillis: number;
}) {
  return {
    schemaVersion: 1 as const,
    subjectKind: "publicEventPayment" as const,
    subjectId: input.paymentId,
    uid: input.uid,
    eventId: input.eventId,
    organizerId: input.organizerId,
    click: {...input.click},
    clientIpAddress: input.client.clientIpAddress,
    clientUserAgent: input.client.clientUserAgent,
    createdAt: admin.firestore.Timestamp.fromMillis(input.nowMillis),
    expiresAt: admin.firestore.Timestamp.fromMillis(
      input.nowMillis + AD_CONVERSION_CONTEXT_TTL_MILLIS,
    ),
  };
}

/**
 * Saves the first ad-click context for a checkout. A retry keeps the
 * original. Failure never blocks the checkout: the booking matters more than
 * its attribution, so errors are logged and swallowed.
 */
export async function recordPublicCheckoutAdContext(input: {
  db: FirebaseFirestore.Firestore;
  paymentId: string;
  uid: string;
  eventId: string;
  organizerId: string;
  click: AdClickContext | undefined;
  client: AdClientIdentity;
  nowMillis: number;
}): Promise<"created" | "kept" | "skipped" | "failed"> {
  if (!input.click || Object.keys(input.click).length === 0) return "skipped";
  const ref = input.db.collection(AD_CONVERSION_CONTEXTS).doc(input.paymentId);
  try {
    await ref.create(adConversionContextRecord({...input, click: input.click}));
    return "created";
  } catch (error) {
    if ((error as {code?: unknown}).code === 6) return "kept";
    logger.warn("Ad conversion context not saved", {
      paymentId: input.paymentId,
      error: error instanceof Error ? error.message : String(error),
    });
    return "failed";
  }
}
