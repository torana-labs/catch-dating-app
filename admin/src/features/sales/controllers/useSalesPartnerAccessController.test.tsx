import {act, cleanup, renderHook, waitFor} from "@testing-library/react";
import {afterEach, beforeEach, expect, it, vi} from "vitest";
import {createQueryHarness} from "../../../shared/test/queryHarness";
import type {PartnerAccess, SalesPartnerAccessApi} from "../api/salesPartnerAccess";
import {useSalesPartnerAccessController} from "./useSalesPartnerAccessController";

const accepted: PartnerAccess = {
  organizerId: "host-one",
  assignment: {partnerUid: "partner", state: "accepted", revision: 2, reviewAt: "2026-11-25T12:00:00.000Z",
    expiresAt: "2026-12-10T12:00:00.000Z", updatedAt: "2026-11-20T12:00:00.000Z"},
  membership: {partnerUid: "partner", displayName: "Example partner", state: "active", revision: 1,
    expiresAt: "2027-02-01T12:00:00.000Z"},
  evaluatedAt: "2026-11-22T12:00:00.000Z",
};
const api = {get: vi.fn(), revoke: vi.fn()};
afterEach(cleanup);
beforeEach(() => {
  api.get.mockReset(); api.get.mockResolvedValue(accepted);
  api.revoke.mockReset(); api.revoke.mockResolvedValue({organizerId: "host-one", partnerUid: "partner", revision: 3, status: "revoked"});
});
async function fixture() {
  const {wrapper} = createQueryHarness();
  const hook = renderHook(({actor, host}) => useSalesPartnerAccessController(actor, host, api as SalesPartnerAccessApi),
    {wrapper, initialProps: {actor: "admin", host: "host-one"}});
  await waitFor(() => expect(hook.result.current.access).not.toBeNull());
  return hook;
}

it("revokes this host's reservation at the revision it read, once, and reads again", async () => {
  let resolve!: (value: unknown) => void;
  api.revoke.mockImplementationOnce(() => new Promise((r) => {resolve = r;}));
  const {result} = await fixture(); let done!: Promise<boolean>;
  await act(async () => {done = result.current.revoke("host", "  The host asked  "); await result.current.revoke("host", "Again");});
  expect(api.revoke).toHaveBeenCalledTimes(1);
  expect(api.revoke.mock.calls[0][0]).toMatchObject({organizerId: "host-one", partnerUid: "partner", expectedRevision: 2,
    reason: "The host asked"});
  await act(async () => {resolve({organizerId: "host-one", partnerUid: "partner", revision: 3, status: "revoked"}); await done;});
  expect(result.current.revoked).toBe("host");
  await waitFor(() => expect(api.get).toHaveBeenCalledTimes(2));
});

it("revokes the whole partner account at the membership's revision", async () => {
  const {result} = await fixture();
  await act(async () => {await result.current.revoke("partner", "Left the programme");});
  expect(api.revoke.mock.calls[0][0]).toMatchObject({organizerId: null, partnerUid: "partner", expectedRevision: 1});
  expect(result.current.revoked).toBe("partner");
});

it("freezes an unconfirmed revoke and retries the exact request", async () => {
  api.revoke.mockRejectedValueOnce(new Error("network unavailable"));
  const {result} = await fixture();
  await act(async () => {await result.current.revoke("host", "The host asked");});
  const original = api.revoke.mock.calls[0][0];
  expect(result.current.ticket).toBe(original);
  expect(result.current.error).toMatch(/Retry the same request/u);
  await act(async () => {await result.current.revoke("partner", "Something else");});
  expect(api.revoke).toHaveBeenCalledTimes(1);
  await act(async () => {await result.current.retry();});
  expect(api.revoke.mock.calls[1][0]).toBe(original);
  expect(result.current.ticket).toBeNull();
});

it("explains a stale revision in words that say what to do, and reads the current state", async () => {
  api.revoke.mockRejectedValueOnce(Object.assign(new Error("Record changed"), {code: "functions/aborted"}));
  const {result} = await fixture();
  await act(async () => {await result.current.revoke("host", "The host asked");});
  expect(result.current.ticket).toBeNull();
  expect(result.current.error).toMatch(/Check what it shows now/u);
  await waitFor(() => expect(api.get).toHaveBeenCalledTimes(2));
});

it("refuses an empty or oversized reason without calling", async () => {
  const {result} = await fixture();
  await act(async () => {await result.current.revoke("host", "   ");});
  await act(async () => {await result.current.revoke("host", "a".repeat(1001));});
  expect(result.current.error).toMatch(/Say why/u);
  expect(api.revoke).not.toHaveBeenCalled();
});

it("discards a late completion after the host changes", async () => {
  let resolve!: (value: unknown) => void;
  api.revoke.mockImplementationOnce(() => new Promise((r) => {resolve = r;}));
  const {result, rerender} = await fixture(); let done!: Promise<boolean>;
  await act(async () => {done = result.current.revoke("host", "The host asked");});
  api.get.mockResolvedValue({...accepted, organizerId: "host-two"});
  rerender({actor: "admin", host: "host-two"});
  await act(async () => {resolve({organizerId: "host-one", partnerUid: "partner", revision: 3, status: "revoked"}); await done;});
  expect(result.current.revoked).toBeNull(); expect(result.current.ticket).toBeNull();
});
