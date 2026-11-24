import {SecretVersionReferenceGuard} from
  "../shared/secretVersionReference";
import assert from "node:assert/strict";
import test from "node:test";
import {SecretManagerServiceClient} from "@google-cloud/secret-manager";
import {GuestLinkKeyStore, parseGuestLinkKeys} from "./guestLinkKeyStore";

const envelope = () => ({schema: "catch.event-assistance-guest-keys/v1",
  currentKeyId: "new", keys: [
    {keyId: "old", key: Buffer.alloc(32, 1).toString("base64url")},
    {keyId: "new", key: Buffer.alloc(32, 2).toString("base64url")}]});

test("signing key rotation retains immutable old key material", () => {
  const keys = parseGuestLinkKeys(envelope());
  assert.equal(keys.currentKeyId, "new");
  assert.deepEqual(keys.keyFor("old"), Buffer.alloc(32, 1));
  keys.keyFor("old").fill(0);
  assert.deepEqual(keys.keyFor("old"), Buffer.alloc(32, 1));
  assert.throws(() => keys.keyFor("unknown"));
});

test("key envelopes reject ambiguity and invalid material", () => {
  const value = envelope();
  for (const invalid of [null, [], {...value, extra: true},
    {...value, currentKeyId: "missing"}, {...value, keys: []},
    {...value, keys: [value.keys[0], value.keys[0]]},
    {...value, keys: [{keyId: "new", key: "x"}]},
    {...value, keys: [{keyId: "new", key: "A".repeat(42) + "B"}]},
    {...value, keys: [{keyId: "../key", key: value.keys[0].key}]}]) {
    assert.throws(() => parseGuestLinkKeys(invalid));
  }
});

test("key access pins its secret and redacts failures", async () => {
  const references = new SecretVersionReferenceGuard(() => "demo",
    async () => "123456");
  const calls: string[] = [];
  const client = {accessSecretVersion: async ({name}: {name: string}) => {
    calls.push(name);
    return [{payload: {data: Buffer.from(JSON.stringify(envelope()))}}];
  }} as unknown as SecretManagerServiceClient;
  const resource =
    "projects/demo/secrets/EVENT_ASSISTANCE_GUEST_KEYS/versions/7";
  const keys = await new GuestLinkKeyStore(resource, client,
    references).access();
  assert.equal(keys.currentKeyId, "new");
  for (const invalid of ["", resource.replace("/7", "/latest"),
    resource.replace("GUEST_KEYS", "OTHER_KEYS"),
    resource.replace("demo", "foreign"), resource.replace("demo", "654321")]) {
    await assert.rejects(new GuestLinkKeyStore(invalid, client,
      references).access(),
    /Guest response signing keys unavailable/);
  }
  assert.deepEqual(calls, [resource]);
  const numbered = resource.replace("demo", "123456");
  const retained = await new GuestLinkKeyStore(numbered, client,
    references).access();
  assert.deepEqual(retained.keyFor("old"), Buffer.alloc(32, 1));
  const broken = {accessSecretVersion: async () => {
    throw new Error("secret-provider-detail");
  }} as unknown as SecretManagerServiceClient;
  await assert.rejects(new GuestLinkKeyStore(resource, broken,
    references).access(),
  (error: Error) => !error.message.includes("secret-provider-detail"));
});
