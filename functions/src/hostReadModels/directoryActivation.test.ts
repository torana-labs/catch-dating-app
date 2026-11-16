import assert from "node:assert/strict";
import test from "node:test";
import {AudienceTestStore} from "../organizers/organizerAudienceTestStore";
import {activateHostDirectory} from "./directoryActivation";

test("a new organizer starts with every Host directory read model active",
  async () => {
    const db = new AudienceTestStore({"organizers/new": {hostUserId: "host"}});
    await activateHostDirectory(db.asFirestore(), "new");
    const directory = db.docs["hostDirectorySummaries/new"];
    for (const marker of ["contactSummaryVersion", "responseSummaryVersion",
      "formSummaryVersion", "groupSummaryVersion", "eventSummaryVersion"]) {
      assert.equal(directory[marker], 1, marker);
    }
    // A repeat, as a retried trigger does, keeps every marker.
    await activateHostDirectory(db.asFirestore(), "new");
    assert.equal(db.docs["hostDirectorySummaries/new"].formSummaryVersion, 1);
  });

test("a missing organizer is not activated", async () => {
  const db = new AudienceTestStore({});
  await assert.rejects(activateHostDirectory(db.asFirestore(), "gone"),
    /does not exist/);
  assert.equal(db.docs["hostDirectorySummaries/gone"], undefined);
});
