import {readFileSync} from "node:fs";
import {resolve} from "node:path";
import assert from "node:assert/strict";
import test from "node:test";
import type {Firestore} from "firebase-admin/firestore";
import type {CallableRequest} from "firebase-functions/v2/https";
import {FakeFirestore} from "../../operations/testFirestore";
import {
  uid,
  phone,
  now as initialNow,
  eventId,
  org,
} from "../publicRegistration/testFixture";
import {
  approvedApplicationFixture,
  responseId,
} from "../../organizerFormAdmission/admissionTestFixture";
import {manageEventApprovalNotificationsHandler as preferences} from
  "./preferences";
import {enqueueApproval, ApprovalNotificationWork} from "./work";
import {ApprovalNotificationWorker} from "./worker";
import {messages, preferenceId, parseMessage, terms} from "./model";
import type {Identity} from "./source";
import type {Submission} from "./transports";
import {prepareBudget} from "./budget";
import type {EventApprovalNotificationSettingsDocument as Settings} from
  "../../shared/generated/eventApprovalNotificationSettingsDocument";
import {BRAND} from "../../shared/generated/brand";

async function fixture() {
  const db = new FakeFirestore();
  const event = JSON.parse(
    readFileSync(
      resolve(
        __dirname,
        "../../../../contracts/fixtures/valid/event_doc.json",
      ),
      "utf8",
    ),
  );
  const app = approvedApplicationFixture();
  for (const [path, value] of app.store.rows) db.write(path, value);
  db.write(`events/${eventId}`, {
    ...event,
    organizerId: org,
    publicationState: "published",
  });
  const application = db.read(
    `organizerApplications/${app.applicationId}`,
  )!;
  Object.assign(application, {
    linkedUid: uid,
    approvalNotificationBasis: {
      revision: 3,
      approvedAtMillis: initialNow - 1,
    },
  });
  db.write(`organizerApplications/${app.applicationId}`, application);
  db.write(`organizerApplicationResponses/${responseId}`, {
    ...db.read(`organizerApplicationResponses/${responseId}`),
    linkedUid: uid,
  });
  db.write(`organizerFormResponses/${responseId}`, {
    ...db.read(`organizerFormResponses/${responseId}`),
    respondentUid: uid,
  });
  const settings: Settings = {
    enabled: true,
    revision: 1,
    whatsapp: {
      connectionId: "conn1",
      templateId: "template1",
      maxCostMicros: 1,
    },
    sms: {
      accountId: "sms1",
      credentialVersion: "projects/p/secrets/sms/versions/1",
      senderId: "sender1",
      mask: "CATCHA",
      principalEntityId: "1234567890123456789",
      dltTemplateId: "1234567890123456789",
      maxCostMicros: 1,
      approvedText:
        "Your event application is approved. View your next steps: {eventUrl}",
    },
    email: {
      provider: "resend",
      accountId: "email1",
      credentialVersion: "projects/p/secrets/email/versions/1",
      from: `events@${BRAND.web.domain}`,
    },
    dailyPhoneLimit: 100,
    monthlyPhoneLimit: 3000,
    dailyCostLimitMicros: 10000,
    monthlyCostLimitMicros: 10000,
  };
  db.write(`eventApprovalNotificationSettings/${org}`, {...settings});
  const stamp = {_seconds: 1, _nanoseconds: 0};
  db.write("organizerSenderConnections/conn1", {
    organizerId: org,
    channel: "whatsapp",
    provider: "metaCloudApi",
    status: "active",
    wabaId: "110000000000002",
    phoneNumberId: "110000000000001",
    businessId: null,
    displayPhoneNumber: null,
    verifiedName: null,
    secretVersionResource: "projects/p/secrets/wa/versions/1",
    qualityRating: null,
    messagingLimitTier: null,
    templateSyncStatus: "current",
    webhookStatus: "subscribed",
    testStatus: "delivered",
    testProviderMessageId: null,
    testRecipientHash: null,
    connectedByUid: "host",
    revision: 1,
    createdAt: stamp,
    updatedAt: stamp,
    disconnectedAt: null,
  });
  db.write("organizerMessageTemplates/template1", {
    organizerId: org,
    connectionId: "conn1",
    providerTemplateId: "111",
    name: "application_approved",
    language: "en",
    category: "UTILITY",
    status: "APPROVED",
    variableNames: ["eventUrl"],
    parameterBindings: [
      {
        variableName: "eventUrl",
        component: "body",
        position: 1,
        buttonIndex: null,
      },
    ],
    hasMediaHeader: false,
    buttonKinds: [],
    parameterFormat: "NAMED",
    providerUpdatedAt: null,
    syncedAt: stamp,
  });
  let now = initialNow;
  const identity: {-readonly [K in keyof Identity]: Identity[K]} = {
    uid,
    phoneNumber: phone,
    email: "guest@example.com",
    emailVerified: true,
    disabled: false,
  };
  const firestore = db as unknown as Firestore;
  const call = (data: Record<string, unknown>) =>
    preferences(
      {
        auth: {uid, token: {uid}},
        data: {eventId, expectedUid: uid, ...data},
      } as CallableRequest<unknown>,
      {
        db: () => firestore,
        now: () => now,
        identity: async () => identity,
        rateLimit: async () => undefined,
      },
    );
  const optIn = () =>
    call({
      action: "save",
      expectedRevision: 0,
      choices: {phoneUpdates: true, emailUpdates: true},
      termsVersion: terms.version,
    });
  const enqueue = () =>
    enqueueApproval(firestore, app.applicationId, uid, eventId, now);
  const sent: string[] = [];
  let outcome: Submission = {
    kind: "accepted",
    providerMessageId: "provider1",
  };
  const worker = new ApprovalNotificationWorker(
    firestore,
    async () => identity,
    async (route) => ({
      submit: async () => {
        sent.push(route);
        return outcome;
      },
    }),
    () => now,
  );
  return {
    db,
    firestore,
    applicationId: app.applicationId,
    identity,
    settings,
    call,
    optIn,
    enqueue,
    sent,
    worker,
    clock: () => now,
    tick: (millis = 61_000) => {
      now += millis;
    },
    outcome: (next: Submission) => {
      outcome = next;
    },
  };
}

