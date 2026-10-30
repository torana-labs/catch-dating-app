import {strict as assert} from "node:assert";
import {test} from "node:test";
import {newHostConsentAuthority, type HostMetaDispatchState}
  from "./consentPolicy";
import {classifyHostMetaResponse, hostMetaLeadPayload} from "./metaPayload";
import {BRAND} from "../shared/generated/brand";

const now = 1792512000000;
const consent = newHostConsentAuthority({version: 1,
  purpose: "host_acquisition_measurement", analytics: true,
  advertising: true, chosenAt: now}, now);
const state: HostMetaDispatchState = {
  eventId: `host_lead_${now}_12345678-1234-4567-8123-123456789012`,
  acceptedAt: now, nextAttemptAt: now, attempts: 0, status: "pending",
};
const context = {clientId: "1234.1792512000",
  userAgent: "Synthetic test agent"};

test("CAPI projects only reviewed website Lead fields", () => {
  const payload = hostMetaLeadPayload({enabled: true, now, consent, state,
    context: {...context, email: "private@example.com", phone: "private",
      answers: {name: "private"}, uid: "private", ip: "127.0.0.1",
      url: `${BRAND.web.origin}/private?email=private@example.com`}});
  assert.ok(payload);
  assert.deepEqual(Object.keys(payload).sort(),
    ["event_name", "event_id", "event_time", "action_source",
      "event_source_url", "user_data"].sort());
  assert.deepEqual(Object.keys(payload.user_data).sort(),
    ["external_id", "client_user_agent"].sort());
  assert.equal(payload.event_id, state.eventId);
  assert.equal(payload.event_time, now / 1000);
  assert.equal(payload.action_source, "website");
  assert.equal(payload.event_source_url, `${BRAND.web.origin}/host/apply/`);
  assert.match(payload.user_data.external_id[0], /^[a-f0-9]{64}$/u);
  assert.equal(JSON.stringify(payload).includes("private"), false);
});

test("fbc requires an actual click observed within current permission", () => {
  const payload = (clickCapturedAt?: number, fbclid = "actualSyntheticClick") =>
    hostMetaLeadPayload({enabled: true, now, consent, state,
      context: {...context, fbclid, clickCapturedAt}});
  assert.equal(payload(now)?.user_data.fbc,
    `fb.1.${now}.actualSyntheticClick`);
  for (const invalid of [undefined, now - 1, now + 1, NaN]) {
    assert.equal(payload(invalid)?.user_data.fbc, undefined);
  }
  assert.equal(payload(now, "invalid?contact=private")?.user_data.fbc,
    undefined);
});

test("missing permission or browser identity produces no CAPI payload", () => {
  assert.equal(hostMetaLeadPayload({enabled: false, now, consent, state,
    get context(): never {
      throw new Error("Do not inspect context.");
    }}),
  null);
  assert.equal(hostMetaLeadPayload({enabled: true, now,
    consent: {...consent, revokedAt: now}, state, context}), null);
  for (const candidate of [null, {}, {...context, clientId: "firebase-user"},
    {...context, userAgent: ""}, {...context, userAgent: "x\nheader"},
    {...context, userAgent: "x".repeat(513)}]) {
    assert.equal(hostMetaLeadPayload({enabled: true, now, consent, state,
      context: candidate}), null);
  }
});

test("only an explicit event receipt confirms acceptance", () => {
  assert.deepEqual(classifyHostMetaResponse(200,
    {events_received: 1, messages: [], fbtrace_id: "trace"}),
  {kind: "accepted"});
  assert.deepEqual(classifyHostMetaResponse(429, {error: {code: 4}}),
    {kind: "rejected", retryable: true});
  assert.deepEqual(classifyHostMetaResponse(400, {error: {code: 100}}),
    {kind: "rejected", retryable: false});
  for (const [status, body] of [[200, null],
    [200, {events_received: 0, messages: []}],
    [200, {events_received: 1, error: {code: 4}, messages: []}],
    [200, {events_received: 1, messages: ["warning"]}],
    [500, {error: {code: 2}}], [429, {message: "proxy error"}],
  ] as const) {
    assert.deepEqual(classifyHostMetaResponse(status, body),
      {kind: "unknown"});
  }
});
