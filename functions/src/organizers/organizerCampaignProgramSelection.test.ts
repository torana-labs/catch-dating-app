import {seedWorkspaceFieldAssertions} from
  "../workspaces/workspaceFieldFixture";
import assert from "node:assert/strict";
import test from "node:test";
import {createHash} from "node:crypto";
import * as admin from "firebase-admin";
import type {CallableRequest} from "firebase-functions/v2/https";
import type {Firestore} from "firebase-admin/firestore";
import type {
  OrganizerCampaignRecipientDocument,
} from "../shared/generated/firestoreAdminTypes";
import type {CampaignWhatsappDispatchDocument}
  from "../shared/generated/campaignWhatsappDispatchDocument";
import {
  approveOrganizerCampaignHandler,
  previewOrganizerCampaignHandler,
  upsertOrganizerCampaignHandler,
} from "./organizerCampaigns";
import {dispatchCampaign} from "./organizerCampaignDispatcher";
import {
  CAMPAIGN_WHATSAPP_DISPATCHES,
} from "./campaignDeliveryWorker";
import {CampaignWhatsappDeliveryStore} from
  "./campaignWhatsappDeliveryStore";
import {whatsappStatusCorrelation} from
  "../eventSuccess/operations/whatsappDeliveryProtocol";
import {whatsappEndpointHash} from
  "../eventSuccess/operations/whatsappReplyProtocol";
import {MetaProviderError} from "./organizerWhatsappProvider";
import {
  hashEndpoint,
  organizerCampaignFrequencyCapMillis,
} from "./organizerCampaignModel";
import {FakeFirestore} from "../shared/testing/programFirestore";

const NOW = admin.firestore.Timestamp.fromMillis(1_800_000_000_000);
const OWNER = "owner-1";

function request(data: Record<string, unknown>): CallableRequest<unknown> {
  return {
    auth: {uid: OWNER},
    data,
    rawRequest: {},
  } as CallableRequest<unknown>;
}

function deps(db: FakeFirestore) {
  return {
    firestore: () => db as unknown as FirebaseFirestore.Firestore,
    checkRateLimit: async () => undefined,
    now: () => NOW,
  };
}

type FakeData = Record<string, unknown>;

function functionGuest(
  functionId: string,
  guestId: string,
  rsvpStatus: string,
): FakeData {
  return {
    programId: "program-1",
    organizerId: "org-1",
    functionId,
    guestId,
    invited: true,
    rsvpStatus,
    attendanceStatus: "expected",
    partySize: null,
    revision: 1,
    createdAt: NOW,
    updatedAt: NOW,
  };
}

