import assert from "node:assert/strict";
import test from "node:test";
import type {CallableRequest} from "firebase-functions/v2/https";
import {commercialTermsRecords} from "../commercialTerms/testFixture";
import {FakeFirestore, type FakeData} from "../shared/testing/programFirestore";
import {
  listMyOwnedOrganizersHandler,
  ownedOrganizersPage,
} from "./ownedOrganizers";

function organizer(owner: string | null, extra: FakeData = {}): FakeData {
  return {name: "Org", ownerUserId: owner, ...extra};
}

const deps = (db: FakeFirestore) => ({
  db: () => db as unknown as FirebaseFirestore.Firestore,
  now: () => Date.UTC(2026, 10, 11),
  checkRateLimit: async () => undefined,
});

const call = (db: FakeFirestore, uid: string | null,
  data: Record<string, unknown>) => listMyOwnedOrganizersHandler(
  {auth: uid ? {uid, token: {}} : undefined,
    data} as unknown as CallableRequest<unknown>, deps(db));

test("lists every organizer the caller owns, with trial and plan status " +
  "and no prices", async () => {
  const db = new FakeFirestore({
    ...commercialTermsRecords(),
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
  const result = await call(db, "owner", {afterOrganizerId: null, limit: 20});
  assert.deepEqual(result.organizers.map((item) =>
    [item.organizerId, item.name, item.archived]), [
    ["harbor", "Harbor", true], ["lantern", "Lantern Lane", false],
    ["legacy", "Legacy", false]]);
  assert.equal(result.nextAfterOrganizerId, null);
  assert.equal(result.organizers[0].plan.plan, "ticketing");
  assert.ok(result.organizers[0].trial.state);
  // Status only: nothing priced reaches the client.
  assert.doesNotMatch(JSON.stringify(result), /Minor|price|fee|url/iu);
});

test("pages in id order without skipping or repeating", async () => {
  const seed: Record<string, FakeData> = {...commercialTermsRecords()};
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
    const page = await call(db, "owner", {afterOrganizerId: after, limit: 2});
    seen.push(...page.organizers.map((item) => item.organizerId));
    after = page.nextAfterOrganizerId;
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
    const fs = db as unknown as FirebaseFirestore.Firestore;
    // hostUserId fills its window (a1, a2) before reaching b: z must wait.
    const first = await ownedOrganizersPage(fs, "owner", null, 1);
    assert.deepEqual(first.organizers.map((item) => item.id), []);
    assert.equal(first.next, "a2");
    const second = await ownedOrganizersPage(fs, "owner", first.next, 1);
    assert.deepEqual(second.organizers.map((item) => item.id), ["b"]);
    const third = await ownedOrganizersPage(fs, "owner", second.next, 1);
    assert.deepEqual(third.organizers.map((item) => item.id), ["z"]);
    assert.equal(third.next, null);
  });

test("needs a signed-in caller and a valid page request", async () => {
  const db = new FakeFirestore({});
  await assert.rejects(call(db, null, {afterOrganizerId: null, limit: 20}),
    /unauthenticated|sign/iu);
  await assert.rejects(call(db, "owner", {afterOrganizerId: null, limit: 0}));
  await assert.rejects(call(db, "owner", {limit: 20}));
  assert.deepEqual(await call(db, "owner", {afterOrganizerId: null,
    limit: 20}), {organizers: [], nextAfterOrganizerId: null});
});
