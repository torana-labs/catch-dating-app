import assert from "node:assert/strict";
import test from "node:test";
import {isEventPubliclyAccessible} from "./eventPublicationAccess";

test("only an explicitly published event is publicly accessible", () => {
  assert.equal(isEventPubliclyAccessible({publicationState: "published",
    setupRevision: 2}), true);
  for (const publicationState of ["private", null, undefined, "public", ""]) {
    assert.equal(isEventPubliclyAccessible({publicationState}), false);
  }
  assert.equal(isEventPubliclyAccessible({status: "active"}), false);
  assert.equal(isEventPubliclyAccessible({setupRevision: 1}), false);
});