test("choices require verification and replay preserves the receipt",
  async () => {
    const h = await fixture();
    assert.deepEqual((await h.call({action: "get"})).choices, {
      phoneUpdates: false,
      emailUpdates: false,
    });
    h.identity.emailVerified = false;
    await assert.rejects(h.optIn(), /Verify/);
    h.identity.emailVerified = true;
    assert.equal((await h.optIn()).revision, 1);
    assert.equal((await h.optIn()).revision, 1);
    assert.equal(
      h.db
        .entries()
        .filter(([path]) =>
          path.startsWith("eventApprovalNotificationReceipts/"),
        ).length,
      1,
    );
    await assert.rejects(
      h.call({
        action: "save",
        expectedRevision: 0,
        choices: {phoneUpdates: false, emailUpdates: false},
        termsVersion: terms.version,
      }),
      /changed/,
    );
  });

test("withdrawal remains possible when application or event closes",
  async () => {
    const h = await fixture();
    await h.optIn();
    h.db.write(`events/${eventId}`, {
      ...h.db.read(`events/${eventId}`),
      status: "cancelled",
    });
    const saved = await h.call({
      action: "save",
      expectedRevision: 1,
      choices: {phoneUpdates: false, emailUpdates: false},
      termsVersion: terms.version,
    });
    assert.equal(saved.revision, 2);
    const receipt = h.db.read(
      `eventApprovalNotificationPreferences/${preferenceId(eventId, uid)}`,
    )!;
    assert.equal(receipt.email, null);
    assert.equal(receipt.phoneE164, null);
  });

test("approval creates two jobs once despite repeated review writes",
  async () => {
    const h = await fixture();
    const ids = await h.enqueue();
    assert.equal(ids.length, 2);
    assert.deepEqual(await h.enqueue(), ids);
    const app = h.db.read(`organizerApplications/${h.applicationId}`)!;
    h.db.write(`organizerApplications/${h.applicationId}`, {
      ...app,
      revision: 4,
      reviewNote: "New note",
    });
    assert.deepEqual(await h.enqueue(), ids);
    assert.equal(
      h.db.entries().filter(([p]) => p.startsWith("operationWorkItems/"))
        .length,
      2,
    );
  });

