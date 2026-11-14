import {createSyntheticCatchAuthority} from "./whatsappAuthorityTestHarness";
import {CATCH_APP_AUTHORITIES} from "./whatsappAppAuthorityStore";
import {CATCH_INGRESS_EVIDENCE} from "./whatsappIngressStore";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createRequire} from "node:module";
import path from "node:path";
import {test} from "node:test";
import {contractFile} from "../shared/contractFixtures";
import Ajv from "ajv";
import {initializeApp, deleteApp} from "firebase-admin/app";
import {getFirestore, Timestamp} from "firebase-admin/firestore";
import type {Firestore} from "firebase-admin/firestore";
import type {CallableRequest} from "firebase-functions/v2/https";
import {FormPaymentTestStore} from
  "../payments/formPayments/formPaymentTestStore";
import {unknownOrganizerCommunicationChannel} from
  "../shared/organizerCommunicationPreferences";
import {
  parseCatchWhatsappWebhook,
  WEBHOOK_RETENTION_MILLIS,
} from "./whatsappWebhookProtocol";
import {
  catchEndpointHash,
  catchReplyHash,
  catchReplyId,
  catchStopId,
  CATCH_SUPPORT_WINDOW_MS,
  sendCatchWhatsappReply,
} from "./whatsappReply";
import type {
  CatchAuthUser,
  CatchReplyConfig,
  CatchReplyInput,
} from "./whatsappReply";
import {
  CatchWhatsappReplyStore,
  CATCH_ENDPOINT_STOPS,
  CATCH_RECEIPTS,
  CATCH_REPLY_OPERATIONS,
  CATCH_REPLY_READINESS,
  catchReadinessId,
  persistCatchStopReceipt,
  readCatchOperation,
} from "./whatsappReplyStore";
import {consumeCatchReplyStatus} from "./whatsappReceiptConsumer";
import {prepareCatchReplyProvider} from "./whatsappReplyProvider";

// Match the existing CJS rules lane: load the client-only rules harness at
// runtime without adding its optional Temporal types to the backend compiler.
const loadRulesHarness = createRequire(__filename);
const {assertFails, initializeTestEnvironment} = loadRulesHarness(
  "@firebase/rules-unit-testing",
);
const {doc, getDoc, setDoc} = loadRulesHarness("firebase/firestore");

const time = 1800000000000;
const config: CatchReplyConfig = {
  enabled: true,
  atomicStopIngressReady: true,
  wabaId: "123",
  phoneNumberId: "456",
  actorUid: "agent",
  recipientUid: "participant",
  recipientE164: "+919000000001",
  credentialVersionResource:
    "projects/demo-catch/secrets/CATCH_WHATSAPP_ACCESS_TOKEN/versions/1",
  graphVersion: "v23.0",
  readinessEvidenceHash: "d".repeat(64),
};

function incoming(
  body = "Please help with my account",
  id = "wamid.inbound",
) {
  const raw = Buffer.from(
    JSON.stringify({
      object: "whatsapp_business_account",
      entry: [
        {
          id: "123",
          changes: [
            {
              field: "messages",
              value: {
                messaging_product: "whatsapp",
                metadata: {phone_number_id: "456"},
                messages: [
                  {
                    id,
                    from: "919000000001",
                    timestamp: String(time / 1000),
                    type: "text",
                    text: {body},
                  },
                ],
              },
            },
          ],
        },
      ],
    }),
  );
  return parseCatchWhatsappWebhook(raw, config)[0];
}

