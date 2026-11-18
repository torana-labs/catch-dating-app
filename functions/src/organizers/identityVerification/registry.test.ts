/* eslint-disable max-len */
import assert from "node:assert/strict";
import test from "node:test";
import {VERIFICATION_METHODS, verificationMethod} from "./methods";
import {verificationPurpose} from "./purposes";

// The registries every verification flow reads (issue #2096). Adding a
// method or purpose is one entry; these tests pin each entry's contract.

const env = (instagramEnabled: boolean, lumaEnabled: boolean, handle: string | null = "catch.example") =>
  ({instagramEnabled, catchInstagramHandle: handle, lumaEnabled: async () => lumaEnabled});

const organizer = (sources: Array<{type: string; href: string}>) =>
  ({publicSources: sources.map((source) => ({...source, label: source.type, detail: source.type,
    confidence: "medium", lastCheckedAt: null}))}) as never;

test("every method has a unique id and is found by it", () => {
  const ids = VERIFICATION_METHODS.map((method) => method.id);
  assert.deepEqual(ids, ["instagramMessage", "lumaDescription"]);
  assert.equal(new Set(ids).size, ids.length);
  for (const id of ids) assert.equal(verificationMethod(id).id, id);
  assert.throws(() => verificationMethod("smokeSignal"));
});

test("Instagram is offered when switched on and startable only with Catch's handle", async () => {
  const method = verificationMethod("instagramMessage");
  assert.equal(method.completion, "inboundMessage");
  assert.equal(method.reservesCode, true);
  assert.equal(await method.offered(env(true, false)), true);
  assert.equal(await method.startable(env(true, false, null)), false);
  assert.equal(await method.startable(env(false, false)), false);
  assert.equal(method.proofText("123456"), "123456");
});

test("Luma is checked on demand, with a marker, and follows the page reader switch", async () => {
  const method = verificationMethod("lumaDescription");
  assert.equal(method.completion, "pageCheck");
  assert.equal(method.reservesCode, false);
  assert.equal(await method.startable(env(false, true)), true);
  assert.equal(await method.offered(env(true, false)), false);
  assert.notEqual(method.proofText("123456"), "123456");
  assert.match(method.proofText("123456"), /123456/u);
});

test("proof targets come from the organizer's own public sources", () => {
  const listed = organizer([{type: "instagram", href: "https://www.instagram.com/driftwood.social/"},
    {type: "luma", href: "https://lu.ma/driftwood-social"}]);
  assert.equal(verificationMethod("instagramMessage").proofTarget(listed), "driftwood.social");
  assert.match(String(verificationMethod("lumaDescription").proofTarget(listed)), /driftwood-social/u);
  assert.equal(verificationMethod("instagramMessage").proofTarget(organizer([])), null);
});

test("an attempt saved before purposes existed is a claim", () => {
  assert.equal(verificationPurpose(undefined).id, "claim");
  assert.equal(verificationPurpose(null).id, "claim");
  assert.equal(verificationPurpose("claim").id, "claim");
  assert.throws(() => verificationPurpose("nothing"));
});

test("the claim purpose refuses an organizer that is already claimed", () => {
  assert.throws(() => verificationPurpose("claim").assertEligible(
    {ownerUserId: "someone", claim: {state: "claimed"}} as never, "visitor"));
  assert.doesNotThrow(() => verificationPurpose("claim").assertEligible(
    {claim: {state: "unclaimed"}, status: "active", archived: false} as never, "visitor"));
});
