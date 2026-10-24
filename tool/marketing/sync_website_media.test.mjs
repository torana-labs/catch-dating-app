import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {fromRepo} from "../lib/repo_paths.mjs";
import {buildWebsiteManifest, scenarioReferenceProblems, validateSourceManifest} from "./sync_website_media.mjs";

const authored = JSON.parse(fs.readFileSync(fromRepo("tool/marketing/capture_manifest.json"), "utf8"));
const liveConsole = authored.captures.find(capture => capture.id === "host-live-console");

function manifestWith(changes) {
  return {...authored, captures: [{...liveConsole, ...changes}]};
}

test("the authored manifest is valid and names real demo-world moments", () => {
  assert.deepEqual(validateSourceManifest(authored), []);
  assert.deepEqual(scenarioReferenceProblems(authored), []);
});

test("a scenario must resolve to a world, an event and a moment", () => {
  const scenario = liveConsole.scenario;
  assert.match(scenarioReferenceProblems(manifestWith({scenario: {...scenario, world: "missing-world"}})).join("\n"), /not a file under/);
  assert.match(scenarioReferenceProblems(manifestWith({scenario: {...scenario, event: "missing-event"}})).join("\n"), /has no event missing-event/);
  assert.match(scenarioReferenceProblems(manifestWith({scenario: {...scenario, moment: "lastWeek"}})).join("\n"), /has no moment lastWeek/);
  assert.match(validateSourceManifest(manifestWith({scenario: {world: scenario.world}})).join("\n"), /needs world, event and moment/);
  assert.match(validateSourceManifest(manifestWith({scenario: {...scenario, world: "../outside"}})).join("\n"), /needs world, event and moment/);
});

test("pages are unique canonical paths on active captures only", () => {
  assert.match(validateSourceManifest(manifestWith({pages: ["/host"]})).join("\n"), /canonical paths/);
  assert.match(validateSourceManifest(manifestWith({pages: ["/", "/"]})).join("\n"), /must not repeat/);
  assert.match(validateSourceManifest(manifestWith({status: "paused"})).join("\n"), /only an active capture can name pages/);
  assert.match(validateSourceManifest(manifestWith({kind: "photo"})).join("\n"), /kind must be one of app-capture/);
});

test("website records carry the framed size and the pages that show them", () => {
  const [record] = buildWebsiteManifest(manifestWith({})).captures;
  assert.equal(record.width, 1020);
  assert.equal(record.height, 1964);
  assert.deepEqual(record.pages, liveConsole.pages);
  assert.equal(record.caption, `${authored.previewDisclosure} ${liveConsole.caption}`);
  assert.equal("scenario" in record, false);
});
