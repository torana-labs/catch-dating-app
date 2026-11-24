import assert from "node:assert/strict";
import {test} from "node:test";
import {publicDocumentId, organizerPath, publicJsonLd} from "../../src/server/publicReadPolicy.ts";

// Publication itself is decided where the page read models are built
// (functions/src/publicPages/projections.test.ts).
test("IDs and canonical paths cannot escape the bounded collection and route", () => {
  for (const id of ["../secret", "a/b", "%2f", "", null, "a?token=x", "x".repeat(181)]) {
    assert.equal(publicDocumentId(id), false);
  }
  for (const path of ["//evil.test", "/organizers/../private/", "/organizers/a/?token=x",
    "/organizers/a/#secret", "/organizers/a/b/c/", "/organizers/%2f/"]) {
    assert.equal(organizerPath(path), false);
  }
});

test("structured metadata cannot close its script tag", () => {
  const value = {name: "</script><script>alert(1)</script>& "};
  const json = publicJsonLd(value);
  assert.equal(json.includes("<"), false);
  assert.deepEqual(JSON.parse(json), value);
});
