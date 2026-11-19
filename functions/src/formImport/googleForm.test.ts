/* eslint-disable max-len */
import assert from "node:assert/strict";
import test from "node:test";
import {GOOGLE_FORM_SCRIPT_ID, googleFormData, importGoogleForm} from "./googleForm";

// A fictional form in the layout of Google's public page data:
// item = [itemId, title, description, typeCode, [[entryId, options, required, scaleLabels]]]
// option = [label, null, goToSectionItemId, null, isOther]
function form(items: unknown[], {title = "Driftwood Supper Club RSVP", description = "Tell us about you."} = {}) {
  return [null, [description, items, null, null, null, null, null, null, title], "/forms", title];
}
const question = (id: number, title: string, type: number, options: unknown[] | null = null, required = 1, extra: unknown = null) =>
  [id, title, null, type, [[id + 1000, options, required, extra]]];
const option = (label: string, goTo: number | null = null, other = false) => [label, null, goTo, null, other];
const section = (id: number, title: string, description: string | null = null) => [id, title, description, 8];

test("questions map to native kinds, with contact fields detected from the label", () => {
  const imported = importGoogleForm(form([
    question(1, "Your name", 0),
    question(2, "Email address", 0),
    question(3, "WhatsApp number", 0),
    question(4, "Anything we should know?", 1, null, 0),
    question(5, "Which night?", 2, [option("Friday"), option("Saturday")]),
    question(6, "Dietary needs", 4, [option("Vegetarian"), option("Vegan"), option("None")]),
    question(7, "Seat preference", 3, [option("Window"), option("Long table")]),
    question(8, "How social are you?", 5, [option("1"), option("2"), option("3")], 1, ["Quiet", "Very"]),
    question(9, "Birthday", 9),
  ]));
  assert.ok(imported);
  assert.equal(imported.title, "Driftwood Supper Club RSVP");
  assert.equal(imported.description, "Tell us about you.");
  assert.equal(imported.sections.length, 1);
  const questions = imported.sections[0].questions;
  assert.deepEqual(questions.map((item) => [item.key, item.kind, item.privacyClass, item.required]), [
    ["q1_your_name", "shortText", "contact", true],
    ["q2_email_address", "email", "contact", true],
    ["q3_whatsapp_number", "phone", "contact", true],
    ["q4_anything_we_should_know", "longText", "organizerCustom", false],
    ["q5_which_night", "singleChoice", "organizerCustom", true],
    ["q6_dietary_needs", "multiChoice", "organizerCustom", true],
    ["q7_seat_preference", "singleChoice", "organizerCustom", true],
    ["q8_how_social_are_you", "singleChoice", "organizerCustom", true],
    ["q9_birthday", "date", "organizerCustom", true],
  ]);
  assert.deepEqual(questions[4].options, [{label: "Friday", value: "Friday"}, {label: "Saturday", value: "Saturday"}]);
  assert.equal(questions[7].helpText, "Quiet to Very");
  assert.deepEqual(imported.flags, []);
  assert.deepEqual(imported.logic, []);
});

test("per-option section jumps become show-section rules on later sections", () => {
  const imported = importGoogleForm(form([
    question(1, "Are you coming?", 2, [option("Yes", 200), option("Maybe", 200), option("No", 300)]),
    section(200, "Your booking", "Seats are limited."),
    question(201, "How many seats?", 3, [option("1"), option("2")]),
    section(300, "Sorry to miss you"),
    question(301, "Want updates?", 2, [option("Yes"), option("No")]),
  ]));
  assert.ok(imported);
  assert.deepEqual(imported.sections.map((item) => [item.id, item.title, item.description, item.questions.length]), [
    ["s1", "Driftwood Supper Club RSVP", null, 1],
    ["s2", "Your booking", "Seats are limited.", 1],
    ["s3", "Sorry to miss you", null, 1],
  ]);
  assert.deepEqual(imported.logic, [
    {action: "showSection", questionKey: "q1_are_you_coming", values: ["Yes", "Maybe"], targetSectionId: "s2"},
    {action: "showSection", questionKey: "q1_are_you_coming", values: ["No"], targetSectionId: "s3"},
  ]);
  assert.deepEqual(imported.flags, []);
});

