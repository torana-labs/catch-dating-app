import assert from "node:assert/strict";
import test from "node:test";
import {eventSourceRevision} from "./eventSourceRevision";

test("the source revision is the event's setup revision", () => {
  assert.equal(eventSourceRevision({setupRevision: 7}), 7);
  assert.equal(eventSourceRevision({setupRevision: 1}), 1);
});

test("a missing or malformed setup revision is an invalid state", () => {
  for (const event of [{}, {setupRevision: 0}, {setupRevision: -1},
    {setupRevision: "7"}, {setupRevision: 1.5}, {setupRevision: null},
    {setupRevision: Number.MAX_SAFE_INTEGER + 1}]) {
    assert.throws(() => eventSourceRevision(event),
      {code: "failed-precondition"}, JSON.stringify(event));
  }
});
