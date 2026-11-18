import {describe, expect, it, vi} from "vitest";
import {createListingRequestSubmission, parseListingRequestReceipt, type ListingRequestDraftBody} from "./listingRequest";

const body = {
  requestType: "claim",
  target: {kind: "organizer", organizerId: "lantern-lane-social"},
  requester: {name: "Asha Verma", role: "owner", email: "asha@lanternlane.example"},
  verification: {proofMethod: "instagramCode", officialHandle: "lanternlanesocial"},
  declarations: {accurate: true, authorised: true, contactConsent: true},
  consent: {purpose: "listingRequest", version: "listing-request-v1"},
  sourcePage: "/listings/request/",
  website: "",
} as unknown as ListingRequestDraftBody;

const receipt = {requestId: `lr-${"a".repeat(40)}`, reference: "LR-K7Q2M9TX", requestType: "claim", isNew: true,
  ackDueAt: "2026-11-19T06:00:00.000Z", actionDueAt: null, resolveDueAt: "2026-11-20T06:00:00.000Z"};

function respond(status: number, json: unknown) {
  return Promise.resolve(new Response(JSON.stringify(json), {status, headers: {"Content-Type": "application/json"}}));
}

describe("listing request client", () => {
  it("posts with the App Check token and returns the receipt", async () => {
    const post = vi.fn(() => respond(200, {ok: true, request: receipt}));
    const client = createListingRequestSubmission({appCheckToken: async () => "token-1", post: post as never, newRequestId: () => "1".repeat(32)});
    await expect(client.submit(body)).resolves.toEqual({status: "sent", receipt});
    const [url, init] = post.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/listing-request");
    expect((init.headers as Record<string, string>)["X-Firebase-AppCheck"]).toBe("token-1");
    expect(JSON.parse(init.body as string).clientRequestId).toBe("1".repeat(32));
  });

  it("keeps the request id across retries of the same answers and starts afresh after a change or a 409", async () => {
    const ids = ["a".repeat(32), "b".repeat(32), "c".repeat(32)];
    const post = vi.fn()
      .mockImplementationOnce(() => Promise.reject(new Error("offline")))
      .mockImplementationOnce(() => respond(200, {ok: true, request: receipt}))
      .mockImplementationOnce(() => respond(409, {error: "changed"}))
      .mockImplementationOnce(() => respond(200, {ok: true, request: receipt}));
    const client = createListingRequestSubmission({appCheckToken: async () => null, post: post as never, newRequestId: () => ids.shift()!});
    expect((await client.submit(body)).status).toBe("failed");
    expect((await client.submit(body)).status).toBe("sent");
    const sent = post.mock.calls.map((call) => JSON.parse((call[1] as RequestInit).body as string).clientRequestId);
    expect(sent).toEqual(["a".repeat(32), "a".repeat(32)]);
    expect((await client.submit({...body, context: "One line."} as ListingRequestDraftBody)).status).toBe("changed");
    await client.submit({...body, context: "One line."} as ListingRequestDraftBody);
    expect(JSON.parse((post.mock.calls[3][1] as RequestInit).body as string).clientRequestId).toBe("c".repeat(32));
  });

  it("passes the intake's words for a 400 and names the other failures", async () => {
    const post = vi.fn()
      .mockImplementationOnce(() => respond(400, {error: "Add the official Instagram handle we should send the code to."}))
      .mockImplementationOnce(() => respond(429, {error: "busy"}))
      .mockImplementationOnce(() => respond(401, {error: "refresh"}))
      .mockImplementationOnce(() => respond(200, {ok: true, request: {...receipt, reference: "bad"}}));
    const client = createListingRequestSubmission({appCheckToken: async () => null, post: post as never});
    expect(await client.submit(body)).toEqual({status: "invalid", message: "Add the official Instagram handle we should send the code to."});
    expect(await client.submit(body)).toEqual({status: "busy", message: null});
    expect(await client.submit(body)).toEqual({status: "refresh", message: null});
    expect(await client.submit(body)).toEqual({status: "failed", message: null});
  });

  it("accepts only a well-formed receipt", () => {
    expect(parseListingRequestReceipt({ok: true, request: receipt})).toEqual(receipt);
    expect(parseListingRequestReceipt({error: "x"})).toBeNull();
    expect(parseListingRequestReceipt({ok: true, request: {...receipt, ackDueAt: "tomorrow"}})).toBeNull();
  });
});