function fixture(realDb?: Firestore, suffix = "") {
  const fake = Object.assign(new FormPaymentTestStore(), {
    projectId: realDb ?
      String(Reflect.get(realDb, "projectId")) :
      "demo-catch-authority",
    databaseId: "(default)",
  });
  const db = realDb ?? (fake as unknown as Firestore);
  const event = incoming(undefined, "wamid.inbound" + suffix);
  const doc = {
    ...event,
    receivedAtMillis: time,
    expiresAt: Timestamp.fromMillis(time + WEBHOOK_RETENTION_MILLIS),
  };
  let now = time + 1000;
  let disabled = false;
  let sends = 0;
  const authority = createSyntheticCatchAuthority(
    db,
    () => now,
    config.recipientE164,
    fake.projectId,
  );
  authority.seedInto(fake.records, doc);
  const input: CatchReplyInput = {
    purpose: "serviceSupport",
    inboundEventId: event.eventId,
    reviewedInboundTextHash: catchReplyHash(event.text),
    confirmSupportRequest: true,
    body: "Here is the requested account help.",
  };
  const request = {
    auth: {uid: "agent", token: {support: true, auth_time: time / 1000}},
    rawRequest: {header: () => "Bearer synthetic-current-id-token"},
    data: input,
  } as unknown as CallableRequest<unknown>;
  const deps = {
    config: () => ({...config}),
    getUser: async (uid: string) =>
      uid === "owner" ?
        {disabled: false, customClaims: {adminOwner: true}} :
        uid === "agent" ?
          {disabled, customClaims: {support: true}} :
          {disabled: false, phoneNumber: config.recipientE164},
    now: () => now,
    authority: authority.store,
  };
  const store = new CatchWhatsappReplyStore(db, deps);
  const service = {
    ...deps,
    store,
    prepare: async () => ({
      send: async () => {
        sends++;
        return "wamid.outbound" + suffix;
      },
    }),
  };
  const readiness = {
    schemaVersion: 1,
    readinessId: catchReadinessId(config),
    wabaId: config.wabaId,
    phoneNumberId: config.phoneNumberId,
    recipientUid: config.recipientUid,
    endpointHash: catchEndpointHash(config.recipientE164),
    purpose: "serviceSupport",
    state: "ready",
    completeHistory: true,
    appAuthorityBindings: authority.bindings,
    historyFromMillis: 0,
    coveredThroughMillis: time,
    atomicIngressStartedAtMillis: time,
    evidenceSha256: "d".repeat(64),
    reviewedByUid: "owner",
    reviewedAtMillis: time,
    expiresAtMillis: time + CATCH_SUPPORT_WINDOW_MS,
  };
  fake.records.set(
    CATCH_REPLY_READINESS + "/" + catchReadinessId(config),
    readiness,
  );
  fake.records.set(CATCH_RECEIPTS + "/" + event.eventId, doc);
  return {
    fake,
    db,
    doc,
    event,
    input,
    request,
    store,
    service,
    readiness,
    authority,
    operationId: catchReplyId(config, event.messageId),
    sends: () => sends,
    setNow: (value: number) => {
      now = value;
    },
    disableActor: () => {
      disabled = true;
    },
  };
}

test(
  "fresh reviewed support request saves one message ID and exact replay",
  async () => {
    const f = fixture();
    const first = await sendCatchWhatsappReply(f.request, f.service);
    const replay = await sendCatchWhatsappReply(f.request, f.service);
    assert.equal(first.providerMessageId, "wamid.outbound");
    assert.equal(first.deliveryStatus, "accepted");
    assert.equal(replay.replayed, true);
    assert.equal(f.sends(), 1);
    const saved = f.fake.records.get(
      CATCH_REPLY_OPERATIONS + "/" + f.operationId,
    )!;
    assert.equal(saved.purpose, "serviceSupport");
    assert.equal(JSON.stringify(saved).includes(f.input.body), false);
    assert.equal(JSON.stringify(saved).includes(config.recipientE164), false);
    const preferenceKey = "catchCommunicationPreferences/participant";
    assert.equal(
      f.fake.records.has(preferenceKey),

      false,
      "A service reply must not enroll marketing",
    );
    await assert.rejects(
      sendCatchWhatsappReply(
        {...f.request, data: {...f.input, body: "A second response"}},
        f.service,
      ),
    );
    assert.equal(f.sends(), 1);
  });

