/**
 * Multi-place public checkout (PR #1887): one booking holds 1 to 4 places.
 * The booker's place costs unitAmountPaise; with a member price
 * (memberPlaceCount 1) each guest place costs guestUnitAmountPaise, the list
 * price. A booking of N places names its N - 1 guests, each trimmed with inner
 * whitespace collapsed, 1 to 80 characters and no control characters, exactly
 * as functions/src/events/publicRegistration/policy.ts publicGuestNames does.
 */
export const MAX_CHECKOUT_PLACES = 4;
export const MAX_GUEST_NAME_LENGTH = 80;

/** The place fields a quote or payment carries; all absent means one place. */
export interface CheckoutPlaceFields {
  amountPaise: number;
  placeCount?: number;
  unitAmountPaise?: number;
  memberPlaceCount?: number;
  guestUnitAmountPaise?: number;
}

export interface CheckoutPlaces {
  placeCount: number;
  /** The booker's place. */
  unitAmountPaise: number;
  /** Each other place: the list price with a member price, else the unit price. */
  guestUnitAmountPaise: number;
  /** One when the booker's place took a member price. */
  memberPlaceCount: 0 | 1;
}

/** Clamps a requested place count to the bookable range and the places left. */
export function clampPlaces(value: number, placesLeft: number | null = null): number {
  const ceiling = Math.max(1, Math.min(MAX_CHECKOUT_PLACES, placesLeft ?? MAX_CHECKOUT_PLACES));
  if (!Number.isFinite(value)) return 1;
  return Math.min(ceiling, Math.max(1, Math.trunc(value)));
}

/** Reads a quote's or payment's places; absent fields mean one place at amountPaise. */
export function checkoutPlaces(fields: CheckoutPlaceFields): CheckoutPlaces {
  const placeCount = fields.placeCount ?? 1;
  const unitAmountPaise = fields.unitAmountPaise ?? (placeCount === 1 ? fields.amountPaise : Math.round(fields.amountPaise / placeCount));
  return {
    placeCount,
    unitAmountPaise,
    guestUnitAmountPaise: fields.guestUnitAmountPaise ?? unitAmountPaise,
    memberPlaceCount: fields.memberPlaceCount === 1 ? 1 : 0,
  };
}

/** Whether the place fields agree with each other and with the whole amount. */
export function placeFieldsConsistent(fields: Record<string, unknown>, maxPlaces: number): boolean {
  const {amountPaise, placeCount, unitAmountPaise, memberPlaceCount, guestUnitAmountPaise} = fields;
  const price = (value: unknown) => typeof value === "number" && Number.isSafeInteger(value) && value >= 100 && value <= 100_000_000;
  if (placeCount === undefined) {
    // One place: only a payment states its unit price, and it is the whole amount.
    return memberPlaceCount === undefined && guestUnitAmountPaise === undefined &&
      (unitAmountPaise === undefined || unitAmountPaise === amountPaise);
  }
  if (typeof placeCount !== "number" || !Number.isSafeInteger(placeCount) || placeCount < 1 || placeCount > maxPlaces) return false;
  if (!price(unitAmountPaise) || typeof amountPaise !== "number") return false;
  if ((memberPlaceCount === undefined) !== (guestUnitAmountPaise === undefined)) return false;
  if (memberPlaceCount !== undefined && (memberPlaceCount !== 1 || placeCount < 2 || !price(guestUnitAmountPaise))) return false;
  const guest = (guestUnitAmountPaise as number | undefined) ?? (unitAmountPaise as number);
  return (unitAmountPaise as number) + guest * (placeCount - 1) === amountPaise;
}

/** A guest name as the server stores it: trimmed, inner whitespace collapsed. */
export function normalizeGuestName(value: string): string {
  return value.trim().replace(/\s+/gu, " ");
}

/** Whether a guest name passes the server's guestNames rule once normalized. */
export function guestNameValid(value: string): boolean {
  if (/\p{Cc}/u.test(value)) return false;
  const clean = normalizeGuestName(value);
  return clean.length > 0 && Array.from(clean).length <= MAX_GUEST_NAME_LENGTH;
}

/** Keeps the names already typed and pads or trims to one per guest place. */
export function resizeGuestNames(names: readonly string[], places: number): string[] {
  const count = Math.max(0, places - 1);
  return Array.from({length: count}, (_, index) => names[index] ?? "");
}

/** The details of a `notEnoughPlaces` refusal: how many places are left. */
export function notEnoughPlacesLeft(error: unknown): number | null {
  const details = (error as {details?: unknown} | null)?.details;
  if (typeof details !== "object" || details === null) return null;
  const {reason, placesLeft} = details as {reason?: unknown; placesLeft?: unknown};
  return reason === "notEnoughPlaces" && typeof placesLeft === "number" && Number.isSafeInteger(placesLeft) && placesLeft >= 0
    ? placesLeft : null;
}

/** A guest-name refusal from the server (wrong count, or an invalid name). */
export function guestNamesRefused(error: unknown): boolean {
  const details = (error as {details?: unknown} | null)?.details;
  const reason = typeof details === "object" && details !== null ? (details as {reason?: unknown}).reason : undefined;
  return reason === "guestNamesCount" || reason === "guestNameInvalid";
}
