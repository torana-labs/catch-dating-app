import assert from "node:assert/strict";
import test from "node:test";
import {doublesRoundsFromPlannedRounds, isDoublesCourt} from "./doublesSlots";
import {isHttpsError} from "../shared/testUtils";

const p = (uid: string) => ({uid});

test("courts of four are doubles; two or unset are singles", () => {
  assert.equal(isDoublesCourt(4), true);
  assert.equal(isDoublesCourt(2), false);
  assert.equal(isDoublesCourt(1), false);
  assert.equal(isDoublesCourt(null), false);
  assert.equal(isDoublesCourt(undefined), false);
  assert.throws(() => isDoublesCourt(3), (error) => {
    isHttpsError(error, "failed-precondition", "four (doubles)");
    return true;
  });
});

test("each court becomes two partnerships facing each other", () => {
  const rounds = doublesRoundsFromPlannedRounds([{
    roundIndex: 0,
    units: [{
      unitIndex: 1,
      members: [p("a"), p("b"), p("c"), p("d")],
      subunits: [[p("a"), p("c")], [p("b"), p("d")]],
    }],
  }]);

  assert.equal(rounds.length, 1);
  const [first, second] = rounds[0].partnerships;
  assert.deepEqual([first.a.uid, first.b.uid], ["a", "c"]);
  assert.deepEqual(first.opponents.map((o) => o.uid), ["b", "d"]);
  assert.equal(first.unitIndex, 1);
  assert.equal(first.side, 0);
  assert.deepEqual([second.a.uid, second.b.uid], ["b", "d"]);
  assert.deepEqual(second.opponents.map((o) => o.uid), ["a", "c"]);
  assert.equal(second.side, 1);
});

test("a court without two sides of two never reaches a guest", () => {
  const rounds = doublesRoundsFromPlannedRounds([{
    roundIndex: 0,
    units: [
      {unitIndex: 0, members: [p("a"), p("b"), p("c")],
        subunits: [[p("a"), p("b")], [p("c")]]},
      {unitIndex: 1, members: [p("d"), p("e"), p("f"), p("g")]},
    ],
  }]);
  assert.deepEqual(rounds[0].partnerships, []);
});