test(
  "authority observation expires during review before credential access",
  async () => {
    const f = fixture();
    const authorize = f.authority.store.replyAuthorization.bind(
      f.authority.store,
    );
    f.authority.store.replyAuthorization = async (...args) => {
      const result = await authorize(...args);
      f.setNow(time + 31001);
      return result;
    };
    await assert.rejects(sendCatchWhatsappReply(f.request, f.service));
    assert.equal(f.sends(), 0);
    assert.equal(
      f.fake.records.has(CATCH_REPLY_OPERATIONS + "/" + f.operationId),
      false,
    );
  });

test("final Auth recheck cannot claim after readiness expires", async () => {
  const ownerConfig = {...config, actorUid: "owner"};
  const ownerFixture = () => {
    const f = fixture();
    f.service.config = () => ownerConfig;
    (
      f.store as unknown as { deps: { config: () => CatchReplyConfig } }
    ).deps.config = () => ownerConfig;
    (
      f.request as unknown as {
        auth: { uid: string; token: Record<string, unknown> };
      }
    ).auth = {
      uid: "owner",
      token: {adminOwner: true, auth_time: time / 1000},
    };
    f.fake.records.get(CATCH_APP_AUTHORITIES + "/owner")!.capabilities = [
      "review",
      "reply",
    ];
    return f;
  };
  const baseline = ownerFixture();
  let baselineChecks = 0;
  baseline.authority.store.deps.withFreshAuthContext = async (
    {uids},
    callback,
  ) =>
    callback({
      ...baseline.authority.fence(uids, () => undefined),
      recheck: async () => {
        baselineChecks++;
      },
    });
  await sendCatchWhatsappReply(baseline.request, baseline.service);
  assert.ok(baselineChecks > 0);
  assert.equal(baseline.sends(), 1);

  const f = ownerFixture();
  let finalChecks = 0;
  f.authority.store.deps.withFreshAuthContext = async ({uids}, callback) =>
    callback({
      ...f.authority.fence(uids, () => undefined),
      recheck: async () => {
        finalChecks++;
        f.setNow(f.readiness.expiresAtMillis);
      },
    });
  await assert.rejects(sendCatchWhatsappReply(f.request, f.service));
  assert.ok(finalChecks > 0, "final current-Auth check must be reached");
  assert.equal(f.sends(), 0);
  assert.equal(
    f.fake.records.has(
      CATCH_REPLY_OPERATIONS +
        "/" +
        catchReplyId(ownerConfig, f.event.messageId),
    ),
    false,
  );
});

test(
  "newly claimed reply is blocked at exact 24h and with invalid evidence",
  async () => {
    for (const patch of [
      {textTruncated: true},
      {messageType: "image"},
      {wabaId: "999"},
      {phoneNumberId: "999"},
      {participantId: "919000000002"},
      {providerTimestampSeconds: String((time + 2000) / 1000)},
      {expiresAt: Timestamp.fromMillis(time)},
      {text: "changed support text"},
    ]) {
      const f = fixture();
      f.fake.records.set(CATCH_RECEIPTS + "/" + f.event.eventId, {
        ...f.doc,
        ...patch,
      });
      await assert.rejects(sendCatchWhatsappReply(f.request, f.service));
      assert.equal(f.sends(), 0);
    }
    const f = fixture();
    f.setNow(time + CATCH_SUPPORT_WINDOW_MS);
    await assert.rejects(sendCatchWhatsappReply(f.request, f.service));
    f.setNow(time + CATCH_SUPPORT_WINDOW_MS - 1);
    await sendCatchWhatsappReply(f.request, f.service);
    assert.equal(f.sends(), 1);
  });

test(
  "current sender-wide withdrawal blocks support; marketing is not reused",
  async () => {
    for (const scope of ["global", "marketing"] as const) {
      const f = fixture();
      const stopped = {
        ...unknownOrganizerCommunicationChannel(),
        status: "optedOut",
        updatedAt: Timestamp.fromMillis(time),
      };
      f.fake.records.set("catchCommunicationPreferences/participant", {
        uid: "participant",
        whatsapp:
        scope === "global" ? stopped : unknownOrganizerCommunicationChannel(),
        whatsappPurposes: {marketing: stopped},
        createdAt: Timestamp.fromMillis(time),
        updatedAt: Timestamp.fromMillis(time),
      });
      if (scope === "global") {
        await assert.rejects(sendCatchWhatsappReply(f.request, f.service));
        assert.equal(f.sends(), 0);
      } else {
        await sendCatchWhatsappReply(f.request, f.service);
        assert.equal(f.sends(), 1);
      }
    }
  });

