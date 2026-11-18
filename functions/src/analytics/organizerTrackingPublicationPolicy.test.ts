import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {join} from "node:path";
import {organizerTrackingEventPolicyReason,
  organizerTrackingPublicationPolicy as policy} from
  "./organizerTrackingPublicationPolicy";

test("publication policy v1 cites the owner decision and stays disabled",
  () => {
    assert.equal(policy.version, 1);
    assert.equal(policy.publicationAllowed, false);
    assert.equal(policy.blockedReason, "policyReviewRequired");
    assert.equal(policy.ownerDecision.reference,
      "torana-labs/catch-dating-app#2063");
    assert.match(policy.ownerDecision.decidedOn, /^\d{4}-\d{2}-\d{2}$/u);
    assert.ok(policy.outstandingChecks.includes("ownerPolicySignOff"));
    assert.ok(Object.isFrozen(policy));
    assert.ok(Object.isFrozen(policy.ownerDecision));
    assert.ok(Object.isFrozen(policy.excludedActivityKinds));
  });

test("the policy record cannot be widened at runtime", () => {
  assert.throws(() => {
    (policy as unknown as {publicationAllowed: boolean})
      .publicationAllowed = true;
  }, TypeError);
  assert.throws(() => {
    (policy.excludedActivityKinds as string[]).pop();
  }, TypeError);
  assert.equal(policy.publicationAllowed, false);
});

test("settings read publication only from the policy record", () => {
  const source = readFileSync(join(__dirname, "..", "..", "src", "analytics",
    "organizerTrackingSettings.ts"), "utf8");
  // No literal gate may come back beside the record.
  assert.doesNotMatch(source, /publicationAllowed\s*=\s*(?:false|true)/u);
  assert.doesNotMatch(source, /enabled:\s*(?:false|true)\b/u);
  assert.match(source, /organizerTrackingPublicationPolicy/u);
});

test("canonical classification: sensitive and unknown fail closed", () => {
  const event = (activityKind: string, interactionModel: string) => ({
    eventFormat: {version: 1, activityKind, interactionModel}});
  assert.equal(organizerTrackingEventPolicyReason({}),
    "eventClassificationUnavailable");
  assert.equal(organizerTrackingEventPolicyReason({eventFormat: {version: 2,
    activityKind: "running", interactionModel: "pacePods"}}),
  "eventClassificationUnavailable");
  for (const kind of policy.excludedActivityKinds) {
    assert.equal(organizerTrackingEventPolicyReason(event(kind, "pacePods")),
      "sensitiveEvent");
  }
  for (const model of policy.excludedInteractionModels) {
    assert.equal(organizerTrackingEventPolicyReason(event("running", model)),
      "sensitiveEvent");
  }
  assert.equal(organizerTrackingEventPolicyReason(event("running",
    "pacePods")), "policyReviewRequired");
});
