import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {loadScenarioConfig} from "./demo_seed_scenario_catalog.mjs";
import {demoWorldFacts, eventStateAt, validateDemoWorld} from "./lib/demo_world.mjs";

test("host demo scenario declares host sales proof coverage", () => {
  const scenario = loadScenarioConfig("host-demo");
  const coverage = scenario.salesDemo.proofCoverage;

  assert.ok(Array.isArray(coverage));
  assert.ok(coverage.length >= 4);
  assert.ok(
    coverage.some((item) => item.claim.includes("Invite links")),
    "invite-link proof should stay represented"
  );
  assert.ok(
    coverage.some((item) => item.claim.includes("waitlist")),
    "waitlist-offer proof should stay represented"
  );
  assert.ok(
    coverage.some((item) => item.claim.includes("private-interest")),
    "catch metrics proof should stay represented"
  );
  assert.ok(
    coverage.some((item) => item.claim.includes("table seating")),
    "assignment primitive proof should stay represented"
  );
});

test("scenario catalog rejects malformed proof coverage", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "catch-scenario-"));
  const scenarioPath = path.join(tempDir, "bad-proof.json");
  fs.writeFileSync(
    scenarioPath,
    JSON.stringify({
      id: "bad-proof",
      label: "Bad Proof",
      description: "Invalid proof coverage fixture.",
      salesDemo: {
        host: {},
        club: {},
        events: [{role: "demo"}],
        rosterPersonaIds: ["persona-1"],
        proofCoverage: [{claim: "Missing evidence"}],
      },
    })
  );

  assert.throws(
    () => loadScenarioConfig(scenarioPath),
    /proofCoverage\[0\]\.productSurface must be a non-empty string/
  );
});

// Demo world scenarios (schemaVersion 2): docs/plans/demo_world_scenarios_spec.md

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
