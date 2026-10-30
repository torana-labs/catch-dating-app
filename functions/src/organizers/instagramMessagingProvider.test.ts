import assert from "node:assert/strict";
import test from "node:test";
import {
  InstagramGraphProvider,
  InstagramProviderError,
} from "./instagramMessagingProvider";

const config = {accountId: "17841400000000001", accessToken: "token-123",
  graphVersion: "v26.0"};

function recordingFetch(status: number, body: unknown) {
  const calls: Array<{url: string; init: RequestInit}> = [];
  const fetchImpl = (async (url: URL, init: RequestInit) => {
    calls.push({url: url.toString(), init});
    return new Response(JSON.stringify(body), {status});
  }) as unknown as typeof fetch;
  return {calls, fetchImpl};
}

test("the username lookup asks graph.instagram.com for one field",
  async () => {
    const {calls, fetchImpl} = recordingFetch(200,
      {username: "Carter_Runs", id: "901"});
    const provider = new InstagramGraphProvider(config, fetchImpl);
    assert.equal(await provider.lookupUsername("901"), "carter_runs");
    assert.equal(calls[0].url,
      "https://graph.instagram.com/v26.0/901?fields=username");
    // The token is a header, never part of the URL.
    assert.equal((calls[0].init.headers as Record<string, string>)
      .Authorization, "Bearer token-123");
  });

test("a reply goes to the sender through Catch's account", async () => {
  const {calls, fetchImpl} = recordingFetch(200, {message_id: "m"});
  await new InstagramGraphProvider(config, fetchImpl)
    .sendReply("901", "Thanks");
  assert.equal(calls[0].url,
    "https://graph.instagram.com/v26.0/17841400000000001/messages");
  assert.equal(calls[0].init.method, "POST");
  assert.deepEqual(JSON.parse(String(calls[0].init.body)),
    {recipient: {id: "901"}, message: {text: "Thanks"}});
});

test("bad ids and Meta errors fail without leaking the token", async () => {
  const {fetchImpl} = recordingFetch(400,
    {error: {message: "Invalid OAuth access token token-123"}});
  const provider = new InstagramGraphProvider(config, fetchImpl);
  await assert.rejects(provider.lookupUsername("../me"),
    InstagramProviderError);
  await assert.rejects(provider.lookupUsername("901"), (error: Error) =>
    error instanceof InstagramProviderError &&
      !error.message.includes("token-123"));
});

test("a token function is asked for the current token on each request",
  async () => {
    const {calls, fetchImpl} = recordingFetch(200, {username: "carter"});
    const tokens = ["first-token", "second-token"];
    const provider = new InstagramGraphProvider({...config,
      accessToken: async () => tokens.shift()!}, fetchImpl);
    await provider.lookupUsername("901");
    await provider.lookupUsername("901");
    assert.deepEqual(calls.map((call) =>
      (call.init.headers as Record<string, string>).Authorization),
    ["Bearer first-token", "Bearer second-token"]);
  });
