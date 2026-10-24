import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import {fileURLToPath} from "node:url";
import {
  MAX_PAGE_HTML_BYTES,
  decodeEntities,
  snapshotFromHtml,
} from "../src/workflows/supply-intake/page-snapshot.mjs";
import {
  SOURCE_PROFILE_IDS,
  extractWithAdapters,
  loadSourceProfiles,
  pageAdapterFor,
} from "../src/workflows/supply-intake/sources/index.mjs";
import platformCatalog from "../src/workflows/supply-intake/sources/platforms.json" with {type: "json"};

const pages = path.join(path.dirname(fileURLToPath(import.meta.url)),
  "../src/workflows/supply-intake/fixtures/pages");
const fixture = (name, url) => snapshotFromHtml({
  url,
  html: fs.readFileSync(path.join(pages, `${name}.html`), "utf8"),
  fetchedAt: "2026-10-24T08:00:00.000Z",
});
const lumaEvent = () => fixture("luma-event", "https://lu.ma/1dfd73wq");
const lumaOrganizer = () => fixture("luma-organizer", "https://luma.com/blrdroid");
const districtEvent = () => fixture("district-event", "https://www.district.in/events/noida-comedy-bar-jan7-2026-buy-tickets");
const urbanautSpot = () => fixture("urbanaut-spot", "https://urbanaut.app/spot/ballard-estate-photowalk");

test("page snapshots keep structured data and bounded text, never raw HTML", () => {
  const snapshot = snapshotFromHtml({
    url: "https://example.org/e/1",
    html: `<html><head><title>Run &amp; Brunch</title>
      <link rel="canonical" href="https://example.org/e/1">
      <meta property="og:title" content="Run &#38; Brunch"><meta name="description" content="Sunday 5K">
      <meta property="og:title" content="ignored second value">
      <script type="application/ld+json">{"@type":"Event","name":"Run"}</script>
      <script type="application/ld+json">{not json</script>
      <script id="__NEXT_DATA__" type="application/json">{"props":{}}</script>
      <script>window.tracking = 1</script><style>body{}</style></head>
      <body><p>Hello <b>runners</b></p><!-- hidden --></body></html>`,
  });
  assert.equal(snapshot.title, "Run & Brunch");
  assert.equal(snapshot.canonicalUrl, "https://example.org/e/1");
  assert.deepEqual(snapshot.meta, {"og:title": "Run & Brunch", description: "Sunday 5K"});
  assert.deepEqual(snapshot.jsonLd, [{"@type": "Event", name: "Run"}]);
  assert.deepEqual(snapshot.embeddedJson, [{id: "__NEXT_DATA__", value: {props: {}}}]);
  assert.equal(snapshot.jsonParseFailures, 1);
  assert.equal(snapshot.text, "Run & Brunch\nHello runners");
  assert.equal("html" in snapshot, false);
  assert.match(snapshot.contentHash, /^[0-9a-f]{64}$/u);
  assert.throws(() => snapshotFromHtml({url: "https://example.org", html: "x".repeat(MAX_PAGE_HTML_BYTES + 1)}),
    /size limit/u);
  assert.equal(decodeEntities("&lt;a&gt; &#x41; &copy; &#0;"), "<a> A &copy; &#0;");
});

test("Luma event pages yield the event and its organizer's calendar link", () => {
  const result = extractWithAdapters({snapshot: lumaEvent()});
  assert.equal(result.adapterId, "luma");
  assert.equal(result.pageKind, "event_page");
  assert.equal(result.surface.normalizedKey, "luma:event:1dfd73wq");
  assert.equal(result.events.length, 1);
  const [event] = result.events;
  assert.equal(event.sourceEntityId, "1dfd73wq");
  assert.equal(event.title, "BlrDroid + Blrkotlin October 2026 Meetup #133");
  assert.equal(event.startAt, "2026-10-24T09:30:00.000+05:30");
  assert.equal(event.locality, "Bengaluru");
  assert.equal(event.organizerUrl, "https://luma.com/blrdroid");
  assert.equal(event.attendanceMode, "offline");
  assert.ok(event.evidenceFields.includes("startAt") && event.evidenceFields.includes("sourceUrl"));
});

test("Luma organizer calendars yield a listing and its upcoming events", () => {
  const result = extractWithAdapters({snapshot: lumaOrganizer()});
  assert.equal(result.pageKind, "organizer_page");
  assert.equal(result.organizers.length, 1);
  const [organizer] = result.organizers;
  assert.equal(organizer.name, "BlrDroid Community");
  assert.equal(organizer.url, "https://luma.com/blrdroid");
  assert.equal(organizer.locality, "Bengaluru");
  assert.match(organizer.description, /android developers/u);
  assert.ok(organizer.imageUrl.startsWith("https://images.lumacdn.com/"));
  assert.deepEqual(result.events.map((event) => event.sourceEntityId), ["1dfd73wq"]);
});

