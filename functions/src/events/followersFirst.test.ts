import assert from "node:assert/strict";
import test from "node:test";
import {Timestamp} from "firebase-admin/firestore";
import {
  followersFirstActive, followersFirstChoice, followersFirstRefusal,
} from "./followersFirst";

test("followers first is open to everyone without the field or after it",
  () => {
    assert.equal(followersFirstActive({}, 10), false);
    assert.equal(followersFirstActive({followersFirstUntilMs: 20}, 10), true);
    assert.equal(followersFirstActive({followersFirstUntilMs: 20}, 20), false);
    assert.equal(followersFirstActive({followersFirstUntilMs: "20"}, 10),
      false);
  });

test("a booking choice sets, keeps or removes the open time", () => {
  const start = Timestamp.fromMillis(100 * 60 * 60 * 1000);
  assert.deepEqual(followersFirstChoice({startTime: start}, "followersFirst"),
    {set: 76 * 60 * 60 * 1000});
  assert.equal(followersFirstChoice({startTime: start,
    followersFirstUntilMs: 5} as object, "followersFirst"), null);
  assert.deepEqual(followersFirstChoice({startTime: start,
    followersFirstUntilMs: 5} as object, "anyone"), {remove: true});
  assert.equal(followersFirstChoice({startTime: start}, "askFirst"), null);
  assert.equal(followersFirstChoice({startTime: start}, null), null);
});

test("the refusal carries the reason and the open time", () => {
  const error = followersFirstRefusal({followersFirstUntilMs: 42});
  assert.equal(error.code, "failed-precondition");
  assert.deepEqual(error.details, {reason: "followersFirst", opensAtMs: 42});
});
