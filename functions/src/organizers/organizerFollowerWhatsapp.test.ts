import assert from "node:assert/strict";
import test from "node:test";
import {Timestamp} from "firebase-admin/firestore";
import type {
  OrganizerCommunicationPreferenceDocument,
  OrganizerMessageTemplateDocument,
  OrganizerSenderConnectionDocument,
} from "../shared/generated/firestoreAdminTypes";
import {
  effectiveFollowerWhatsappStatus,
  followByPhonePermissionReceipt,
  followerUpdateTemplateReady,
  followerUpdateTemplateText,
  followerWhatsappConsentCopyHash,
  followerWhatsappGrant,
  followerWhatsappTermsVersion,
  resolveFollowerWhatsappPlan,
} from "./organizerFollowerWhatsapp";

const phone = "+919812345678";
const at = (millis: number) => Timestamp.fromMillis(millis);

function preference(
  overrides: Partial<OrganizerCommunicationPreferenceDocument> = {},
): OrganizerCommunicationPreferenceDocument {
  const unknown = {status: "unknown" as const,
    evidenceStatus: "notApplicable" as const, currentReceiptId: null,
    termsVersion: null, source: null, sourceEventId: null, updatedAt: null};
  return {organizerId: "org-1", uid: "uid-1", whatsapp: unknown, sms: unknown,
    whatsappPurposes: {followerUpdates: followerWhatsappGrant({
      receiptId: "ocpr_grant", endpointE164: phone, now: at(2_000)})},
    createdAt: at(1_000), updatedAt: at(2_000), ...overrides};
}

test("a complete follower grant bound to the same phone is opted in", () => {
  assert.equal(effectiveFollowerWhatsappStatus(preference(), phone), "optedIn");
});

test("a changed verified phone makes the grant unknown, never opted in",
  () => {
    assert.equal(effectiveFollowerWhatsappStatus(preference(),
      "+919800000000"), "unknown");
    assert.equal(effectiveFollowerWhatsappStatus(preference(), null),
      "unknown");
  });

test("a later broad withdrawal or STOP wins over the follower grant", () => {
  const withdrawn = preference({whatsapp: {status: "optedOut",
    evidenceStatus: "complete", currentReceiptId: "pmpr_x",
    termsVersion: null, source: "participantSettings", sourceEventId: null,
    updatedAt: at(3_000)}});
  assert.equal(effectiveFollowerWhatsappStatus(withdrawn, phone), "optedOut");
  assert.equal(effectiveFollowerWhatsappStatus(preference(), phone, 2_500),
    "optedOut");
  // A grant given after the STOP re-opens the route.
  assert.equal(effectiveFollowerWhatsappStatus(preference(), phone, 1_500),
    "optedIn");
});

test("campaign marketing consent never reads as follower consent", () => {
  const marketingOnly = preference({whatsappPurposes: {marketing:
    followerWhatsappGrant({receiptId: "ocpr_m", endpointE164: phone,
      now: at(2_000)})}});
  assert.equal(effectiveFollowerWhatsappStatus(marketingOnly, phone),
    "unknown");
});

test("plan resolution names the first blocker", () => {
  const base = {verifiedPhoneE164: phone, preference: preference(),
    stoppedAtMillis: null, senderReady: true};
  assert.deepEqual(resolveFollowerWhatsappPlan(base), {
    routeId: "organizerFollowerWhatsapp", availability: "available",
    blocker: null});
  assert.equal(resolveFollowerWhatsappPlan({...base, senderReady: false})
    .blocker, "senderUnavailable");
  assert.equal(resolveFollowerWhatsappPlan({...base, verifiedPhoneE164: null})
    .blocker, "missingPhone");
  assert.equal(resolveFollowerWhatsappPlan({...base, preference: null})
    .blocker, "permissionRequired");
  assert.equal(resolveFollowerWhatsappPlan({...base, stoppedAtMillis: 9_000})
    .blocker, "contactOptedOut");
});

test("the grant receipt carries reviewed copy, purpose and phone", () => {
  const {id, document} = followByPhonePermissionReceipt({organizerId: "org-1",
    uid: "uid-1", endpointE164: phone, requestId: "req-1",
    supersedesReceiptId: null, now: at(5_000)});
  assert.match(id, /^ocpr_[a-f0-9]{48}$/u);
  assert.equal(document.purpose, "followerUpdates");
  assert.equal(document.endpointE164, phone);
  assert.equal(document.source, "organizerFollowByPhone");
  assert.equal(document.consentCopyHash,
    followerWhatsappConsentCopyHash(followerWhatsappTermsVersion));
  assert.equal(followerWhatsappConsentCopyHash("unknown-v0"), null);
});

test("the template must be the approved one-variable follower template",
  () => {
    const connection = {organizerId: "org-1", channel: "whatsapp",
      status: "active", phoneNumberId: "pn-1",
      secretVersionResource: "projects/p/secrets/s/versions/1"} as
      OrganizerSenderConnectionDocument;
    const template = {organizerId: "org-1", connectionId: "pn-1",
      name: "organizer_follower_update", status: "APPROVED",
      hasMediaHeader: false, variableNames: ["update_text"],
      parameterBindings: [{variableName: "update_text", component: "body",
        position: 0, buttonIndex: null}]} as unknown as
      OrganizerMessageTemplateDocument;
    const ready = (overrides: Partial<OrganizerMessageTemplateDocument>) =>
      followerUpdateTemplateReady({organizerId: "org-1",
        connectionId: "conn-1", connection,
        template: {...template, ...overrides}});
    assert.equal(ready({}), true);
    assert.equal(ready({connectionId: "conn-1"}), true);
    assert.equal(ready({status: "PENDING"}), false);
    assert.equal(ready({name: "organizer_promo"}), false);
    assert.equal(ready({variableNames: ["a", "b"]}), false);
    assert.equal(followerUpdateTemplateReady({organizerId: "org-1",
      connectionId: "conn-1", connection: {...connection, status: "degraded"},
      template}), false);
  });

test("template text is one line for Meta parameters", () => {
  assert.equal(followerUpdateTemplateText("New date!\n\nSunday   7am\tCubbon"),
    "New date! Sunday 7am Cubbon");
});
