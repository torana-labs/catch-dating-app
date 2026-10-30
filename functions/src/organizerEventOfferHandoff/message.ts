import {publicWebhookUrl} from "../organizers/organizerAutomationWebhook";
import {BRAND_ORIGIN_PATTERN} from "../shared/generated/brand";

const checkoutUrlPattern =
  new RegExp(`^${BRAND_ORIGIN_PATTERN}/offer#[A-Za-z0-9_-]{43}$`, "u");

/**
 * Pure preparation for one personal-device offer handoff. Inputs must come
 * from a server-reviewed offer, event, contact and payment-terms snapshot.
 * These flags are not authority: the caller must revalidate manager/source,
 * current offer generation/expiry/terms and contact permission/endpoint in a
 * transaction immediately before opening the existing manual-send handoff.
 * Preparation never sends, queues, or records a sent/delivered message.
 */
export interface ReviewedOfferHandoff {
  offer: {
    offerId: string;
    eventId: string;
    contactId: string;
    status: "draft" | "offered" | "withdrawn" | "expired";
    expiresAtMillis: number;
    organizerPaymentLink: string | null;
    /** Frozen at offer issuance; later event defaults do not rewrite it. */
    paymentTermsHash: string;
  };
  event: {
    eventId: string;
    title: string;
    startsAtMillis: number;
    timeZone: string;
    lifecycle: "current" | "canceled" | "archived";
  };
  recipient: {
    contactId: string;
    displayName: string;
    phoneE164: string | null;
    whatsappPermission: "available" | "optedOut" | "unavailable";
    sourceCurrent: boolean;
    contactCurrent: boolean;
  };
  payment: {
    /** Explicit mode from manager-reviewed event-local terms. */
    collectionMode: "reusablePage" | "manualInstructions" |
      "personalRequest" | "catchCheckout" | null;
    expectedAmountMinor: number | null;
    currency: string | null;
    reusablePaymentPageUrl: string | null;
    paymentInstructions: string | null;
    eventPaymentHash: string;
  };
  /** Optional event-authored intro or complete four-placeholder template. */
  messageTemplate: string | null;
  /** Generated only by the server after issuing a phone-bound grant. */
  recipientCheckoutUrl?: string;
  nowMillis: number;
}

export type HandoffBlocker =
  | "offerUnavailable" | "offerWithdrawn" | "offerExpired"
  | "eventMismatch" | "eventCanceled" | "eventArchived"
  | "eventUnavailable"
  | "contactMismatch" | "sourceRevoked"
  | "contactUnavailable" | "contactOptedOut" | "permissionUnavailable"
  | "termsChanged" | "nameMissing" | "eventMissing" | "eventStarted"
  | "timeMissing"
  | "timeZoneInvalid" | "paymentPolicyMissing" | "paymentModeUnsupported"
  | "currencyMissing" | "paymentLinkMissing" | "paymentLinkInvalid"
  | "paymentLinkMismatch" | "paymentInstructionsMissing"
  | "phoneMissing" | "phoneInvalid" | "templateInvalid";

export type PreparedOfferHandoff = {
  kind: "blocked";
  offerId: string;
  blockers: HandoffBlocker[];
} | {
  kind: "prepared";
  offerId: string;
  contactId: string;
  /** Editable prefill. The Host makes the final Send decision in WhatsApp. */
  editableText: string;
  copyText: string;
  /** Universal fallback matching the existing Flutter wa.me handoff. */
  whatsappUrl: string;
};

const commonTokens = ["name", "event", "time"] as const;
type Placeholder = typeof commonTokens[number] |
  "paymentLink" | "paymentInstructions";
const defaultIntro = "Hi {name}, your offer for {event} is ready on {time}.";

function nonblank(value: string): string {
  return typeof value === "string" ? value.trim() : "";
}

