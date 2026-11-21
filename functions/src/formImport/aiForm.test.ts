/* eslint-disable max-len */
import assert from "node:assert/strict";
import * as path from "node:path";
import test from "node:test";
import {pathToFileURL} from "node:url";
import {FakeFirestore} from "../operations/testFirestore";
import {AI_FALLBACK_POLICY, type ReadyAiFallbackPolicy} from "../commands/aiFallback/policy";
import {packagedModelModules, type AiFallbackDeps} from "../commands/aiFallback/runner";
import {formAiFallbackRequest, sharedFormAiFallback} from "../commands/importFormFromLink";
import {AI_FORM_OUTPUT_SCHEMA, aiFormInput, importAiForm} from "./aiForm";

// Every page and answer below is fictional; no real provider is called.

const answer = {
  title: "Lantern Walk sign-up",
  description: "Join the evening walk.",
  conditional: false,
  sections: [{title: "", questions: [
    {label: "Your name", helpText: "", kind: "shortText", required: true, options: []},
    {label: "Email", helpText: "", kind: "email", required: true, options: []},
    {label: "Pace", helpText: "Pick one", kind: "singleChoice", required: false, options: ["Easy", "Brisk"]},
    {label: "House rules", helpText: "", kind: "acknowledgement", required: true, options: []},
  ]}],
};

test("an answer becomes a native draft, every question listed for review", () => {
  const read = importAiForm(answer);
  assert.ok(read);
  assert.equal(read.imported.provider, "ai_read");
  assert.equal(read.imported.title, "Lantern Walk sign-up");
  assert.deepEqual(read.imported.logic, []);
  const questions = read.imported.sections[0].questions;
  assert.deepEqual(questions.map((item) => [item.kind, item.privacyClass, item.required]), [
    ["shortText", "contact", true], ["email", "contact", true], ["singleChoice", "organizerCustom", false],
    ["acknowledgement", "organizerCustom", true]]);
  assert.deepEqual(questions[2].options?.map((item) => item.value), ["Easy", "Brisk"]);
  assert.equal(questions[2].helpText, "Pick one");
  assert.deepEqual(read.reviewFields, questions.map((item) => item.key));
  assert.deepEqual(read.imported.flags, []);
});

test("conditional pages are flagged for the host, never turned into logic", () => {
  const read = importAiForm({...answer, conditional: true, sections: [...answer.sections,
    {title: "Your booking", questions: [{label: "Seats", helpText: "", kind: "number", required: false, options: []}]}]});
  assert.ok(read);
  assert.deepEqual(read.imported.logic, []);
  assert.deepEqual(read.imported.flags, [{code: "branching_review", item: null}]);
  assert.deepEqual(read.imported.sections.map((item) => item.title), ["Lantern Walk sign-up", "Your booking"]);
});

test("native limits apply as for a Google Form, and unknown kinds or empty answers are dropped", () => {
  const read = importAiForm({...answer, sections: [{title: "", questions: [
    {label: "x".repeat(300), helpText: "", kind: "longText", required: false, options: []},
    {label: "Upload a photo", helpText: "", kind: "file", required: true, options: []},
    {label: "One choice", helpText: "", kind: "singleChoice", required: false, options: ["Only"]},
  ]}]});
  assert.ok(read);
  const questions = read.imported.sections[0].questions;
  assert.equal(questions.length, 2);
  assert.equal(questions[0].label.length, 240);
  assert.equal(questions[1].kind, "shortText");
  assert.deepEqual(read.imported.flags.map((item) => item.code), ["text_trimmed"]);
  assert.equal(importAiForm({...answer, sections: []}), null);
  assert.equal(importAiForm({...answer, sections: [{title: "Empty", questions: []}]}), null);
  assert.equal(importAiForm("not an answer"), null);
});

test("the input is the page title and text only, within the byte limit", () => {
  assert.equal(aiFormInput("Title", "   "), null);
  assert.deepEqual(aiFormInput(" Lantern \n Walk ", "Name\n\nEmail"), {pageTitle: "Lantern Walk", pageText: "Name Email"});
  const long = aiFormInput("t", "é".repeat(20_000));
  assert.ok(long);
  assert.ok(Buffer.byteLength(long.pageText) <= 18_000);
  assert.ok(!long.pageText.endsWith("�"));
});

