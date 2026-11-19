import assert from "node:assert/strict";
import test from "node:test";

import {
  detectRosterAdapter,
  guestListConverter,
  guestListConverters,
  prepareRosterTable,
} from "./registry";

test("every converter is reachable from its provider hint", () => {
  for (const converter of guestListConverters) {
    if (!converter.provider) continue;
    assert.deepEqual(detectRosterAdapter([], converter.provider), {
      adapterId: converter.id, support: "verified", confidence: 1,
    });
    assert.equal(guestListConverter(converter.id), converter);
  }
});

test("every converter detects its own signature from headers alone", () => {
  for (const converter of guestListConverters) {
    // vCard is chosen by file type, never by headers.
    if (converter.id === "vcard-v1") continue;
    const detection = detectRosterAdapter([...converter.signature]);
    assert.equal(detection.adapterId, converter.id);
    assert.equal(detection.confidence, 1);
  }
});

test("converter ids are unique and versioned", () => {
  const ids = guestListConverters.map((converter) => converter.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const id of ids) assert.match(id, /-v[0-9]+$/u);
});

test("a table no converter knows is read with the generic mapping", () => {
  const prepared = prepareRosterTable([
    ["Guest Name", "Mobile", "Booking ID"],
    ["Mira Fictional", "9876543210", "bk-1"],
  ]);
  assert.equal(prepared.adapter.adapterId, "generic-v1");
  assert.deepEqual(prepared.rows, [{rowId: "2",
    displayName: "Mira Fictional", phone: "9876543210", email: null,
    externalReference: "bk-1", arrivalGroup: null, ticketType: null,
    status: "registered"}]);
});
