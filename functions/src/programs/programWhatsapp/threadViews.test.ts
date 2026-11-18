import assert from "node:assert/strict";
import test from "node:test";
import type {Firestore} from "firebase-admin/firestore";
import {FakeFirestore} from "../../shared/testing/programFirestore";
import {now} from "../../shared/testing/programFixtures";
import {contractValidator} from "../../shared/contractTestValidators";
import {routeProgramWhatsappInbound} from "./inbound";
import {guestHash, inboundEvent, strangerPhone, whatsappSeed} from
  "./testFixtures";
import {
  programWhatsappThreadView,
  reconcileProgramWhatsappThreadView,
} from "./threadViews";

const validate = contractValidator("ProgramWhatsappThreadViewDocument");

async function seeded() {
  const store = new FakeFirestore({...whatsappSeed(),
    "organizerPrograms/program-1": {
      ...whatsappSeed()["organizerPrograms/program-1"]!,
      householdSideLabels: {partnerA: "Aditi", partnerB: "Kabir"}},
    "programHouseholds/household-1": {
      ...whatsappSeed()["programHouseholds/household-1"]!,
      side: "partnerA"},
  });
  const db = store as unknown as Firestore;
  await routeProgramWhatsappInbound(db, inboundEvent({}), now);
  await routeProgramWhatsappInbound(db, inboundEvent({from: strangerPhone,
    id: "wamid.s1", atMillis: now.toMillis() - 1000}), now);
  return {store, db};
}

test("a thread view is the inbox row and holds no phone data", async () => {
  const {store, db} = await seeded();
  await reconcileProgramWhatsappThreadView(db, "program-1_household-1");
  const view = store.getDoc("programWhatsappThreadViews/program-1_household-1")!;
  assert.equal(validate(view), true, JSON.stringify(validate.errors));
  assert.equal(view.displayName, "The Mehra family");
  assert.equal(view.sideLabel, "Aditi");
  assert.equal(view.householdLabel, "The Mehra family");
  assert.equal(view.primaryContactName, "Neha Mehra");
  assert.equal(view.guestCount, 1);
  assert.equal(view.unreadCount, 1);
  assert.equal(view.state, "needsYou");
  const text = JSON.stringify(view);
  for (const secret of [guestHash, "conn-1", "98765", "takenOverByUid",
    "endpointHash", "connectionId", strangerPhone]) {
    assert.equal(text.includes(secret), false, secret);
  }
  const unknown = [...store.docs.keys()].find((path) =>
    path.startsWith("programWhatsappThreads/program-1_u-"))!;
  const unknownId = unknown.split("/")[1];
  await reconcileProgramWhatsappThreadView(db, unknownId);
  const stranger = store.getDoc(`programWhatsappThreadViews/${unknownId}`)!;
  assert.equal(stranger.displayName, "Unknown number");
  assert.equal(stranger.householdLabel, null);
  assert.equal(stranger.guestCount, 0);
  assert.equal(stranger.sideLabel, null);
});

test("reconcile writes on change only and follows household and thread",
  async () => {
    const {store, db} = await seeded();
    const id = "program-1_household-1";
    await reconcileProgramWhatsappThreadView(db, id);
    let writes = 0;
    const setDoc = store.setDoc.bind(store);
    store.setDoc = (...args: Parameters<typeof setDoc>) => {
      writes++;
      return setDoc(...args);
    };
    await reconcileProgramWhatsappThreadView(db, id);
    assert.equal(writes, 0, "a no-op writes nothing");

    store.updateDoc("programHouseholds/household-1",
      {label: "Mehra-Shah family", memberGuestIds: ["g1", "g2"]});
    await reconcileProgramWhatsappThreadView(db, id);
    const renamed = store.getDoc(`programWhatsappThreadViews/${id}`)!;
    assert.equal(renamed.displayName, "Mehra-Shah family");
    assert.equal(renamed.guestCount, 2);

    store.updateDoc(`programWhatsappThreads/${id}`,
      {unreadCount: 0, state: "handled", revision: 9});
    await reconcileProgramWhatsappThreadView(db, id);
    const read = store.getDoc(`programWhatsappThreadViews/${id}`)!;
    assert.equal(read.unreadCount, 0);
    assert.equal(read.state, "handled");
    assert.equal(read.revision, 9);

    store.updateDoc("organizerPrograms/program-1",
      {householdSideLabels: {partnerA: "Anaya", partnerB: "Kabir"}});
    await reconcileProgramWhatsappThreadView(db, id);
    assert.equal(store.getDoc(`programWhatsappThreadViews/${id}`)!.sideLabel,
      "Anaya");

    // The retention sweep deletes the thread; its view goes with it.
    store.deleteDoc(`programWhatsappThreads/${id}`);
    await reconcileProgramWhatsappThreadView(db, id);
    assert.equal(store.getDoc(`programWhatsappThreadViews/${id}`),
      undefined);
  });

test("a thread of another organizer's programme gets no view", () => {
  const program = whatsappSeed()["organizerPrograms/program-1"] as never;
  const thread = {threadId: "t1", programId: "program-1",
    organizerId: "other-org", householdId: null, guestId: null,
    unknownSender: true, handledBy: "planner", state: "needsYou",
    language: null, escalationReason: null, lastMessagePreview: "Hi",
    lastMessageDirection: "inbound", lastMessageAuthor: "guest",
    lastMessageAtMillis: 1, lastInboundAtMillis: 1,
    serviceWindowExpiresAtMillis: 2, unreadCount: 1, revision: 1};
  assert.equal(programWhatsappThreadView("t1", thread, program, undefined),
    null);
  assert.equal(programWhatsappThreadView("t1", undefined, program,
    undefined), null);
  assert.throws(() => programWhatsappThreadView("t2",
    {...thread, organizerId: "org-1"}, program, undefined), /does not match/);
});
