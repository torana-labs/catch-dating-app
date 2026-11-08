/* eslint-disable max-len */
import assert from "node:assert/strict";
import test from "node:test";
import * as admin from "firebase-admin";
import {FakeFirestore, type FakeData} from "../../shared/testing/programFirestore";
import {baseSeed, now, request} from "../../shared/testing/programFixtures";
import {contractValidator} from "../../shared/contractTestValidators";
import {getProgramLiveBoardHandler} from "../programLiveBoard";
import type {AssistantRequestBody} from "./prompt";
import type {AssistantRuntime, ProviderResult} from "./provider";
import {
  handleProgramWhatsappInbound,
  type ProgramAssistantDeps,
  type ServiceReplyInput,
} from "./decide";
import {previewProgramAssistantReplyHandler} from "./preview";
import {assistantRunId} from "./runs";

const validateRun = contractValidator("ProgramAssistantRunDocument");
const validateSend = contractValidator("OrganizerMomentSendDocument");
const validateAlert = contractValidator("ProgramAlertDocument");
const validatePreview = contractValidator("ProgramAssistantReplyPreviewCallableResponse");
const NOW = now.toMillis();
const THREAD = "program-1_hh-1";
const ts = (millis: number) => admin.firestore.Timestamp.fromMillis(millis);

function seed(overrides: Record<string, FakeData | undefined> = {}): Record<string, FakeData | undefined> {
  const base = baseSeed();
  return {
    ...base,
    "programHouseholds/hh-1": {programId: "program-1", organizerId: "org-1",
      label: "The Sharma family", primaryContactName: "Asha", primaryPhoneE164: "+919800000001",
      primaryEmail: null, memberGuestIds: ["guest-1"], deliveryPreference: "whatsapp",
      createdAt: now, updatedAt: now, revision: 1},
    "programGuests/guest-1": {...base["programGuests/guest-1"], householdId: "hh-1",
      displayName: "Asha Sharma", invitationStatus: "responded", rsvpStatus: "attending"},
    "programFunctions/fn-haldi": {programId: "program-1", organizerId: "org-1",
      name: "Haldi", startsAt: ts(NOW + 86_400_000), endsAt: ts(NOW + 90_000_000),
      venueName: "The Courtyard", status: "scheduled", dressCode: "Yellow",
      createdAt: now, updatedAt: now, revision: 1},
    "programAssistantSettings/program-1": {enabled: true, languages: ["en", "hi"],
      replyWithin: "sameDay", escalationStaffUids: ["manager-1"], neverDoes: [],
      tone: "warm", dailyTokenBudget: 100_000},
    [`programWhatsappThreads/${THREAD}`]: {programId: "program-1", householdId: "hh-1",
      handledBy: "assistant", state: "handled", language: "en",
      serviceWindowExpiresAt: ts(NOW + 3_600_000)},
    ...overrides,
  };
}

function inbound(messageId: string, text: string | null, kind = "text"): FakeData {
  return {threadId: THREAD, direction: "inbound", kind, text, author: "guest",
    providerMessageId: `wamid.${messageId}`, status: "received", createdAt: now};
}

function fakeRuntime(reply: (body: AssistantRequestBody) => ProviderResult,
  enabled = true) {
  const calls: AssistantRequestBody[] = [];
  const runtime: AssistantRuntime = {enabled, provider: async () => ({
    complete: async (body) => {
      calls.push(body);
      return reply(body);
    }})};
  return {runtime, calls};
}

const answer = (text: string): ProviderResult => ({ok: true,
  text: JSON.stringify({action: "answer", text}), inputTokens: 800, outputTokens: 30,
  attempts: 1, status: 200});

function setup(options: {seed?: Record<string, FakeData | undefined>;
  reply?: (body: AssistantRequestBody) => ProviderResult; enabled?: boolean} = {}) {
  const db = new FakeFirestore(options.seed ?? seed());
  const {runtime, calls} = fakeRuntime(options.reply ?? (() => answer("The haldi is at 10 AM.")),
    options.enabled ?? true);
  const sent: ServiceReplyInput[] = [];
  const deps: ProgramAssistantDeps = {
    firestore: () => db as unknown as FirebaseFirestore.Firestore,
    nowMillis: () => NOW,
    runtime: () => runtime,
    sendServiceReply: async (input) => {
      sent.push(input);
    },
  };
  const run = async (messageId: string, message: FakeData) => {
    db.setDoc(`programWhatsappMessages/${messageId}`, message);
    return handleProgramWhatsappInbound({params: {messageId},
      data: {id: messageId, data: () => message}}, deps);
  };
  return {db, deps, calls, sent, run};
}

