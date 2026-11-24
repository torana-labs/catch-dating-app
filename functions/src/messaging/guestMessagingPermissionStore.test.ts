import assert from "node:assert/strict";
import test from "node:test";
import {catchPermissionViewId, guestPermissionSummary} from
  "./guestMessagingPermissionStore";

test("the Catch row id and the summary the guest row holds", () => {
  assert.equal(catchPermissionViewId("person"), "catchpref_person");
  assert.deepEqual(guestPermissionSummary(null, "organizer"),
    {status: "unknown", receiptId: null, purposes: {}});
});
