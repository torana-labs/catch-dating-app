/* eslint-disable max-len */
import assert from "node:assert/strict";
import test from "node:test";
import {
  answerIsSafe,
  chooseLanguage,
  holdingReply,
  normalizeLanguages,
  normalizeReplyWithin,
  preCheck,
} from "./policy";
import {
  buildRequestBody,
  parseModelDecision,
  promptHash,
  systemPrompt,
} from "./prompt";

test("the reply language follows the guest's script among the offered languages", () => {
  assert.equal(chooseLanguage("What time is the haldi?", ["en", "hi"]), "en");
  assert.equal(chooseLanguage("हल्दी कितने बजे है?", ["en", "hi"]), "hi");
  assert.equal(chooseLanguage("हल्दी कितने बजे है?", ["en", "mr"]), "mr");
  assert.equal(chooseLanguage("હલ્દી ક્યારે છે?", ["en", "hi"]), "en");
  assert.equal(chooseLanguage("હલ્દી ક્યારે છે?", ["gu", "en"]), "gu");
  assert.equal(chooseLanguage("What time?", ["hi"]), "hi");
  assert.deepEqual(normalizeLanguages(undefined), ["en", "hi"]);
  assert.deepEqual(normalizeLanguages(["fr", "ta", "ta"]), ["ta"]);
});

test("media, asking for a person, distress, money and changes never reach the model", () => {
  assert.equal(preCheck({kind: "media-ref", text: null}), "media");
  assert.equal(preCheck({kind: "text", text: "  "}), "media");
  assert.equal(preCheck({kind: "text", text: "Can I talk to a real person please"}), "askedForPerson");
  assert.equal(preCheck({kind: "text", text: "प्लानर से बात करनी है"}), "askedForPerson");
  assert.equal(preCheck({kind: "text", text: "Dadi fainted, we need a hospital"}), "distress");
  assert.equal(preCheck({kind: "text", text: "मदद करो, पासपोर्ट चोरी हो गया"}), "distress");
  assert.equal(preCheck({kind: "text", text: "Where do we send the shagun?"}), "giftsOrMoney");
  assert.equal(preCheck({kind: "text", text: "Please change our room to a suite"}), "changeRequest");
  assert.equal(preCheck({kind: "text", text: "We're 6 now, not 5"}), "changeRequest");
  assert.equal(preCheck({kind: "text", text: "What time are the cars to the wedding?"}), null);
  assert.equal(preCheck({kind: "text", text: "हल्दी कितने बजे है?"}), null);
});

test("an answer with invented contact details or links is never sent", () => {
  const facts = "Pickup at UDR arrivals, Gate 2. Hotel desk 0294 2528016.";
  assert.ok(answerIsSafe("Cars leave the Taj porch at 6:15 PM.", facts));
  assert.ok(answerIsSafe("The desk number is 0294 2528016.", facts));
  assert.ok(!answerIsSafe("Call Meher on +91 98765 01234.", facts));
  assert.ok(!answerIsSafe("See https://example.com/map", facts));
  assert.ok(!answerIsSafe("Email meher@example.com", facts));
  assert.ok(!answerIsSafe("x".repeat(1001), facts));
  assert.ok(!answerIsSafe("   ", facts));
});

test("the holding reply says it was passed on and when, in English or Hindi", () => {
  assert.equal(holdingReply("en", "sameDay", "notInFacts"),
    "I've passed this to your planner. They'll reply here today.");
  assert.equal(holdingReply("en", "hour", "distress"),
    "I'm sorry. I've passed this to your planner. They'll reply here within the hour.");
  assert.match(holdingReply("hi", "fourHours", "notInFacts"), /चार घंटे के भीतर/u);
  assert.equal(holdingReply("gu", "sameDay", "media"), holdingReply("en", "sameDay", "media"));
  assert.equal(normalizeReplyWithin("weekly"), "sameDay");
});

test("the prompt carries the never-does list and the facts, and history starts with the guest", () => {
  const system = systemPrompt("hi", "warm");
  assert.match(system, /Reply in Hindi/u);
  assert.match(system, /Never shares another guest's details/u);
  assert.match(system, /cannot book, change, cancel or confirm/u);
  const body = buildRequestBody({language: "en", tone: "brief", factText: "Wedding: X",
    history: [
      {direction: "outbound", text: "Welcome!"},
      {direction: "inbound", text: "Hi"},
      {direction: "outbound", text: "Hello"},
      {direction: "inbound", text: "When is the sangeet?"},
    ]});
  assert.equal(body.model, "claude-sonnet-5-5");
  assert.equal(body.messages[0].role, "user");
  assert.equal(body.messages.at(-1)?.content, "When is the sangeet?");
  assert.equal(body.messages.length, 3);
  assert.equal(body.system[1].text, "FACTS\nWedding: X");
  assert.equal(promptHash(body), promptHash(structuredClone(body)));
  assert.throws(() => buildRequestBody({language: "en", tone: "warm", factText: "",
    history: [{direction: "outbound", text: "Hello"}]}));
});

test("the model's decision parses strictly; anything else is passed on", () => {
  assert.deepEqual(parseModelDecision("{\"action\":\"answer\",\"text\":\"At 10 AM.\"}"),
    {action: "answer", text: "At 10 AM."});
  assert.deepEqual(parseModelDecision("```json\n{\"action\":\"escalate\",\"reason\":\"changeRequest\"}\n```"),
    {action: "escalate", reason: "changeRequest"});
  assert.deepEqual(parseModelDecision("{\"action\":\"escalate\",\"reason\":\"whatever\"}"),
    {action: "escalate", reason: "notInFacts"});
  assert.deepEqual(parseModelDecision("Sure! The haldi is at 10."),
    {action: "escalate", reason: "unsafeAnswer"});
  assert.deepEqual(parseModelDecision("{\"action\":\"answer\",\"text\":\"\"}"),
    {action: "escalate", reason: "unsafeAnswer"});
});
