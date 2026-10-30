import assert from "node:assert/strict";
import test from "node:test";
import {
  formatOfferTime,
  prepareOfferHandoff,
  ReviewedOfferHandoff,
} from "./message";

import {validateEventOfferHandoffCallableResponse} from
  "../shared/generated/validators/eventOfferHandoffOutput";
import {BRAND} from "../shared/generated/brand";

const now = Date.parse("2026-10-01T00:00:00Z");

function reviewed(): ReviewedOfferHandoff {
  return {
    offer: {offerId: "offer-1", eventId: "event-1", contactId: "contact-1",
      status: "offered", expiresAtMillis: now + 86_400_000,
      organizerPaymentLink: "https://pay.example.test/a?x=1&y=2",
      paymentTermsHash: "terms-1"},
    event: {eventId: "event-1", title: "Catch & Dance",
      startsAtMillis: Date.parse("2026-10-18T13:00:00Z"),
      timeZone: "Asia/Kolkata", lifecycle: "current"},
    recipient: {contactId: "contact-1", displayName: "Asha & Co",
      phoneE164: "+919876543210", whatsappPermission: "available",
      sourceCurrent: true, contactCurrent: true},
    payment: {collectionMode: "reusablePage", expectedAmountMinor: 150000,
      currency: "INR", reusablePaymentPageUrl:
        "https://pay.example.test/a?x=1&y=2",
      paymentInstructions: null, eventPaymentHash: "terms-1"},
    messageTemplate: null, nowMillis: now,
  };
}

function blockers(input: ReviewedOfferHandoff): string[] {
  const result = prepareOfferHandoff(input);
  assert.equal(result.kind, "blocked");
  assert.equal(validateEventOfferHandoffCallableResponse(result), true);
  return result.kind === "blocked" ? result.blockers : [];
}

test("prepares editable individual copy and encoded WhatsApp fallback", () => {
  const result = prepareOfferHandoff(reviewed());
  assert.equal(result.kind, "prepared");
  assert.equal(validateEventOfferHandoffCallableResponse(result), true);
  if (result.kind !== "prepared") return;
  assert.match(result.editableText, /Hi Asha & Co/);
  assert.match(result.editableText, /Catch & Dance/);
  assert.match(result.editableText, /2026-10-18 18:30 Asia\/Kolkata/);
  assert.match(result.editableText, /https:\/\/pay\.example\.test\/a\?x=1&y=2/);
  assert.equal(result.copyText, result.editableText);
  const url = new URL(result.whatsappUrl);
  assert.equal(url.origin, "https://wa.me");
  assert.equal(url.pathname, "/919876543210");
  assert.equal(url.searchParams.get("text"), result.editableText);
  assert.equal("sent" in result, false);
  assert.equal("delivered" in result, false);
});

test("custom intro and complete placeholders resolve without omission", () => {
  const intro = reviewed();
  intro.messageTemplate = "Your offer is ready.";
  const prepared = prepareOfferHandoff(intro);
  assert.equal(prepared.kind, "prepared");
  if (prepared.kind === "prepared") {
    assert.match(prepared.editableText, /^Your offer is ready\.\n\nHi Asha/);
  }
  const all = reviewed();
  all.messageTemplate =
    "{name}: {event} at {time}. Pay here: {paymentLink}";
  const custom = prepareOfferHandoff(all);
  assert.equal(custom.kind, "prepared");
  if (custom.kind === "prepared") {
    assert.match(custom.editableText, /^Asha & Co: Catch & Dance at /);
    assert.equal(custom.editableText.includes("{name}"), false);
  }
  all.messageTemplate = "{name}: {event} {unknown}";
  assert.deepEqual(blockers(all), ["templateInvalid"]);
  all.messageTemplate = "{name}: {event} {time}";
  assert.deepEqual(blockers(all), ["templateInvalid"]);
  all.messageTemplate = "Hello {name} {event} {time} {paymentLink} {";
  assert.deepEqual(blockers(all), ["templateInvalid"]);
  all.messageTemplate = null;
  all.recipient.displayName = "Asha {she/her}";
  assert.equal(prepareOfferHandoff(all).kind, "prepared");
});

test("manual payment and explicit free offer use distinct copy", () => {
  const manual = reviewed();
  manual.payment.collectionMode = "manualInstructions";
  manual.payment.reusablePaymentPageUrl = null;
  manual.payment.paymentInstructions = "Transfer to account 123";
  manual.offer.organizerPaymentLink = null;
  const manualResult = prepareOfferHandoff(manual);
  assert.equal(manualResult.kind, "prepared");
  if (manualResult.kind === "prepared") {
    assert.match(manualResult.editableText, /Transfer to account 123/);
    assert.equal(manualResult.editableText.includes("Payment link:"), false);
  }
  manual.messageTemplate =
    "{name}: {event} at {time}. {paymentInstructions}";
  assert.equal(prepareOfferHandoff(manual).kind, "prepared");
  manual.payment.paymentInstructions = null;
  assert.deepEqual(blockers(manual), ["paymentInstructionsMissing"]);

  const free = reviewed();
  free.payment.collectionMode = null;
  free.payment.expectedAmountMinor = 0;
  free.offer.organizerPaymentLink = null;
  free.payment.reusablePaymentPageUrl = null;
  const freeResult = prepareOfferHandoff(free);
  assert.equal(freeResult.kind, "prepared");
  if (freeResult.kind === "prepared") {
    assert.match(freeResult.editableText, /No payment is required/);
    assert.equal(freeResult.editableText.includes("Payment link:"), false);
  }
  free.payment.expectedAmountMinor = null;
  assert.deepEqual(blockers(free), ["paymentPolicyMissing"]);
  free.payment.expectedAmountMinor = 100;
  assert.deepEqual(blockers(free), ["paymentPolicyMissing"]);
});