function seedBase(): Record<string, FakeData> {
  const synthetic: Record<string, FakeData> = {
    "organizers/org-1": {
      ownerUserId: OWNER,
      hostUserIds: [],
      hostProfiles: [],
    },
    "organizerPrograms/program-1": {
      organizerId: "org-1",
      status: "active",
      name: "Sharma-Mehta Wedding",
      revision: 1,
      createdAt: NOW,
      updatedAt: NOW,
    },
    "programFunctions/fn-mehndi": {
      programId: "program-1",
      organizerId: "org-1",
      status: "scheduled",
      invitationMode: "allGuests",
      revision: 1,
      createdAt: NOW,
      updatedAt: NOW,
    },
    // Two guests share household hh-1 (dedupe to one recipient).
    "programGuests/g-1": {
      programId: "program-1",
      organizerId: "org-1",
      householdId: "hh-1",
      phoneE164: "+919800000001",
      invitationStatus: "invited",
    },
    "programGuests/g-2": {
      programId: "program-1",
      organizerId: "org-1",
      householdId: "hh-1",
      phoneE164: "+919800000002",
      invitationStatus: "invited",
    },
    // Standalone guest with a reachable phone.
    "programGuests/g-3": {
      programId: "program-1",
      organizerId: "org-1",
      householdId: null,
      phoneE164: "+919800000003",
      invitationStatus: "invited",
    },
    // Standalone guest with no phone -> excluded recipient row.
    "programGuests/g-4": {
      programId: "program-1",
      organizerId: "org-1",
      householdId: null,
      phoneE164: null,
      invitationStatus: "invited",
    },
    // Declined household still resolves; consent flips it excluded.
    "programGuests/g-5": {
      programId: "program-1",
      organizerId: "org-1",
      householdId: "hh-2",
      phoneE164: "+919800000005",
      invitationStatus: "invited",
    },
    "programFunctionGuests/fn-mehndi_g-1":
      functionGuest("fn-mehndi", "g-1", "attending"),
    "programFunctionGuests/fn-mehndi_g-2":
      functionGuest("fn-mehndi", "g-2", "attending"),
    "programFunctionGuests/fn-mehndi_g-3":
      functionGuest("fn-mehndi", "g-3", "attending"),
    "programFunctionGuests/fn-mehndi_g-4":
      functionGuest("fn-mehndi", "g-4", "attending"),
    "programFunctionGuests/fn-mehndi_g-5":
      functionGuest("fn-mehndi", "g-5", "declined"),
    "programHouseholds/hh-1": {
      programId: "program-1",
      organizerId: "org-1",
      messagingConsent: {
        granted: true,
        grantedAt: NOW,
        source: "householdRsvpLink",
      },
      revision: 1,
      createdAt: NOW,
      updatedAt: NOW,
    },
    "programHouseholds/hh-2": {
      programId: "program-1",
      organizerId: "org-1",
      messagingConsent: {
        granted: false,
        grantedAt: NOW,
        source: "householdRsvpLink",
      },
      revision: 1,
      createdAt: NOW,
      updatedAt: NOW,
    },
    "organizerSenderConnections/conn-1": {
      organizerId: "org-1",
      provider: "metaCloudApi",
      status: "active",
      secretVersionResource: "projects/p/secrets/s/versions/1",
      phoneNumberId: "110000000000001",
      wabaId: "110000000000002",
      revision: 1,
    },
    "organizerMessageTemplates/tpl-1": {
      organizerId: "org-1",
      connectionId: "conn-1",
      status: "APPROVED",
      variableNames: [],
      parameterBindings: [],
    },
  };
  return seedWorkspaceFieldAssertions(synthetic);
}

function programUpsert(extra: FakeData = {}): Record<string, unknown> {
  return {
    organizerId: "org-1",
    requestId: "req-program-selection-1",
    name: "Mehndi save the date",
    messageClass: "organizerUpdate",
    savedAudienceId: null,
    recipientSource: {
      kind: "programSelection",
      programId: "program-1",
      functionIds: null,
      rsvpStatuses: null,
      householdDedupe: true,
    },
    connectionId: "conn-1",
    templateId: "tpl-1",
    templateVariables: {},
    ...extra,
  };
}

function campaignIdOf(db: FakeFirestore): string {
  const key = [...db.docs.keys()]
    .find((path) => path.startsWith("organizerCampaigns/"));
  assert.ok(key, "expected an organizerCampaigns doc");
  return key!.split("/")[1];
}

function recipients(db: FakeFirestore): [string, FakeData][] {
  return [...db.docs.entries()]
    .filter(([path]) => path.startsWith("organizerCampaignRecipients/"))
    .sort(([a], [b]) => a.localeCompare(b));
}

async function upsert(db: FakeFirestore, data: Record<string, unknown>) {
  return upsertOrganizerCampaignHandler(request(data), deps(db));
}

test("programSelection upsert validates audience exclusivity and program",
  async () => {
    const denied = (err: unknown) =>
      (err as {code?: string}).code === "invalid-argument";
    const precondition = (err: unknown) =>
      (err as {code?: string}).code === "failed-precondition";

    await assert.rejects(
      upsert(new FakeFirestore(seedBase()),
        programUpsert({savedAudienceId: "aud-1"})),
      denied,
    );
    await assert.rejects(
      upsert(new FakeFirestore(seedBase()),
        programUpsert({eventId: "event-1"})),
      denied,
    );
    const missingProgram = seedBase();
    delete missingProgram["organizerPrograms/program-1"];
    await assert.rejects(
      upsert(new FakeFirestore(missingProgram), programUpsert()),
      precondition,
    );
    const foreign = seedBase();
    foreign["organizerPrograms/program-1"] = {
      ...(foreign["organizerPrograms/program-1"] as FakeData),
      organizerId: "org-other",
    };
    await assert.rejects(
      upsert(new FakeFirestore(foreign), programUpsert()),
      precondition,
    );
    // CRM path still requires savedAudienceId.
    const crmPayload = programUpsert({recipientSource: null});
    await assert.rejects(
      upsert(new FakeFirestore(seedBase()), crmPayload),
      denied,
    );
  },
);

