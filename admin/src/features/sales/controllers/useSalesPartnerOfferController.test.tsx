import {act, cleanup, renderHook} from "@testing-library/react";
import {afterEach, beforeEach, expect, it, vi} from "vitest";
import {createQueryHarness} from "../../../shared/test/queryHarness";
import {useSalesPartnerOfferController} from "./useSalesPartnerOfferController";
const api = vi.hoisted(() => ({offerSalesPartner: vi.fn()}));
vi.mock("../api/salesPartnerAssignment", () => api);
afterEach(cleanup);
beforeEach(() => {api.offerSalesPartner.mockReset(); api.offerSalesPartner.mockResolvedValue(undefined);});
const offer = () => ({partnerUid: "partner", nextAction: "Verify current buyer", reason: "Reviewed public identity",
  reviewAt: new Date(Date.now() + 3600_000).toISOString(), expiresAt: new Date(Date.now() + 86400000).toISOString()});
function fixture() {
  const {wrapper} = createQueryHarness();
  return renderHook(({actor, host, revision}) => useSalesPartnerOfferController(actor, host, revision),
    {wrapper, initialProps: {actor: "admin", host: "host-one", revision: 0}});
}
it("offers only a new assignment and blocks double submission and repeat success", async () => {
  let resolve!: () => void;
  api.offerSalesPartner.mockImplementation(() => new Promise<void>((r) => {resolve = r;}));
  const {result} = fixture(); const value = offer(); let done!: Promise<boolean>;
  await act(async () => {done = result.current.offer(value); await result.current.offer(value);});
  expect(api.offerSalesPartner).toHaveBeenCalledTimes(1);
  expect(api.offerSalesPartner.mock.calls[0][0]).toMatchObject({organizerId: "host-one", expectedRevision: 0, originatorUid: null});
  await act(async () => {resolve(); await done;});
  expect(result.current.offeredTo).toBe("partner");
  await act(async () => {await result.current.offer(value);});
  expect(api.offerSalesPartner).toHaveBeenCalledTimes(1);
});
it("freezes an uncertain offer and retries the exact request", async () => {
  api.offerSalesPartner.mockRejectedValueOnce(new Error("network unavailable"));
  const {result} = fixture();
  await act(async () => {await result.current.offer(offer());});
  const original = api.offerSalesPartner.mock.calls[0][0];
  expect(result.current.ticket).toEqual(original);
  await act(async () => {await result.current.offer({...offer(), partnerUid: "another-partner"});});
  expect(api.offerSalesPartner).toHaveBeenCalledTimes(1);
  await act(async () => {await result.current.retry();});
  expect(api.offerSalesPartner.mock.calls[1][0]).toBe(original);
  expect(result.current.offeredTo).toBe("partner");
});
it("reports a definitive rejection without claiming assignment", async () => {
  api.offerSalesPartner.mockRejectedValueOnce(Object.assign(new Error("Reviewed identity required"), {code: "functions/failed-precondition"}));
  const {result} = fixture();
  await act(async () => {await result.current.offer(offer());});
  expect(result.current.ticket).toBeNull(); expect(result.current.offeredTo).toBeNull();
  expect(result.current.error).toBe("Reviewed identity required");
});
it("rejects invalid dates and oversized input without locking retries", async () => {
  const {result} = fixture();
  await act(async () => {await result.current.offer({...offer(), reviewAt: "invalid"});});
  await act(async () => {await result.current.offer({...offer(), nextAction: "a".repeat(501)});});
  expect(result.current.ticket).toBeNull();
  expect(api.offerSalesPartner).not.toHaveBeenCalled();
});
it("discards late completions and retries after actor or organizer changes", async () => {
  let resolve!: () => void;
  api.offerSalesPartner.mockImplementationOnce(() => new Promise<void>((r) => {resolve = r;}));
  const {result, rerender} = fixture(); let done!: Promise<boolean>;
  await act(async () => {done = result.current.offer(offer());});
  rerender({actor: "other-admin", host: "host-two", revision: 0});
  await act(async () => {resolve(); await done; await result.current.retry();});
  expect(result.current.offeredTo).toBeNull(); expect(result.current.ticket).toBeNull();
  expect(api.offerSalesPartner).toHaveBeenCalledTimes(1);
});
it("offers at the current reservation revision, and a new revision allows the next offer", async () => {
  const {result, rerender} = fixture();
  rerender({actor: "admin", host: "host-one", revision: 3});
  await act(async () => {await result.current.offer(offer());});
  expect(api.offerSalesPartner.mock.calls[0][0]).toMatchObject({expectedRevision: 3});
  await act(async () => {await result.current.offer(offer());});
  expect(api.offerSalesPartner).toHaveBeenCalledTimes(1);
  rerender({actor: "admin", host: "host-one", revision: 5});
  expect(result.current.offeredTo).toBeNull();
  await act(async () => {await result.current.offer(offer());});
  expect(api.offerSalesPartner.mock.calls[1][0]).toMatchObject({expectedRevision: 5});
});
it("keeps a stale-revision error on screen while the reservation is read again", async () => {
  api.offerSalesPartner.mockRejectedValueOnce(Object.assign(new Error("Record changed"), {code: "functions/aborted"}));
  const {result, rerender} = fixture();
  await act(async () => {await result.current.offer(offer());});
  rerender({actor: "admin", host: "host-one", revision: 2});
  expect(result.current.error).toMatch(/check who has it now/u);
});
