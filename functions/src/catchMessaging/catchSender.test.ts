/* eslint-disable max-len */
import assert from "node:assert/strict";
import test from "node:test";
import {catchTextSender} from "./catchSender";

const scope = {wabaId: "123", phoneNumberId: "456", graphVersion: "v23.0"};
const version = "projects/catch-dating-app-64e51/secrets/CATCH_WHATSAPP_ACCESS_TOKEN/versions/3";
const credential = JSON.stringify({schema: "catch.whatsapp-sender-token/v1", wabaId: "123", phoneNumberId: "456",
  accessToken: "token-abc"});

test("no credential version means no sender, so routing works and replies are skipped", async () => {
  assert.equal(await catchTextSender({...scope, credentialVersion: " "}), null);
});

test("a misconfigured version or a credential for another number is refused", async () => {
  await assert.rejects(catchTextSender({...scope, credentialVersion: "projects/x/secrets/OTHER/versions/1"}),
    /misconfigured/u);
  await assert.rejects(catchTextSender({...scope, credentialVersion: version},
    {readSecret: async () => credential.replace("\"456\"", "\"999\"")}), /Invalid credential binding/u);
});

test("the sender posts one text message to the Graph API and returns its id", async () => {
  const calls: Array<{url: string; body: Record<string, unknown>; auth: string | null}> = [];
  const send = await catchTextSender({...scope, credentialVersion: version}, {readSecret: async () => credential,
    now: () => 1_000, fetch: async (url, init) => {
      calls.push({url: String(url), body: JSON.parse(String(init?.body)),
        auth: new Headers(init?.headers).get("authorization")});
      return new Response(JSON.stringify({messages: [{id: "wamid.out"}]}), {status: 200,
        headers: {"content-type": "application/json"}});
    }});
  assert.ok(send);
  assert.equal(await send("+919800012345", "Got it."), "wamid.out");
  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /\/v23\.0\/456\/messages$/u);
  assert.deepEqual([calls[0].body.to, calls[0].body.type, (calls[0].body.text as {body: string}).body],
    ["919800012345", "text", "Got it."]);
  assert.equal(calls[0].auth, "Bearer token-abc");
});