for (const kind of ["accepted", "unknown"] as const) {
  test(`${kind} WhatsApp cannot trigger SMS; email remains independent`,
    async () => {
      const h = await fixture();
      await h.optIn();
      const [phoneId, emailId] = await h.enqueue();
      h.outcome(
        kind === "accepted" ? {kind, providerMessageId: "p1"} : {kind},
      );
      await Promise.all([
        h.worker.dispatch(phoneId),
        h.worker.dispatch(phoneId),
      ]);
      h.tick(300_000);
      await h.worker.dispatch(phoneId);
      await h.worker.dispatch(emailId);
      assert.deepEqual(h.sent, ["approvalWhatsapp", "approvalEmail"]);
    });
}

test("only confirmed technical WhatsApp failure unlocks SMS after backoff",
  async () => {
    const h = await fixture();
    await h.optIn();
    const [id] = await h.enqueue();
    h.outcome({kind: "failed", classification: "technical"});
    await h.worker.dispatch(id);
    assert.equal((await h.worker.dispatch(id)).reason, "retryBackoff");
    h.tick();
    await h.worker.dispatch(id);
    assert.deepEqual(h.sent, ["approvalWhatsapp", "approvalSms"]);
  });

for (const classification of [
  "policy",
  "suppressed",
  "invalidRecipient",
] as const) {
  test(`${classification} WhatsApp failure cannot unlock SMS`, async () => {
    const h = await fixture();
    await h.optIn();
    const [id] = await h.enqueue();
    h.outcome({kind: "failed", classification});
    await h.worker.dispatch(id);
    h.tick();
    assert.equal((await h.worker.dispatch(id)).status, "review");
    assert.deepEqual(h.sent, ["approvalWhatsapp"]);
  });
}

for (const change of [
  "withdrawn",
  "deleted",
  "contactChanged",
  "consentRemoved",
  "senderDisabled",
  "responseRevoked",
] as const) {
  test(`${change} prevents dispatch using stale approval`, async () => {
    const h = await fixture();
    await h.optIn();
    const [id] = await h.enqueue();
    if (change === "withdrawn") {
      h.db.write(`organizerApplications/${h.applicationId}`, {
        ...h.db.read(`organizerApplications/${h.applicationId}`),
        reviewStatus: "withdrawn",
      });
    }
    if (change === "deleted") h.db.write(`deletedUsers/${uid}`, {uid});
    if (change === "contactChanged") {
      h.identity.phoneNumber = "+919999999998";
    }
    if (change === "consentRemoved") {
      h.db.remove(
        `eventApprovalNotificationPreferences/${preferenceId(eventId, uid)}`,
      );
    }
    if (change === "senderDisabled") {
      h.db.write(`eventApprovalNotificationSettings/${org}`, {
        ...h.settings,
        enabled: false,
      });
    }
    if (change === "responseRevoked") {
      h.db.write(`organizerFormResponses/${responseId}`, {
        ...h.db.read(`organizerFormResponses/${responseId}`),
        status: "withdrawn",
      });
    }
    await h.worker.dispatch(id);
    assert.deepEqual(h.sent, []);
  });
}

test("configuration change during credential preparation withholds the claim",
  async () => {
    const h = await fixture();
    await h.optIn();
    const [, id] = await h.enqueue();
    const worker = new ApprovalNotificationWorker(
      h.firestore,
      async () => h.identity,
      async () => {
        h.db.write(`eventApprovalNotificationSettings/${org}`, {
          ...h.settings,
          revision: 2,
        });
        return {
          submit: async () => {
            assert.fail("stale payload sent");
          },
        };
      },
      h.clock,
    );
    assert.equal((await worker.dispatch(id)).reason, "authorityChanged");
  });

test("email budget enforces the shared free daily ceiling", async () => {
  const h = await fixture();
  const results = await Promise.all(
    Array.from({length: 105}, () =>
      h.firestore.runTransaction(async (tx) => {
        const debit = await prepareBudget(
          h.firestore,
          tx,
          h.settings,
          "approvalEmail",
          h.clock(),
        );
        debit?.();
        return Boolean(debit);
      }),
    ),
  );
  assert.equal(results.filter(Boolean).length, 100);
});

