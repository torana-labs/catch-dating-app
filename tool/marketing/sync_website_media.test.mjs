import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {fromRepo} from "../lib/repo_paths.mjs";
import {framedSize} from "./lib/capture_devices.mjs";
import {buildWebsiteManifest, scenarioReferenceProblems, validateSourceManifest} from "./sync_website_media.mjs";
import {brand} from "@catch/brand";

const authored = JSON.parse(fs.readFileSync(fromRepo("tool/marketing/capture_manifest.json"), "utf8"));
// A sample record to vary, held pending so the rules under test don't also
// need its image on disk.
const liveConsole = {...authored.captures.find(capture => capture.id === "host-live-console"), status: "pending-fixture"};

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

test("pages are unique canonical paths on published captures", () => {
  assert.match(validateSourceManifest(manifestWith({pages: ["/host"]})).join("\n"), /canonical paths/);
  assert.match(validateSourceManifest(manifestWith({pages: ["/", "/"]})).join("\n"), /must not repeat/);
  assert.match(validateSourceManifest(manifestWith({status: "paused"})).join("\n"), /a paused capture cannot name pages/);
  assert.deepEqual(validateSourceManifest(manifestWith({status: "pending-fixture"})), []);
  assert.match(validateSourceManifest(manifestWith({kind: "photo"})).join("\n"), /kind must be one of app-capture, web-capture/);
});

test("website records carry the framed size and the pages that show them", () => {
  const [record] = buildWebsiteManifest(manifestWith({})).captures;
  assert.deepEqual({width: record.width, height: record.height}, framedSize(liveConsole.device));
  assert.deepEqual(record.pages, liveConsole.pages);
  assert.equal(record.caption, `${authored.previewDisclosure} ${liveConsole.caption}`);
  assert.equal("scenario" in record, false);
});

test("a web capture names its story and address instead of a catalog fixture", () => {
  const web = {kind: "web-capture", fixtureKey: undefined, address: brand.web.domain,
    story: {file: "website/src/stories/WebCaptures.stories.tsx", id: "marketing-website-web-captures--join-phone-check-in"}};
  assert.deepEqual(validateSourceManifest(manifestWith(web)), []);
  assert.match(validateSourceManifest(manifestWith({...web, story: undefined})).join("\n"), /story needs the stories file/);
  assert.match(validateSourceManifest(manifestWith({...web, address: undefined})).join("\n"), /address is required/);
  assert.match(validateSourceManifest(manifestWith({fixtureKey: undefined})).join("\n"), /fixtureKey is required/);
});

test("a pending capture's placeholder is the drawn placeholder at its framed size", () => {
  const pending = authored.captures.filter(capture => capture.status === "pending-fixture");
  assert.ok(pending.length > 0);
  for (const capture of pending) {
    const header = fs.readFileSync(fromRepo(capture.placeholderPath));
    assert.deepEqual({width: header.readUInt32BE(16), height: header.readUInt32BE(20)}, framedSize(capture.device), capture.id);
  }
  const wrong = {...liveConsole, placeholderPath: authored.captures.find(capture => capture.device === "generic-tablet").placeholderPath};
  assert.match(validateSourceManifest({...authored, captures: [wrong]}).join("\n"), /not the generic-phone size 980x1924/);
});