const runDoc = (db: FakeFirestore, messageId: string) =>
  db.getDoc(`programAssistantRuns/${assistantRunId("live", messageId)}`);

test("a question in the itinerary is answered through W1's service and audited without text", async () => {
  const {db, calls, sent, run} = setup();
  const result = await run("m1", inbound("m1", "What time is the haldi?"));
  assert.equal(result.status, "answered");
  assert.equal(calls.length, 1);
  assert.match(calls[0].system[1].text, /Haldi/u);
  assert.match(calls[0].system[1].text, /Asha Sharma/u);
  assert.ok(!calls[0].system[1].text.includes("+9198"));
  assert.deepEqual(sent, [{programId: "program-1", householdId: "hh-1",
    text: "The haldi is at 10 AM.", author: "assistant", runId: assistantRunId("live", "m1")}]);
  const audit = runDoc(db, "m1")!;
  assert.ok(validateRun(audit), JSON.stringify(validateRun.errors));
  assert.equal(audit.status, "answered");
  assert.equal(audit.inputTokens, 800);
  assert.ok(!JSON.stringify(audit).includes("haldi"));
  const day = String(audit.budgetDay);
  const ledger = db.getDoc(`programAssistantBudgets/program-1_${day}`)!;
  assert.equal(ledger.consumedTokens, 830);
  assert.equal(ledger.reservedTokens, 0);
  assert.equal(db.getDoc(`programWhatsappThreads/${THREAD}`)!.state, "handled");
});

test("a retried trigger never calls the model or replies twice", async () => {
  const {calls, sent, run} = setup();
  await run("m1", inbound("m1", "What time is the haldi?"));
  const again = await run("m1", inbound("m1", "What time is the haldi?"));
  assert.equal(again.status, "duplicate");
  assert.equal(calls.length, 1);
  assert.equal(sent.length, 1);
});

test("an unsettled earlier attempt is passed on, never resubmitted", async () => {
  const {db, calls, sent, run} = setup();
  db.setDoc(`programAssistantRuns/${assistantRunId("live", "m9")}`, {
    runId: assistantRunId("live", "m9"), programId: "program-1", organizerId: "org-1",
    mode: "live", threadId: THREAD, messageId: "m9", actorUid: null, status: "intent",
    reason: null, language: "en", model: "claude-sonnet-5-5", promptVersion: "v", factPackVersion: "f",
    promptHash: null, factPackHash: null, budgetDay: "2027-01-15", reservedTokens: 2000,
    inputTokens: 0, outputTokens: 0, attempts: 0, providerStatus: null, latencyMillis: null,
    createdAtMillis: NOW, updatedAtMillis: NOW});
  const result = await run("m9", inbound("m9", "What time is the haldi?"));
  assert.deepEqual(result, {status: "escalated", runId: assistantRunId("live", "m9"),
    reason: "uncertainRetry"});
  assert.equal(calls.length, 0);
  assert.equal(sent.length, 0);
});

test("a thread the planner took over is left to the planner", async () => {
  const data = seed();
  data[`programWhatsappThreads/${THREAD}`] = {...data[`programWhatsappThreads/${THREAD}`]!,
    handledBy: "planner"};
  const {db, calls, sent, run} = setup({seed: data});
  const result = await run("m1", inbound("m1", "What time is the haldi?"));
  assert.equal(result.status, "skipped");
  assert.equal(calls.length + sent.length, 0);
  assert.equal(runDoc(db, "m1")!.reason, "plannerHandling");
});

test("with the kill switch or the programme setting off, the thread needs the planner and nothing is sent", async () => {
  for (const variant of ["param", "setting"] as const) {
    const data = seed();
    if (variant === "setting") {
      data["programAssistantSettings/program-1"] = {...data["programAssistantSettings/program-1"]!,
        enabled: false};
    }
    const {db, calls, sent, run} = setup({seed: data, enabled: variant !== "param"});
    const result = await run("m1", inbound("m1", "What time is the haldi?"));
    assert.equal(result.status, "escalated");
    assert.equal(calls.length + sent.length, 0);
    const thread = db.getDoc(`programWhatsappThreads/${THREAD}`)!;
    assert.equal(thread.state, "needsYou");
    assert.equal(thread.escalationReason, "assistantOff");
    assert.equal((await db.collection("programAlerts").get()).size, 0);
  }
  // No settings document at all reads as off.
  const data = seed({"programAssistantSettings/program-1": undefined});
  const {calls} = setup({seed: data});
  assert.equal(calls.length, 0);
});