test("Operations holds accepted WhatsApp for receipt review without resending",
  async () => {
    const h = await fixture();
    await h.optIn();
    const [id] = await h.enqueue();
    const work = new ApprovalNotificationWork(h.firestore, h.worker, h.clock);
    await work.processMessage(id, true);
    h.tick(180_000);
    await work.processMessage(id);
    await work.processMessage(id, true);
    assert.deepEqual(h.sent, ["approvalWhatsapp"]);
    const item = h.db
      .entries()
      .find(
        ([p, v]) =>
          p.startsWith("operationWorkItems/") && v.externalKey === id,
      )![1];
    assert.equal(item.primaryStage, "host_review");
    assert.equal(
      parseMessage(h.db.read(`${messages}/${id}`)).attempts[0].state.kind,
      "accepted",
    );
  });

test("an account switch cannot save choices for the newly authenticated user",
  async () => {
    const h = await fixture();
    await assert.rejects(
      h.call({action: "get", expectedUid: "other"}),
      /unavailable/,
    );
  });

test("signed WhatsApp failure unlocks one SMS fallback",
  async () => {
    const {createHash} = await import("node:crypto");
    const {whatsappStatusCorrelation} = await import(
      "../../eventSuccess/operations/whatsappDeliveryProtocol.js"
    );
    const {ApprovalWhatsappReceipts} = await import("./whatsappReceipts.js");
    const h = await fixture();
    await h.optIn();
    const [id] = await h.enqueue();
    await h.worker.dispatch(id);
    h.tick();
    const proof = h.db
      .entries()
      .find(([path]) =>
        path.startsWith("eventApprovalNotificationDispatches/"),
      )![1];
    const at = h.clock();
    const stamp = (value: number) => ({
      _seconds: Math.floor(value / 1000),
      _nanoseconds: (value % 1000) * 1_000_000,
    });
    const providerEventId = `status:provider1:failed:${at}`;
    const queueId =
    "omwe_" +
    createHash("sha256").update(providerEventId).digest("hex").slice(0, 48);
    const queue = {
      provider: "metaCloudApi",
      providerEventId,
      organizerId: org,
      connectionId: "conn1",
      eventKind: "status",
      providerMessageId: "provider1",
      contextProviderMessageId: null,
      providerAccountId: "110000000000002",
      providerPhoneNumberId: "110000000000001",
      callbackData: whatsappStatusCorrelation(
        String(proof.attemptId),
        String(proof.payloadHash),
      ),
      inboundReply: null,
      deliveryStatus: "failed",
      endpointHash: proof.endpointHash,
      isStop: false,
      hasReply: false,
      inboundBody: null,
      providerErrorCode: 131016,
      providerErrorEvidence: {kind: "codes", codes: [131016]},
      providerOccurredAt: stamp(at),
      processingStatus: "pending",
      attemptCount: 0,
      createdAt: stamp(at),
      processedAt: null,
      expiresAt: stamp(at + 3_600_000),
    };
    h.db.write(`organizerMessagingWebhookEvents/${queueId}`, queue);
    h.db.write(`organizerCampaignWebhookReceipts/${queueId}`, {
      provider: "metaCloudApi",
      providerEventId,
      organizerId: org,
      connectionId: "conn1",
      eventKind: "status",
      payloadHash: "f".repeat(64),
      createdAt: stamp(at),
      expiresAt: stamp(at + 3_600_000),
    });
    const receipts = new ApprovalWhatsappReceipts(h.firestore, h.clock);
    h.db.write(`organizerMessagingWebhookEvents/${queueId}`, {
      ...queue,
      endpointHash: "0".repeat(64),
    });
    assert.equal((await receipts.consumeQueued(queueId)).kind, "rejected");
    h.db.write(`organizerMessagingWebhookEvents/${queueId}`, queue);
    assert.equal((await receipts.consumeQueued(queueId)).kind, "recorded");
    h.tick();
    await h.worker.dispatch(id);
    await h.worker.dispatch(id);
    assert.deepEqual(h.sent, ["approvalWhatsapp", "approvalSms"]);
  });

