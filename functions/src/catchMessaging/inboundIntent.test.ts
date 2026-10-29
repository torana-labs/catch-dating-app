/* eslint-disable max-len */
import assert from "node:assert/strict";
import test from "node:test";
import {classifyCatchInbound, type CatchInboundFacts} from "./inboundIntent";

const facts = (overrides: Partial<CatchInboundFacts> = {}): CatchInboundFacts => ({text: "@afterfly.in",
  isNominator: true, nominationCount: 1, notes: [null], awaitingClarification: false, ...overrides});

test("a nominator's links alone, or with a short note, are a nomination", () => {
  assert.deepEqual(classifyCatchInbound(facts()), {kind: "nomination"});
  assert.deepEqual(classifyCatchInbound(facts({notes: ["techno run club, Indore"]})), {kind: "nomination"});
});

test("links with a question, or a long message, are unclear", () => {
  for (const note of ["is this legit?", "Can you check them", "what do you think", Array(30).fill("word").join(" ")]) {
    assert.deepEqual(classifyCatchInbound(facts({notes: [note]})), {kind: "clarify"}, note);
  }
});

test("an explicit word wins over what the message holds", () => {
  assert.deepEqual(classifyCatchInbound(facts({text: "nominate @afterfly.in is this legit?",
    notes: ["is this legit?"]})), {kind: "nomination"});
  assert.deepEqual(classifyCatchInbound(facts({text: "nominate them", nominationCount: 0, notes: []})),
    {kind: "nomination_without_links"});
  assert.deepEqual(classifyCatchInbound(facts({text: "help, the page for @afterfly.in is wrong"})), {kind: "support"});
});

test("anyone who is not a nominator, or sends no links, is support", () => {
  assert.deepEqual(classifyCatchInbound(facts({isNominator: false})), {kind: "support"});
  assert.deepEqual(classifyCatchInbound(facts({isNominator: false, text: "nominate @afterfly.in"})), {kind: "support"});
  assert.deepEqual(classifyCatchInbound(facts({text: "when is the next event", nominationCount: 0, notes: []})),
    {kind: "support"});
});

test("1 or 2 answer an open question; anything else is read afresh", () => {
  for (const text of ["1", " yes ", "Nominate."]) {
    assert.deepEqual(classifyCatchInbound(facts({text, awaitingClarification: true, nominationCount: 0, notes: []})),
      {kind: "clarification_answer", answer: "nominate"}, text);
  }
  for (const text of ["2", "question", "no"]) {
    assert.deepEqual(classifyCatchInbound(facts({text, awaitingClarification: true, nominationCount: 0, notes: []})),
      {kind: "clarification_answer", answer: "support"}, text);
  }
  assert.deepEqual(classifyCatchInbound(facts({text: "1", nominationCount: 0, notes: []})), {kind: "support"});
  assert.deepEqual(classifyCatchInbound(facts({awaitingClarification: true})), {kind: "nomination"});
});