/** An instant plus IANA zone, including offset, disambiguates DST folds. */
export function formatOfferTime(
  startsAtMillis: number,
  timeZone: string,
): string | null {
  if (!Number.isSafeInteger(startsAtMillis) || startsAtMillis <= 0 ||
      !nonblank(timeZone)) return null;
  try {
    const formatter = new Intl.DateTimeFormat("en-GB", {
      timeZone,
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", hourCycle: "h23",
      timeZoneName: "shortOffset",
    });
    const values = Object.fromEntries(formatter.formatToParts(
      new Date(startsAtMillis),
    ).map((part) => [part.type, part.value]));
    if (!["year", "month", "day", "hour", "minute", "timeZoneName"]
      .every((key) => values[key])) return null;
    return `${values.year}-${values.month}-${values.day} ` +
      `${values.hour}:${values.minute} ${timeZone} (${values.timeZoneName})`;
  } catch {
    return null;
  }
}

function publicPaymentLink(value: string | null): string | null {
  if (!value || value.length > 2048) return null;
  try {
    const url = publicWebhookUrl(value);
    if (url.toString() !== value) return null;
    return value;
  } catch {
    return null;
  }
}

function renderMessage(
  template: string | null,
  values: Record<Placeholder, string>,
  mode: "reusablePage" | "manualInstructions" | "catchCheckout" | "free",
): string | null {
  const authored = nonblank(template ?? "");
  if (authored.length > 1000) return null;
  const requiredTokens = [...commonTokens, ...((mode === "reusablePage" ||
    mode === "catchCheckout") ?
    ["paymentLink"] : mode === "manualInstructions" ?
      ["paymentInstructions"] : [])];
  const paymentLine = mode === "catchCheckout" ?
    "Verify your phone and pay securely: {paymentLink}\n" +
      "Your seat is held for 15 minutes when checkout starts. " +
      "Admission is confirmed after payment verification." :
    mode === "reusablePage" ?
      "Payment link: {paymentLink}" : mode === "manualInstructions" ?
        "Payment instructions: {paymentInstructions}" :
        "No payment is required for this offer.";
  const defaultTemplate = `${defaultIntro}\n${paymentLine}`;
  const tokens = [...authored.matchAll(/\{([^{}]+)\}/gu)]
    .map((match) => match[1]);
  if (tokens.some((token) => !requiredTokens.includes(token))) return null;
  const chosen = tokens.length === 0 ?
    (authored ? `${authored}\n\n${defaultTemplate}` : defaultTemplate) :
    authored;
  if (tokens.length > 0 &&
      requiredTokens.some((token) => !tokens.includes(token))) return null;
  const validated = chosen.replace(
    /\{(name|event|time|paymentLink|paymentInstructions)\}/gu,
    "");
  if (/[{}]/u.test(validated)) return null;
  let rendered = chosen.replace(
    /\{(name|event|time|paymentLink|paymentInstructions)\}/gu,
    (_, key: Placeholder) => values[key]);
  if (mode === "free" && values.paymentLink) {
    rendered += `\nVerify your phone and accept: ${values.paymentLink}`;
  }
  if (rendered.length > 2000) return null;
  return rendered;
}

