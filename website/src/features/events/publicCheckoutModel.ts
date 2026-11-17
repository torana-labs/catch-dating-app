import type { ManagePublicEventCheckoutCallableResponse as Response } from "../../shared/contracts/generated/managePublicEventCheckoutCallableResponse";
import {
  record,
  integer,
  matches,
  keys,
  policy,
  validEventPayment,
} from "../../shared/payments/eventPaymentValidation";
import {MAX_CHECKOUT_PLACES, placeFieldsConsistent} from "./checkoutPlaces";
export type PublicQuote = NonNullable<Response["quote"]>;
export type PublicPayment = NonNullable<Response["payment"]>;
export type PublicAdmission = NonNullable<Response["admission"]>;
const eventIdValid = (value: unknown) =>
  matches(value, /^[A-Za-z0-9_:-]{1,180}$/u);
function eventFacts(value: Record<string, unknown>) {
  return (
    eventIdValid(value.eventId) &&
    typeof value.eventName === "string" &&
    value.eventName.length > 0 &&
    value.eventName.length <= 200 &&
    integer(value.startTimeMillis)
  );
}
// Multi-place checkout (PR #1887) adds optional place fields: a quote's
// place count is 2 to 4, a payment's or admission's 1 to 20. A one-place
// quote carries none, so the reviewed quote echoes exactly what it read.
const quotePlaceKeys = ["placeCount", "unitAmountPaise", "memberPlaceCount", "guestUnitAmountPaise"];
const quoteOptionalKeys = [...quotePlaceKeys, "listAmountPaise"];
const paymentPlaceKeys = quotePlaceKeys;
const MAX_PAYMENT_PLACES = 20;
/** The object's keys are the required ones plus any of the optional ones. */
function keysWithOptional(value: Record<string, unknown>, required: string[], optional: string[]) {
  return keys(value, [...required, ...optional.filter((key) => key in value)]);
}
function withoutKeys(value: Record<string, unknown>, omitted: string[]) {
  return Object.fromEntries(Object.entries(value).filter(([key]) => !omitted.includes(key)));
}
export function assertPublicCheckoutResponse(
  value: unknown,
  eventId: string,
  paymentId?: string,
): Response {
  const invalid = () => {
    throw new Error("Invalid event checkout response");
  };
  if (
    !record(value) ||
    !keys(value, ["quote", "payment", "admission", "serverTimeMillis"]) ||
    !integer(value.serverTimeMillis) ||
    (value.quote && (value.payment || value.admission))
  )
    return invalid();
  const quote = value.quote;
  if (
    quote !== null &&
    (!record(quote) ||
      !keysWithOptional(quote, [
        "eventId",
        "eventName",
        "registrationRevision",
        "startTimeMillis",
        "amountPaise",
        "currency",
        "cancellationPolicy",
      ], quoteOptionalKeys) ||
      (quote.placeCount !== undefined && (quote.placeCount as number) < 2) ||
      !placeFieldsConsistent(quote, MAX_CHECKOUT_PLACES) ||
      (quote.listAmountPaise !== undefined && !integer(quote.listAmountPaise, 100)) ||
      !eventFacts(quote) ||
      quote.eventId !== eventId ||
      !integer(quote.registrationRevision, 0) ||
      !integer(quote.amountPaise, 100) ||
      quote.amountPaise > 100_000_000 ||
      quote.currency !== "INR" ||
      !policy(quote.cancellationPolicy) ||
      (quote.cancellationPolicy as PublicQuote["cancellationPolicy"])
        .eventStartsAtMillis !== quote.startTimeMillis)
  )
    return invalid();
  const payment = value.payment;
  if (
    record(payment) &&
    !placeFieldsConsistent(payment, MAX_PAYMENT_PLACES)
  )
    return invalid();
  if (
    !validEventPayment(record(payment) ? withoutKeys(payment, paymentPlaceKeys) : payment, "pp", [
      "eventId",
      "eventName",
      "startTimeMillis",
    ])
  )
    return invalid();
  if (
    payment !== null &&
    (!record(payment) ||
      !eventFacts(payment) ||
      payment.eventId !== eventId ||
      (paymentId && payment.paymentId !== paymentId) ||
      (payment.cancellationPolicy &&
        (payment.cancellationPolicy as PublicQuote["cancellationPolicy"])
          .eventStartsAtMillis !== payment.startTimeMillis))
  )
    return invalid();
  const admission = value.admission;
  if (
    admission !== null &&
    (!record(admission) ||
      !keysWithOptional(admission, ["eventId", "attendeeId", "status"], ["placeCount"]) ||
      (admission.placeCount !== undefined && !(integer(admission.placeCount) && admission.placeCount <= MAX_PAYMENT_PLACES)) ||
      admission.eventId !== eventId ||
      !eventIdValid(admission.attendeeId) ||
      !["registered", "checkedIn"].includes(String(admission.status)) ||
      (payment !== null && (payment as PublicPayment).status !== "admitted"))
  )
    return invalid();
  return value as unknown as Response;
}
