import {strict as assert} from "node:assert";
import {describe, it} from "node:test";
import {
  activateFormDomain, resolveCustomFormHost, revokeFormDomain,
  verifyFormDomain, type OrganizerFormDomain,
} from "./organizerFormDomains";
import {BRAND} from "../shared/generated/brand";

const now = 1_700_000_000_000;
const pending: OrganizerFormDomain = {
  hostname: "apply.client.example", organizerId: "organizer-a",
  formId: "form-a", publicFormId: "public-a",
  ownershipChallenge: "catch-verification=random-proof",
  expectedCname: `custom.${BRAND.web.domain}`, status: "pending",
  certificateStatus: "pending", verifiedAtMillis: null, generation: 1,
  reservedAtMillis: now, pendingExpiresAtMillis: now + 48 * 60 * 60 * 1000,
};
const probe = {
  hostname: pending.hostname, txtValues: [pending.ownershipChallenge],
  cnameTarget: pending.expectedCname, checkedAtMillis: now,
};

describe("custom form domain policy", () => {
  it("requires current TXT, CNAME, and certificate", () => {
    assert.equal(resolveCustomFormHost(
      pending.hostname, pending, probe, now), null);
    const verified = verifyFormDomain(pending, probe, now);
    assert.throws(() => activateFormDomain(verified, probe, now));
    const active = activateFormDomain(
      {...verified, certificateStatus: "ready"}, probe, now);
    assert.deepEqual(resolveCustomFormHost(
      pending.hostname, active, probe, now), {
      organizerId: "organizer-a", formId: "form-a",
      publicFormId: "public-a",
    });
    assert.equal(resolveCustomFormHost(
      pending.hostname, active, null, now), null);
    assert.equal(resolveCustomFormHost(
      pending.hostname, active, probe, now + 900_001), null);
    assert.equal(resolveCustomFormHost(pending.hostname, active,
      {...probe, txtValues: []}, now), null);
    assert.equal(resolveCustomFormHost(pending.hostname, active,
      {...probe, cnameTarget: "elsewhere.example"}, now), null);
    assert.equal(resolveCustomFormHost(pending.hostname, active, probe, now,
      "organizer-b"), null);
    assert.equal(resolveCustomFormHost(
      "apply.client.example.evil.test", active, probe, now), null);
    assert.equal(resolveCustomFormHost(
      "apply.client.example:443", active, probe, now), null);
    assert.equal(resolveCustomFormHost(
      `app.${BRAND.web.domain}`, active, probe, now), null);
    assert.equal(resolveCustomFormHost(
      pending.hostname, revokeFormDomain(active), probe, now), null);
  });
});