export function prepareOfferHandoff(
  input: ReviewedOfferHandoff,
): PreparedOfferHandoff {
  const {offer, event, recipient} = input;
  const blockers: HandoffBlocker[] = [];
  if (offer.status === "withdrawn") blockers.push("offerWithdrawn");
  else if (offer.status === "expired" ||
      !Number.isSafeInteger(offer.expiresAtMillis) ||
      !Number.isSafeInteger(input.nowMillis) ||
      input.nowMillis >= offer.expiresAtMillis) blockers.push("offerExpired");
  else if (offer.status !== "offered") blockers.push("offerUnavailable");
  if (offer.eventId !== event.eventId) blockers.push("eventMismatch");
  if (event.lifecycle === "canceled") blockers.push("eventCanceled");
  else if (event.lifecycle === "archived") blockers.push("eventArchived");
  else if (event.lifecycle !== "current") blockers.push("eventUnavailable");
  if (offer.contactId !== recipient.contactId) blockers.push("contactMismatch");
  if (!recipient.sourceCurrent) blockers.push("sourceRevoked");
  if (!recipient.contactCurrent) blockers.push("contactUnavailable");
  if (recipient.whatsappPermission === "optedOut") {
    blockers.push("contactOptedOut");
  } else if (recipient.whatsappPermission !== "available") {
    blockers.push("permissionUnavailable");
  }
  const payment = input.payment;
  if (!offer.paymentTermsHash || !payment.eventPaymentHash ||
      offer.paymentTermsHash !== payment.eventPaymentHash) {
    blockers.push("termsChanged");
  }
  const name = nonblank(recipient.displayName);
  const eventTitle = nonblank(event.title);
  const time = formatOfferTime(event.startsAtMillis, event.timeZone);
  if (!name) blockers.push("nameMissing");
  if (!eventTitle) blockers.push("eventMissing");
  if (!time) {
    blockers.push(Number.isSafeInteger(event.startsAtMillis) &&
      event.startsAtMillis > 0 ? "timeZoneInvalid" : "timeMissing");
  }
  if (Number.isSafeInteger(event.startsAtMillis) &&
      event.startsAtMillis <= input.nowMillis) blockers.push("eventStarted");
  let mode: "reusablePage" | "manualInstructions" |
    "catchCheckout" | "free" | null = null;
  let link: string | null = null;
  let instructions = "";
  if (!Number.isSafeInteger(payment.expectedAmountMinor) ||
      payment.expectedAmountMinor === null ||
      payment.expectedAmountMinor < 0) {
    blockers.push("paymentPolicyMissing");
  } else if (payment.expectedAmountMinor === 0 &&
      payment.collectionMode === null) {
    mode = "free";
    if (input.recipientCheckoutUrl) {
      if (!checkoutUrlPattern.test(input.recipientCheckoutUrl)) {
        blockers.push("paymentLinkInvalid");
      } else link = input.recipientCheckoutUrl;
    }
    if (offer.organizerPaymentLink) blockers.push("paymentLinkMismatch");
  } else if (payment.expectedAmountMinor > 0 &&
      (payment.collectionMode === "reusablePage" ||
        payment.collectionMode === "manualInstructions" ||
        payment.collectionMode === "personalRequest")) {
    mode = payment.collectionMode === "manualInstructions" ?
      "manualInstructions" : "reusablePage";
    if (!nonblank(payment.currency ?? "")) blockers.push("currencyMissing");
    if (mode === "reusablePage") {
      const expectedLink = payment.collectionMode === "personalRequest" ?
        offer.organizerPaymentLink : payment.reusablePaymentPageUrl;
      if (!expectedLink || !offer.organizerPaymentLink) {
        blockers.push("paymentLinkMissing");
      } else if (expectedLink !== offer.organizerPaymentLink) {
        blockers.push("paymentLinkMismatch");
      } else {
        link = publicPaymentLink(offer.organizerPaymentLink);
        if (!link) blockers.push("paymentLinkInvalid");
      }
    } else {
      instructions = nonblank(payment.paymentInstructions ?? "");
      if (!instructions) blockers.push("paymentInstructionsMissing");
      if (offer.organizerPaymentLink) blockers.push("paymentLinkMismatch");
    }
  } else if (payment.collectionMode === "catchCheckout") {
    if (payment.currency !== "INR" || payment.expectedAmountMinor < 100 ||
        !input.recipientCheckoutUrl) {
      blockers.push("paymentModeUnsupported");
    } else if (!checkoutUrlPattern.test(input.recipientCheckoutUrl)) {
      blockers.push("paymentLinkInvalid");
    } else {
      mode = "catchCheckout";
      link = input.recipientCheckoutUrl;
    }
    if (offer.organizerPaymentLink) blockers.push("paymentLinkMismatch");
  } else {
    blockers.push("paymentPolicyMissing");
  }
  if (!recipient.phoneE164) blockers.push("phoneMissing");
  else if (!/^\+[1-9]\d{7,14}$/u.test(recipient.phoneE164)) {
    blockers.push("phoneInvalid");
  }
  if (blockers.length > 0) {
    return {kind: "blocked", offerId: offer.offerId,
      blockers};
  }
  const editableText = renderMessage(input.messageTemplate, {
    name, event: eventTitle, time: time!, paymentLink: link ?? "",
    paymentInstructions: instructions,
  }, mode!);
  if (!editableText) {
    return {kind: "blocked", offerId: offer.offerId,
      blockers: ["templateInvalid"]};
  }
  const url = new URL(`https://wa.me/${recipient.phoneE164!.slice(1)}`);
  url.searchParams.set("text", editableText);
  return {kind: "prepared", offerId: offer.offerId,
    contactId: offer.contactId, editableText, copyText: editableText,
    whatsappUrl: url.toString()};
}