test("a closed 24-hour window passes the message on without any free text", async () => {
  const data = seed();
  data[`programWhatsappThreads/${THREAD}`] = {...data[`programWhatsappThreads/${THREAD}`]!,
    serviceWindowExpiresAt: ts(NOW - 1000)};
  const {db, calls, sent, run} = setup({seed: data});
  const result = await run("m1", inbound("m1", "What time is the haldi?"));
  assert.equal(result.status, "escalated");
  assert.equal(calls.length + sent.length, 0);
  assert.equal((await db.collection("programAlerts").get()).size, 1);
});

test("media is passed to the planner with a holding reply, staff attention and an assigned alert", async () => {
  const {db, calls, sent, run} = setup();
  const result = await run("m1", inbound("m1", null, "media-ref"));
  assert.equal(result.status, "escalated");
  assert.equal(calls.length, 0);
  assert.equal(sent.length, 1);
  assert.equal(sent[0].text, "I've passed this to your planner. They'll reply here today.");
  const runId = assistantRunId("live", "m1");
  const send = db.getDoc(`organizerMomentSends/${runId}_uid:manager-1`)!;
  assert.ok(validateSend(send), JSON.stringify(validateSend.errors));
  assert.equal(send.actionKind, "staffAttention");
  assert.equal(send.title, "The Sharma family needs a reply on WhatsApp");
  const alert = db.getDoc(`programAlerts/program-1_${runId}_communications`)!;
  assert.ok(validateAlert(alert), JSON.stringify(validateAlert.errors));
  assert.equal(alert.assigneeUid, "manager-1");
  assert.equal(db.getDoc(`programWhatsappThreads/${THREAD}`)!.escalationReason, "media");
  // The live board shows it, assigned to the planner.
  const board = await getProgramLiveBoardHandler(request({programId: "program-1"}, "manager-1"),
    {firestore: () => db as unknown as FirebaseFirestore.Firestore,
      checkRateLimit: async () => undefined, now: () => now});
  const shown = board.alerts.find((row) => row.alertId === `${runId}_communications`);
  assert.equal(shown?.assignedToMe, true);
  assert.equal(shown?.revision, 1);
});

