import assert from "node:assert/strict";
import test from "node:test";
import * as admin from "firebase-admin";
import type {Firestore} from "firebase-admin/firestore";
import {FakeFirestore} from "../../shared/testing/programFirestore";
import {deps, now, request} from "../../shared/testing/programFixtures";
import {
  getProgramWhatsappThreadHandler,
  listProgramWhatsappThreadsHandler,
  sendProgramWhatsappReplyHandler,
} from "./callables";
import {routeProgramWhatsappInbound} from "./inbound";
import {inboundEvent, strangerPhone, whatsappSeed} from "./testFixtures";

const code = (expected: string) => (err: unknown) =>
  (err as {code?: string}).code === expected;

async function seeded() {
  const db = new FakeFirestore({...whatsappSeed(),
    "organizerPrograms/program-1": {
      ...whatsappSeed()["organizerPrograms/program-1"]!,
      householdSideLabels: {partnerA: "Aditi", partnerB: "Kabir"}},
    "programHouseholds/household-1": {
      ...whatsappSeed()["programHouseholds/household-1"]!,
      side: "partnerA"},
  });
  await routeProgramWhatsappInbound(db as unknown as Firestore,
    inboundEvent({}), now);
  await routeProgramWhatsappInbound(db as unknown as Firestore,
    inboundEvent({from: strangerPhone, id: "wamid.s1",
      atMillis: now.toMillis() - 1000}), now);
  return db;
}

test("the inbox lists threads with segment counts and the number",
  async () => {
    const db = await seeded();
    const list = await listProgramWhatsappThreadsHandler(request({
      programId: "program-1", filter: "all"}, "manager-1"), deps(db));
    assert.deepEqual(list.counts, {needsYou: 2, handled: 0, all: 2});
    assert.equal(list.threads[0].displayName, "The Mehra family");
    assert.equal(list.threads[0].sideLabel, "Aditi");
    assert.equal(list.threads[1].displayName, "Unknown number");
    assert.equal(list.sender?.connectionId, "conn-1");
    const page = await listProgramWhatsappThreadsHandler(request({
      programId: "program-1", filter: "all", limit: 1}, "manager-1"),
    deps(db));
    assert.equal(page.threads.length, 1);
    const next = await listProgramWhatsappThreadsHandler(request({
      programId: "program-1", filter: "all", limit: 1,
      cursor: page.nextCursor}, "manager-1"), deps(db));
    assert.equal(next.threads[0].unknownSender, true);
    assert.equal(next.nextCursor, null);
    await assert.rejects(listProgramWhatsappThreadsHandler(request({
      programId: "program-1", filter: "all"}, "stranger"), deps(db)),
    code("permission-denied"));
  });

test("opening a thread shows the household and marks it read", async () => {
  const db = await seeded();
  const thread = await getProgramWhatsappThreadHandler(request({
    programId: "program-1", threadId: "program-1_household-1"},
  "manager-1"), deps(db));
  assert.equal(thread.household?.label, "The Mehra family");
  assert.equal(thread.messages.length, 1);
  assert.equal(thread.messages[0].author, "guest");
  assert.equal(thread.thread.serviceWindowOpen, true);
  assert.equal(db.getDoc("programWhatsappThreads/program-1_household-1")!
    .unreadCount, 0);
});

test("the planner's reply goes through the reservation path", async () => {
  const db = await seeded();
  const sent: string[] = [];
  const replyDeps = {...(deps(db) as object),
    provider: () => ({sendText: async (params: {body: string}) => {
      sent.push(params.body);
      return {providerMessageId: "wamid.reply"};
    }}),
    tokenStore: {accessBound: async () => "token"},
    now: () => admin.firestore.Timestamp.fromMillis(now.toMillis() + 5000),
  } as never;
  const result = await sendProgramWhatsappReplyHandler(request({
    programId: "program-1", threadId: "program-1_household-1",
    text: "  Yes, at 6 from the lobby. ", idempotencyKey: "reply-key-0001",
    expectedLastInboundAtMillis: now.toMillis()}, "manager-1"), replyDeps);
  assert.equal(result.replayed, false);
  assert.deepEqual(sent, ["Yes, at 6 from the lobby."]);
  const list = await listProgramWhatsappThreadsHandler(request({
    programId: "program-1", filter: "handled"}, "manager-1"), deps(db));
  assert.equal(list.threads[0].handledBy, "planner");
  await assert.rejects(sendProgramWhatsappReplyHandler(request({
    programId: "program-1",
    threadId: list.threads[0].threadId.replace("household-1", "nope"),
    text: "Hi", idempotencyKey: "reply-key-0002",
    expectedLastInboundAtMillis: now.toMillis()}, "manager-1"), replyDeps),
  code("not-found"));
});
