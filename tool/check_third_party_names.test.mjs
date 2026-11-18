import assert from "node:assert/strict";
import {execFileSync} from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {fileURLToPath} from "node:url";
import {
  isCodeAnnotation,
  isDataFile,
  isFictional,
  loadAllowlist,
  scanRepository,
  scanText,
  socialAccount,
} from "./check_third_party_names.mjs";

const allowlist = loadAllowlist();
const scan = (file, text) => scanText(file, text, allowlist).map(({rule, line}) => `${rule}:${line}`);
const checkPath = fileURLToPath(new URL("./check_third_party_names.mjs", import.meta.url));

// "Kestrel Point Runners" and its handles stand in for a real organiser: the
// planted violations below must be caught, and the fictional ones must pass.
test("social URLs naming an unlisted account fail in any tracked file", () => {
  assert.deepEqual(scan("functions/src/organizers/links.ts", [
    'const page = "https://www.instagram.com/kestrelpointrunners/";',
    'const calendar = "https://lu.ma/calendar/kestrel-point";',
    'const events = "https://luma.com/kpr2026a?utm_source=share";',
    'const group = "https://www.meetup.com/kestrel-point-runners/";',
    'const fb = "https://facebook.com/kestrelpointrunners";',
  ].join("\n")), ["social-url:1", "social-url:2", "social-url:3", "social-url:4", "social-url:5"]);
});

test("fictional accounts, reserved domains, templates and platform routes pass", () => {
  assert.deepEqual(scan("functions/src/organizers/links.test.ts", [
    'const a = "https://www.instagram.com/moonmoth.example/";',
    'const b = "https://lu.ma/lanternlanesocial";',
    'const c = "https://instagram.com/brindle.fixture";',
    'const d = `https://www.instagram.com/${handle}/`;',
    'const e = "https://www.instagram.com/p/C0ffee/";',
    'const f = "https://graph.facebook.com/v26.0/me";',
    'const g = "https://lu.ma/x";',
    'const h = "https://luma.com/";',
    'const i = "https://kestrelpointrunners.example/events";',
  ].join("\n")), []);
});

test("@handles are checked in fixture, story, test, design and doc files only", () => {
  const text = 'caption: "Join @kestrelpointrunners at 6"';
  assert.deepEqual(scan("admin/src/stories/AdminInbox.stories.tsx", text), ["social-handle:1"]);
  assert.deepEqual(scan("docs/plans/launch.md", text), ["social-handle:1"]);
  assert.deepEqual(scan("design/source_packs/website-v2/boards/WebOrgV2.dc.html", text), ["social-handle:1"]);
  assert.deepEqual(scan("admin/src/shared/api/sampleData.ts", text), ["social-handle:1"]);
  assert.deepEqual(scan("functions/src/organizers/mutateOrganizer.ts", text), []);
});

test("code annotations, at-rules, e-mail addresses and npm scopes are not handles", () => {
  assert.deepEqual(scan("test/goldens/entity_material_test.dart", [
    "@override",
    "@Tags(['golden'])",
    "@media (max-width: 600px) {}",
    " * @param {string} name",
    'const email = "hello@kestrelpoint.in";',
    'import x from "@types/node";',
    '"@context": "https://schema.org"',
    '"@usedKey": {"description": "metadata"}',
    "uses: actions/checkout@v4",
    "scale @2.0",
  ].join("\n")), []);
});

test("a waiver comment documents a platform account used on purpose", () => {
  assert.deepEqual(scan("docs/operations_platform.md",
    "See https://www.instagram.com/kestrelpointrunners/ <!-- third-party-name-ok: platform demo -->"), []);
});

test("generated listing data may not hold records built from public sources", () => {
  const record = '[{"id": "kestrel", "dataOrigin": "organizerIntake", "listingVariant": "unclaimedScraped"}]';
  assert.deepEqual(scan("website/src/generated/hostListings.json", record), ["scraped-record:1"]);
  assert.deepEqual(scan("website/src/generated/hostListings.demo.json", '"dataOrigin": "catchDemo"'), []);
  // Contract fixtures and TypeScript fixtures model the enum; they are not generated data.
  assert.deepEqual(scan("contracts/fixtures/valid/organizer_public_page_doc.json", record), []);
});

test("helpers classify accounts, files, annotations and fictional names", () => {
  assert.equal(socialAccount("lu.ma", "/calendar/kestrel-point"), "kestrel-point");
  assert.equal(socialAccount("www.instagram.com", "/@kestrel/"), "kestrel");
  assert.equal(socialAccount("instagram.com", "/explore/tags/run"), null);
  assert.equal(socialAccount("graph.instagram.com", "/v26.0/me"), null);
  assert.equal(isDataFile("operations/src/workflows/supply-intake/fixtures/pages/luma-event.html"), true);
  assert.equal(isDataFile("operations/src/workflows/supply-intake/message-nomination.mjs"), false);
  assert.equal(isCodeAnnotation("lib/main.dart", "Riverpod"), true);
  assert.equal(isCodeAnnotation("docs/a.md", "KestrelPoint"), false);
  assert.equal(isFictional("ShopName.Example", allowlist), true);
  assert.equal(isFictional("kestrelpointrunners", allowlist), false);
  assert.equal(isFictional("moonmoth-mixer", allowlist), true);
  assert.equal(isFictional("sunday-brunch-club", allowlist), false);
});

test("the CLI fails on a planted violation and withholds the matched text", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "catch-third-party-names-"));
  try {
    execFileSync("git", ["init", "-q"], {cwd: root});
    fs.mkdirSync(path.join(root, "test"), {recursive: true});
    fs.writeFileSync(path.join(root, "test", "clean_test.dart"), "final link = 'https://lu.ma/moonmoth';\n");
    fs.writeFileSync(path.join(root, "test", "planted_test.dart"),
      "final link = 'https://instagram.com/kestrelpointrunners';\n");
    execFileSync("git", ["add", "-A"], {cwd: root});
    const findings = scanRepository({root, allowlist});
    assert.deepEqual(findings.map(({file, rule}) => `${file}:${rule}`), ["test/planted_test.dart:social-url"]);
  } finally {
    fs.rmSync(root, {recursive: true, force: true});
  }
  // The real CLI prints no matched token without --show.
  const source = fs.readFileSync(checkPath, "utf8");
  assert.match(source, /show && finding\.token/u);
});

test("the allowlist stays sorted, lower case and free of real-looking domains", () => {
  const raw = JSON.parse(fs.readFileSync(new URL("./third_party_names_allowlist.json", import.meta.url), "utf8"));
  for (const key of ["fictionalStems", "handleKeywords", "fictionalNames"]) {
    assert.deepEqual(raw[key], [...raw[key]].sort(), `${key} must stay sorted`);
    assert.ok(raw[key].every((name) => name === name.toLowerCase()), `${key} must be lower case`);
  }
  assert.ok(raw.fictionalNames.every((name) => !/\.(?:in|com|club|co)$/u.test(name)),
    "fictional names never end in a real top-level domain");
});
