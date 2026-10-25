import assert from "node:assert/strict";
import test from "node:test";
import {listScenarioConfigs, loadScenarioConfig} from "./demo_seed_scenario_catalog.mjs";
import {civilInstant, demoWorldFacts, eventOutcomesAt, eventStateAt, isDemoWorld, validateDemoWorld} from "./lib/demo_world.mjs";

// Demo world scenarios (schemaVersion 2): docs/plans/demo_world_scenarios_spec.md

test("every demo world in the scenarios folder validates", () => {
  // Loading validates each schemaVersion 2 world; a new world needs no test of its own.
  const worlds = listScenarioConfigs().filter(isDemoWorld);
  assert.ok(worlds.some((world) => world.id === "host-marketing-india"));
  assert.ok(worlds.some((world) => world.id === "us-nyc-host-demo"));
});

const trivia = loadScenarioConfig("host-marketing-india");
const triviaEvent = "event-host-trivia-store-demo";
const clone = () => structuredClone(trivia);

test("the India trivia world derives the counts its captures show at each moment", () => {
  const counts = Object.fromEntries(Object.keys(trivia.moments).map((moment) => {
    const {booked, checkedIn, phase} = eventStateAt(trivia, triviaEvent, moment);
    return [moment, [booked, checkedIn, phase]];
  }));
  assert.deepEqual(counts, {
    planning: [0, 0, "upcoming"],
    today: [24, 0, "upcoming"],
    live: [24, 18, "live"],
    followUp: [24, 18, "ended"],
  });
});

test("facts expose what copy may quote, taken from the same records", () => {
  const facts = demoWorldFacts(trivia, triviaEvent, "live");
  assert.equal(facts.eventName, "Saturday Trivia Social");
  assert.equal(facts.venueName, "Harbour Room");
  assert.equal(facts.organizerName, "Evening Club");
  assert.equal(facts.checkedIn, 18);
  assert.equal(facts.booked, 24);
});

test("cancellations drop out of the booked count from the moment they happen", () => {
  const world = clone();
  world.events[0].attendance[0].cancelledAt = "2026-10-17T12:00:00";
  delete world.events[0].attendance[0].checkedInAt;
  validateDemoWorld(world);
  assert.equal(eventStateAt(world, triviaEvent, "planning").booked, 0);
  assert.equal(eventStateAt(world, triviaEvent, "today").booked, 23);
});

const invariantCases = [
  ["an unknown guest", (world) => { world.events[0].attendance[0].personId = "nobody"; }, /guest nobody is not in people/],
  ["a check-in before booking", (world) => { world.events[0].attendance[0].checkedInAt = "2026-10-16T12:00:00"; }, /checks in before booking/],
  ["a check-in after the event", (world) => { world.events[0].attendance[0].checkedInAt = "2026-10-17T21:00:00"; }, /outside the event window/],
  ["a booking over capacity", (world) => { world.events[0].capacity = 20; }, /over capacity at today \(24\/20\)/],
  ["moments out of order", (world) => { world.moments.today = "2026-10-15T09:00:00"; }, /moment today is not after planning/],
  ["an activity kind production doesn't have", (world) => { world.events[0].activityKind = "laserTag"; }, /laserTag is not a production activity kind/],
  ["an unknown venue", (world) => { world.events[0].venueId = "nowhere"; }, /unknown venue nowhere/],
  ["a guest booked twice", (world) => { world.events[0].attendance[1].personId = world.events[0].attendance[0].personId; }, /books p01 twice/],
  ["a persona no catalog has", (world) => { world.people[0].personaId = "in_nobody_999"; }, /person p01 uses unknown persona in_nobody_999/],
  ["a persona from another country", (world) => { world.people[0].personaId = "nyc_maya_shah_001"; }, /persona nyc_maya_shah_001 is from US, not IN/],
  ["one persona cast twice", (world) => { world.people[1].personaId = world.people[0].personaId; }, /is cast twice/],
  ["a host persona also cast as a guest", (world) => { world.people[0].personaId = world.host.personaId; }, /in_meher_bhatia_001 is cast twice/],
  ["a host named differently from their persona", (world) => { world.host.displayName = "Demo Host"; }, /host is named Demo Host, but persona in_meher_bhatia_001 is Meher Bhatia/],
];

