import assert from "node:assert/strict";
import test from "node:test";
import {
  buildIcsFeed,
  escapeText,
  foldLine,
  formatUtcDateTime,
  type IcsFeedFunction,
} from "./icsFeed";

const GENERATED_AT = Date.UTC(2026, 3, 20, 9, 0, 0);

const sangeet: IcsFeedFunction = {
  functionId: "fn-sangeet",
  name: "Sangeet Night",
  startsAt: Date.UTC(2026, 4, 1, 13, 30, 0),
  endsAt: Date.UTC(2026, 4, 1, 16, 0, 0),
  venueName: "Mirror Lake Pavilion",
  venueNotes: "Rooftop, north gate",
  status: "scheduled",
  revision: 3,
};

const haldi: IcsFeedFunction = {
  functionId: "fn-haldi",
  name: "Haldi",
  startsAt: Date.UTC(2026, 4, 2, 4, 0, 0),
  endsAt: Date.UTC(2026, 4, 2, 5, 30, 0),
  venueName: "Courtyard",
  status: "cancelled",
  revision: 2,
};

test("buildIcsFeed emits a complete RFC 5545 calendar", () => {
  // Input order is reversed on purpose: VEVENTs come out sorted.
  const feed = buildIcsFeed({
    programTitle: "Shah-Mehta Wedding",
    generatedAtMillis: GENERATED_AT,
    functions: [haldi, sangeet],
  });
  const expected = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Catch//Program Schedule//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Shah-Mehta Wedding",
    "BEGIN:VEVENT",
    "UID:fn-sangeet@catch",
    "DTSTAMP:20260420T090000Z",
    "DTSTART:20260501T133000Z",
    "DTEND:20260501T160000Z",
    "SUMMARY:Sangeet Night",
    "LOCATION:Mirror Lake Pavilion\\, Rooftop\\, north gate",
    "DESCRIPTION:Sangeet Night\\n\\nRooftop\\, north gate",
    "SEQUENCE:3",
    "END:VEVENT",
    "BEGIN:VEVENT",
    "UID:fn-haldi@catch",
    "DTSTAMP:20260420T090000Z",
    "DTSTART:20260502T040000Z",
    "DTEND:20260502T053000Z",
    "SUMMARY:Haldi",
    "LOCATION:Courtyard",
    "DESCRIPTION:Haldi",
    "SEQUENCE:2",
    "STATUS:CANCELLED",
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
  assert.equal(feed, expected);
});

test("every line ends CRLF and stays within 75 octets", () => {
  const longName = `Ceremony ${"x".repeat(100)}`;
  const feed = buildIcsFeed({
    programTitle: "Program",
    generatedAtMillis: GENERATED_AT,
    functions: [{...sangeet, name: longName}],
  });
  for (const line of feed.split("\r\n")) {
    assert.ok(!line.includes("\n") && !line.includes("\r"));
    assert.ok(Buffer.byteLength(line, "utf8") <= 75,
      `line exceeds 75 octets: ${line}`);
  }
  const physical = feed.split("\r\n");
  const summaryIndex = physical.findIndex(
    (line) => line.startsWith("SUMMARY:"));
  assert.equal(physical[summaryIndex].length, 75);
  assert.ok(physical[summaryIndex + 1].startsWith(" "));
  assert.ok(feed.endsWith("\r\n"));
});

test("foldLine splits on octet boundaries with a space join", () => {
  assert.equal(foldLine("short"), "short");
  const line = "x".repeat(76);
  assert.equal(foldLine(line), `${"x".repeat(75)}\r\n x`);
  // A multi-byte character is never split across a fold.
  const folded = foldLine(`${"a".repeat(74)}é`);
  assert.deepEqual(folded.split("\r\n"), [
    "a".repeat(74),
    " é",
  ]);
});

test("escapeText escapes commas, semicolons, newlines, backslashes",
  () => {
    assert.equal(escapeText("a,b;c\nd\\e"), "a\\,b\\;c\\nd\\\\e");
    assert.equal(escapeText("a\r\nb"), "a\\nb");
    assert.equal(escapeText("plain"), "plain");
  });

test("formatUtcDateTime renders the UTC basic format", () => {
  assert.equal(formatUtcDateTime(0), "19700101T000000Z");
  assert.equal(formatUtcDateTime(Date.UTC(2026, 11, 31, 23, 59, 59)),
    "20261231T235959Z");
  assert.throws(() => formatUtcDateTime(-1), RangeError);
});

test("functions without venues emit no LOCATION line", () => {
  const feed = buildIcsFeed({
    programTitle: "Program",
    generatedAtMillis: GENERATED_AT,
    functions: [{...haldi, status: "scheduled", venueName: undefined}],
  });
  assert.ok(!feed.includes("LOCATION"));
  assert.ok(!feed.includes("STATUS:CANCELLED"));
});
