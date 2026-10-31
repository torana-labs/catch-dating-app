import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {
  listSalesAccounts, listSalesInboundIntents, listSalesOpportunities,
  listSalesTasks, updateSalesAccount,
} from "./salesRepository";

vi.mock("../../../shared/api/dataMode", () => ({dataMode: () => "live"}));
vi.mock("../../../shared/api/adminApi", () => ({listOrganizerDetails: vi.fn()}));
vi.mock("../../../shared/api/firebaseFunctions", async () => {
  const {initializeApp} = await import("firebase/app");
  const {getFunctions} = await import("firebase/functions");
  const app = initializeApp({projectId: "demo-sales-wire"}, "sales-wire-test");
  return {functions: getFunctions(app, "asia-south1")};
});

// Exercise the real Firebase encoder, intercepting HTTP before any network I/O.
const fetchMock = vi.fn();
let responseData: unknown;
function sentData(): unknown {
  const options = fetchMock.mock.calls[0][1] as RequestInit;
  return JSON.parse(String(options.body)).data;
}

beforeEach(() => {
  responseData = {rows: [], nextCursor: null};
  vi.stubGlobal("fetch", fetchMock.mockImplementation(async () =>
    new Response(JSON.stringify({data: responseData}), {
      status: 200, headers: {"Content-Type": "application/json"},
    })));
});
afterEach(() => vi.unstubAllGlobals());

describe("Sales callable wire payloads", () => {
  it.each([
    ["inbound enquiries", () => listSalesInboundIntents({limit: 25,
      cursor: undefined, status: "needs_identity_review"}),
    {limit: 25, status: "needs_identity_review"}],
    ["hosts", () => listSalesAccounts({limit: 25, cursor: undefined,
      query: undefined, ownerUid: undefined, researchStatus: undefined}),
    {limit: 25}],
    ["tasks", () => listSalesTasks({limit: 50, cursor: undefined,
      status: "open"}), {limit: 50, status: "open"}],
    ["opportunities", () => listSalesOpportunities({limit: 25,
      cursor: undefined, stage: undefined}), {limit: 25}],
  ] as const)("omits absent fields for the first page of %s", async (
    _name, request, expected,
  ) => {
    await request();
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(sentData()).toEqual(expected);
  });

  it("preserves an actual cursor and filters for later pages", async () => {
    await listSalesAccounts({limit: 25, cursor: "opaque-cursor",
      query: "Mumbai", ownerUid: "owner-1", researchStatus: "new"});
    expect(sentData()).toEqual({limit: 25, cursor: "opaque-cursor",
      query: "Mumbai", ownerUid: "owner-1", researchStatus: "new"});
  });

  it("preserves explicit null values used to clear account fields", async () => {
    const payload = {organizerId: "host-1", requestId: "request-123",
      expectedRevision: 1, patch: {assignedOwnerUid: null, nextAction: null}};
    responseData = {account: {organizerId: "host-1", revision: 2,
      researchStatus: "new", assignedOwnerUid: null, nextAction: null},
    receipt: {requestId: "request-123", revision: 2}};
    await updateSalesAccount(payload);
    expect(sentData()).toEqual(payload);
  });
});
