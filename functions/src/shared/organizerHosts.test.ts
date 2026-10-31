import assert from "node:assert/strict";
import test from "node:test";
import {isOrganizerManager, isOrganizerOwner, organizerManagerUserIds} from
  "./organizerHosts";

// Preserve the authority fields the rules read.
// Display-only entries and nested ownership snapshots cannot grant a seat.
for (const [label, fields, expected] of [
  ["legacy single host", {hostUserId: "legacy"}, ["legacy"]],
  ["canonical owner", {ownerUserId: "owner"}, ["owner"]],
  ["manager array", {hostUserIds: ["manager", "manager", ""]}, ["manager"]],
  ["all existing rule authority fields", {hostUserId: "legacy",
    ownerUserId: "owner", hostUserIds: ["manager", "owner"]},
  ["legacy", "owner", "manager"]],
  ["display-only legacy entry", {hostProfiles: [{uid: "stale",
    displayName: "Stale", avatarUrl: null, role: "owner"}]}, []],
  ["nested ownership snapshot", {ownership: {ownerUserId: "stale",
    primaryHostUserId: "stale", hostUserIds: ["stale"]}}, []],
] as const) {
  test(`organizer manager authority: ${label}`, () => {
    const source = {hostUserIds: [], hostProfiles: [], ...fields};
    assert.deepEqual(organizerManagerUserIds(source as never), expected);
    for (const uid of ["legacy", "owner", "manager", "stale"]) {
      const allowed = (expected as readonly string[]).includes(uid);
      assert.equal(isOrganizerManager(source as never, uid), allowed);
    }
  });
}

test("legacy host ownership retains canonical owner precedence", () => {
  {
    const predicate = isOrganizerOwner;
    assert.equal(predicate({hostUserId: "legacy"} as never, "legacy"), true);
    assert.equal(predicate({hostUserId: "legacy", ownerUserId: "owner"} as
      never, "legacy"), false);
    assert.equal(predicate({hostUserId: "legacy", ownerUserId: "owner"} as
      never, "owner"), true);
  }
});