test("what native forms cannot express is flagged, never guessed", () => {
  const imported = importGoogleForm(form([
    question(1, "Pick a plan", 2, [option("Full", 200), option("Half")]),
    question(2, "Rate each course", 7),
    question(3, "Arrival time", 10),
    question(4, "Upload a photo", 13),
    [5, "Map", null, 11],
    question(6, "Favourite drink", 2, [option("Tea"), option("Coffee"), option("", null, true)]),
    question(7, "Back to the start", 2, [option("Again", -3), option("Done")]),
    [8, "Mystery item", null, 42],
    section(200, "Full plan"),
    question(201, "Go back?", 2, [option("Yes", 200), option("No")]),
  ]));
  assert.ok(imported);
  assert.deepEqual(imported.flags.map((flag) => [flag.code, flag.item]), [
    ["branching_review", "Pick a plan"],
    ["grid_not_supported", "Rate each course"],
    ["time_as_text", "Arrival time"],
    ["file_upload_skipped", "Upload a photo"],
    ["media_skipped", "Map"],
    ["other_option_dropped", "Favourite drink"],
    ["navigation_not_supported", "Back to the start"],
    ["unknown_item_skipped", "Mystery item"],
    ["branching_review", "Go back?"],
    ["navigation_not_supported", "Go back?"],
  ]);
  assert.deepEqual(imported.logic, [
    {action: "showSection", questionKey: "q1_pick_a_plan", values: ["Full"], targetSectionId: "s2"},
  ]);
  const arrival = imported.sections[0].questions.find((item) => item.label === "Arrival time");
  assert.equal(arrival?.kind, "shortText");
});

test("a leading section break titles the opening section", () => {
  const imported = importGoogleForm(form([section(10, "About you"), question(11, "Your name", 0)]));
  assert.ok(imported);
  assert.deepEqual(imported.sections.map((item) => [item.id, item.title]), [["s1", "About you"]]);
});

test("keys stay unique and option values unique, case-insensitively", () => {
  const imported = importGoogleForm(form([
    question(1, "Size", 2, [option("Small"), option("small"), option("Large")]),
  ]));
  assert.ok(imported);
  assert.deepEqual(imported.sections[0].questions[0].options?.map((item) => item.value), ["Small", "small (2)", "Large"]);
});

test("a choice question left with fewer than two options becomes short text", () => {
  const imported = importGoogleForm(form([question(1, "Only one", 2, [option("Yes"), option("", null, true)])]));
  assert.ok(imported);
  assert.equal(imported.sections[0].questions[0].kind, "shortText");
  assert.equal(imported.sections[0].questions[0].options, undefined);
});

test("long text is trimmed to native limits and flagged once", () => {
  const long = "x".repeat(300);
  const imported = importGoogleForm(form([question(1, long, 0)], {title: "t".repeat(200)}));
  assert.ok(imported);
  assert.equal(imported.title.length, 160);
  assert.equal(imported.sections[0].questions[0].label.length, 240);
  assert.deepEqual(imported.flags.map((flag) => flag.code), ["text_trimmed", "text_trimmed"]);
});

test("page data that is not a form reads as null", () => {
  assert.equal(importGoogleForm([]), null);
  assert.equal(importGoogleForm([null, "nope"]), null);
  assert.equal(googleFormData(null), null);
  assert.equal(googleFormData({embeddedJson: [{id: "__NEXT_DATA__", value: {}}]}), null);
  assert.deepEqual(googleFormData({embeddedJson: [{id: GOOGLE_FORM_SCRIPT_ID, value: [1]}]}), [1]);
});
