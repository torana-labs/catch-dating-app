import assert from "node:assert/strict";
import test from "node:test";
import {normalizeSurfaceUrl} from "../src/cli/normalize-surface-url.mjs";

test("surface URL normalization emits a CLI envelope and enforces expectations", () => {
  const envelope = normalizeSurfaceUrl([
    "https://www.instagram.com/afterfly.in/?hl=en",
    "--expect-platform", "instagram",
    "--expect-key", "instagram:afterfly.in",
    "--role", "primary",
  ]);
  assert.equal(envelope.program, "catch-operations");
  assert.equal(envelope.command, "normalize-surface-url");
  assert.equal(envelope.data.surface.surfaceKind, "socialProfile");
  assert.equal(envelope.data.surface.role, "primary");

  assert.throws(() => normalizeSurfaceUrl(["https://lu.ma/pxgmph3b",
    "--expect-kind", "socialProfile"]), {code: "SURFACE_MISMATCH"});
  assert.throws(() => normalizeSurfaceUrl([]), {code: "MISSING_ARGUMENT"});
  assert.throws(() => normalizeSurfaceUrl(["https://lu.ma/x", "--write"]),
    {code: "INVALID_ARGUMENT"});
});
