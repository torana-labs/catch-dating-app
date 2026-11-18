/* eslint-disable max-len */
import assert from "node:assert/strict";
import test from "node:test";
import {handleListingRequest, typeRuleMessages} from "./intake";
import {REQUEST_TYPES, takedownReference, takedownRequestId} from "./model";
import {NOW, assertContract, harness, validRequests} from "./testHarness";

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const hours = (iso: string) => (Date.parse(iso) - Date.parse(NOW)) / 3_600_000;

test("every type's form body is a valid request and stores one server-only record with its deadlines", async () => {
  const expected: Record<string, {action: number | null; resolve: number}> = {
    claim: {action: null, resolve: 48}, correctFact: {action: null, resolve: 168},
    removeAndDoNotList: {action: 24, resolve: 168}, trademark: {action: null, resolve: 168},
    copyright: {action: 36, resolve: 168}, privacy: {action: null, resolve: 168},
    impersonation: {action: 24, resolve: 168}, legalOrder: {action: 3, resolve: 168},
  };
  for (const type of REQUEST_TYPES) {
    const h = harness();
    const body = clone(validRequests[type]);
    assertContract("ListingRequestHTTPRequest", body, `${type} request`);
    const result = await handleListingRequest(h.request(), body, h.deps);
    assert.equal(result.status, 200, `${type}: ${JSON.stringify(result.body)}`);
    assertContract("ListingRequestHTTPResponse", result.body, `${type} response`);
    if (!("ok" in result.body)) throw new Error("expected a receipt");
    const receipt = result.body.request;
    const email = (body.requester as {email: string}).email;
    assert.equal(receipt.requestId, takedownRequestId(email, body.clientRequestId as string));
    assert.equal(receipt.reference, takedownReference(receipt.requestId));
    assert.equal(receipt.isNew, true);
    assert.equal(hours(receipt.ackDueAt), 24, `${type} acknowledges within 24 h`);
    assert.equal(receipt.actionDueAt === null ? null : hours(receipt.actionDueAt), expected[type].action, `${type} action deadline`);
    assert.equal(hours(receipt.resolveDueAt), expected[type].resolve, `${type} resolve deadline`);
    const stored = h.db.get(`takedownRequests/${receipt.requestId}`) as Record<string, unknown>;
    assertContract("TakedownRequestDocument", clone(stored), `${type} document`);
    assert.equal(stored.status, "received");
    assert.equal(stored.requestType, type);
    assert.deepEqual(h.db.paths().filter((path) => !path.startsWith("takedownRequests/")), [], "no Sales or other records");
  }
});

test("a URL target must be a page on Catch's website, and organiser and event pages resolve to their ids", async () => {
  const h = harness();
  const copyright = await handleListingRequest(h.request(), clone(validRequests.copyright), h.deps);
  if (!("ok" in copyright.body)) throw new Error("expected a receipt");
  assert.deepEqual(h.db.get(`takedownRequests/${copyright.body.request.requestId}`)?.target,
    {kind: "event", id: "ev-lantern-supper-7", path: "/events/ev-lantern-supper-7/"});
  for (const url of ["https://elsewhere.example/organizers/lantern-lane-social/", "http://catch.example/organizers/x/"]) {
    const body = {...clone(validRequests.copyright), clientRequestId: "1".repeat(32), target: {kind: "url", url}};
    const refused = await handleListingRequest(h.request(), body, h.deps);
    assert.equal(refused.status, 400, url);
  }
});

