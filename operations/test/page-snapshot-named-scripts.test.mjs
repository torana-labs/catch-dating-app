import assert from "node:assert/strict";
import test from "node:test";
import {loadSupplyAcquisitionPolicy} from "../src/workflows/supply-intake/acquisition.mjs";
import {StaticPageSource} from "../src/workflows/supply-intake/page-capture.mjs";
import {NAMED_SCRIPT_VARIABLES, snapshotFromHtml} from "../src/workflows/supply-intake/page-snapshot.mjs";

const FORM_DATA = [null, ["Tell us about you.", [[1, "Your name", null, 0, [[1001, null, 1]]]]], "/forms", "Driftwood RSVP"];
const PAGE = [
  "<html><head><title>Driftwood RSVP</title>",
  `<script type="text/javascript" nonce="n1">var FB_PUBLIC_LOAD_DATA_ = ${JSON.stringify(FORM_DATA)};</script>`,
  "<script>var OTHER_STATE = {\"a\":1};</script>",
  "<script type=\"application/ld+json\">{\"@type\":\"WebPage\"}</script>",
  "</head><body><p>Driftwood RSVP</p></body></html>",
].join("");
const BASE = {url: "https://forms.example.com/d/e/fictional/viewform", html: PAGE, fetchedAt: "2026-11-19T09:00:00.000Z"};

test("without namedScripts a snapshot is unchanged: inline scripts stay out", () => {
  const plain = snapshotFromHtml(BASE);
  const explicit = snapshotFromHtml({...BASE, namedScripts: []});
  assert.deepEqual(explicit, plain);
  assert.deepEqual(plain.embeddedJson, []);
  assert.deepEqual(plain.jsonLd, [{"@type": "WebPage"}]);
});

test("a listed page variable is kept as embedded JSON under var:<name>", () => {
  const snapshot = snapshotFromHtml({...BASE, namedScripts: ["FB_PUBLIC_LOAD_DATA_"]});
  assert.deepEqual(snapshot.embeddedJson, [{id: "var:FB_PUBLIC_LOAD_DATA_", value: FORM_DATA}]);
  assert.deepEqual(snapshot.jsonLd, [{"@type": "WebPage"}]);
  assert.equal(snapshot.jsonParseFailures, 0);
  assert.notEqual(snapshot.contentHash, snapshotFromHtml(BASE).contentHash);
});

test("only listed variables may be requested", () => {
  assert.deepEqual(NAMED_SCRIPT_VARIABLES, ["FB_PUBLIC_LOAD_DATA_"]);
  assert.throws(() => snapshotFromHtml({...BASE, namedScripts: ["OTHER_STATE"]}), {code: "PAGE_SNAPSHOT_NAMED_SCRIPT"});
  assert.throws(() => snapshotFromHtml({...BASE, namedScripts: "FB_PUBLIC_LOAD_DATA_"}), {code: "PAGE_SNAPSHOT_NAMED_SCRIPT"});
});

test("a listed variable that is not JSON counts as a parse failure", () => {
  const html = "<script>var FB_PUBLIC_LOAD_DATA_ = [function(){}];</script>";
  const snapshot = snapshotFromHtml({...BASE, html, namedScripts: ["FB_PUBLIC_LOAD_DATA_"]});
  assert.deepEqual(snapshot.embeddedJson, []);
  assert.equal(snapshot.jsonParseFailures, 1);
});

test("capture passes namedScripts through and defaults to none", async () => {
  const source = new StaticPageSource({pages: {[BASE.url]: PAGE}, policy: await loadSupplyAcquisitionPolicy()});
  const plain = await source.capture({runKey: "test", url: BASE.url});
  assert.deepEqual(plain.snapshot.embeddedJson, []);
  const kept = await source.capture({runKey: "test", url: BASE.url, namedScripts: ["FB_PUBLIC_LOAD_DATA_"]});
  assert.deepEqual(kept.snapshot.embeddedJson.map((entry) => entry.id), ["var:FB_PUBLIC_LOAD_DATA_"]);
});
