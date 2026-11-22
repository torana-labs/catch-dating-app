import assert from "node:assert/strict";
import test from "node:test";
import {main} from "./recompute_organizer_program_counts.mjs";

const summary = {scanned: 2, written: 0, drift: 1, current: 1, tooLarge: 0,
  busy: 0, noView: 0, stoppedEarly: false,
  changes: [{programId: "program-1", before: {},
    counts: {guestCount: 3, repliedGuestCount: 1, flyingInCount: 2}}]};

async function run(argv) {
  const calls = [];
  const logged = [];
  const log = console.log;
  console.log = (line) => logged.push(String(line));
  try {
    await main(argv, {
      firestore: {fake: true},
      recountAll: async (db, options) => {
        calls.push({db, options});
        return summary;
      },
    });
  } finally {
    console.log = log;
  }
  return {calls, output: logged.join("\n")};
}

test("a dry run is the default and writes nothing", async () => {
  const {calls, output} = await run(["--project", "demo-project"]);
  assert.deepEqual(calls, [{db: {fake: true}, options: {dryRun: true}}]);
  assert.match(output, /Would write: 1/u);
  assert.match(output, /Dry run only/u);
});

test("--apply writes, and prod needs --allow-prod", async () => {
  const {calls} = await run(["--project", "demo-project", "--apply"]);
  assert.deepEqual(calls[0].options, {dryRun: false});
  await assert.rejects(run(["--env", "prod", "--apply"]), /--allow-prod/u);
  const prod = await run(["--env", "prod", "--apply", "--allow-prod"]);
  assert.deepEqual(prod.calls[0].options, {dryRun: false});
  const dry = await run(["--env", "prod", "--json"]);
  assert.match(dry.output, /"drift": 1/u);
});

test("help prints usage without reading", async () => {
  const {calls, output} = await run(["--help"]);
  assert.deepEqual(calls, []);
  assert.match(output, /Usage:/u);
});