async function materialize(db: FakeFirestore) {
  await upsert(db, programUpsert());
  const campaignId = campaignIdOf(db);
  await previewOrganizerCampaignHandler(
    request({organizerId: "org-1", campaignId, expectedRevision: null}),
    deps(db),
  );
  await approveOrganizerCampaignHandler(
    request({organizerId: "org-1", campaignId, expectedRevision: null}),
    deps(db),
  );
  return campaignId;
}

test(
  "program audience materializes deduped recipients with provenance",
  async () => {
    const db = new FakeFirestore(seedBase());
    const campaignId = await materialize(db);
    const rows = recipients(db);
    assert.equal(rows.length, 4);
    const byKey = new Map(
      rows.map(([, doc]) => {
        const recipient = doc as unknown as
          OrganizerCampaignRecipientDocument;
        return [recipient.programRecipient?.recipientKey ?? "", recipient];
      }),
    );
    const household = byKey.get("household:hh-1")!;
    assert.equal(household.contactId, null);
    assert.equal(household.status, "pending");
    assert.equal(household.eligibility, "eligible");
    assert.equal(household.endpointE164, "+919800000001");
    assert.deepEqual(household.programRecipient?.guestIds, ["g-1", "g-2"]);
    assert.equal(household.programRecipient?.endpointGuestId, "g-1");
    assert.equal(household.programRecipient?.householdId, "hh-1");

    const standalone = byKey.get("guest:g-3")!;
    assert.equal(standalone.status, "pending");
    assert.equal(standalone.endpointE164, "+919800000003");
    assert.equal(standalone.programRecipient?.householdId, null);

    const noPhone = byKey.get("guest:g-4")!;
    assert.equal(noPhone.status, "suppressed");
    assert.equal(noPhone.exclusionReason, "noVerifiedEndpoint");

    const declined = byKey.get("household:hh-2")!;
    assert.equal(declined.status, "suppressed");
    assert.equal(declined.exclusionReason, "optedOut");

    const campaign = db.getDoc(`organizerCampaigns/${campaignId}`)!;
    assert.equal(campaign.status, "approved");
    assert.equal(
      (campaign.deliveryCounts as FakeData).pending, 2);
    assert.equal(
      (campaign.deliveryCounts as FakeData).suppressed, 2);
    assert.equal(
      (campaign.audienceCounts as FakeData).reachable, 2);
    assert.equal(
      (campaign.audienceCounts as FakeData).optedOut, 1);
    assert.equal(
      (campaign.audienceCounts as FakeData).invalid, 1);
  },
);

function dispatcherDeps(db: FakeFirestore) {
  return {
    runtimeProjectId: () => "demo-catch-rules",
    firestore: () => db as unknown as FirebaseFirestore.Firestore,
    checkRateLimit: async () => undefined,
    tokenStore: {accessBound: async () => "test-token"} as never,
    provider: () => ({
      sendTemplate: async () => ({providerMessageId: "wamid-test-1"}),
    }) as never,
    now: () => NOW,
  };
}

test(
  "program dispatch sends without CRM channel state",
  async () => {
    const db = new FakeFirestore(seedBase());
    const campaignId = await materialize(db);
    await dispatchCampaign({
      db: db as unknown as FirebaseFirestore.Firestore,
      organizerId: "org-1",
      campaignId,
      expectedRevision: null,
      deps: dispatcherDeps(db),
    });
    const rows = recipients(db);
    const accepted = rows.filter(([, doc]) =>
      (doc as FakeData).status === "accepted");
    assert.equal(accepted.length, 2);
    for (const [, doc] of accepted) {
      assert.equal((doc as FakeData).providerMessageId, "wamid-test-1");
    }
    // No CRM channel-state doc exists for program recipients.
    assert.equal(
      [...db.docs.keys()].filter((path) =>
        path.startsWith("organizerContactChannelStates/")).length,
      0,
    );
    const campaign = db.getDoc(`organizerCampaigns/${campaignId}`)!;
    assert.equal(campaign.status, "completed");
  },
);