test(
  "credential waits cannot bypass STOP, withdrawal or role revocation",
  async () => {
    for (const change of ["stop", "withdrawal", "role"] as const) {
      const f = fixture();
      const service = {
        ...f.service,
        prepare: async () => {
          if (change === "stop") {
            await persistCatchStopReceipt(
              f.db,
              incoming(" STOP ", "wamid.stop"),
              time + 1000,
            );
          }
          if (change === "role") f.disableActor();
          if (change === "withdrawal") {
            f.fake.records.set("catchCommunicationPreferences/participant", {
              uid: "participant",
              whatsapp: {
                ...unknownOrganizerCommunicationChannel(),
                status: "optedOut",
              },
              createdAt: Timestamp.fromMillis(time),
              updatedAt: Timestamp.fromMillis(time),
            });
          }
          return f.service.prepare();
        },
      };
      await assert.rejects(sendCatchWhatsappReply(f.request, service));
      assert.equal(f.sends(), 0);
    }
  });

test(
  "unknown provider and failed persistence never release a consumed inbound",
  async () => {
    for (const failure of ["provider", "save"] as const) {
      const f = fixture();
      let sends = 0;
      const service = {
        ...f.service,
        prepare: async () => ({
          send: async () => {
            sends++;
            if (failure === "provider") {
              throw new Error("private provider detail");
            }
            f.fake.failNextCommit = true;
            return "wamid.accepted-before-save-failure";
          },
        }),
      };
      await assert.rejects(
        sendCatchWhatsappReply(f.request, service),
        (error: Error) => !error.message.includes("private"),
      );
      await assert.rejects(sendCatchWhatsappReply(f.request, service));
      assert.equal(sends, 1);
      assert.equal(
        f.fake.records.get(CATCH_REPLY_OPERATIONS + "/" + f.operationId)?.state,
        "unknown",
      );
    }
  });

test(
  "STOP helper commits suppression and immutable receipt atomically",
  async () => {
    const f = fixture();
    const stop = incoming("stop", "wamid.stop");
    f.fake.failNextCommit = true;
    await assert.rejects(persistCatchStopReceipt(f.db, stop, time));
    const stopId = catchStopId(config, catchEndpointHash(config.recipientE164));
    assert.equal(
      f.fake.records.has(CATCH_RECEIPTS + "/" + stop.eventId),
      false,
    );
    assert.equal(
      f.fake.records.has(CATCH_ENDPOINT_STOPS + "/" + stopId),
      false,
    );
    await persistCatchStopReceipt(f.db, stop, time);
    const original = f.fake.records.get(CATCH_RECEIPTS + "/" + stop.eventId)!;
    await persistCatchStopReceipt(
      f.db,
      {...stop, payloadHash: "a".repeat(64)},
      time + 5000,
    );
    assert.deepEqual(
      f.fake.records.get(CATCH_RECEIPTS + "/" + stop.eventId),
      original,
    );
    assert.equal(
      (original.expiresAt as Timestamp).toMillis(),
      time + WEBHOOK_RETENTION_MILLIS,
    );
    await assert.rejects(sendCatchWhatsappReply(f.request, f.service));
    assert.equal(f.sends(), 0);
    // Receipt expiry cannot clear a durable STOP.
    f.fake.records.delete(CATCH_RECEIPTS + "/" + stop.eventId);
    await assert.rejects(sendCatchWhatsappReply(f.request, f.service));
  });

