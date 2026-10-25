import assert from "node:assert/strict";
import test from "node:test";
import {syncExternalEventAppVisibility} from "./externalEventVisibility";

type Row = Record<string, unknown>;

function fakeDb(events: Record<string, Row>) {
  const writes: Array<{id: string; patch: Row}> = [];
  const pick = (row: Row, path: string) => path.split(".")
    .reduce<unknown>((value, key) =>
      (value as Row | undefined)?.[key], row);
  const snapshotFor = (id: string) => ({
    id,
    ref: {id},
    get: (path: string) => pick(events[id], path),
  });
  const query = (organizerId: string, limit: number, after: string | null) => ({
    limit: (next: number) => query(organizerId, next, after),
    startAfter: (doc: {id: string}) => query(organizerId, limit, doc.id),
    get: async () => ({
      docs: Object.keys(events).sort()
        .filter((id) => events[id].canonicalHostId === organizerId)
        .filter((id) => after === null || id > after)
        .slice(0, limit)
        .map(snapshotFor),
    }),
  });
  const db = {
    collection: (name: string) => {
      assert.equal(name, "externalEvents");
      return {
        where: (field: string, op: string, value: string) => {
          assert.deepEqual([field, op], ["canonicalHostId", "=="]);
          return {orderBy: () => query(value, Number.MAX_SAFE_INTEGER, null)};
        },
      };
    },
    batch: () => {
      const pending: Array<{id: string; patch: Row}> = [];
      return {
        update: (ref: {id: string}, patch: Row) => {
          pending.push({id: ref.id, patch});
        },
        commit: async () => {
          writes.push(...pending);
        },
      };
    },
  };
  return {
    writes,
    deps: {
      firestore: () => db as unknown as FirebaseFirestore.Firestore,
      serverTimestamp: () =>
        "now" as unknown as FirebaseFirestore.FieldValue,
    },
  };
}

function event(organizerId: string, appVisibility: string): Row {
  return {canonicalHostId: organizerId, discovery: {appVisibility}};
}

test("an organizer made discoverable brings its events into the app",
  async () => {
    const {writes, deps} = fakeDb({
      "ext-a": event("afterfly", "hidden"),
      "ext-b": event("afterfly", "discoverable"),
      "ext-c": event("other", "hidden"),
    });
    const updated = await syncExternalEventAppVisibility("afterfly",
      {appVisibility: "hidden"}, {appVisibility: "discoverable"}, deps);
    assert.equal(updated, 1);
    assert.deepEqual(writes, [{id: "ext-a", patch: {
      "discovery.appVisibility": "discoverable",
      "updatedAt": "now",
    }}]);
  });

test("hiding or deleting an organizer hides its events in the app",
  async () => {
    for (const after of [{appVisibility: "hidden"}, undefined]) {
      const {writes, deps} = fakeDb({
        "ext-a": event("afterfly", "discoverable"),
        "ext-b": event("afterfly", "discoverable"),
      });
      const updated = await syncExternalEventAppVisibility("afterfly",
        {appVisibility: "discoverable"}, after, deps);
      assert.equal(updated, 2);
      assert.deepEqual(writes.map((write) =>
        write.patch["discovery.appVisibility"]), ["hidden", "hidden"]);
    }
  });

test("an organizer write that keeps its app visibility reads nothing",
  async () => {
    const {writes, deps} = fakeDb({"ext-a": event("afterfly", "discoverable")});
    deps.firestore = () => {
      throw new Error("No read expected.");
    };
    const updated = await syncExternalEventAppVisibility("afterfly",
      {appVisibility: "hidden", followerCount: 1},
      {followerCount: 2}, deps);
    assert.equal(updated, 0);
    assert.deepEqual(writes, []);
  });
