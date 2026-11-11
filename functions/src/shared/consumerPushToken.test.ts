import assert from "node:assert/strict";
import test from "node:test";
import * as admin from "firebase-admin";
import {newestPushToken, readPushToken} from "./consumerPushToken";

const at = (millis: number) => admin.firestore.Timestamp.fromMillis(millis);

test("newest Guest device wins; Host and blank rows never count", () => {
  const rows = [
    {appRole: "consumer", token: "old", updatedAt: at(1)},
    {appRole: "consumer", token: "new", updatedAt: at(3)},
    {appRole: "host", token: "host-newest", updatedAt: at(9)},
    {appRole: "consumer", token: "  ", updatedAt: at(10)},
    {appRole: "consumer", token: 7, updatedAt: at(11)},
  ];
  assert.equal(newestPushToken(rows), "new");
  assert.equal(newestPushToken(rows, "host"), "host-newest");
  assert.equal(newestPushToken([]), null);
  assert.equal(newestPushToken([{appRole: "host", token: "h"}]), null);
});

test("rows without a timestamp still resolve", () => {
  assert.equal(newestPushToken([{appRole: "consumer", token: "t"}]), "t");
});

test("reader scans a bounded installations query, in a transaction too",
  async () => {
    const reads: string[] = [];
    const query = {
      path: "",
      async get() {
        reads.push(`get:${this.path}`);
        return {docs: [{data: () => ({appRole: "host", token: "h"})}]};
      },
    };
    const db = {collection: (path: string) => ({limit: (count: number) => {
      reads.push(`limit:${count}`);
      query.path = path;
      return query;
    }})} as unknown as FirebaseFirestore.Firestore;
    assert.equal(await readPushToken(db, "u1", "host"), "h");
    const tx = {get: async (q: typeof query) => {
      reads.push("tx");
      return q.get();
    }} as unknown as FirebaseFirestore.Transaction;
    assert.equal(await readPushToken(db, "u1", "consumer", tx), null);
    assert.deepEqual(reads, ["limit:20", "get:users/u1/pushInstallations",
      "limit:20", "tx", "get:users/u1/pushInstallations"]);
  });
