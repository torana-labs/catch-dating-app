import assert from "node:assert/strict";
import test from "node:test";
import type {Firestore} from "firebase-admin/firestore";
import {Timestamp} from "firebase-admin/firestore";
import {FakeFirestore} from "../../shared/testing/programFirestore";
import {deps, now, request} from "../../shared/testing/programFixtures";
import {contractValidator} from "../../shared/contractTestValidators";
import {whatsappSeed} from "./testFixtures";
import {getProgramAssistantSettingsHandler} from "./assistantSettings";
import {
  reconcileOrganizerSenderViews,
  reconcileProgramAssistantSettingView,
  reconcileProgramSenderView,
} from "./settingViews";

const validateSender = contractValidator("ProgramSenderViewDocument");
const validateSettings = contractValidator(
  "ProgramAssistantSettingViewDocument");
const hour = 3_600_000;
const dbOf = (store: FakeFirestore) => store as unknown as Firestore;

test("the sender view is the callable's sender with nothing secret",
  async () => {
    const store = new FakeFirestore(whatsappSeed());
    await reconcileProgramSenderView(dbOf(store), "program-1");
    const view = store.getDoc("programSenderViews/program-1")!;
    assert.equal(validateSender(view), true,
      JSON.stringify(validateSender.errors));
    const callable = await getProgramAssistantSettingsHandler(request({
      programId: "program-1"}, "manager-1"), deps(store));
    assert.deepEqual(view.sender, callable.sender);
    assert.deepEqual(view.sender, {connectionId: "conn-1",
      displayPhoneNumber: "+91 98765 00000", verifiedName: "Aditi & Kabir",
      status: "active", boundToProgramme: true});
    assert.equal(view.organizerActiveConnectionId, "conn-1");
    const text = JSON.stringify(view);
    for (const secret of ["1111", "2222", "projects/p/secrets",
      "metaCloudApi"]) {
      assert.equal(text.includes(secret), false, secret);
    }
  });

test("an unbound programme falls back to the first active sender by id",
  async () => {
    const seed = whatsappSeed({
      "organizerSenderConnections/conn-0": {organizerId: "org-1",
        channel: "whatsapp", provider: "metaCloudApi", status: "degraded",
        displayPhoneNumber: "+91 90000 00000", verifiedName: "Old number"},
      "organizerSenderConnections/conn-2": {organizerId: "org-1",
        channel: "whatsapp", provider: "metaCloudApi", status: "active",
        displayPhoneNumber: "+91 91111 11111", verifiedName: "Second"},
    });
    delete seed["organizerPrograms/program-1"]!.whatsappSenderConnectionId;
    const store = new FakeFirestore(seed);
    await reconcileProgramSenderView(dbOf(store), "program-1");
    const view = store.getDoc("programSenderViews/program-1")!;
    assert.equal((view.sender as {connectionId: string}).connectionId,
      "conn-1");
    assert.equal((view.sender as {boundToProgramme: boolean})
      .boundToProgramme, false);
    // A sender going inactive moves every programme of the organizer on.
    store.updateDoc("organizerSenderConnections/conn-1",
      {status: "disconnected"});
    await reconcileOrganizerSenderViews(dbOf(store), "org-1");
    const moved = store.getDoc("programSenderViews/program-1")!;
    assert.equal((moved.sender as {connectionId: string}).connectionId,
      "conn-2");
    assert.equal(moved.organizerActiveConnectionId, "conn-2");
  });

test("a bound number of another organizer shows no sender", async () => {
  const store = new FakeFirestore(whatsappSeed());
  store.updateDoc("organizerSenderConnections/conn-1",
    {organizerId: "org-9"});
  await reconcileProgramSenderView(dbOf(store), "program-1");
  const view = store.getDoc("programSenderViews/program-1")!;
  assert.equal(view.sender, null);
  assert.equal(view.organizerActiveConnectionId, null);
});

test("the settings view is the callable's settings with staff expiries",
  async () => {
    const store = new FakeFirestore(whatsappSeed({
      "programStaffGrants/program-1__revoked-1": {programId: "program-1",
        organizerId: "org-1", uid: "revoked-1", status: "active",
        displayName: "Zed", expiresAt: Timestamp.fromMillis(
          now.toMillis() + hour), revokedAt: now},
    }));
    await reconcileProgramAssistantSettingView(dbOf(store), "program-1");
    const view = store.getDoc("programAssistantSettingViews/program-1")!;
    assert.equal(validateSettings(view), true,
      JSON.stringify(validateSettings.errors));
    const callable = await getProgramAssistantSettingsHandler(request({
      programId: "program-1"}, "manager-1"), deps(store));
    for (const field of ["enabled", "languages", "replyWithin",
      "escalationStaffUids", "neverDoes", "tone", "dailyTokenBudget",
      "answerTopics", "attachmentReads", "revision", "usesDefaults"]) {
      assert.deepEqual(view[field], (callable as unknown as Record<string, unknown>)[
        field], field);
    }
    const staff = view.staff as Array<{uid: string; expiresAtMillis: number}>;
    // Every unrevoked active grant, the callable's list before expiry.
    assert.deepEqual(staff.map((row) => row.uid).sort(),
      callable.staff.map((row) => row.uid).sort());
    assert.equal(staff.some((row) => row.uid === "revoked-1"), false);
    assert.ok(staff.every((row) => row.expiresAtMillis > 0));
    const text = JSON.stringify(view);
    for (const hidden of ["lastRequestId", "lastRequestHash",
      "updatedByUid", "sender", "phoneLastFour"]) {
      assert.equal(text.includes(hidden), false, hidden);
    }
  });

test("settings views write on change only and follow the programme",
  async () => {
    const store = new FakeFirestore(whatsappSeed());
    const path = "programAssistantSettingViews/program-1";
    await reconcileProgramAssistantSettingView(dbOf(store), "program-1");
    let writes = 0;
    const setDoc = store.setDoc.bind(store);
    store.setDoc = (...args: Parameters<typeof setDoc>) => {
      writes++;
      return setDoc(...args);
    };
    await reconcileProgramAssistantSettingView(dbOf(store), "program-1");
    assert.equal(writes, 0, "a no-op writes nothing");
    store.deleteDoc("organizerPrograms/program-1");
    await reconcileProgramAssistantSettingView(dbOf(store), "program-1");
    await reconcileProgramSenderView(dbOf(store), "program-1");
    assert.equal(store.getDoc(path), undefined);
    assert.equal(store.getDoc("programSenderViews/program-1"), undefined);
  });