test(
  "consent revoked after approve suppresses at claim time",
  async () => {
    const db = new FakeFirestore(seedBase());
    const campaignId = await materialize(db);
    db.updateDoc("programHouseholds/hh-1", {
      messagingConsent: {granted: false, grantedAt: NOW, source: "staff"},
    });
    await dispatchCampaign({
      db: db as unknown as FirebaseFirestore.Firestore,
      organizerId: "org-1",
      campaignId,
      expectedRevision: null,
      deps: dispatcherDeps(db),
    });
    const byKey = new Map(
      recipients(db).map(([, doc]) => {
        const recipient = doc as unknown as
          OrganizerCampaignRecipientDocument;
        return [recipient.programRecipient?.recipientKey ?? "", recipient];
      }),
    );
    assert.equal(byKey.get("household:hh-1")!.status, "suppressed");
    assert.equal(
      byKey.get("household:hh-1")!.exclusionReason, "optedOut");
    assert.equal(byKey.get("guest:g-3")!.status, "accepted");
    const campaign = db.getDoc(`organizerCampaigns/${campaignId}`)!;
    assert.equal((campaign.deliveryCounts as FakeData).accepted, 1);
    assert.equal((campaign.deliveryCounts as FakeData).suppressed, 3);
  },
);

test(
  "recent sends to the same endpoint frequency-cap program recipients",
  async () => {
    const db = new FakeFirestore(seedBase());
    const campaignId = await materialize(db);
    const priorAccepted: FakeData = {
      organizerId: "org-1",
      campaignId: "campaign-earlier",
      contactId: null,
      channel: "whatsapp",
      eligibility: "eligible",
      exclusionReason: null,
      endpointE164: "+919800000003",
      endpointHash: hashEndpoint("+919800000003"),
      status: "accepted",
      acceptedAt: admin.firestore.Timestamp.fromMillis(
        NOW.toMillis() - organizerCampaignFrequencyCapMillis + 60_000),
      attemptCount: 1,
      retryEligible: false,
      createdAt: NOW,
      updatedAt: NOW,
    };
    db.setDoc("organizerCampaignRecipients/prior-1", priorAccepted);
    await dispatchCampaign({
      db: db as unknown as FirebaseFirestore.Firestore,
      organizerId: "org-1",
      campaignId,
      expectedRevision: null,
      deps: dispatcherDeps(db),
    });
    const byKey = new Map(
      recipients(db)
        .filter(([path]) => path !== "organizerCampaignRecipients/prior-1")
        .map(([, doc]) => {
          const recipient = doc as unknown as
            OrganizerCampaignRecipientDocument;
          return [recipient.programRecipient?.recipientKey ?? "", recipient];
        }),
    );
    assert.equal(byKey.get("guest:g-3")!.status, "suppressed");
    assert.equal(
      byKey.get("guest:g-3")!.exclusionReason, "frequencyCapped");
    assert.equal(byKey.get("household:hh-1")!.status, "accepted");
  },
);

const ts = (millis: number) => ({_seconds: Math.floor(millis / 1000),
  _nanoseconds: (millis % 1000) * 1_000_000});