for (const [name, mutate, expected] of invariantCases) {
  test(`rejects ${name}`, () => {
    const world = clone();
    mutate(world);
    assert.throws(() => validateDemoWorld(world), expected);
  });
}

test("rejects contact details outside the reserved demo ranges", () => {
  for (const mutate of [
    (world) => { world.host.phoneNumber = "+919876543210"; },
    (world) => { world.host.email = "host@gmail.com"; },
  ]) {
    const world = clone();
    mutate(world);
    assert.throws(() => validateDemoWorld(world), /does not match the demo world schema/);
  }
});

test("rejects stored counts: the world format has no field for them", () => {
  const world = clone();
  world.events[0].bookedCount = 24;
  assert.throws(() => validateDemoWorld(world), /bookedCount is not a field of the demo world format/);
});

test("the schema check reports missing fields and wrong types by path", () => {
  const missing = clone();
  delete missing.events[0].capacity;
  assert.throws(() => validateDemoWorld(missing), /\/events\/0 is missing capacity/);
  const wrongType = clone();
  wrongType.events[0].capacity = "thirty";
  assert.throws(() => validateDemoWorld(wrongType), /\/events\/0\/capacity must be integer/);
});

const nyc = loadScenarioConfig("us-nyc-host-demo");
const nycClone = () => structuredClone(nyc);
const nycEvent = (world, id) => world.events.find((event) => event.id === id);

test("the New York world derives the counts the host captures and demo listing show", () => {
  const counts = Object.fromEntries(nyc.events.map((event) => {
    const {booked, checkedIn, waitlisted, phase} = eventStateAt(nyc, event.id, "live");
    return [event.id, [booked, checkedIn, waitlisted, phase]];
  }));
  assert.deepEqual(counts, {
    "event-host-setup-sales-demo": [0, 0, 0, "upcoming"],
    "event-host-live-console": [17, 7, 3, "live"],
    "event-host-post-report": [17, 13, 2, "ended"],
  });
  assert.deepEqual(eventOutcomesAt(nyc, "event-host-post-report", "live"),
    {catchSent: 41, mutualMatches: 18, chatsStarted: 12});
});

test("civil times convert to instants in the world's time zone, across DST", () => {
  assert.equal(civilInstant("America/New_York", "2026-05-31T05:00:00").toISOString(), "2026-05-31T09:00:00.000Z");
  assert.equal(civilInstant("America/New_York", "2026-01-15T05:00:00").toISOString(), "2026-01-15T10:00:00.000Z");
  assert.equal(civilInstant("Asia/Kolkata", "2026-10-17T18:30:00").toISOString(), "2026-10-17T13:00:00.000Z");
});

const report = "event-host-post-report";
const recordCases = [
  ["a waitlisted guest who also holds a booking", (world) => { nycEvent(world, report).waitlist[0].personId = "p01"; }, /waitlisted p01 also holds a booking/],
  ["a catch from a guest who never checked in", (world) => { nycEvent(world, report).catches[0].personId = "p20"; }, /names p20, who never checked in/],
  ["a chat without a mutual match", (world) => { nycEvent(world, report).chats[0].personIds = ["p01", "p13"]; }, /chat p01\+p13 has no mutual match/],
  ["a review written before the event ends", (world) => { nycEvent(world, report).reviews[0].createdAt = "2026-05-30T17:00:00"; }, /is written before the event ends/],
  ["a review from a no-show", (world) => { nycEvent(world, report).reviews[0].personId = "p20"; }, /comes from someone who never checked in/],
  ["a phone from another country's range", (world) => { world.host.phoneNumber = "+919000000001"; }, /not in the US demo range/],
  ["a seed generator the world does not declare", (world) => { world.uses = world.uses.filter((use) => use !== "demo-seed"); }, /has a seedWorld but does not use demo-seed/],
];

for (const [name, mutate, expected] of recordCases) {
  test(`rejects ${name}`, () => {
    const world = nycClone();
    mutate(world);
    assert.throws(() => validateDemoWorld(world), expected);
  });
}
