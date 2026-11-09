import assert from "node:assert/strict";
import test from "node:test";
import type {Firestore} from "firebase-admin/firestore";
import {FakeFirestore} from "../../shared/testing/programFirestore";
import {deps, now, request} from "../../shared/testing/programFixtures";
import {contractValidator} from "../../shared/contractTestValidators";
import {
  getProgramAssistantSettingsHandler,
  readProgramAssistantSettings,
  updateProgramAssistantSettingsHandler,
} from "./assistantSettings";
import {
  listProgramWhatsappCannedRepliesHandler,
  upsertProgramWhatsappCannedReplyHandler,
} from "./cannedReplies";
import {setProgramWhatsappThreadHandlingHandler} from "./handling";
import {routeProgramWhatsappInbound} from "./inbound";
import {inboundEvent, whatsappSeed} from "./testFixtures";

const validateSettings = contractValidator("ProgramAssistantSettingsDocument");
const validateCanned = contractValidator("ProgramWhatsappCannedReplyDocument");
const code = (expected: string) => (err: unknown) =>
  (err as {code?: string}).code === expected;

const variants = [
  {language: "en", text: "Buses leave the lobby 30 minutes before."},
  {language: "hi", text: "Bus lobby se 30 minute pehle chalegi."},
];

test("saved replies are added, replayed, fenced and listed in order",
  async () => {
    const db = new FakeFirestore(whatsappSeed());
    const added = await upsertProgramWhatsappCannedReplyHandler(request({
      programId: "program-1", cannedReplyId: "bus-times", label: "Bus times",
      variants, sortOrder: 2, expectedRevision: 0,
      requestId: "canned-cmd-1"}, "manager-1"), deps(db));
    assert.equal(added.cannedReply.revision, 1);
    assert.equal(validateCanned(
      db.getDoc("programWhatsappCannedReplies/program-1_bus-times")), true,
    JSON.stringify(validateCanned.errors));
    const replay = await upsertProgramWhatsappCannedReplyHandler(request({
      programId: "program-1", cannedReplyId: "bus-times", label: "Bus times",
      variants, sortOrder: 2, expectedRevision: 0,
      requestId: "canned-cmd-1"}, "manager-1"), deps(db));
    assert.equal(replay.cannedReply.revision, 1);
    await assert.rejects(upsertProgramWhatsappCannedReplyHandler(request({
      programId: "program-1", cannedReplyId: "bus-times", label: "Buses",
      variants, expectedRevision: 0, requestId: "canned-cmd-2"},
    "manager-1"), deps(db)), code("aborted"));
    await assert.rejects(upsertProgramWhatsappCannedReplyHandler(request({
      programId: "program-1", cannedReplyId: "dupe", label: "Dupe",
      variants: [variants[0], variants[0]], expectedRevision: 0,
      requestId: "canned-cmd-3"}, "manager-1"), deps(db)),
    code("invalid-argument"));
    await upsertProgramWhatsappCannedReplyHandler(request({
      programId: "program-1", cannedReplyId: "dress-code",
      label: "Dress code", variants: [variants[0]], sortOrder: 1,
      expectedRevision: 0, requestId: "canned-cmd-4"}, "manager-1"),
    deps(db));
    const list = await listProgramWhatsappCannedRepliesHandler(request({
      programId: "program-1"}, "manager-1"), deps(db));
    assert.deepEqual(list.cannedReplies.map((reply) => reply.cannedReplyId),
      ["dress-code", "bus-times"]);
    await assert.rejects(listProgramWhatsappCannedRepliesHandler(request({
      programId: "program-1"}, "stranger"), deps(db)),
    code("permission-denied"));
  });

test("assistant settings start from the defaults and keep never-does fixed",
  async () => {
    const db = new FakeFirestore(whatsappSeed());
    const initial = await getProgramAssistantSettingsHandler(request({
      programId: "program-1"}, "manager-1"), deps(db));
    assert.equal(initial.usesDefaults, true);
    assert.equal(initial.enabled, false);
    assert.deepEqual(initial.languages, ["en", "hi"]);
    assert.equal(initial.sender?.connectionId, "conn-1");
    assert.equal(initial.sender?.boundToProgramme, true);
    const updated = await updateProgramAssistantSettingsHandler(request({
      programId: "program-1", enabled: true, languages: ["hi", "en", "gu"],
      replyWithin: "hour", expectedRevision: 0,
      requestId: "settings-cmd-1"}, "manager-1"), deps(db));
    assert.equal(updated.revision, 1);
    assert.equal(updated.replyWithin, "hour");
    assert.equal(updated.neverDoes.length, 4);
    assert.equal(validateSettings(
      db.getDoc("programAssistantSettings/program-1")), true,
    JSON.stringify(validateSettings.errors));
    const read = await readProgramAssistantSettings(
      db as unknown as Firestore, "program-1");
    assert.equal(read.enabled, true);
    assert.equal(read.tone, "warm");
    await assert.rejects(updateProgramAssistantSettingsHandler(request({
      programId: "program-1", escalationStaffUids: ["nobody"],
      expectedRevision: 1, requestId: "settings-cmd-2"}, "manager-1"),
    deps(db)), code("invalid-argument"));
    await assert.rejects(updateProgramAssistantSettingsHandler(request({
      programId: "program-1", enabled: false, expectedRevision: 0,
      requestId: "settings-cmd-3"}, "manager-1"), deps(db)),
    code("aborted"));
  });

test("the planner takes a thread over and hands it back", async () => {
  const db = new FakeFirestore(whatsappSeed());
  await routeProgramWhatsappInbound(db as unknown as Firestore,
    inboundEvent({}), now);
  const path = "programWhatsappThreads/program-1_household-1";
  const revision = db.getDoc(path)!.revision as number;
  const taken = await setProgramWhatsappThreadHandlingHandler(request({
    programId: "program-1", threadId: "program-1_household-1",
    handledBy: "planner", expectedRevision: revision}, "manager-1"),
  deps(db));
  assert.equal(taken.handledBy, "planner");
  assert.equal(db.getDoc(path)!.takenOverByUid, "manager-1");
  const back = await setProgramWhatsappThreadHandlingHandler(request({
    programId: "program-1", threadId: "program-1_household-1",
    handledBy: "assistant", state: "handled",
    expectedRevision: taken.revision}, "manager-1"), deps(db));
  assert.equal(back.state, "handled");
  assert.equal(db.getDoc(path)!.takenOverByUid, null);
  await assert.rejects(setProgramWhatsappThreadHandlingHandler(request({
    programId: "program-1", threadId: "program-1_household-1",
    handledBy: "planner", expectedRevision: taken.revision}, "manager-1"),
  deps(db)), code("aborted"));
});
