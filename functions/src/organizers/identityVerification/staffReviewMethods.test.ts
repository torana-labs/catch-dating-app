import assert from "node:assert/strict";
import test from "node:test";
import {VERIFICATION_METHODS} from "./methods";
import {
  STAFF_REVIEW_METHODS,
  staffReviewMethod,
  type ChannelProofClaim,
} from "./staffReviewMethods";

/** The listing request rules as they stood before they moved here. */
function previousRule(method: string, claim: ChannelProofClaim) {
  if (method === "instagramCode" && !claim.officialHandle) return "handle";
  if (method === "domainEmail") {
    if (!claim.officialDomain) return "domain";
    const emailDomain = claim.requesterEmail.split("@")[1] ?? "";
    if (emailDomain !== claim.officialDomain &&
        !emailDomain.endsWith(`.${claim.officialDomain}`)) {
      return "domainEmail";
    }
  }
  if (method === "letterhead" && !claim.officialDomain &&
      !claim.officialHandle) {
    return "domain";
  }
  return null;
}

test("every staff-review rule matches the listing request rule it replaced",
  () => {
    const handles = [undefined, "", "lanternlanesocial"];
    const domains = [undefined, "", "lanternlane.example"];
    const emails = ["ops@lanternlane.example", "ops@mail.lanternlane.example",
      "ops@notlanternlane.example", "ops@other.example", "no-at-sign"];
    let cases = 0;
    for (const method of STAFF_REVIEW_METHODS) {
      for (const officialHandle of handles) {
        for (const officialDomain of domains) {
          for (const requesterEmail of emails) {
            const claim = {officialHandle, officialDomain, requesterEmail};
            assert.equal(method.requestProblem(claim),
              previousRule(method.id, claim),
              `${method.id} ${JSON.stringify(claim)}`);
            cases += 1;
          }
        }
      }
    }
    assert.equal(cases, 3 * 3 * 3 * 5);
  });

test("staff-review methods name the automated method for the same channel",
  () => {
    const automated = new Set(VERIFICATION_METHODS.map((method) => method.id));
    for (const method of STAFF_REVIEW_METHODS) {
      assert.equal(method.kind, "staffReview");
      if (method.automatedEquivalent) {
        assert.ok(automated.has(method.automatedEquivalent), method.id);
      }
    }
    assert.equal(staffReviewMethod("instagramCode").automatedEquivalent,
      "instagramMessage");
    assert.throws(() => staffReviewMethod("smokeSignal"), /Unknown/u);
  });
