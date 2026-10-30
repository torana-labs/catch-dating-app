import assert from "node:assert/strict";
import test from "node:test";
import {createHostMetaSender, HOST_META_EVENTS_URL} from "./metaSender";
import type {HostMetaLeadPayload} from "./metaPayload";
import {BRAND} from "../shared/generated/brand";

const payload: HostMetaLeadPayload = {
  event_name: "Lead", event_id: "host_lead_1792512000000_example",
  event_time: 1792512000, action_source: "website",
  event_source_url: `${BRAND.web.origin}/host/apply/`,
  user_data: {external_id: ["a".repeat(64)],
    client_user_agent: "Synthetic browser"},
};
test("fixed sender projects only reviewed fields and isolates the token",
  async () => {
    const calls: {url: string; options?: RequestInit}[] = [];
    const send = createHostMetaSender({
      token: () => "synthetic-secret", testEventCode: "TEST12345",
      fetch: (async (url, options) => {
        calls.push({url: String(url), options});
        return new Response(JSON.stringify({
          events_received: 1, messages: [],
        }), {status: 200});
      }) as typeof fetch,
    });
    assert.equal((await send({...payload, email: "private@example.test",
      user_data: {...payload.user_data, em: ["private-hash"]},
    } as unknown as HostMetaLeadPayload)).status, 200);
    assert.equal(calls[0].url, HOST_META_EVENTS_URL);
    assert.equal(calls[0].options?.redirect, "error");
    const body = String(calls[0].options?.body);
    assert.doesNotMatch(body, /secret|email|private/u);
    assert.equal(JSON.parse(body).test_event_code, "TEST12345");
    assert.deepEqual(JSON.parse(body).data, [payload]);
    assert.equal((calls[0].options?.headers as Record<string, string>)
      .Authorization, "Bearer synthetic-secret");
  });
test("oversized and malformed acknowledgements remain uncertain", async () => {
  for (const body of ["not-json", "x".repeat(16_385)]) {
    const send = createHostMetaSender({token: () => "synthetic",
      fetch: (async () => new Response(body, {status: 200})) as typeof fetch});
    assert.equal((await send(payload)).body, null);
  }
});
test("timeouts are exposed once and no network retries occur", async () => {
  let calls = 0;
  const send = createHostMetaSender({token: () => "synthetic",
    fetch: (async () => {
      calls++; throw new Error("network unavailable");
    }) as typeof fetch});
  await assert.rejects(send(payload));
  assert.equal(calls, 1);
});