test(
  "STOP repair uses existing immutable facts and rejects a changed message",
  async () => {
    const f = fixture();
    const stop = incoming("stop", "wamid.historical-stop");
    f.fake.records.set(CATCH_RECEIPTS + "/" + stop.eventId, {
      ...stop,
      receivedAtMillis: time,
      expiresAt: Timestamp.fromMillis(time + WEBHOOK_RETENTION_MILLIS),
    });
    await persistCatchStopReceipt(f.db, stop, time + 5000);
    const stopId = catchStopId(config, catchEndpointHash(config.recipientE164));
    assert.equal(
      f.fake.records.get(CATCH_ENDPOINT_STOPS + "/" + stopId)?.observedAtMillis,
      time,
    );
    await assert.rejects(
      persistCatchStopReceipt(
        f.db,
        {...stop, text: "unsubscribe"},
        time + 5000,
      ),
    );
    for (const patch of [
      {textTruncated: true},
      {messageType: "button"},
      {participantId: "not-a-phone"},
    ]) {
      await assert.rejects(
        persistCatchStopReceipt(f.db, {...stop, ...patch}, time),
      );
    }
  });

test(
  "authored operation and STOP contracts validate real store outputs",
  async () => {
    const f = fixture();
    await sendCatchWhatsappReply(f.request, f.service);
    await persistCatchStopReceipt(f.db, incoming("stop", "wamid.stop"), time);
    const ajv = new Ajv({strict: false});
    ajv.addSchema(contractFile(
      "firestore/catch_whatsapp_app_authorities.schema.json"));
    for (const [schema, collection] of [
      [contractFile("firestore/catch_whatsapp_reply_operations.schema.json"),
        CATCH_REPLY_OPERATIONS],
      [contractFile("firestore/catch_whatsapp_endpoint_stops.schema.json"),
        CATCH_ENDPOINT_STOPS],
    ]) {
      const validate = ajv.compile(schema);
      const document = [...f.fake.records].find(([key]) =>
        key.startsWith(collection + "/"),
      )![1];
      assert.equal(validate(document), true, JSON.stringify(validate.errors));
      assert.equal(validate({...document, body: "private message"}), false);
    }
    assert.throws(() => readCatchOperation({schemaVersion: 1}));
  });

