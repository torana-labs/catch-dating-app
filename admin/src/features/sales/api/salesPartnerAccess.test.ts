import {beforeEach, expect, it, vi} from "vitest";
const mocks = vi.hoisted(() => ({call: vi.fn(), names: [] as string[], mode: vi.fn(() => "live")}));
vi.mock("firebase/functions", () => ({httpsCallable: vi.fn((_functions: unknown, name: string) => {
  mocks.names.push(name); return mocks.call;
})}));
vi.mock("../../../shared/api/firebaseFunctions", () => ({functions: {}}));
vi.mock("../../../shared/api/dataMode", () => ({dataMode: mocks.mode}));
import {salesPartnerAccessApi, type PartnerAccess, type PartnerRevokeInput} from "./salesPartnerAccess";

const access: PartnerAccess = {
  organizerId: "host",
  assignment: {partnerUid: "partner", state: "accepted", revision: 2, reviewAt: "2026-11-25T12:00:00.000Z",
    expiresAt: "2026-12-10T12:00:00.000Z", updatedAt: "2026-11-20T12:00:00.000Z"},
  membership: {partnerUid: "partner", displayName: "Example partner", state: "active", revision: 1,
    expiresAt: "2027-02-01T12:00:00.000Z"},
  evaluatedAt: "2026-11-22T12:00:00.000Z",
};
const revoke: PartnerRevokeInput = {requestId: "request-revoke-1", organizerId: "host", partnerUid: "partner",
  expectedRevision: 2, reason: "The host asked to work with Catch directly"};
beforeEach(() => {mocks.mode.mockReturnValue("live"); mocks.call.mockReset(); mocks.names.length = 0;});

it("reads one host's partner access through the strict response contract", async () => {
  mocks.call.mockResolvedValue({data: access});
  await expect(salesPartnerAccessApi.get("host")).resolves.toEqual(access);
  expect(mocks.names).toEqual(["adminGetSalesPartnerAccess"]);
  expect(mocks.call).toHaveBeenCalledWith({organizerId: "host"});
});

it("rejects another host's record and private fields it was never meant to carry", async () => {
  mocks.call.mockResolvedValue({data: {...access, organizerId: "other-host"}});
  await expect(salesPartnerAccessApi.get("host")).rejects.toThrow("different host");
  mocks.call.mockResolvedValue({data: {...access, assignment: {...access.assignment, nextAction: "Private note"}}});
  await expect(salesPartnerAccessApi.get("host")).rejects.toThrow();
});

it("confirms a revoke only when the receipt names the same record and the next revision", async () => {
  mocks.call.mockResolvedValue({data: {organizerId: "host", partnerUid: "partner", revision: 3, status: "revoked"}});
  await expect(salesPartnerAccessApi.revoke(revoke)).resolves.toMatchObject({revision: 3});
  expect(mocks.names).toEqual(["adminRevokeSalesPartnerAccess"]);
  expect(mocks.call).toHaveBeenCalledWith(revoke);
  mocks.call.mockResolvedValue({data: {organizerId: null, partnerUid: "partner", revision: 3, status: "revoked"}});
  await expect(salesPartnerAccessApi.revoke(revoke)).rejects.toThrow("not confirmed");
});

it("never revokes from sample data and refuses a malformed request before calling", async () => {
  mocks.mode.mockReturnValue("sample");
  await expect(salesPartnerAccessApi.revoke(revoke)).rejects.toThrow("live administrator");
  await expect(salesPartnerAccessApi.get("host")).resolves.toMatchObject({assignment: null, membership: null});
  mocks.mode.mockReturnValue("live");
  await expect(salesPartnerAccessApi.revoke({...revoke, reason: ""})).rejects.toThrow();
  expect(mocks.call).not.toHaveBeenCalled();
});
