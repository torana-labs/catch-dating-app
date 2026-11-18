import {strict as assert} from "node:assert";
import {describe, it} from "node:test";
import {
  LAPSE_GRACE_MS, newReservation, parseServedHostname, screenHostname,
  transitionCustomDomain, type CustomDomainRecord,
} from "./domainPolicy";
import {
  organizerDomainResponse, ownerProblemCode,
  parseCheckOrganizerDomainPayload, parseGetOrganizerDomainPayload,
  parseRemoveOrganizerDomainPayload, parseRequestOrganizerDomainPayload,
} from "./ownerDomainContract";

const now = 1_700_000_000_000;
const challenge = "catch-verification=Qx7Lr2Vb9Tn4Hc6Md1Ks8Wp3Yf5Ga0Ze";
const context = {atMillis: now, actor: "owner" as const, actorUid: "owner-1",
  reason: null};

function pending(hostname = "www.example-club.test"): CustomDomainRecord {
  const served = parseServedHostname(hostname)!;
  return newReservation({served, apexRedirect: {
    hostname: served.registrableDomain, mode: "registrar"},
  target: {kind: "organizerPage", organizerId: "organizer-1"},
  provider: "cloudflareSaas", expectedCname: "domains.neutral.example",
  ownershipChallenge: challenge, previous: null,
  screening: screenHostname(served), context});
}

function active(): CustomDomainRecord {
  let record = transitionCustomDomain(pending(), "verified", context,
    {verifiedAtMillis: now, pendingExpiresAtMillis: null});
  record = transitionCustomDomain(record, "provisioning", context,
    {providerHostnameId: "cf-hostname-1"});
  return transitionCustomDomain(record, "active", context, {
    activatedAtMillis: now, providerStatus: {hostname: "active",
      ssl: "active", errors: [], observedAtMillis: now}});
}

describe("owner domain callable boundary", () => {
  it("parses payloads with the generated validators and the policy", () => {
    assert.deepEqual(parseRequestOrganizerDomainPayload({
      organizerId: "organizer-1", hostname: " Example-Club.test "}), {
      organizerId: "organizer-1",
      served: {hostname: "www.example-club.test",
        registrableDomain: "example-club.test"},
      apexRedirect: {hostname: "example-club.test", mode: "registrar"}});
    assert.deepEqual(parseRequestOrganizerDomainPayload({
      organizerId: "organizer-1", hostname: "co.in"}),
    {error: "noRegistrableDomain"});
    assert.deepEqual(parseRequestOrganizerDomainPayload({
      organizerId: "organizer-1", hostname: "www.example-club.test",
      target: "form"}), {error: "invalidPayload"});
    assert.deepEqual(parseGetOrganizerDomainPayload(
      {organizerId: "organizer-1"}), {organizerId: "organizer-1"});
    assert.equal(parseGetOrganizerDomainPayload({}), null);
    const exact = {organizerId: "organizer-1",
      hostname: "www.example-club.test", generation: 1};
    assert.deepEqual(parseCheckOrganizerDomainPayload(exact), exact);
    assert.deepEqual(parseRemoveOrganizerDomainPayload(exact), exact);
    assert.equal(parseCheckOrganizerDomainPayload({...exact,
      hostname: "WWW.example-club.test"}), null);
    assert.equal(parseRemoveOrganizerDomainPayload({...exact,
      generation: undefined}), null);
  });

  it("names the missing DNS record from a fresh failing probe", () => {
    const record = pending();
    const probe = {hostname: record.hostname, txtValues: [challenge],
      cnameTarget: record.expectedCname, checkedAtMillis: now};
    assert.equal(ownerProblemCode(record, now), null);
    assert.equal(ownerProblemCode(record, now, probe), null);
    assert.equal(ownerProblemCode(record, now,
      {...probe, txtValues: []}), "dnsTxtMissing");
    assert.equal(ownerProblemCode(record, now,
      {...probe, cnameTarget: null}), "dnsCnameMissing");
    assert.equal(ownerProblemCode(record, now,
      {...probe, cnameTarget: "other.example"}), "dnsCnameMismatch");
    assert.equal(ownerProblemCode(record,
      record.pendingExpiresAtMillis!), "leaseExpired");
    assert.equal(ownerProblemCode(pending("www.club-login.test"), now),
      "heldForReview");
    assert.equal(ownerProblemCode(transitionCustomDomain(record, "failed",
      context), now), "providerError");
    assert.equal(ownerProblemCode(transitionCustomDomain(record, "suspended",
      context, {suspension: {reason: "Report", byUid: "admin-1",
        atMillis: now}}), now), "suspended");
  });

  it("returns a bounded, contract-valid view", () => {
    const live = active();
    const response = organizerDomainResponse({organizerId: "organizer-1",
      role: "owner", manageBlockedReason: "none", record: live,
      nowMillis: now, nextCheckAllowedAtMillis: now + 60_000});
    assert.equal(response.canManage, true);
    assert.equal(response.domain?.liveUrl, "https://www.example-club.test/");
    assert.equal(response.domain?.nextCheckAllowedAtMillis, now + 60_000);
    const serialized = JSON.stringify(response);
    for (const secret of ["cf-hostname-1", "owner-1", "history",
      "providerStatus", "createdByUid"]) {
      assert.equal(serialized.includes(secret), false, secret);
    }
    const lapsed = transitionCustomDomain(live, "lapsed", context,
      {lapsedAtMillis: now});
    assert.equal(organizerDomainResponse({organizerId: "organizer-1",
      role: "manager", manageBlockedReason: "notOwner", record: lapsed,
      nowMillis: now}).domain?.lapseRemovalAtMillis, now + LAPSE_GRACE_MS);
    const removed = transitionCustomDomain(live, "removed", context);
    assert.equal(organizerDomainResponse({organizerId: "organizer-1",
      role: "owner", manageBlockedReason: "none", record: removed,
      nowMillis: now}).domain, null);
    assert.equal(organizerDomainResponse({organizerId: "organizer-1",
      role: "owner", manageBlockedReason: "none", record: removed,
      nowMillis: now, showEnded: true}).domain?.status, "removed");
    assert.equal(organizerDomainResponse({organizerId: "organizer-1",
      role: "manager", manageBlockedReason: "notOwner", record: null,
      nowMillis: now}).canManage, false);
  });
});