test(
  "Firestore concurrent replies send once and committed STOP blocks claims",
  {skip: !process.env.FIRESTORE_EMULATOR_HOST},
  async () => {
    assert.match(
      process.env.FIRESTORE_EMULATOR_HOST!,
      /^(localhost|127\.0\.0\.1):[0-9]+$/u,
    );
    const app = initializeApp(
      {projectId: "demo-catch-cat16"},
      "cat16-" + Date.now(),
    );
    const db = getFirestore(app);
    const suffix = String(Date.now());
    const f = fixture(db, suffix);
    const stop = incoming("stop", "wamid.stop" + suffix);
    const stopId = catchStopId(
      config,
      catchEndpointHash(config.recipientE164),
    );
    const paths = [
      CATCH_RECEIPTS + "/" + f.event.eventId,
      CATCH_RECEIPTS + "/" + stop.eventId,
      CATCH_ENDPOINT_STOPS + "/" + stopId,
      CATCH_REPLY_OPERATIONS + "/" + f.operationId,
    ];
    const readinessPath =
      CATCH_REPLY_READINESS + "/" + catchReadinessId(config);
    paths.push(readinessPath);
    try {
      for (const [key, row] of f.authority.rows) {
        await db.doc(key).set(row);
        paths.push(key);
      }
      const ingressKey = CATCH_INGRESS_EVIDENCE + "/" + f.event.eventId;
      await db.doc(ingressKey).set(f.authority.ingress(f.doc));
      paths.push(ingressKey);
      await db.doc(readinessPath).set(f.readiness);
      await db.doc(paths[0]).create(f.doc);
      const results = await Promise.allSettled(
        Array.from({length: 8}, () =>
          sendCatchWhatsappReply(f.request, f.service),
        ),
      );
      assert.ok(results.some((result) => result.status === "fulfilled"));
      assert.equal(f.sends(), 1);
      assert.equal(
        (await db.doc(paths[3]).get()).data()?.providerMessageId,
        "wamid.outbound" + suffix,
      );
      const raw = Buffer.from(
        JSON.stringify({
          object: "whatsapp_business_account",
          entry: [
            {
              id: "123",
              changes: [
                {
                  field: "messages",
                  value: {
                    messaging_product: "whatsapp",
                    metadata: {phone_number_id: "456"},
                    statuses: ["read", "sent", "delivered"].map((status) => ({
                      id: "wamid.outbound" + suffix,
                      status,
                      timestamp: String(time / 1000 + 2),
                      recipient_id: "919000000001",
                    })),
                  },
                },
              ],
            },
          ],
        }),
      );
      const statuses = parseCatchWhatsappWebhook(raw, config);
      for (const event of statuses) {
        const key = CATCH_RECEIPTS + "/" + event.eventId;
        paths.push(key);
        await db
          .doc(key)
          .create({
            ...event,
            receivedAtMillis: time + 2000,
            expiresAt: Timestamp.fromMillis(time + WEBHOOK_RETENTION_MILLIS),
          });
      }
      await Promise.all(
        statuses.map((event) =>
          consumeCatchReplyStatus(
            db,
            f.operationId,
            event.eventId,
            time + 3000,
          ),
        ),
      );
      const deliveredOperation = (await db.doc(paths[3]).get()).data();
      assert.equal(deliveredOperation?.deliveryStatus, "read");

      // Race a separate inbound claim against ingress. An admitted claim must
      // have committed before STOP; every claim started after STOP must fail.
      const racing = fixture(db, suffix + "race");
      const racingKey = CATCH_REPLY_OPERATIONS + "/" + racing.operationId;
      paths.push(CATCH_RECEIPTS + "/" + racing.event.eventId, racingKey);
      await db.doc(paths.at(-2)!).create(racing.doc);
      const racingIngress =
        CATCH_INGRESS_EVIDENCE + "/" + racing.event.eventId;
      await db.doc(racingIngress).set(racing.authority.ingress(racing.doc));
      paths.push(racingIngress);
      const [race] = await Promise.allSettled([
        sendCatchWhatsappReply(racing.request, racing.service),
        persistCatchStopReceipt(db, stop, time + 1000),
      ]);
      await Promise.all(
        Array.from({length: 5}, () =>
          persistCatchStopReceipt(db, stop, time + 1000),
        ),
      );
      if (race.status === "fulfilled") {
        assert.equal(racing.sends(), 1);
        const claimTime = (await db.doc(racingKey).get()).createTime!;
        const stopTime = (await db.doc(paths[2]).get()).createTime!;
        assert.ok(
          claimTime.seconds < stopTime.seconds ||
            (claimTime.seconds === stopTime.seconds &&
              claimTime.nanoseconds <= stopTime.nanoseconds),
        );
      } else assert.equal(racing.sends(), 0);

      const later = fixture(db, suffix + "after-stop");
      const laterClaim = CATCH_REPLY_OPERATIONS + "/" + later.operationId;
      paths.push(
        CATCH_RECEIPTS + "/" + later.event.eventId,
        CATCH_REPLY_OPERATIONS + "/" + later.operationId,
      );
      await db.doc(paths.at(-2)!).create(later.doc);
      const laterIngress = CATCH_INGRESS_EVIDENCE + "/" + later.event.eventId;
      await db.doc(laterIngress).set(later.authority.ingress(later.doc));
      paths.push(laterIngress);
      await assert.rejects(
        sendCatchWhatsappReply(later.request, later.service),
      );
      assert.equal(later.sends(), 0);
      assert.equal((await db.doc(laterClaim).get()).exists, false);
      await assert.rejects(sendCatchWhatsappReply(f.request, f.service));
      assert.equal(f.sends(), 1);
      const receipt = (await db.doc(paths[1]).get()).data()!;
      assert.equal(receipt.receivedAtMillis, time + 1000);
      // Inbound text cannot masquerade as a delivery status.
      assert.equal(
        await consumeCatchReplyStatus(
          db,
          f.operationId,
          stop.eventId,
          time + 1000,
        ),
        "unmatched",
      );
    } finally {
      for (const item of paths) await db.doc(item).delete();
      await deleteApp(app);
    }
  },
);

