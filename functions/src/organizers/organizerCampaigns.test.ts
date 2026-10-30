import assert from "node:assert/strict";
import test from "node:test";
import type {
  EventDocument,
  OrganizerCampaignDocument,
  OrganizerCommunicationPreferenceDocument,
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

test("campaign eligibility fails closed for an incomplete legacy grant", () => {
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
  const preference = {
    organizerId: "organizer-1",
    uid: "user-1",
    whatsapp: {
      status: "optedIn",
      evidenceStatus: "incomplete",
      currentReceiptId: "legacy-receipt",
      termsVersion: "organizer-updates-v1",
      source: "publicEventRegistration",
    },
  } as OrganizerCommunicationPreferenceDocument;
  const [row] = evaluateAudienceRows([{
    contactId: "contact-1",
    contact,
    trait,
    preference,
    channelState: null,
  }], now, ["repeat_attendee"]);
  assert.equal(row.eligibility, "excluded");
  assert.equal(row.exclusionReason, "unknownPermission");
  preference.whatsapp.evidenceStatus = "complete";
  const [eligible] = evaluateAudienceRows([{
    contactId: "contact-1",
    contact,
    trait,
    preference,
    channelState: null,
  }], now, ["repeat_attendee"]);
  assert.equal(eligible.eligibility, "eligible");
  for (const termsVersion of ["v1", "2026-08-30"]) {
    const [ambiguous] = evaluateAudienceRows([{
      contactId: "contact-1", contact, trait,
      preference: {...preference, whatsapp: {...preference.whatsapp,
        termsVersion}},
      channelState: null,
    }], now, ["repeat_attendee"]);
    assert.equal(ambiguous.eligibility, "excluded");
    assert.equal(ambiguous.exclusionReason, "unknownPermission");
  }
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
    const preference = {
      organizerId: "organizer-1",
      uid: "user-1",
      whatsapp: {
        status: "optedIn",
        evidenceStatus: "complete",
        currentReceiptId: "receipt-1",
        termsVersion: "organizer-updates-v1",
        source: "publicEventRegistration",
        updatedAt: admin.firestore.Timestamp.fromMillis(9_000),
      },
    } as OrganizerCommunicationPreferenceDocument;
    const rows = evaluateAudienceRows([
      {
        contactId: "contact-b",
        contact: {...contact, phoneE164: "+919876543211"},
        trait,
        preference,
        channelState: null,
      },
      {
        contactId: "contact-a",
        contact,
        trait,
        preference,
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
      preference: {
        ...preference,
        whatsapp: {...preference.whatsapp, evidenceStatus: "incomplete"},
      },
      channelState: null,
    }], now, ["repeat_attendee"]);
    assert.notEqual(
      campaignAudienceSnapshotHash(rows.filter((row) =>
        row.contactId === "contact-a")),
      campaignAudienceSnapshotHash(changed),
    );
  },
);
