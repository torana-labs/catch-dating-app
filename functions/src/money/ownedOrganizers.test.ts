import assert from "node:assert/strict";
import test from "node:test";
import {FakeFirestore, type FakeData} from "../shared/testing/programFirestore";
import {ownedOrganizersPage} from "./ownedOrganizers";

function organizer(owner: string | null, extra: FakeData = {}): FakeData {
  return {name: "Org", ownerUserId: owner, ...extra};
}

const page = (db: FakeFirestore, uid: string, after: string | null,
  limit: number) => ownedOrganizersPage(
  db as unknown as FirebaseFirestore.Firestore, uid, after, limit);

test("lists every organizer the caller owns under the owner rule",
  async () => {
    const db = new FakeFirestore({
      "organizers/lantern": organizer("owner", {name: "Lantern Lane"}),
      "organizers/harbor": organizer("owner", {name: "Harbor",
        status: "archived", archived: true}),
      // Legacy: no owner recorded, the host is the owner.
      "organizers/legacy": {name: "Legacy", hostUserId: "owner"},
      // Someone else owns it; the caller is only its legacy host.
      "organizers/theirs": organizer("other", {hostUserId: "owner"}),
      // The caller only manages it.
      "organizers/managed": organizer("other", {hostUserIds: ["owner"]}),
    });
    const result = await page(db, "owner", null, 20);
    assert.deepEqual(result.organizers.map((item) => item.id),
      ["harbor", "lantern", "legacy"]);
    assert.equal(result.next, null);
  });

test("pages in id order without skipping or repeating", async () => {
  const seed: Record<string, FakeData> = {};
  for (const id of ["a", "b", "c", "d", "e"]) {
    seed[`organizers/${id}`] = organizer("owner");
  }
  // Legacy-host matches owned by someone else fill the hostUserId window.
  for (const id of ["a1", "a2", "a3"]) {
    seed[`organizers/${id}`] = organizer("other", {hostUserId: "owner"});
  }
  seed["organizers/c0"] = {name: "Legacy", hostUserId: "owner"};
  const db = new FakeFirestore(seed);
  const seen: string[] = [];
  let after: string | null = null;
  for (let pages = 0; pages < 10; pages++) {
    const result = await page(db, "owner", after, 2);
    seen.push(...result.organizers.map((item) => item.id));
    after = result.next;
    if (after === null) break;
  }
  assert.deepEqual(seen, ["a", "b", "c", "c0", "d", "e"]);
});

test("the page stops where a full read ends, so nothing is skipped",
  async () => {
    const db = new FakeFirestore({
      "organizers/a1": organizer("other", {hostUserId: "owner"}),
      "organizers/a2": organizer("other", {hostUserId: "owner"}),
      "organizers/b": {name: "Legacy", hostUserId: "owner"},
      "organizers/z": organizer("owner"),
    });
    // hostUserId fills its window (a1, a2) before reaching b: z must wait.
    const first = await page(db, "owner", null, 1);
    assert.deepEqual(first.organizers.map((item) => item.id), []);
    assert.equal(first.next, "a2");
    const second = await page(db, "owner", first.next, 1);
    assert.deepEqual(second.organizers.map((item) => item.id), ["b"]);
    const third = await page(db, "owner", second.next, 1);
    assert.deepEqual(third.organizers.map((item) => item.id), ["z"]);
    assert.equal(third.next, null);
  });
