import assert from "node:assert/strict";
import test from "node:test";
import {
  listingInstagramUsername,
  listingLumaCalendarUrl,
  normalizeInstagramUsername,
} from "./organizerClaimSources";

function source(type: string, href: string | null) {
  return {type, label: `${type} page`, detail: "Public page.", href,
    confidence: "medium" as const, lastCheckedAt: null};
}

test("usernames are compared lower-case without @", () => {
  assert.equal(normalizeInstagramUsername("@CarterRoad.Runners"),
    "carterroad.runners");
  assert.equal(normalizeInstagramUsername("has space"), null);
  assert.equal(normalizeInstagramUsername("explore"), null);
  assert.equal(normalizeInstagramUsername(""), null);
});

test("the listing's own handle wins over its sources", () => {
  assert.equal(listingInstagramUsername({instagramHandle: "@own_handle",
    publicSources: [source("instagram", "https://instagram.com/other/")]}),
  "own_handle");
});

test("generated listings use their first Instagram profile source", () => {
  assert.equal(listingInstagramUsername({instagramHandle: null,
    publicSources: [
      source("luma", "https://luma.com/calendar/cal-1"),
      source("instagram", "https://www.instagram.com/p/C0ffee/"),
      source("instagram", "https://m.instagram.com/Carter_Runs/?hl=en"),
    ]}), "carter_runs");
  assert.equal(listingInstagramUsername({instagramHandle: null,
    publicSources: [source("instagram", "https://instagram.evil.com/x")]}),
  null);
});

test("Luma sources resolve to the calendar page", () => {
  assert.equal(listingLumaCalendarUrl({instagramHandle: null,
    publicSources: [source("luma", "https://lu.ma/calendar/cal-AbC123")]}),
  "https://luma.com/calendar/cal-AbC123");
  assert.equal(listingLumaCalendarUrl({instagramHandle: null,
    publicSources: [source("luma", "https://luma.com/carter-runs")]}),
  "https://luma.com/carter-runs");
  assert.equal(listingLumaCalendarUrl({instagramHandle: null,
    publicSources: [source("luma", "https://luma.com/")]}), null);
});
