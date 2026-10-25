import crypto from "node:crypto";
import {HttpsError} from "firebase-functions/v2/https";
import type {ExternalEventDocument} from
  "../shared/generated/externalEventDocument";
import type {ExternalEventPublicationReceiptDocument} from
  "../shared/generated/externalEventPublicationReceiptDocument";
import {marketForIdOrAlias} from "../locations/marketConfig";
import {
  verifiedOrganizerSupplyCapabilities,
} from "../shared/organizerSupplyCapabilities";

export type ExternalEventPublicationAction =
  ExternalEventPublicationReceiptDocument["action"];

export function publicationReceiptId(
  uid: string,
  action: ExternalEventPublicationAction,
  idempotencyKey: string
): string {
  return `external-event-${crypto.createHash("sha256")
    .update(`${uid}:${action}:${idempotencyKey}`)
    .digest("hex")
    .slice(0, 40)}`;
}

export function publicationInputHash(value: unknown): string {
  return crypto.createHash("sha256")
    .update(stableJson(value))
    .digest("hex");
}

export function assertMatchingPublicationReceipt(
  receipt: Record<string, unknown>,
  expected: {
    action: ExternalEventPublicationAction;
    inputHash: string;
    idempotencyKey: string;
  }
) {
  if (
    receipt.action === expected.action &&
    receipt.inputHash === expected.inputHash &&
    receipt.idempotencyKey === expected.idempotencyKey
  ) {
    return;
  }
  throw new HttpsError(
    "already-exists",
    "This idempotency key was already used for a different action."
  );
}

/**
 * App discovery follows the organizer: an event is discoverable in the app
 * only while its organizer is. Anything but an explicit "discoverable" hides.
 * @param {Record<string, unknown>} organizer Organizer document.
 * @return {"hidden" | "discoverable"} The event's app visibility.
 */
export function externalEventAppVisibilityFor(
  organizer: Record<string, unknown>
): ExternalEventDocument["discovery"]["appVisibility"] {
  return organizer.appVisibility === "discoverable" ?
    "discoverable" :
    "hidden";
}

export function assertExternalEventOrganizerAuthority(
  eventId: string,
  document: ExternalEventDocument,
  organizerId: string,
  organizer: Record<string, unknown>
) {
  if (document.canonicalHostId !== organizerId) {
    throw new HttpsError(
      "failed-precondition",
      `External event ${eventId} is not attributed to its canonical organizer.`
    );
  }
  if (document.discovery.appVisibility !==
    externalEventAppVisibilityFor(organizer)) {
    throw new HttpsError(
      "failed-precondition",
      "External event app visibility must match its canonical organizer."
    );
  }
  const market = marketForIdOrAlias(
    stringValue(organizer.locationMarketId) ||
      stringValue(organizer.location)
  );
  if (!market ||
    document.discovery.citySlug !== market.slug ||
    document.discovery.countryCode !== market.countryIsoCode) {
    throw new HttpsError(
      "failed-precondition",
      "External event market identity must match its canonical organizer."
    );
  }
  const capabilities = verifiedOrganizerSupplyCapabilities(organizer);
  if (stableJson(document.organizerCapabilities) !==
    stableJson(capabilities)) {
    throw new HttpsError(
      "failed-precondition",
      "External event organizer capabilities are stale or over-broad."
    );
  }
  if (
    document.booking.catchBookingEnabled ||
    document.booking.catchPaymentsEnabled ||
    document.booking.catchReservationsEnabled ||
    document.booking.catchWaitlistEnabled
  ) {
    throw new HttpsError(
      "failed-precondition",
      "External events must remain outbound-only on Catch."
    );
  }
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableJson).join(",")}]`;
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort().map((key) =>
      `${JSON.stringify(key)}:${stableJson(record[key])}`
    ).join(",")}}`;
  }
  return JSON.stringify(value);
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}
