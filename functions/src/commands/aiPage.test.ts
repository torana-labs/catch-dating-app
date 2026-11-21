/* eslint-disable max-len */
import assert from "node:assert/strict";
import test from "node:test";
import {importAiEvents, importAiOrganizer, storedPageInput} from "./aiPage";

test("AI events: only titled events with a real date and time, keyed by what they say, earliest first", () => {
  const events = importAiEvents({events: [
    {title: "Later", startDate: "2026-12-10", startTime: "19:30", venue: ""},
    {title: "Sooner", startDate: "2026-11-26", startTime: "20:00", venue: "The Lantern Room"},
    {title: "Sooner", startDate: "2026-11-26", startTime: "20:00", venue: "Duplicate"},
    {title: "Bad date", startDate: "2026-02-30", startTime: "20:00", venue: ""},
    {title: "Bad time", startDate: "2026-11-27", startTime: "8pm", venue: ""},
    {title: " ", startDate: "2026-11-27", startTime: "20:00", venue: ""},
  ]});
  assert.deepEqual(events.map((event) => [event.title, event.localDate, event.localStartTime, event.venue]),
    [["Sooner", "2026-11-26", "20:00", "The Lantern Room"], ["Later", "2026-12-10", "19:30", null]]);
  assert.deepEqual(importAiEvents({events: [{title: "Sooner", startDate: "2026-11-26", startTime: "20:00", venue: "x"}]})[0].eventKey,
    events[0].eventKey, "the same answer gives the same key");
  assert.deepEqual(importAiEvents(null), []);
});

test("AI organizer: a name or a description, or nothing", () => {
  const read = importAiOrganizer({name: " Harbour Lights ", description: ""});
  assert.deepEqual([read?.name, read?.description], ["Harbour Lights", null]);
  assert.match(read?.contentHash ?? "", /^[a-f0-9]{64}$/u);
  assert.equal(importAiOrganizer({name: "", description: ""}), null);
});

test("stored page input: the asked-for page's title and text, from this request's snapshots only", async () => {
  const mine = "supply-intake/snapshots/tryit-1/aaa.json";
  const other = "supply-intake/snapshots/tryit-1/bbb.json";
  const foreign = "supply-intake/snapshots/tryit-2/ccc.json";
  const snapshots: Record<string, Record<string, unknown>> = {
    [other]: {url: "https://harbour-lights.example/about", title: "About", text: "Follow-on page."},
    [mine]: {url: "https://www.harbour-lights.example/", finalUrl: "https://harbour-lights.example/", title: "Home", text: "  Dinners   for strangers. "},
    [foreign]: {url: "https://harbour-lights.example/", title: "Foreign", text: "Not this request."},
  };
  const reads: string[] = [];
  const reader = async (ref: string) => {
    reads.push(ref);
    return snapshots[ref] ?? null;
  };
  const input = await storedPageInput({result: {snapshotRefs: [other, mine, foreign, "../escape.json"]}}, "tryit-1",
    "https://harbour-lights.example", reader);
  assert.deepEqual(input, {pageTitle: "Home", pageText: "Dinners for strangers."});
  assert.deepEqual(reads.sort(), [mine, other].sort(), "another request's snapshot is never read");
  assert.equal(await storedPageInput({result: {snapshotRefs: []}}, "tryit-1", "https://harbour-lights.example", reader), null);
});
