import assert from "node:assert/strict";
import test from "node:test";
import {
  MAX_MESSAGE_NOMINATIONS,
  parseNominationMessage,
} from "../src/workflows/supply-intake/message-nomination.mjs";

test("a profile shared from Instagram becomes one nomination without its share token", () => {
  const parsed = parseNominationMessage("https://www.instagram.com/afterfly.in?igsh=MXd4ZnB0bWZ4cGs=");
  assert.deepEqual(parsed, {
    nominations: [{urls: ["https://instagram.com/afterfly.in"], notes: null}],
    unreadable: [],
    droppedNominations: 0,
  });
});

test("links on one line belong to one organizer and duplicates collapse", () => {
  const parsed = parseNominationMessage(
    "Afterfly: lu.ma/afterfly, https://www.instagram.com/afterfly.in/ and @afterfly.in");
  assert.deepEqual(parsed.nominations, [{
    urls: ["https://luma.com/afterfly", "https://instagram.com/afterfly.in"],
    notes: "Afterfly: and",
  }]);
});

test("each line with links is its own organizer and link-less lines are notes", () => {
  const parsed = parseNominationMessage([
    "Mumbai run clubs",
    "@bandrarunners",
    "https://luma.com/calendar/sunday-social great Sunday crowd",
    "met them at a mixer",
  ].join("\n"));
  assert.deepEqual(parsed.nominations, [
    {urls: ["https://instagram.com/bandrarunners"], notes: "Mumbai run clubs"},
    {urls: ["https://luma.com/calendar/sunday-social"], notes: "great Sunday crowd\nmet them at a mixer"},
  ]);
});

test("a handle inside a link stays part of that link", () => {
  const parsed = parseNominationMessage("https://medium.com/@afterfly/our-story");
  assert.deepEqual(parsed.nominations, [{urls: ["https://medium.com/%40afterfly/our-story"], notes: null}]);
});

test("email addresses, plain words and bare hosts without a path are not links", () => {
  const parsed = parseNominationMessage("write to team@example.com, e.g. catch.app is great");
  assert.deepEqual(parsed.nominations, []);
  assert.deepEqual(parsed.unreadable, []);
});

test("a message with no links yields no nominations", () => {
  assert.deepEqual(parseNominationMessage("hi, who is this?").nominations, []);
  assert.deepEqual(parseNominationMessage(null).nominations, []);
});

test("caps the organizers one message can nominate", () => {
  const lines = Array.from({length: MAX_MESSAGE_NOMINATIONS + 2}, (_, index) => `@organizer_${index}`);
  const parsed = parseNominationMessage(lines.join("\n"));
  assert.equal(parsed.nominations.length, MAX_MESSAGE_NOMINATIONS);
  assert.equal(parsed.droppedNominations, 2);
});