test(
  "new Catch state denies SDK clients including privileged staff",
  {skip: !process.env.FIRESTORE_EMULATOR_HOST},
  async () => {
    assert.match(
      process.env.FIRESTORE_EMULATOR_HOST!,
      /^(localhost|127\.0\.0\.1):[0-9]+$/u,
    );
    const [host, port] = process.env.FIRESTORE_EMULATOR_HOST!.split(":");
    const env = await initializeTestEnvironment({
      projectId: "demo-catch-cat16",
      firestore: {
        host,
        port: Number(port),
        rules: readFileSync(
          path.resolve(__dirname, "../../../firestore.rules"),
          "utf8",
        ),
      },
    });
    try {
      const clients = [
        env.unauthenticatedContext(),
        env.authenticatedContext("participant"),
        env.authenticatedContext("host", {organizerId: "org"}),
        env.authenticatedContext("staff", {
          admin: true,
          adminOwner: true,
          support: true,
        }),
      ];
      const collections = [
        CATCH_REPLY_OPERATIONS,
        CATCH_ENDPOINT_STOPS,
        CATCH_REPLY_READINESS,
      ];
      for (const client of clients) {
        for (const collection of collections) {
          const ref = doc(client.firestore(), collection, "private-test");
          await assertFails(getDoc(ref));
          await assertFails(setDoc(ref, {private: true}));
        }
      }
    } finally {
      await env.cleanup();
    }
  },
);

test(
  "final claim rechecks scope and current identity after preparation",
  async () => {
    for (const change of [
      "sender",
      "recipient",
      "actor",
      "gate",
      "phone",
      "recipientDisabled",
      "role",
      "session",
      "deleted",
      "deadline",
    ] as const) {
      const f = fixture();
      const current = {...config};
      const actor: CatchAuthUser = {
        disabled: false,
        customClaims: {support: true},
      };
      const recipient: CatchAuthUser = {
        disabled: false,
        phoneNumber: config.recipientE164,
      };
      const deps = {
        config: () => ({...current}),
        getUser: async (uid: string) =>
          uid === "owner" ?
            {disabled: false, customClaims: {adminOwner: true}} :
            uid === "agent" ?
              actor :
              recipient,
        now: f.service.now,
        authority: f.authority.store,
      };
      const store = new CatchWhatsappReplyStore(f.db, deps);
      let preparations = 0;
      const service = {
        ...deps,
        store,
        prepare: async () => {
          preparations++;
          if (change === "sender") current.phoneNumberId = "999";
          if (change === "recipient") current.recipientUid = "foreign";
          if (change === "actor") current.actorUid = "foreign";
          if (change === "gate") current.enabled = false;
          if (change === "phone") recipient.phoneNumber = "+919000000002";
          if (change === "recipientDisabled") recipient.disabled = true;
          if (change === "role") actor.customClaims = {support: false};
          if (change === "session") {
            actor.tokensValidAfterTime = new Date(time + 1000).toISOString();
          }
          if (change === "deleted") {
            f.fake.records.set("deletedUsers/participant", {});
          }
          if (change === "deadline") f.setNow(time + CATCH_SUPPORT_WINDOW_MS);
          return f.service.prepare();
        },
      };
      await assert.rejects(sendCatchWhatsappReply(f.request, service), change);
      assert.equal(preparations, 1, change);
      assert.equal(f.sends(), 0, change);
      assert.equal(
        f.fake.records.has(CATCH_REPLY_OPERATIONS + "/" + f.operationId),
        false,
        change,
      );
    }
  });