test("withdrawal, expiry, opt-out and stale provenance cannot prepare", () => {
  const cases: Array<[string, (input: ReviewedOfferHandoff) => void]> = [
    ["offerWithdrawn", (input) => {
      input.offer.status = "withdrawn";
    }],
    ["offerExpired", (input) => {
      input.nowMillis = input.offer.expiresAtMillis;
    }],
    ["offerUnavailable", (input) => {
      input.offer.status = "draft";
    }],
    ["contactOptedOut", (input) => {
      input.recipient.whatsappPermission = "optedOut";
    }],
    ["sourceRevoked", (input) => {
      input.recipient.sourceCurrent = false;
    }],
    ["contactUnavailable", (input) => {
      input.recipient.contactCurrent = false;
    }],
    ["termsChanged", (input) => {
      input.payment.eventPaymentHash = "terms-2";
    }],
    ["eventMismatch", (input) => {
      input.event.eventId = "event-2";
    }],
    ["eventCanceled", (input) => {
      input.event.lifecycle = "canceled";
    }],
    ["eventArchived", (input) => {
      input.event.lifecycle = "archived";
    }],
    ["eventStarted", (input) => {
      input.event.startsAtMillis = now;
    }],
    ["contactMismatch", (input) => {
      input.recipient.contactId = "contact-2";
    }],
  ];
  for (const [expected, change] of cases) {
    const input = reviewed();
    change(input);
    assert.ok(blockers(input).includes(expected), expected);
  }
});

test("missing or unsafe contact, event and payment values are blockers", () => {
  const cases: Array<[string, (input: ReviewedOfferHandoff) => void]> = [
    ["nameMissing", (input) => {
      input.recipient.displayName = "  ";
    }],
    ["eventMissing", (input) => {
      input.event.title = "";
    }],
    ["timeMissing", (input) => {
      input.event.startsAtMillis = 0;
    }],
    ["timeZoneInvalid", (input) => {
      input.event.timeZone = "Mars/Crater";
    }],
    ["paymentLinkMissing", (input) => {
      input.offer.organizerPaymentLink = null;
    }],
    ["paymentLinkInvalid", (input) => {
      input.offer.organizerPaymentLink = "http://127.0.0.1/pay";
      input.payment.reusablePaymentPageUrl = "http://127.0.0.1/pay";
    }],
    ["phoneMissing", (input) => {
      input.recipient.phoneE164 = null;
    }],
    ["phoneInvalid", (input) => {
      input.recipient.phoneE164 = "9876543210";
    }],
    ["paymentModeUnsupported", (input) => {
      input.payment.collectionMode = "catchCheckout";
    }],
    ["currencyMissing", (input) => {
      input.payment.currency = null;
    }],
  ];
  for (const [expected, change] of cases) {
    const input = reviewed();
    change(input);
    assert.ok(blockers(input).includes(expected), expected);
  }
});

test("reviewed personal request link is a recipient payment URL", () => {
  const input = reviewed();
  input.payment.collectionMode = "personalRequest";
  input.payment.reusablePaymentPageUrl = null;
  const result = prepareOfferHandoff(input);
  assert.equal(result.kind, "prepared");
  assert.equal(validateEventOfferHandoffCallableResponse(result), true);
  if (result.kind === "prepared") {
    assert.match(result.editableText, /https:\/\/pay\.example\.test\/a/u);
    assert.equal("providerReceipt" in result, false);
  }
});

test("time rendering distinguishes repeated DST wall times", () => {
  const zone = "America/New_York";
  const first = formatOfferTime(Date.parse("2026-11-01T05:30:00Z"), zone);
  const second = formatOfferTime(Date.parse("2026-11-01T06:30:00Z"), zone);
  assert.match(first ?? "", /2026-11-01 01:30/);
  assert.match(second ?? "", /2026-11-01 01:30/);
  assert.notEqual(first, second);
});

test("automatic checkout uses only a server-issued Catch fragment link", () => {
  const input = reviewed();
  input.payment.collectionMode = "catchCheckout";
  input.payment.reusablePaymentPageUrl = null;
  input.offer.organizerPaymentLink = null;
  input.recipientCheckoutUrl = `${BRAND.web.origin}/offer#${"a".repeat(43)}`;
  const result = prepareOfferHandoff(input);
  assert.equal(result.kind, "prepared");
  assert.equal(validateEventOfferHandoffCallableResponse(result), true);
  if (result.kind !== "prepared") return;
  assert.ok(result.copyText.includes(input.recipientCheckoutUrl));
  assert.match(result.copyText, /held for 15 minutes when checkout starts/u);
  assert.equal(new URL(result.whatsappUrl).searchParams.get("text"),
    result.copyText);
  for (const url of ["https://evil.test/offer#token",
    `${BRAND.web.origin}/offer?token=${"a".repeat(43)}`]) {
    assert.ok(blockers({...input, recipientCheckoutUrl: url})
      .includes("paymentLinkInvalid"));
  }
});
