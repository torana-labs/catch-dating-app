import assert from "node:assert/strict";
import test from "node:test";
import * as admin from "firebase-admin";
import {
  deckEraReasons,
  deckRetiredAtMillis,
  isCurrentPick,
  isDeckEraDecision,
  timestampMillis,
} from "./deckEraDecision";

const afterCutoff = admin.firestore.Timestamp.fromDate(
  new Date("2026-11-13T00:00:00.000Z")
);
const beforeCutoff = admin.firestore.Timestamp.fromDate(
  new Date("2026-11-12T12:50:03.999Z")
);

test("a plain like at or after the cutoff is a current pick", () => {
  const atCutoff = admin.firestore.Timestamp.fromMillis(deckRetiredAtMillis);
  for (const createdAt of [atCutoff, afterCutoff]) {
    const pick = {direction: "like", createdAt};
    assert.deepEqual(deckEraReasons(pick), []);
    assert.equal(isDeckEraDecision(pick), false);
    assert.equal(isCurrentPick(pick), true);
  }
});

test("each approved rule marks a decision deck-era", () => {
  assert.deepEqual(
    deckEraReasons({direction: "pass", createdAt: afterCutoff}),
    ["pass"]
  );
  for (const field of [
    "reactionTargetId",
    "reactionTargetType",
    "reactionTargetLabel",
    "reactionTargetPreview",
    "comment",
  ]) {
    assert.deepEqual(
      deckEraReasons({direction: "like", createdAt: afterCutoff, [field]: "x"}),
      ["reactionOrComment"],
      field
    );
  }
  assert.deepEqual(
    deckEraReasons({direction: "like", createdAt: beforeCutoff}),
    ["beforeCutoff"]
  );
  assert.deepEqual(
    deckEraReasons({
      direction: "pass",
      comment: "old",
      createdAt: beforeCutoff,
    }),
    ["pass", "reactionOrComment", "beforeCutoff"]
  );
  assert.equal(isCurrentPick({direction: "pass", createdAt: afterCutoff}),
    false);
});

test("null reaction fields and unreadable timestamps do not count", () => {
  assert.deepEqual(
    deckEraReasons({
      direction: "like",
      createdAt: afterCutoff,
      comment: null,
      reactionTargetId: null,
    }),
    []
  );
  assert.deepEqual(deckEraReasons({direction: "like"}), []);
  assert.deepEqual(deckEraReasons(undefined), []);
});

test("timestampMillis reads the serialized forms tools see", () => {
  const millis = Date.parse("2026-11-01T00:00:00.500Z");
  assert.equal(timestampMillis(admin.firestore.Timestamp.fromMillis(millis)),
    millis);
  assert.equal(timestampMillis({_seconds: Math.floor(millis / 1000),
    _nanoseconds: 500_000_000}), millis);
  assert.equal(timestampMillis({seconds: 1, nanoseconds: 0}), 1000);
  assert.equal(timestampMillis("2026-11-01T00:00:00.500Z"), millis);
  assert.equal(timestampMillis(new Date(millis)), millis);
  assert.equal(timestampMillis("not a date"), null);
  assert.equal(timestampMillis(42), null);
});