test("per-type rules a schema cannot say are refused with words for the form", async () => {
  const cases: Array<[string, Record<string, unknown>, keyof typeof typeRuleMessages | "schema"]> = [
    ["a member of the public cannot ask for removal", {...clone(validRequests.removeAndDoNotList),
      requester: {name: "Ravi K", role: "memberOfPublic", email: "ravi@mail.example"}}, "role"],
    ["an Instagram proof needs the handle", {...clone(validRequests.claim), verification: {proofMethod: "instagramCode"}}, "handle"],
    ["a domain proof needs an email at that domain", {...clone(validRequests.removeAndDoNotList),
      requester: {name: "Asha Verma", role: "owner", email: "asha@mail.example"}}, "domainEmail"],
    ["a registered mark needs its number, class and country", {...clone(validRequests.trademark),
      verification: {basis: "registered", preferredRemedy: "relabel"}}, "trademarkRegistered"],
    ["an unregistered mark needs first use and evidence", {...clone(validRequests.trademark),
      verification: {basis: "unregistered", preferredRemedy: "relabel"}}, "trademarkUnregistered"],
    ["trademark needs the good-faith declaration", {...clone(validRequests.trademark),
      declarations: {accurate: true, authorised: true, contactConsent: true}}, "goodFaith"],
    ["copyright needs the not-licensed declaration", {...clone(validRequests.copyright),
      declarations: {accurate: true, authorised: true, contactConsent: true, goodFaith: true}}, "notLicensed"],
    ["the declarations are required", {...clone(validRequests.claim), declarations: {accurate: true, authorised: true}}, "schema"],
    ["no free-text demand: context is capped", {...clone(validRequests.claim), context: "x".repeat(281)}, "schema"],
    ["no extra fields", {...clone(validRequests.claim), demands: "Pay us"}, "schema"],
    ["a type takes only its own verification", {...clone(validRequests.privacy), verification: (validRequests.claim.verification)}, "schema"],
  ];
  for (const [label, body, problem] of cases) {
    const h = harness();
    const result = await handleListingRequest(h.request(), body, h.deps);
    assert.equal(result.status, 400, label);
    if (problem !== "schema") assert.deepEqual(result.body, {error: typeRuleMessages[problem]}, label);
    assert.deepEqual(h.db.paths("takedownRequests/"), [], `${label}: nothing stored`);
  }
});

test("App Check is required before anything is read", async () => {
  const h = harness();
  for (const headers of [{}, {"x-firebase-appcheck": "forged"}] as Array<Record<string, string>>) {
    const result = await handleListingRequest(h.request(headers), clone(validRequests.claim), h.deps);
    assert.equal(result.status, 401);
  }
  assert.deepEqual(h.limits, [], "refused before the rate limit is spent");
});

test("hashed network and email limits refuse with 429 and never store addresses", async () => {
  const network = harness({limited: "listingRequestNetwork"});
  assert.equal((await handleListingRequest(network.request(), clone(validRequests.claim), network.deps)).status, 429);
  const email = harness({limited: "listingRequestEmail"});
  assert.equal((await handleListingRequest(email.request(), clone(validRequests.claim), email.deps)).status, 429);
  assert.deepEqual(email.db.paths("takedownRequests/"), []);
  for (const {key} of email.limits) {
    assert.match(key, /^listing_request_(ip|email)_[a-f0-9]{40}$/u);
    assert.doesNotMatch(key, /asha|198\.51/u);
  }
});

test("a retry is the same request: same receipt, no second record, no email quota; changed answers conflict", async () => {
  const h = harness();
  const first = await handleListingRequest(h.request(), clone(validRequests.removeAndDoNotList), h.deps);
  h.setNow("2026-11-18T07:00:00.000Z");
  const retry = await handleListingRequest(h.request(), clone(validRequests.removeAndDoNotList), h.deps);
  assert.equal(retry.status, 200);
  if (!("ok" in first.body) || !("ok" in retry.body)) throw new Error("expected receipts");
  assert.equal(retry.body.request.isNew, false);
  assert.equal(retry.body.request.requestId, first.body.request.requestId);
  assert.equal(retry.body.request.ackDueAt, first.body.request.ackDueAt, "deadlines run from the first receipt");
  assert.equal(h.db.paths("takedownRequests/").length, 1);
  assert.equal(h.limits.filter((limit) => limit.action === "listingRequestEmail").length, 1);
  const changed = {...clone(validRequests.removeAndDoNotList), context: "Please hurry."};
  assert.equal((await handleListingRequest(h.request(), changed, h.deps)).status, 409);
  // Blank optional answers and spacing do not change the request.
  const spaced = clone(validRequests.removeAndDoNotList) as Record<string, Record<string, unknown>>;
  spaced.requester = {...spaced.requester, name: "  Asha   Verma ", phone: ""};
  assert.equal((await handleListingRequest(h.request(), spaced, h.deps)).status, 200);
});

test("the honeypot stores nothing", async () => {
  const h = harness();
  const result = await handleListingRequest(h.request(), {...clone(validRequests.claim), website: "spam.example"}, h.deps);
  assert.equal(result.status, 400);
  assert.deepEqual(h.db.paths(), []);
});