test("a later endpoint STOP suppresses SMS after WhatsApp technical failure",
  async () => {
    const {whatsappStopId} = await import(
      "../../shared/organizerWhatsappStops.js"
    );
    const {hashEndpoint} = await import(
      "../../organizers/organizerCampaignModel.js"
    );
    const h = await fixture();
    await h.optIn();
    const [id] = await h.enqueue();
    h.outcome({kind: "failed", classification: "technical"});
    await h.worker.dispatch(id);
    h.tick();
    const endpointHash = hashEndpoint(phone);
    const stopId = whatsappStopId(org, endpointHash);
    h.db.write(`organizerWhatsappEndpointStops/${stopId}`, {
      schemaVersion: 1,
      stopId,
      organizerId: org,
      connectionId: "conn1",
      endpointHash,
      providerAccountId: "110000000000002",
      providerPhoneNumberId: "110000000000001",
      providerEventId: "stop1", payloadHash: "f".repeat(64),
      stoppedAt: h.clock(),
      observedAt: h.clock(),
      revision: 1,
    });
    await h.worker.dispatch(id);
    assert.deepEqual(h.sent, ["approvalWhatsapp"]);
  });

test("email acceptance completes submission without claiming inbox delivery",
  async () => {
    const h = await fixture();
    await h.optIn();
    const [, id] = await h.enqueue();
    const work = new ApprovalNotificationWork(h.firestore, h.worker, h.clock);
    await work.processMessage(id, true);
    await work.processMessage(id, true);
    const item = h.db
      .entries()
      .find(
        ([p, v]) =>
          p.startsWith("operationWorkItems/") && v.externalKey === id,
      )![1];
    assert.equal(item.outcome, "provider_accepted");
    assert.equal(
      parseMessage(h.db.read(`${messages}/${id}`)).attempts[0].state.kind,
      "accepted",
    );
    assert.deepEqual(h.sent, ["approvalEmail"]);
  });

for (const channel of ["eventOperations", "sms", "marketing", "undated"]) {
  test(`current ${channel} withdrawal fences the appropriate approval route`,
    async () => {
      const {organizerCommunicationPreferenceId} = await import(
        "../../shared/organizerCommunicationPreferences.js"
      );
      const h = await fixture();
      await h.optIn();
      const [id, emailId] = await h.enqueue();
      h.outcome({kind: "failed", classification: "technical"});
      await h.worker.dispatch(id);
      h.tick();
      const decision = {
        status: "optedOut",
        ...(channel === "undated" ? {} : {
          updatedAt: {
            _seconds: Math.floor(h.clock() / 1000),
            _nanoseconds: h.clock() % 1000 * 1_000_000,
          },
        }),
      };
      h.db.write(
        "organizerCommunicationPreferences/" +
          organizerCommunicationPreferenceId(org, uid),
        channel === "sms" ? {sms: decision} : {
          whatsappPurposes: {
            [channel === "undated" ? "eventOperations" : channel]: decision,
          },
        },
      );
      h.outcome({kind: "accepted", providerMessageId: "provider2"});
      await h.worker.dispatch(id);
      await h.worker.dispatch(emailId);
      assert.deepEqual(h.sent, channel === "marketing" ?
        ["approvalWhatsapp", "approvalSms", "approvalEmail"] :
        ["approvalWhatsapp", "approvalEmail"]);
    });
}

test("a fresh explicit event choice can supersede an earlier withdrawal",
  async () => {
    const {organizerCommunicationPreferenceId} = await import(
      "../../shared/organizerCommunicationPreferences.js"
    );
    const h = await fixture();
    h.db.write(
      "organizerCommunicationPreferences/" +
        organizerCommunicationPreferenceId(org, uid),
      {whatsappPurposes: {eventOperations: {
        status: "optedOut",
        updatedAt: {_seconds: Math.floor(h.clock() / 1000), _nanoseconds: 0},
      }}},
    );
    h.tick();
    await h.optIn();
    const [id] = await h.enqueue();
    await h.worker.dispatch(id);
    assert.deepEqual(h.sent, ["approvalWhatsapp"]);
  });
