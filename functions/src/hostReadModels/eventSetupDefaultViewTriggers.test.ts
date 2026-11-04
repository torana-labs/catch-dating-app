import assert from "node:assert/strict";
import test from "node:test";
import {
  eventSetupDefaultOrganizerFields,
  organizerWriteAffectsDefaultView,
} from "./eventSetupDefaultViewTriggers";

test("organizer writes evaluate the defaults view only when it can change",
  () => {
    const base = {locationCityId: "c", locationMarketId: "m",
      hostDefaults: {revision: 1}, status: "active", archived: false,
      description: "Old"};
    assert.equal(organizerWriteAffectsDefaultView(base,
      {...base, description: "New"}), false);
    for (const field of eventSetupDefaultOrganizerFields) {
      assert.equal(organizerWriteAffectsDefaultView(base,
        {...base, [field]: "changed"}), true, field);
    }
    assert.equal(organizerWriteAffectsDefaultView(undefined, base), true);
    assert.equal(organizerWriteAffectsDefaultView(base, undefined), true);
  });
