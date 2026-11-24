import assert from "node:assert/strict";
import {test} from "node:test";
import {
  DEFAULT_GROUP_SIZE_FLOOR,
  parseGuestDataVisibilityConfig,
} from "./guestDataVisibility";

test("the group-size floor defaults to 10 with no config document", () => {
  assert.equal(DEFAULT_GROUP_SIZE_FLOOR, 10);
  assert.deepEqual(parseGuestDataVisibilityConfig(undefined),
    {floor: 10, source: "absent"});
});

test("a well-formed config document sets the floor", () => {
  assert.deepEqual(parseGuestDataVisibilityConfig({
    groupSizeFloor: 15,
    reason: "Pilot cities",
    updatedBy: "owner",
  }), {floor: 15, source: "set"});
  assert.deepEqual(parseGuestDataVisibilityConfig({groupSizeFloor: 2}),
    {floor: 2, source: "set"});
});

test("a malformed config document fails closed to the default", () => {
  for (const data of [
    null,
    [],
    {},
    {groupSizeFloor: "20"},
    {groupSizeFloor: 1},
    {groupSizeFloor: 0},
    {groupSizeFloor: 7.5},
    {groupSizeFloor: 501},
    {groupSizeFloor: 12, extra: true},
  ]) {
    assert.deepEqual(parseGuestDataVisibilityConfig(data),
      {floor: 10, source: "invalid"}, JSON.stringify(data));
  }
});
