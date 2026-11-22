import {beforeEach, expect, it, vi} from "vitest";
const mocks = vi.hoisted(() => ({call: vi.fn(), mode: vi.fn(() => "live")}));
vi.mock("firebase/functions", () => ({httpsCallable: vi.fn(() => mocks.call)}));
vi.mock("../../../shared/api/firebaseFunctions", () => ({functions: {}}));
vi.mock("../../../shared/api/dataMode", () => ({dataMode: mocks.mode}));
import {offerSalesPartner, type PartnerOfferInput} from "./salesPartnerAssignment";
const input: PartnerOfferInput = {requestId: "request", organizerId: "host", partnerUid: "partner", expectedRevision: 0,
  originatorUid: null, nextAction: "Verify buyer", reason: "Identity reviewed", reviewAt: "2026-10-20T12:00:00Z", expiresAt: "2026-10-25T12:00:00Z"};
beforeEach(() => {mocks.mode.mockReturnValue("live"); mocks.call.mockReset();});
it("validates the callable input and confirms matching organizer, recipient and revision", async () => {
  mocks.call.mockResolvedValue({data: {organizerId: "host", partnerUid: "partner", revision: 1, status: "offered"}});
  await expect(offerSalesPartner(input)).resolves.toBeUndefined();
  expect(mocks.call).toHaveBeenCalledWith(input);
});
it("re-offers over a closed reservation at its current revision", async () => {
  mocks.call.mockResolvedValue({data: {organizerId: "host", partnerUid: "partner", revision: 4, status: "offered"}});
  await expect(offerSalesPartner({...input, expectedRevision: 3})).resolves.toBeUndefined();
  mocks.call.mockResolvedValue({data: {organizerId: "host", partnerUid: "partner", revision: 1, status: "offered"}});
  await expect(offerSalesPartner({...input, expectedRevision: 3})).rejects.toThrow("not confirmed");
});
it("rejects a mismatched receipt instead of claiming success", async () => {
  mocks.call.mockResolvedValue({data: {organizerId: "host", partnerUid: "someone-else", revision: 1, status: "offered"}});
  await expect(offerSalesPartner(input)).rejects.toThrow("not confirmed");
});
it("does not grant real access from sample mode or malformed input", async () => {
  mocks.mode.mockReturnValue("sample");
  await expect(offerSalesPartner(input)).rejects.toThrow("live administrator");
  mocks.mode.mockReturnValue("live");
  await expect(offerSalesPartner({...input, reviewAt: "invalid"})).rejects.toThrow();
  expect(mocks.call).not.toHaveBeenCalled();
});