test("the output schema uses only what Anthropic structured outputs accept", async () => {
  const contract = await import(pathToFileURL(path.resolve(__dirname,
    "../operations/src/platform/model/provider-contract.mjs")).href);
  assert.doesNotThrow(() => contract.validateStructuredOutputSchema(AI_FORM_OUTPUT_SCHEMA, "anthropic"));
});

const NOW = new Date("2026-11-20T10:00:00.000Z");
const READY: ReadyAiFallbackPolicy = {...AI_FALLBACK_POLICY, enabled: true,
  decisionId: "issue-2062-comment-7045984815", privacyNoticeRef: "website-legal-ai-reading-2231"};
const stamp = (millis: number) => ({_seconds: Math.floor(millis / 1000), _nanoseconds: 0});

function fallback(policy: ReadyAiFallbackPolicy | null = READY) {
  const db = new FakeFirestore();
  const calls: Array<Record<string, unknown>> = [];
  const deps: AiFallbackDeps = {
    db: db as unknown as FirebaseFirestore.Firestore,
    now: () => NOW,
    serverTimestamp: () => stamp(NOW.getTime()) as unknown as FirebaseFirestore.FieldValue,
    timestampFromMillis: (millis) => stamp(millis) as unknown as FirebaseFirestore.Timestamp,
    policy: async () => policy,
    modules: packagedModelModules,
    accessToken: async () => "fixture-federation-token",
    transport: (async (_url: string, init: {body: string}) => {
      calls.push(JSON.parse(init.body));
      return new Response(JSON.stringify({id: "msg_fixture_1", type: "message", model: "claude-haiku-5-5",
        role: "assistant", stop_reason: "end_turn", stop_details: null, stop_sequence: null,
        content: [{type: "text", text: JSON.stringify(answer)}],
        usage: {input_tokens: 2_000, cache_read_input_tokens: 0, cache_creation_input_tokens: 0, output_tokens: 400}}),
      {status: 200});
    }) as unknown as typeof fetch,
  };
  return {db, deps, calls};
}

test("through the real runner: one paid read for preview and apply, page text only", async () => {
  const {db, deps, calls} = fallback();
  const ai = sharedFormAiFallback(deps);
  assert.equal(await ai.enabled(), true);
  const input = aiFormInput("Lantern Walk", "Lantern Walk sign-up. Your name. Email. Pace: Easy or Brisk.");
  assert.ok(input);
  const first = await ai.read({uid: "visitor-1", input});
  assert.equal(first.status, "read");
  assert.deepEqual(importAiForm(first.status === "read" ? first.output : null)?.reviewFields.length, 4);
  const again = await ai.read({uid: "visitor-1", input});
  assert.deepEqual(again, {status: "read", output: answer, cacheHit: true});
  assert.equal(calls.length, 1);
  // The provider saw the page text and title, nothing about the visitor.
  assert.ok(JSON.stringify(calls[0]).includes("Pace: Easy or Brisk."));
  assert.ok(!JSON.stringify(calls[0]).includes("visitor-1"));
  assert.equal((db.read("aiFallbackUsage/2026-11") as {paidReads: number}).paidReads, 1);
  // The per-call ceiling covers the worst case of the largest page.
  const modules = await packagedModelModules();
  const largest = formAiFallbackRequest("visitor-1", {pageTitle: "t".repeat(300), pageText: "x".repeat(18_000)});
  assert.ok(modules.stepCeilingMicros({modelId: READY.modelId, inputTokens: 18_300 + Buffer.byteLength(largest.prompt) +
    Buffer.byteLength(JSON.stringify(largest.outputSchema)) + 256 + 64, maxOutputTokens: largest.maxOutputTokens,
  maxWebSearches: 0}) <= largest.maxCostMicros);
});

test("while the policy is off, the command sees it off and nothing is sent", async () => {
  const {deps, calls} = fallback(null);
  assert.equal(await sharedFormAiFallback(deps).enabled(), false);
  assert.equal(calls.length, 0);
});