test(
  "a crash between claim and submit never resends and reconciles on evidence",
  async () => {
    const db = new FakeFirestore(seedBase());
    const campaignId = await materialize(db);
    const recipientId = recipients(db)
      .map(([path]) => path.split("/")[1])
      .find((id) =>
        (db.getDoc(`organizerCampaignRecipients/${id}`) as
          unknown as OrganizerCampaignRecipientDocument)
          .programRecipient?.recipientKey === "guest:g-3")!;
    let sends = 0;
    const deps = (now: FirebaseFirestore.Timestamp) => ({
      runtimeProjectId: () => "demo-catch-rules",
      firestore: () => db as unknown as FirebaseFirestore.Firestore,
      checkRateLimit: async () => undefined,
      tokenStore: {accessBound: async () => "test-token"} as never,
      provider: () => ({
        sendTemplate: async (args: {toE164: string}) => {
          sends += 1;
          if (args.toE164 === "+919800000003") {
            throw new MetaProviderError("timeout", null, null,
              "outcomeUnknown");
          }
          return {providerMessageId: "wamid-hh"};
        },
      }) as never,
      now: () => now,
    });
    const dispatch = () => dispatchCampaign({
      db: db as unknown as FirebaseFirestore.Firestore,
      organizerId: "org-1",
      campaignId,
      expectedRevision: null,
      deps: deps(admin.firestore.Timestamp.fromMillis(NOW.toMillis())),
    });
    // First pass: hh-1 delivers; g-3's send outcome is ambiguous — the old
    // code would have reclaimed its expired lease and resent.
    await dispatch();
    assert.equal(sends, 2);
    const recipient = () => db.getDoc(
      `organizerCampaignRecipients/${recipientId}`) as unknown as
      OrganizerCampaignRecipientDocument;
    assert.equal(recipient().status, "sending");
    const campaign = () => db.getDoc(`organizerCampaigns/${campaignId}`)!;
    assert.equal(campaign().status, "blocked");
    // Re-dispatch at a later clock: recovery reconciles, never resends.
    const later = admin.firestore.Timestamp.fromMillis(
      NOW.toMillis() + 10 * 60 * 1000);
    await dispatchCampaign({
      db: db as unknown as FirebaseFirestore.Firestore,
      organizerId: "org-1",
      campaignId,
      expectedRevision: null,
      deps: deps(later),
    });
    assert.equal(sends, 2, "unknown outcome must reconcile, not resend");
    assert.equal(recipient().status, "sending");
    // Evidence arrives through the signed webhook corridor.
    const evidence = [...db.docs.entries()]
      .filter(([path]) =>
        path.startsWith(CAMPAIGN_WHATSAPP_DISPATCHES + "/"))
      .map(([, doc]) => doc as unknown as CampaignWhatsappDispatchDocument)
      .find((doc) => doc.context.recipientId === recipientId)!;
    assert.ok(evidence, "claim must have committed dispatch evidence");
    const providerEventId = `status:wamid-g3:failed:${NOW.toMillis() +
      60_000}`;
    const eventId = "omwe_" + createHash("sha256")
      .update(providerEventId).digest("hex").slice(0, 48);
    db.setDoc(`organizerMessagingWebhookEvents/${eventId}`, {
      provider: "metaCloudApi",
      providerEventId,
      organizerId: "org-1",
      connectionId: "conn-1",
      eventKind: "status",
      providerMessageId: "wamid-g3",
      contextProviderMessageId: null,
      providerAccountId: "110000000000002",
      providerPhoneNumberId: "110000000000001",
      callbackData: whatsappStatusCorrelation(evidence.attemptId,
        evidence.payloadHash),
      inboundReply: null,
      deliveryStatus: "failed",
      endpointHash: whatsappEndpointHash("+919800000003"),
      isStop: false,
      hasReply: false,
      inboundBody: null,
      providerErrorCode: 131016,
      providerErrorEvidence: {kind: "codes", codes: [131016]},
      providerOccurredAt: ts(NOW.toMillis() + 60_000),
      processingStatus: "pending",
      attemptCount: 0,
      createdAt: ts(NOW.toMillis() + 60_000),
      processedAt: null,
      expiresAt: ts(NOW.toMillis() + 3_600_000),
    });
    db.setDoc(`organizerCampaignWebhookReceipts/${eventId}`, {
      provider: "metaCloudApi",
      providerEventId,
      organizerId: "org-1",
      connectionId: "conn-1",
      eventKind: "status",
      payloadHash: "f".repeat(64),
      createdAt: ts(NOW.toMillis() + 60_000),
      expiresAt: ts(NOW.toMillis() + 3_600_000),
    });
    const store = new CampaignWhatsappDeliveryStore(
      db as unknown as Firestore, () => NOW.toMillis() + 60_000);
    assert.equal((await store.consumeQueued(eventId)).kind, "recorded");
    // The next pass mirrors the confirmed failure; the campaign settles.
    await dispatchCampaign({
      db: db as unknown as FirebaseFirestore.Firestore,
      organizerId: "org-1",
      campaignId,
      expectedRevision: null,
      deps: deps(admin.firestore.Timestamp.fromMillis(
        NOW.toMillis() + 20 * 60 * 1000)),
    });
    assert.equal(recipient().status, "failed");
    assert.equal(campaign().status, "partiallyFailed");
    assert.equal(sends, 2);
  },
);

