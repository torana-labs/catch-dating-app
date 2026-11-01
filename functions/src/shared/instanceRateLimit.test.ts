import assert from "node:assert/strict";
import test from "node:test";
import {checkInstanceRateLimit} from "./instanceRateLimit";

const limit = {maxRequests: 2, windowMs: 60_000};
const windowStart = 60_000 * 1000;

test("rejects the call after the limit, then allows the next window", () => {
  const action = "windowed";
  checkInstanceRateLimit("a", action, limit, windowStart);
  checkInstanceRateLimit("a", action, limit, windowStart + 59_999);
  assert.throws(
    () => checkInstanceRateLimit("a", action, limit, windowStart + 59_999),
    {code: "resource-exhausted"}
  );
  checkInstanceRateLimit("a", action, limit, windowStart + 60_000);
});

test("counts each caller and each action apart", () => {
  checkInstanceRateLimit("a", "separate-1", limit, windowStart);
  checkInstanceRateLimit("a", "separate-1", limit, windowStart);
  checkInstanceRateLimit("b", "separate-1", limit, windowStart);
  checkInstanceRateLimit("a", "separate-2", limit, windowStart);
});

test("a rejected call does not extend the count", () => {
  const action = "rejected";
  const oneCall = {maxRequests: 1, windowMs: 60_000};
  checkInstanceRateLimit("a", action, oneCall, windowStart);
  for (let attempt = 0; attempt < 3; attempt += 1) {
    assert.throws(
      () => checkInstanceRateLimit("a", action, oneCall, windowStart),
      {code: "resource-exhausted"}
    );
  }
  checkInstanceRateLimit("a", action, oneCall, windowStart + 60_000);
});