test("District sessions of one show become separate occurrences with the organizer name", () => {
  const result = extractWithAdapters({snapshot: districtEvent()});
  assert.equal(result.adapterId, "district");
  assert.equal(result.events.length, 3);
  assert.equal(new Set(result.events.map((event) => event.sourceEntityId)).size, 3);
  assert.ok(result.events.every((event) => event.title === "Noida Comedy Bar" &&
    event.price?.currency === "INR" && event.latitude === 28.5399));
  assert.deepEqual(result.events.map((event) => event.startAt), [
    "2026-10-24T14:30:00.000Z", "2026-10-24T16:30:00.000Z", "2026-10-25T08:30:00.000Z"]);
  assert.deepEqual(result.organizers.map((organizer) => [organizer.name, organizer.locality, organizer.url]),
    [["TRIBAL SIERRA CAFE LLP", "Noida", null]]);
});

test("Urbanaut experiences read embedded state but never its contacts", () => {
  const snapshot = urbanautSpot();
  const result = extractWithAdapters({snapshot});
  assert.equal(result.adapterId, "urbanaut");
  const [event] = result.events;
  assert.equal(event.title, "BALLARD ESTATE PHOTOWALK");
  assert.equal(event.startAt, "2026-10-25T02:00:00.000Z");
  assert.equal(event.locality, "Mumbai");
  assert.equal(event.price.currency, "INR");
  assert.equal(event.organizerUrl, "https://urbanaut.app/mayanksoni");
  const [organizer] = result.organizers;
  assert.equal(organizer.name, "Mayank Soni");
  assert.equal(organizer.sourceEntityId, "urbanaut:profile:mayanksoni");
  // Contacts in a live page's state are never copied into candidates.
  const spot = Object.values(snapshot.embeddedJson[0].value)[0];
  const withContacts = structuredClone(snapshot);
  Object.values(withContacts.embeddedJson[0].value)[0].contacts = {
    booking_related_emails: [{email: "host@example.org"}], on_ground_contacts: [{phone: "+910000000000"}]};
  const leaked = JSON.stringify(extractWithAdapters({snapshot: withContacts}));
  assert.equal(leaked.includes("host@example.org") || leaked.includes("+910000000000"), false);
  assert.ok(spot.name);
});

test("a platform page whose template drifted abstains for the agent instead of guessing", () => {
  for (const [snapshot, adapterId] of [
    [{...lumaEvent(), jsonLd: []}, "luma"],
    [{...districtEvent(), jsonLd: [{"@type": "FAQPage"}]}, "district"],
    [{...urbanautSpot(), embeddedJson: []}, "urbanaut"],
  ]) {
    const result = extractWithAdapters({snapshot});
    assert.equal(result.abstained, true, adapterId);
    assert.equal(result.abstainReason, "template_drift", adapterId);
    assert.equal(result.attempts[0].adapterId, adapterId);
    assert.deepEqual([result.organizers, result.events], [[], []]);
  }
});

test("organizer websites fall back to schema.org markup, then to metadata only", () => {
  const marked = snapshotFromHtml({url: "https://thebhag.in/events", html: `<script type="application/ld+json">
    {"@context":"https://schema.org","@graph":[
      {"@type":"SportsClub","name":"The Bhag","url":"https://thebhag.in","sameAs":["https://instagram.com/thebhag"]},
      {"@type":"Event","name":"Sunday Long Run","startDate":"2026-11-01T06:00:00+05:30",
       "location":{"@type":"Place","name":"Cubbon Park","address":{"addressLocality":"Bengaluru"}}}]}</script>`});
  const result = extractWithAdapters({snapshot: marked});
  assert.equal(result.adapterId, "schema-org-event");
  assert.equal(result.platform, "officialWebsite");
  assert.deepEqual(result.organizers.map((organizer) => [organizer.name, organizer.sameAs]),
    [["The Bhag", ["https://instagram.com/thebhag"]]]);
  assert.equal(result.events[0].venue, "Cubbon Park");

  const bare = snapshotFromHtml({url: "https://linktr.ee/somecrew", html: `<meta property="og:title" content="Some Crew">
    <meta property="og:description" content="Weekend hikes">`});
  const unmatched = extractWithAdapters({snapshot: bare});
  assert.equal(unmatched.abstained, true);
  assert.equal(unmatched.abstainReason, "no_structured_data");
  assert.deepEqual(unmatched.attempts.map((attempt) => attempt.adapterId), ["schema-org-event", "open-graph"]);
  assert.equal(unmatched.metadata.title, "Some Crew");
});

test("invalid snapshots abstain without throwing", () => {
  assert.equal(extractWithAdapters({snapshot: null}).abstainReason, "invalid_snapshot");
  assert.equal(extractWithAdapters({snapshot: {url: "not a url", jsonLd: [], embeddedJson: []}}).surface, null);
});

test("every catalog platform with an adapter has one registered, and every profile loads", async () => {
  for (const platform of platformCatalog.platforms) {
    assert.equal(pageAdapterFor(platform.id)?.adapterId ?? null, platform.adapterId, platform.id);
  }
  const profiles = await loadSourceProfiles();
  assert.deepEqual(profiles.map((profile) => profile.sourceProfileId), [...SOURCE_PROFILE_IDS].sort());
  for (const profile of profiles) {
    assert.equal(profile.publication.autoEligible, false, profile.sourceProfileId);
    assert.equal(profile.acquisition.networkEnabled, false, profile.sourceProfileId);
  }
});