for (const evidenceChange of ["unassigned", "deleted", "foreignScope"]) {
  test(`program dispatch suppresses ${evidenceChange} field evidence`,
    async () => {
      const db = new FakeFirestore(seedBase());
      const campaignId = await materialize(db);
      const selected = (db.getDoc("programGuests/g-1")!.fieldSelections as
        {phoneE164: string}).phoneE164;
      if (evidenceChange === "unassigned") {
        db.updateDoc("programGuests/g-1", {fieldSelections: {}});
      } else if (evidenceChange === "deleted") {
        db.deleteDoc(`workspaceFieldAssertions/${selected}`);
      } else {
        db.updateDoc(`workspaceFieldAssertions/${selected}`, {
          workspaceRef: {kind: "program", id: "another-wedding"}});
      }
      await dispatchCampaign({db: db as unknown as FirebaseFirestore.Firestore,
        organizerId: "org-1", campaignId, expectedRevision: null,
        deps: dispatcherDeps(db)});
      const household = recipients(db).map(([, doc]) => doc)
        .find((doc) => (doc.programRecipient as {recipientKey: string})
          .recipientKey === "household:hh-1")!;
      assert.equal(household.status, "suppressed");
      assert.equal(household.exclusionReason, "invalidEndpoint");
      assert.equal(household.providerMessageId, null);
    });
}

test("program audience leaves old unassigned phones excluded", async () => {
  const synthetic = seedBase();
  for (const [path, doc] of Object.entries(synthetic)) {
    if (path.startsWith("programGuests/")) doc.fieldSelections = {};
  }
  const db = new FakeFirestore(synthetic);
  await assert.rejects(materialize(db), /noReachableRecipients/);
  assert.equal(recipients(db).length, 0);
});

for (const change of ["assertionDeleted", "consentRevoked", "householdMoved"]) {
  test(`program campaign ${change} between reserve and claim never sends`,
    async () => {
      const db = new FakeFirestore(seedBase());
      const campaignId = await materialize(db);
      const sends: string[] = [];
      let changed = false;
      const d = dispatcherDeps(db);
      d.tokenStore = {accessBound: async () => {
        if (!changed) {
          changed = true;
          if (change === "consentRevoked") {
            db.updateDoc("programHouseholds/hh-1", {
              messagingConsent: {granted: false, grantedAt: NOW,
                source: "staff"}});
          } else if (change === "householdMoved") {
            db.updateDoc("programGuests/g-1", {householdId: null});
          } else {
            const id = (db.getDoc("programGuests/g-1")!.fieldSelections as
              {phoneE164: string}).phoneE164;
            db.deleteDoc(`workspaceFieldAssertions/${id}`);
          }
        }
        return "test-token";
      }} as never;
      d.provider = (() => ({sendTemplate: async (args: {toE164: string}) => {
        sends.push(args.toE164);
        return {providerMessageId: "synthetic-accepted"};
      }})) as never;
      await dispatchCampaign({db: db as unknown as Firestore,
        organizerId: "org-1", campaignId, expectedRevision: null, deps: d});
      assert.equal(changed, true);
      assert.equal(sends.includes("+919800000001"), false);
      assert.equal(sends.includes("+919800000003"), true);
      const dispatches = [...db.docs.entries()].filter(([path]) =>
        path.startsWith("campaignWhatsappDispatches/"));
      assert.equal(dispatches.length, 1);
    });
}
