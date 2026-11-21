import assert from "node:assert/strict";
import fs from "node:fs";
import zlib from "node:zlib";
import test from "node:test";
import {fromRepo} from "../lib/repo_paths.mjs";
import {framedSize} from "./lib/capture_devices.mjs";
import {buildWebsiteManifest, scenarioReferenceProblems, validateSourceManifest} from "./sync_website_media.mjs";
import {brand} from "@catch/brand";

const authored = JSON.parse(fs.readFileSync(fromRepo("tool/marketing/capture_manifest.json"), "utf8"));
// A sample record to vary, held pending so the rules under test don't also
// need its image on disk.
const liveConsole = {...authored.captures.find(capture => capture.id === "host-live-console"), status: "pending-fixture"};

// The smallest PNG fragmentRect reads: its header and one caPt provenance chunk.
function pngWithProvenance(width, height, provenance) {
  const chunk = (type, data) => {
    const bytes = Buffer.alloc(data.length + 12);
    bytes.writeUInt32BE(data.length);
    bytes.write(type, 4, "ascii");
    data.copy(bytes, 8);
    bytes.writeUInt32BE(zlib.crc32(bytes.subarray(4, -4)), bytes.length - 4);
    return bytes;
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width);
  header.writeUInt32BE(height, 4);
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", header),
    chunk("caPt", Buffer.from(JSON.stringify(provenance))), chunk("IEND", Buffer.alloc(0))]);
}

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
  assert.equal(record.caption, liveConsole.caption);
  assert.equal("scenario" in record, false);
});

test("a fragment is cut from an active generic-phone app capture and takes its size from its PNG", () => {
  const screen = {...liveConsole, id: "sample-screen", status: "active", pages: []};
  const fragment = {...liveConsole, id: "sample-fragment", device: "fragment-phone", fragmentOf: "sample-screen", status: "active", pages: [],
    sourcePath: screen.sourcePath, websitePath: "website/public/assets/app-screenshots/sample-fragment.png"};
  const of = (...captures) => ({...authored, captures});
  assert.deepEqual(validateSourceManifest(of(screen, fragment)), []);
  assert.match(validateSourceManifest(of(screen, {...fragment, fragmentOf: "missing"})).join("\n"), /fragmentOf must name the generic-phone app capture/);
  assert.match(validateSourceManifest(of({...screen, device: "generic-tablet"}, fragment)).join("\n"), /fragmentOf must name the generic-phone/);
  assert.match(validateSourceManifest(of({...screen, status: "pending-fixture"}, fragment)).join("\n"), /needs its screen sample-screen active/);
  assert.match(validateSourceManifest(of(screen, {...fragment, status: "pending-fixture"})).join("\n"), /cannot wait on a placeholder/);
  assert.match(validateSourceManifest(of({...screen, fragmentOf: "sample-fragment"}, fragment)).join("\n"), /only a fragment-phone capture is cut from another/);
  // A 2x crop's size, from its PNG header, and its place on the screen, from its provenance.
  const rect = {x: 0.025, y: 0.3, width: 0.9005, height: 0.1327};
  const record = buildWebsiteManifest(of(screen, fragment), {readPng: () => pngWithProvenance(724, 232, {fragment: rect})}).captures[1];
  assert.deepEqual({width: record.width, height: record.height, fragmentOf: record.fragmentOf, screenRect: record.screenRect},
    {width: 724, height: 232, fragmentOf: "sample-screen", screenRect: rect});
  assert.equal("fragmentOf" in buildWebsiteManifest(of(screen)).captures[0], false);
});

test("a web capture names its story and address instead of a catalog fixture", () => {
  const web = {kind: "web-capture", fixtureKey: undefined, address: brand.web.domain,
    story: {file: "website/src/stories/WebCaptures.stories.tsx", id: "marketing-website-web-captures--join-phone-check-in"}};
  assert.deepEqual(validateSourceManifest(manifestWith(web)), []);
  assert.match(validateSourceManifest(manifestWith({...web, story: undefined})).join("\n"), /story needs the stories file/);
  assert.match(validateSourceManifest(manifestWith({...web, address: undefined})).join("\n"), /address is required/);
  assert.match(validateSourceManifest(manifestWith({fixtureKey: undefined})).join("\n"), /fixtureKey is required/);
});

test("a pending capture's placeholder is the drawn placeholder at its device's size", () => {
  // Every pending capture, and the sample record held pending above (the manifest may have none left).
  const pending = [...authored.captures.filter(capture => capture.status === "pending-fixture"), liveConsole];
  assert.deepEqual(validateSourceManifest(manifestWith({})), []);
  for (const capture of pending) {
    const header = fs.readFileSync(fromRepo(capture.placeholderPath));
    assert.deepEqual({width: header.readUInt32BE(16), height: header.readUInt32BE(20)}, framedSize(capture.device), capture.id);
  }
  const wrong = {...liveConsole, placeholderPath: authored.captures.find(capture => capture.device === "generic-tablet").placeholderPath};
  assert.match(validateSourceManifest({...authored, captures: [wrong]}).join("\n"), /not the generic-phone size 804x1748/);
});
