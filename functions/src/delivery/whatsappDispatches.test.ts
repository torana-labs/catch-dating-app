import assert from "node:assert/strict";
import test from "node:test";
import type {Firestore, Transaction} from "firebase-admin/firestore";
import {FakeFirestore} from "../shared/testing/programFirestore";
import type {CampaignWhatsappDispatchDocument} from
  "../shared/generated/campaignWhatsappDispatchDocument";
import type {ProgramWhatsappDispatchDocument} from
  "../shared/generated/programWhatsappDispatchDocument";
import {
  WHATSAPP_DISPATCHES,
  prepareWhatsappDispatch,
  setWhatsappDispatch,
  whatsappDispatchExists,
  type WhatsappDispatchDocument,
} from "./whatsappDispatches";

const hex = (digit: string) => digit.repeat(64);

const programDispatch = (attemptId = "attempt-1"):
  ProgramWhatsappDispatchDocument => ({
  schemaVersion: 1, source: "program", attemptId, messageId: "message-1",
  context: {mode: "live", programId: "program-1", organizerId: "org-1"},
  senderId: "connection-1", bindingRevision: 3,
  providerAccountId: "1001", providerPhoneNumberId: "2002",
  senderHash: hex("a"), recipientEndpointId: "whatsapp:" + hex("b"),
  endpointHash: hex("b"), templateDocumentId: "template-1",
  templateHash: hex("c"), payloadHash: hex("d"), createdAt: 1_000,
});

const campaignDispatch = (): CampaignWhatsappDispatchDocument => ({
  schemaVersion: 1, source: "campaign", attemptId: "attempt-2",
  messageId: "message-2",
  context: {mode: "live", organizerId: "org-1", campaignId: "campaign-1",
    recipientId: "recipient-1"},
  senderId: "connection-1", bindingRevision: 3,
  providerAccountId: "1001", providerPhoneNumberId: "2002",
  senderHash: hex("a"), recipientEndpointId: "whatsapp:" + hex("b"),
  endpointHash: hex("b"), templateDocumentId: "template-1",
  templateHash: hex("c"), payloadHash: hex("d"), createdAt: 1_000,
});

const path = (attemptId: string) => `${WHATSAPP_DISPATCHES}/${attemptId}`;

function inTx<T>(db: FakeFirestore,
  run: (tx: Transaction) => Promise<T>): Promise<T> {
  return db.runTransaction((tx) => run(tx as unknown as Transaction));
}

test("prepare validates, then stages a create the caller commits", async () => {
  const db = new FakeFirestore({});
  const firestore = db as unknown as Firestore;
  await inTx(db, async (tx) => {
    const stage = await prepareWhatsappDispatch(firestore, tx,
      programDispatch());
    assert.ok(stage);
    assert.equal(db.getDoc(path("attempt-1")), undefined);
    stage();
  });
  assert.deepEqual(db.getDoc(path("attempt-1")), programDispatch());
});

test("prepare returns null and writes nothing when evidence exists",
  async () => {
    const existing = {...programDispatch(), createdAt: 5};
    const db = new FakeFirestore({[path("attempt-1")]: existing});
    const stage = await inTx(db, (tx) =>
      prepareWhatsappDispatch(db as unknown as Firestore, tx,
        programDispatch()));
    assert.equal(stage, null);
    assert.deepEqual(db.getDoc(path("attempt-1")), existing);
  });

test("prepare checks each document against its own source contract",
  async () => {
    const db = new FakeFirestore({});
    const firestore = db as unknown as Firestore;
    await inTx(db, async (tx) => {
      assert.ok(await prepareWhatsappDispatch(firestore, tx,
        campaignDispatch()));
    });
    // A programme context under the campaign source fails the campaign
    // contract, with the campaign worker's error message.
    const mixed = {...campaignDispatch(),
      context: programDispatch().context} as unknown as
      WhatsappDispatchDocument;
    await assert.rejects(inTx(db, (tx) =>
      prepareWhatsappDispatch(firestore, tx, mixed)),
    /Invalid campaign WhatsApp dispatch evidence/);
    const badHash = {...programDispatch(), payloadHash: "not-a-hash"};
    await assert.rejects(inTx(db, (tx) =>
      prepareWhatsappDispatch(firestore, tx, badHash)),
    /Invalid program WhatsApp dispatch evidence/);
    const unknown = {...programDispatch(), source: "event"} as unknown as
      WhatsappDispatchDocument;
    await assert.rejects(inTx(db, (tx) =>
      prepareWhatsappDispatch(firestore, tx, unknown)),
    /Unknown WhatsApp dispatch source/);
    assert.equal(db.docs.size, 0);
  });

test("set validates and overwrites the attempt's evidence", async () => {
  const db = new FakeFirestore({[path("attempt-1")]: {stale: true}});
  const firestore = db as unknown as Firestore;
  const service: ProgramWhatsappDispatchDocument = {...programDispatch(),
    kind: "service", templateDocumentId: null, templateHash: null};
  await inTx(db, async (tx) => {
    setWhatsappDispatch(firestore, tx, service);
  });
  assert.deepEqual(db.getDoc(path("attempt-1")), service);
  await assert.rejects(inTx(db, async (tx) => {
    setWhatsappDispatch(firestore, tx, {...service, createdAt: -1});
  }), /Invalid program WhatsApp dispatch evidence/);
  assert.deepEqual(db.getDoc(path("attempt-1")), service);
});

test("exists reads the attempt's evidence row in the transaction",
  async () => {
    const db = new FakeFirestore({[path("attempt-1")]: {...programDispatch()}});
    const firestore = db as unknown as Firestore;
    const [taken, free] = await inTx(db, async (tx) => [
      await whatsappDispatchExists(firestore, tx, "attempt-1"),
      await whatsappDispatchExists(firestore, tx, "attempt-9"),
    ]);
    assert.equal(taken, true);
    assert.equal(free, false);
  });
