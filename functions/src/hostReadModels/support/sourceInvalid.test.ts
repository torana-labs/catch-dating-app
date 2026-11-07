import assert from "node:assert/strict";
import test from "node:test";
import {HttpsError} from "firebase-functions/v2/https";
import {invalidWork} from "../../eventSuccess/operations/liveWorkRecords";
import {invalidSource} from "../../eventSuccess/operations/groupProgressSource";
import {unavailable} from "../../eventSuccess/operations/guestRecords";
import {
  isSourceInvalid,
  parsing,
  SourceInvalidError,
  stage,
} from "./sourceInvalid";

test("a source invalid error names its collection", () => {
  const error = new SourceInvalidError("events", "is malformed.");
  assert.equal(error.name, "SourceInvalidError");
  assert.equal(error.message, "events: is malformed.");
  assert.equal(error.source, "events");
  assert.equal(error.detail, "is malformed.");
});

test("the readers' invalid-source failures are recognised", () => {
  assert.equal(isSourceInvalid(invalidSource()), true);
  assert.equal(isSourceInvalid(unavailable()), true);
  assert.equal(isSourceInvalid(invalidWork()), true);
  assert.equal(isSourceInvalid(
    new Error("Invalid assistance document id")), true);
});

for (const code of ["failed-precondition", "not-found",
  "invalid-argument"] as const) {
  test(`an HttpsError ${code} is an invalid source`, () => {
    assert.equal(isSourceInvalid(new HttpsError(code, "bad")), true);
  });
}

for (const code of ["internal", "permission-denied", "aborted",
  "unavailable", "already-exists", "resource-exhausted",
  "unknown"] as const) {
  test(`an HttpsError ${code} propagates`, () => {
    assert.equal(isSourceInvalid(new HttpsError(code, "bad")), false);
  });
}

test("plain, transport and non-error failures propagate", () => {
  assert.equal(isSourceInvalid(new Error("socket hang up")), false);
  assert.equal(isSourceInvalid(new TypeError("x is undefined")), false);
  assert.equal(isSourceInvalid("Invalid assistance document id"), false);
  assert.equal(isSourceInvalid(undefined), false);
});

test("stage names the collection of an invalid source", () => {
  assert.equal(stage("events", () => 7), 7);
  assert.throws(() => stage("events", () => {
    throw invalidSource();
  }), (error: unknown) => error instanceof SourceInvalidError &&
    error.source === "events" && error.detail === invalidSource().message);
});

test("stage keeps an inner source and lets other failures through", () => {
  const inner = new SourceInvalidError("organizers", "is malformed.");
  assert.throws(() => stage("events", () => {
    throw inner;
  }), (error: unknown) => error === inner);
  const internal = new HttpsError("internal", "boom");
  assert.throws(() => stage("events", () => {
    throw internal;
  }), (error: unknown) => error === internal);
});

test("parsing does the same for asynchronous readers", async () => {
  assert.equal(await parsing("events", async () => 7), 7);
  await assert.rejects(parsing("eventAssistanceGuests", async () => {
    throw unavailable();
  }), (error: unknown) => error instanceof SourceInvalidError &&
    error.source === "eventAssistanceGuests");
  const inner = new SourceInvalidError("organizers", "is malformed.");
  await assert.rejects(parsing("events", () => {
    throw inner;
  }), (error: unknown) => error === inner);
  const transport = new Error("deadline exceeded");
  await assert.rejects(parsing("events", async () => {
    throw transport;
  }), (error: unknown) => error === transport);
});
