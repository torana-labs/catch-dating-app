import assert from "node:assert/strict";
import test from "node:test";
import {FakeFirestore} from "../../shared/testing/programFirestore";
import {now} from "../../shared/testing/programFixtures";
import {contractValidator} from "../../shared/contractTestValidators";
import {hashEndpoint} from "../../organizers/organizerCampaignModel";
import {processOrganizerMessagingWebhookEvent} from
  "../../organizers/organizerWhatsappWebhook";
import {routeProgramWhatsappInbound} from "./inbound";
import {handleProgramInboundMessage} from "./inboundTrigger";
import {
  guestHash,
  inboundEvent,
  strangerPhone,
  whatsappSeed,
} from "./testFixtures";

const validateThread = contractValidator("ProgramWhatsappThreadDocument");
const validateMessage = contractValidator("ProgramWhatsappMessageDocument");
const asDb = (fake: FakeFirestore) =>
  fake as unknown as FirebaseFirestore.Firestore;

test("a known guest's message lands in their household's thread", async () => {
  const db = new FakeFirestore(whatsappSeed());
  const route = await routeProgramWhatsappInbound(asDb(db), inboundEvent({}),
    now);
  assert.equal(route.kind, "routed");
  const thread = db.getDoc(
    "programWhatsappThreads/program-1_household-1")!;
  assert.equal(validateThread(thread), true,
    JSON.stringify(validateThread.errors));
  assert.equal(thread.state, "needsYou");
  assert.equal(thread.handledBy, "assistant");
  assert.equal(thread.serviceWindowExpiresAtMillis,
    now.toMillis() + 24 * 60 * 60 * 1000);
  const messageId = route.kind === "routed" ? route.messageId! : "";
  const message = db.getDoc(`programWhatsappMessages/${messageId}`)!;
  assert.equal(validateMessage(message), true,
    JSON.stringify(validateMessage.errors));
  assert.equal(message.author, "guest");
  // A provider replay writes nothing new.
  const replay = await routeProgramWhatsappInbound(asDb(db),
    inboundEvent({}), now);
  assert.equal(replay.kind === "routed" && replay.messageId, null);
  assert.equal(db.getDoc(
    "programWhatsappThreads/program-1_household-1")!.messageCount, 1);
});

test("media is recorded by reference and passed to the planner", async () => {
  const db = new FakeFirestore(whatsappSeed());
  await routeProgramWhatsappInbound(asDb(db),
    inboundEvent({body: null}), now);
  const thread = db.getDoc("programWhatsappThreads/program-1_household-1")!;
  assert.equal(thread.escalationReason, "sentMedia");
  assert.equal(thread.lastMessagePreview, "Sent an attachment");
});

test("an unknown number gets an unknown-sender thread for the planner",
  async () => {
    const db = new FakeFirestore(whatsappSeed());
    const route = await routeProgramWhatsappInbound(asDb(db),
      inboundEvent({from: strangerPhone, id: "wamid.s1"}), now);
    assert.equal(route.kind, "routed");
    const id = `program-1_u-${hashEndpoint(strangerPhone).slice(0, 32)}`;
    const thread = db.getDoc(`programWhatsappThreads/${id}`)!;
    assert.equal(validateThread(thread), true,
      JSON.stringify(validateThread.errors));
    assert.equal(thread.unknownSender, true);
    assert.equal(thread.handledBy, "planner");
    assert.equal(thread.escalationReason, "unknownSender");
  });

test("an unbound programme uses the organiser's first active number",
  async () => {
    const seed = whatsappSeed();
    const program = {...seed["organizerPrograms/program-1"]!} as
      Record<string, unknown>;
    delete program.whatsappSenderConnectionId;
    const db = new FakeFirestore({...seed,
      "organizerPrograms/program-1": program});
    const route = await routeProgramWhatsappInbound(asDb(db),
      inboundEvent({}), now);
    assert.equal(route.kind, "routed");
    db.setDoc("organizerSenderConnections/conn-1", {
      ...db.getDoc("organizerSenderConnections/conn-1")!, status: "degraded"});
    const none = await routeProgramWhatsappInbound(asDb(db),
      inboundEvent({id: "wamid.m2"}), now);
    assert.equal(none.kind, "notProgramme");
  });

test("STOP revokes the household's consent and stores no thread", async () => {
  const db = new FakeFirestore(whatsappSeed());
  const route = await routeProgramWhatsappInbound(asDb(db),
    inboundEvent({body: "STOP", stop: true}), now);
  assert.deepEqual(route, {kind: "stop", householdIds: ["household-1"]});
  assert.equal((db.getDoc("programHouseholds/household-1")!
    .messagingConsent as {granted: boolean}).granted, false);
  assert.equal(db.getDoc("programWhatsappThreads/program-1_household-1"),
    undefined);
});

test("the webhook processor routes a guest before the CRM path", async () => {
  const db = new FakeFirestore({...whatsappSeed(),
    "organizerMessagingWebhookEvents/evt-1": inboundEvent({}) as never,
    "organizerContactChannelStates/state-1": {organizerId: "org-1",
      contactId: "contact-1", endpointHash: guestHash},
  });
  await processOrganizerMessagingWebhookEvent({db: asDb(db),
    eventId: "evt-1", event: inboundEvent({}), now});
  assert.ok(db.getDoc("programWhatsappThreads/program-1_household-1"));
  assert.equal(db.getDoc("organizerMessagingWebhookEvents/evt-1")!
    .processingStatus, "processed");
  // The CRM channel state was not rewritten for a routed guest.
  assert.equal(db.getDoc("organizerContactChannelStates/state-1")!
    .lastInboundAt, undefined);
});

test("the trigger stub leaves assistant threads waiting for lane W2",
  async () => {
    const db = new FakeFirestore(whatsappSeed());
    const route = await routeProgramWhatsappInbound(asDb(db),
      inboundEvent({}), now);
    const messageId = route.kind === "routed" ? route.messageId! : "";
    await handleProgramInboundMessage(asDb(db), messageId,
      db.getDoc(`programWhatsappMessages/${messageId}`) as never,
      now.toMillis());
    assert.equal(db.getDoc("programWhatsappThreads/program-1_household-1")!
      .state, "needsYou");
  });
