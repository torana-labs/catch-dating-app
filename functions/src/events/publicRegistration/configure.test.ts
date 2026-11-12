import {initialPolicyFromTerms} from "../eventPolicy";
import assert from "node:assert/strict";
import test from "node:test";
import type {
  EventDocument,
  OrganizerDocument,
} from "../../shared/generated/firestoreAdminTypes";
import {actorUid} from "../../organizerFormAdmission/admissionTestFixture";
import {publicFixture, now, org, eventId} from "./testFixture";
import {configureEventRegistration} from "./configure";
import {
  assertPublicRegistrationPolicy,
  publicRegistrationMode,
} from "./policy";

test("paid opt-in is explicit, revision-checked and replay-safe", async () => {
  const h = await publicFixture();
  h.event.eventOrigin = {kind: "catchNative", label: "Original source"};
  const command = {
    organizerId: org,
    eventId,
    requestId: "configure_public_1",
    expectedRegistrationRevision: 1,
    mode: "paid" as const,
  };
  const change = () =>
    configureEventRegistration({
      db: h.store.db(),
      actorUid,
      command,
      routing: h.routing,
      nowMillis: () => now,
    });
  assert.equal((await change()).registrationRevision, 2);
  assert.equal((await change()).replayed, true);
  assert.deepEqual(h.event.eventOrigin, {
    kind: "catchNative",
    label: "Original source",
  });
  await assert.rejects(
    configureEventRegistration({
      db: h.store.db(),
      actorUid,
      command: {...command, requestId: "configure_public_2"},
      routing: h.routing,
      nowMillis: () => now,
    }),
  );
  await assert.rejects(
    configureEventRegistration({
      db: h.store.db(),
      actorUid: "outsider",
      command,
      routing: h.routing,
      nowMillis: () => now,
    }),
  );
});

test("paid enablement needs a ready route and reconciled seats", async () => {
  for (const missing of ["route", "seats"]) {
    const h = await publicFixture();
    if (missing === "seats") {
      h.store.rows.delete(`eventSeatMigrationFences/${eventId}`);
    }
    await assert.rejects(
      configureEventRegistration({
        db: h.store.db(),
        actorUid,
        command: {
          organizerId: org,
          eventId,
          requestId: "configure_public_1",
          expectedRegistrationRevision: 1,
          mode: "paid",
        },
        nowMillis: () => now,
        ...(missing === "route" ? {} : {routing: h.routing}),
      }),
    );
    assert.equal(
      h.store.get(`events/${eventId}`)?.publicRegistrationRevision,
      1,
    );
  }
});

test("external free opt-in and closing preserve event origin", async () => {
  const h = await publicFixture();
  Object.assign(h.event, {
    priceInPaise: 0,
    eventPolicy: initialPolicyFromTerms({...h.event, priceInPaise: 0,
      eventPolicy: undefined} as unknown as EventDocument),
    eventOrigin: {kind: "externalCompanion", provider: "luma"},
  });
  const command = {
    organizerId: org,
    eventId,
    requestId: "configure_free_1",
    expectedRegistrationRevision: 1,
    mode: "free" as const,
  };
  await configureEventRegistration({
    db: h.store.db(),
    actorUid,
    command,
    nowMillis: () => now,
  });
  const close = {
    ...command,
    requestId: "configure_closed_1",
    expectedRegistrationRevision: 2,
    mode: "closed" as const,
  };
  await configureEventRegistration({
    db: h.store.db(),
    actorUid,
    command: close,
    nowMillis: () => 300_000_000,
  });
  const event = h.store.get(`events/${eventId}`)!;
  assert.equal(event.publicRegistrationEnabled, false);
  assert.equal(event.publicRegistrationMode, "closed");
  assert.deepEqual(event.eventOrigin, {
    kind: "externalCompanion",
    provider: "luma",
  });
});

test("legacy enabled flag never opts into paid registration", async () => {
  const h = await publicFixture();
  delete h.event.publicRegistrationMode;
  assert.equal(
    publicRegistrationMode(h.event as unknown as EventDocument),
    "free",
  );
  assert.throws(h.quote);
});

test("public OTP cannot bypass restricted eligibility", async () => {
  for (const patch of [
    {format: "membersOnly"},
    {format: "manualApproval"},
    {format: "inviteOnly"},
    {membershipRequired: true},
    {manualApprovalRequired: true},
    {inviteRequired: true},
    {cohortCapacityLimits: {men: 2}},
    {balancedRatioPolicy: {leftCohortId: "men"}},
    {crossPathsPairInventory: {enabled: true}},
    {privateAccessPolicy: {mode: "inviteCode"}},
  ]) {
    const h = await publicFixture();
    Object.assign(
      (h.event.eventPolicy as { admission: object }).admission,
      patch,
    );
    assert.throws(() =>
      assertPublicRegistrationPolicy(
        h.event as unknown as EventDocument,
        h.organizer as unknown as OrganizerDocument,
        "paid",
        now,
      ),
    );
  }
});


test("free registration does not require an INR collection route", async () => {
  const h = await publicFixture();
  Object.assign(h.event, {priceInPaise: 0, currency: "USD",
    eventPolicy: initialPolicyFromTerms({...h.event, priceInPaise: 0,
      eventPolicy: undefined} as unknown as EventDocument)});
  await configureEventRegistration({db: h.store.db(), actorUid,
    command: {organizerId: org, eventId, requestId: "configure_usd_free",
      expectedRegistrationRevision: 1, mode: "free"},
    nowMillis: () => now});
  const saved = h.store.get(`events/${eventId}`)!;
  assert.equal(saved.publicRegistrationMode, "free");
  assert.equal(saved.currency, "USD");
  Object.assign(h.event, {priceInPaise: 10000});
  assert.throws(() => assertPublicRegistrationPolicy(
    h.event as unknown as EventDocument,
    h.organizer as unknown as OrganizerDocument, "paid", now));
});