test("distress is urgent and never reaches the model", async () => {
  const {db, calls, sent, run} = setup();
  await run("m1", inbound("m1", "Dadi fainted, we need a hospital"));
  assert.equal(calls.length, 0);
  assert.match(sent[0].text, /^I'm sorry\./u);
  assert.equal(db.getDoc(`organizerMomentSends/${assistantRunId("live", "m1")}_uid:manager-1`)!.severity, "urgent");
});

test("when the facts do not hold the answer the guest hears back in Hindi and the planner is told", async () => {
  const {db, calls, sent, run} = setup({reply: () => ({ok: true,
    text: "{\"action\":\"escalate\",\"reason\":\"notInFacts\"}", inputTokens: 700,
    outputTokens: 12, attempts: 1, status: 200})});
  const result = await run("m1", inbound("m1", "क्या हमारा ड्राइवर भी होटल में रुक सकता है?"));
  assert.deepEqual(result, {status: "escalated", runId: assistantRunId("live", "m1"),
    reason: "notInFacts"});
  assert.match(calls[0].system[0].text, /Reply in Hindi/u);
  assert.match(sent[0].text, /प्लानर/u);
  assert.equal(runDoc(db, "m1")!.reason, "notInFacts");
  assert.equal(runDoc(db, "m1")!.outputTokens, 12);
});

test("an answer with an invented phone number is never sent", async () => {
  const {db, sent, run} = setup({reply: () => answer("Call Meher on +91 98765 01234.")});
  const result = await run("m1", inbound("m1", "Who do I call at the venue?"));
  assert.equal(result.status, "escalated");
  assert.equal(runDoc(db, "m1")!.reason, "unsafeAnswer");
  assert.equal(sent.length, 1);
  assert.ok(!sent[0].text.includes("98765"));
});

test("provider failures and a spent budget pass the message on", async () => {
  const down = setup({reply: () => ({ok: false, failure: "unavailable", attempts: 2,
    status: 529, billedUncertain: false, inputTokens: 0, outputTokens: 0})});
  assert.equal((await down.run("m1", inbound("m1", "What time is the haldi?"))).status, "escalated");
  assert.equal(runDoc(down.db, "m1")!.reason, "providerError");
  assert.equal(runDoc(down.db, "m1")!.attempts, 2);

  const data = seed();
  data["programAssistantSettings/program-1"] = {...data["programAssistantSettings/program-1"]!,
    dailyTokenBudget: 100};
  const broke = setup({seed: data});
  const result = await broke.run("m1", inbound("m1", "What time is the haldi?"));
  assert.equal(result.status, "escalated");
  assert.equal(broke.calls.length, 0);
  assert.equal(runDoc(broke.db, "m1")!.reason, "budgetExhausted");
});

test("outbound, staff and unknown-sender messages are ignored", async () => {
  const {calls, run} = setup();
  assert.equal((await run("o1", {...inbound("o1", "Hi"), direction: "outbound",
    author: "assistant"})).status, "ignored");
  assert.equal((await run("s1", {...inbound("s1", "Hi"), author: "staff-1"})).status, "ignored");
  const data = seed();
  data[`programWhatsappThreads/${THREAD}`] = {...data[`programWhatsappThreads/${THREAD}`]!,
    unknownSender: true};
  const unknown = setup({seed: data});
  assert.equal((await unknown.run("u1", inbound("u1", "Hi"))).status, "ignored");
  assert.equal(calls.length + unknown.calls.length, 0);
});

function previewDeps(db: FakeFirestore, runtime: AssistantRuntime) {
  return {firestore: () => db as unknown as FirebaseFirestore.Firestore,
    checkRateLimit: async () => undefined, now: () => now, runtime: () => runtime};
}

test("Try it answers as a guest through the same path and sends nothing", async () => {
  const db = new FakeFirestore(seed());
  const {runtime, calls} = fakeRuntime(() => answer("The haldi is at 10 AM."));
  const response = await previewProgramAssistantReplyHandler(request({programId: "program-1",
    requestId: "preview-0001", text: "What time is the haldi?", householdId: "hh-1"}, "manager-1"),
  previewDeps(db, runtime));
  assert.ok(validatePreview(response));
  assert.equal(response.outcome, "answer");
  assert.equal(response.reply, "The haldi is at 10 AM.");
  assert.equal(response.remainingTokens, 100_000 - 830);
  assert.equal(calls.length, 1);
  const audit = db.getDoc(`programAssistantRuns/${response.runId}`)!;
  assert.equal(audit.mode, "preview");
  assert.equal(audit.actorUid, "manager-1");
  await assert.rejects(previewProgramAssistantReplyHandler(request({programId: "program-1",
    requestId: "preview-0001", text: "Again?"}, "manager-1"), previewDeps(db, runtime)),
  (error: {code?: string}) => error.code === "already-exists");
});

test("Try it shows the holding reply for what it passes on, and says when Catch has it off", async () => {
  const db = new FakeFirestore(seed());
  const {runtime} = fakeRuntime(() => answer("unused"));
  const passed = await previewProgramAssistantReplyHandler(request({programId: "program-1",
    requestId: "preview-0002", text: "Where do we send the shagun?"}, "manager-1"),
  previewDeps(db, runtime));
  assert.equal(passed.outcome, "passedOn");
  assert.equal(passed.reason, "giftsOrMoney");
  assert.match(passed.reply ?? "", /passed this to your planner/u);
  const off = fakeRuntime(() => answer("unused"), false);
  const unavailable = await previewProgramAssistantReplyHandler(request({programId: "program-1",
    requestId: "preview-0003", text: "Hi"}, "manager-1"), previewDeps(db, off.runtime));
  assert.ok(validatePreview(unavailable));
  assert.equal(unavailable.outcome, "unavailable");
  assert.equal(unavailable.reply, null);
});

test("Try it is for staff with the communications duty", async () => {
  const db = new FakeFirestore(seed());
  const {runtime} = fakeRuntime(() => answer("x"));
  await assert.rejects(previewProgramAssistantReplyHandler(request({programId: "program-1",
    requestId: "preview-0004", text: "Hi"}, "greeter-1"), previewDeps(db, runtime)),
  (error: {code?: string}) => error.code === "permission-denied");
  await assert.rejects(previewProgramAssistantReplyHandler(request({programId: "program-1",
    requestId: "preview-0005", text: "Hi", householdId: "nope"}, "manager-1"), previewDeps(db, runtime)),
  (error: {code?: string}) => error.code === "not-found");
});
