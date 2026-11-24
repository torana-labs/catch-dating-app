import assert from "node:assert/strict";
import test from "node:test";
import type {
  EventDocument,
  OrganizerCampaignDocument,
  OrganizerContactDocument,
  OrganizerContactTraitDocument,
} from "../shared/generated/firestoreAdminTypes";
import {
  campaignAudienceSnapshotHash,
  campaignVariables,
  evaluateAudienceRows,
  hasReachableCampaignRecipient,
} from "./organizerCampaigns";
import * as admin from "firebase-admin";
import {BRAND} from "../shared/generated/brand";
import {effectiveContactKeys, type ContactGrant, type ContactPermission} from
  "../shared/contactPermissions";

function marketing(grant: Partial<ContactGrant> = {}): ContactPermission {
  const grants = {"whatsapp:marketing": {status: "optedIn" as const,
    endpointE164: "+919876543210", receiptId: "receipt-1",
    termsVersion: "organizer-updates-v1",
    source: "publicEventRegistration" as const,
    updatedAt: admin.firestore.Timestamp.fromMillis(9_000), ...grant}};
  return {senderKind: "organizer", senderId: "organizer-1", grants,
    granted: effectiveContactKeys(grants),
    updatedAt: admin.firestore.Timestamp.fromMillis(9_000)};
}

test("campaign preview rejects empty and fully excluded audiences", () => {
  assert.equal(hasReachableCampaignRecipient([]), false);
  assert.equal(
    hasReachableCampaignRecipient([
      {eligibility: "excluded"},
      {eligibility: "excluded"},
    ]),
    false,
  );
  assert.equal(
    hasReachableCampaignRecipient([
      {eligibility: "excluded"},
      {eligibility: "eligible"},
    ]),
    true,
  );
});

test(
  "campaign invite variables distinguish full links from URL suffixes",
  () => {
    const campaign = {
      eventId: "event-1",
      templateVariables: {first_name: "Maya"},
    } as unknown as OrganizerCampaignDocument;
    const event = {} as EventDocument;
    const token = "v2_invite-1_abcdefghijklmnopqrstuvwxyz12345678901234567";

    assert.deepEqual(
      campaignVariables(campaign, token, event, ["first_name", "invite_url"]),
      {
        first_name: "Maya",
        invite_url: `${BRAND.web.origin}/invite/${token}`,
      },
    );
    assert.deepEqual(
      campaignVariables(campaign, token, event, ["first_name", "invite_token"]),
      {first_name: "Maya", invite_token: encodeURIComponent(token)},
    );
  }
);

test("campaign eligibility needs an effective grant for the contact's number",
  () => {
    const now = admin.firestore.Timestamp.fromMillis(10_000);
    const contact = {
      organizerId: "organizer-1",
      linkedUid: "user-1",
      phoneE164: "+919876543210",
      identityState: "verified",
      identityConfidence: "verified",
      deletedAt: null,
      hiddenAt: null,
    } as OrganizerContactDocument;
    const trait = {
      segmentIds: ["repeat_attendee"],
    } as OrganizerContactTraitDocument;
    const evaluate = (permission: ContactPermission | null) =>
      evaluateAudienceRows([{contactId: "contact-1", contact, trait,
        permission, channelState: null}], now, ["repeat_attendee"])[0];
    assert.equal(evaluate(marketing()).eligibility, "eligible");
    for (const permission of [
      null,
      marketing({receiptId: null}),
      marketing({endpointE164: "+919800000002"}),
      marketing({endpointE164: null}),
      marketing({source: "hostFormResponse",
        termsVersion: "form-whatsapp-v2"}),
      {...marketing(), senderId: "organizer-2"},
    ]) {
      const row = evaluate(permission);
      assert.equal(row.eligibility, "excluded");
      assert.equal(row.exclusionReason, "unknownPermission");
    }
    const stopped = evaluate(marketing({status: "optedOut",
      endpointE164: null, source: "inboundStop", termsVersion: null}));
    assert.equal(stopped.exclusionReason, "optedOut");
  });

test(
  "campaign audience snapshots are order-stable and consent-sensitive",
  () => {
    const now = admin.firestore.Timestamp.fromMillis(10_000);
    const contact = {
      organizerId: "organizer-1",
      linkedUid: "user-1",
      phoneE164: "+919876543210",
      identityState: "verified",
      identityConfidence: "verified",
      deletedAt: null,
      hiddenAt: null,
    } as OrganizerContactDocument;
    const trait = {
      segmentIds: ["repeat_attendee"],
    } as OrganizerContactTraitDocument;
    const permission = marketing();
    const rows = evaluateAudienceRows([
      {
        contactId: "contact-b",
        contact: {...contact, phoneE164: "+919876543211"},
        trait,
        permission,
        channelState: null,
      },
      {
        contactId: "contact-a",
        contact,
        trait,
        permission,
        channelState: null,
      },
    ], now, ["repeat_attendee"]);

    assert.equal(
      campaignAudienceSnapshotHash(rows),
      campaignAudienceSnapshotHash([...rows].reverse()),
    );

    const changed = evaluateAudienceRows([{
      contactId: "contact-a",
      contact,
      trait,
      permission: marketing({receiptId: null}),
      channelState: null,
    }], now, ["repeat_attendee"]);
    assert.notEqual(
      campaignAudienceSnapshotHash(rows.filter((row) =>
        row.contactId === "contact-a")),
      campaignAudienceSnapshotHash(changed),
    );
  },
);
