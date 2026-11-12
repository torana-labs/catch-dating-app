import assert from "node:assert/strict";
import test from "node:test";
import {
  conversationPushTokens, resolveConversationPushTokens,
} from "./conversationPushTargets";

const installations = [
  {appRole: "consumer", token: "consumer-a"},
  {appRole: "consumer", token: "consumer-b"},
  {appRole: "consumer", token: "consumer-a"},
  {appRole: "host", token: "host-a"},
  {appRole: "host", token: ""},
  {appRole: "unknown", token: "invalid"},
];

test("Consumer uses unique Consumer installations only", () => {
  assert.deepEqual(conversationPushTokens(installations, "consumer"),
    ["consumer-a", "consumer-b"]);
  assert.deepEqual(conversationPushTokens([], "consumer"), []);
});

test("Host uses Host installations only", () => {
  assert.deepEqual(conversationPushTokens(installations, "host"), ["host-a"]);
  assert.deepEqual(conversationPushTokens([], "host"), []);
});

test("resolver reads installations for a Host-only account", async () => {
  const paths: string[] = [];
  const db = {collection: (path: string) => {
    paths.push(path);
    return {doc: (uid: string) => {
      paths.push(uid);
      return {collection: (collection: string) => {
        paths.push(collection);
        return {get: async () => ({
          docs: installations.map((value) => ({data: () => value})),
        })};
      }};
    }};
  }};
  assert.deepEqual(await resolveConversationPushTokens(
    db as unknown as FirebaseFirestore.Firestore, "host-uid", "host"
  ), ["host-a"]);
  assert.deepEqual(paths, ["users", "host-uid", "pushInstallations"]);
});