test(
  "credential and claim failures cannot dispatch or persist a send claim",
  async () => {
    for (const failure of ["credential", "claim"] as const) {
      const f = fixture();
      let prepared = 0;
      const service = {
        ...f.service,
        prepare: async () => {
          prepared++;
          if (failure === "credential") {
            throw new Error("private token material");
          }
          if (failure === "claim") f.fake.failNextCommit = true;
          return f.service.prepare();
        },
      };
      await assert.rejects(
        sendCatchWhatsappReply(f.request, service),
        (error: Error) => !error.message.includes("private token material"),
      );
      assert.equal(prepared, 1, "Preflight reached credential preparation");
      assert.equal(f.sends(), 0);
      assert.equal(
        f.fake.records.has(CATCH_REPLY_OPERATIONS + "/" + f.operationId),
        false,
      );
      // A definitely failed pre-dispatch claim has not consumed this inbound.
      await sendCatchWhatsappReply(f.request, f.service);
      assert.equal(f.sends(), 1);
    }
  });

test(
  "malformed suppression and preference evidence fail closed before claim",
  async () => {
    for (const key of [
      CATCH_ENDPOINT_STOPS +
      "/" +
      catchStopId(config, catchEndpointHash(config.recipientE164)),
      "catchCommunicationPreferences/participant",
      "deletedUsers/participant",
    ]) {
      const f = fixture();
      f.fake.records.set(key, {unexpected: true});
      await assert.rejects(sendCatchWhatsappReply(f.request, f.service));
      assert.equal(f.sends(), 0);
      assert.equal(
        f.fake.records.has(CATCH_REPLY_OPERATIONS + "/" + f.operationId),
        false,
      );
    }
  });

test(
  "service, store and mocked Meta adapter return saved delivery on replay",
  async () => {
    const f = fixture();
    let calls = 0;
    const service = {
      ...f.service,
      prepare: (controlled: CatchReplyConfig) =>
        prepareCatchReplyProvider(controlled, {
          readCredential: async (version) => {
            assert.equal(version, config.credentialVersionResource);
            return JSON.stringify({
              schema: "catch.whatsapp-sender-token/v1",
              wabaId: "123",
              phoneNumberId: "456",
              accessToken: "mock-token",
            });
          },
          now: f.service.now,
          fetch: async (url, init) => {
            calls++;
            assert.equal(
              url.toString(),
              "https://graph.facebook.com/v23.0/456/messages",
            );
            const body = JSON.parse(init!.body as string);
            assert.equal(body.to, "919000000001");
            assert.equal(body.text.body, f.input.body);
            assert.equal(
              f.fake.records.get(CATCH_REPLY_OPERATIONS + "/" + f.operationId)
                ?.state,
              "claimed",
            );
            return new Response(
              JSON.stringify({
                messages: [{id: "wamid.saved"}],
              }),
            );
          },
        }),
    };
    const first = await sendCatchWhatsappReply(f.request, service);
    assert.equal(first.providerMessageId, "wamid.saved");
    const raw = Buffer.from(
      JSON.stringify({
        object: "whatsapp_business_account",
        entry: [
          {
            id: "123",
            changes: [
              {
                field: "messages",
                value: {
                  messaging_product: "whatsapp",
                  metadata: {phone_number_id: "456"},
                  statuses: [
                    {
                      id: "wamid.saved",
                      status: "delivered",
                      timestamp: String(time / 1000 + 1),
                      recipient_id: "919000000001",
                    },
                  ],
                },
              },
            ],
          },
        ],
      }),
    );
    const event = parseCatchWhatsappWebhook(raw, config)[0];
    f.fake.records.set(CATCH_RECEIPTS + "/" + event.eventId, {
      ...event,
      receivedAtMillis: time + 1000,
      expiresAt: Timestamp.fromMillis(time + WEBHOOK_RETENTION_MILLIS),
    });
    assert.equal(
      await consumeCatchReplyStatus(
        f.db,
        f.operationId,
        event.eventId,
        time + 1000,
      ),
      "applied",
    );
    const replay = await sendCatchWhatsappReply(f.request, service);
    assert.deepEqual(replay, {
      ...first,
      replayed: true,
      deliveryStatus: "delivered",
    });
    assert.equal(calls, 1);
    await persistCatchStopReceipt(f.db, incoming("stop", "wamid.stop"), time);
    await assert.rejects(sendCatchWhatsappReply(f.request, service));
    assert.equal(calls, 1);
  });
