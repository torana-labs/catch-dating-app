import assert from "node:assert/strict";
import test from "node:test";
import {
  assertExternalEventOrganizerAuthority,
  assertMatchingPublicationReceipt,
  externalEventAppVisibilityFor,
  publicationInputHash,
  publicationReceiptId,
} from "./externalEventPublicationPolicy";

test("publication receipt ids are stable and action scoped", () => {
  assert.equal(
    publicationReceiptId("admin-1", "publish", "candidate:1:apply"),
    publicationReceiptId("admin-1", "publish", "candidate:1:apply")
  );
  assert.notEqual(
    publicationReceiptId("admin-1", "publish", "candidate:1:apply"),
    publicationReceiptId("admin-1", "takedown", "candidate:1:apply")
  );
});

test("publication input hashes ignore object property order", () => {
  assert.equal(
    publicationInputHash({a: 1, b: {c: 2}}),
    publicationInputHash({b: {c: 2}, a: 1})
  );
});

test("receipt key reuse with different input fails", () => {
  assert.throws(
    () => assertMatchingPublicationReceipt(
      {action: "publish", inputHash: "a", idempotencyKey: "same-key"},
      {action: "publish", inputHash: "b", idempotencyKey: "same-key"}
    ),
    (error) => (error as {code?: string}).code === "already-exists"
  );
});

test("external event authority enforces organizer market and capabilities",
  () => {
    const document = {
      canonicalHostId: "organizer-1",
      discovery: {
        citySlug: "mumbai",
        countryCode: "IN",
        appVisibility: "discoverable",
      },
      organizerCapabilities: {
        mode: "unclaimed_read_only",
        bookable: false,
        paymentsEnabled: false,
        waitlistEnabled: false,
        hostContactEnabled: false,
        claimable: true,
        reviewPolicy: "after_event_end",
      },
      booking: {
        catchBookingEnabled: false,
        catchPaymentsEnabled: false,
        catchReservationsEnabled: false,
        catchWaitlistEnabled: false,
      },
    };
    assert.doesNotThrow(() => assertExternalEventOrganizerAuthority(
      "event-1",
      document as never,
      "organizer-1",
      {
        locationMarketId: "in-mh-mumbai",
        appVisibility: "discoverable",
        ownership: {state: "programmatic"},
        claim: {state: "unclaimed"},
        supplyCapabilities: document.organizerCapabilities,
      }
    ));
    assert.throws(
      () => assertExternalEventOrganizerAuthority(
        "event-1",
        document as never,
        "organizer-1",
        {
          locationMarketId: "in-mp-indore",
          appVisibility: "discoverable",
          ownership: {state: "programmatic"},
          claim: {state: "unclaimed"},
          supplyCapabilities: document.organizerCapabilities,
        }
      ),
      (error) => (error as {code?: string}).code === "failed-precondition"
    );
  });

test("external event app visibility follows its organizer", () => {
  const capabilities = {
    mode: "unclaimed_read_only",
    bookable: false,
    paymentsEnabled: false,
    waitlistEnabled: false,
    hostContactEnabled: false,
    claimable: true,
    reviewPolicy: "after_event_end",
  };
  const documentFor = (appVisibility: string) => ({
    canonicalHostId: "organizer-1",
    discovery: {citySlug: "mumbai", countryCode: "IN", appVisibility},
    organizerCapabilities: capabilities,
    booking: {
      catchBookingEnabled: false,
      catchPaymentsEnabled: false,
      catchReservationsEnabled: false,
      catchWaitlistEnabled: false,
    },
  });
  const organizer = (appVisibility: string | undefined) => ({
    locationMarketId: "in-mh-mumbai",
    appVisibility,
    ownership: {state: "programmatic"},
    claim: {state: "unclaimed"},
    supplyCapabilities: capabilities,
  });
  // An organizer hidden in the app publishes events hidden in the app.
  assert.doesNotThrow(() => assertExternalEventOrganizerAuthority(
    "event-1", documentFor("hidden") as never, "organizer-1",
    organizer("hidden")));
  assert.equal(externalEventAppVisibilityFor(organizer(undefined)), "hidden");
  for (const [event, owner] of [["discoverable", "hidden"],
    ["hidden", "discoverable"]]) {
    assert.throws(
      () => assertExternalEventOrganizerAuthority(
        "event-1", documentFor(event) as never, "organizer-1",
        organizer(owner)),
      (error) => (error as {code?: string}).code === "failed-precondition"
    );
  }
});
