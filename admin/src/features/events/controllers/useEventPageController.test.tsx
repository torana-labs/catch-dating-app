import {renderHook, waitFor} from "@testing-library/react";
import {describe, expect, it, vi} from "vitest";
import * as adminApi from "../../../shared/api/adminApi";
import {createQueryHarness} from "../../../shared/test/queryHarness";
import {useEventPageController} from "./useEventPageController";

describe("useEventPageController", () => {
  it("reads a Catch event's full record", async () => {
    const {wrapper} = createQueryHarness();
    const {result} = renderHook(() => useEventPageController("catch", "mumbai-padel-mixer-1"), {wrapper});
    await waitFor(() => expect(result.current.loadState).toBe("ready"));
    expect(result.current.record?.source).toBe("catch");
    expect(result.current.record?.event.title).toBe("Padel mixer");
  });

  it("reads an imported event by its id, not by searching the external list", async () => {
    const reads = vi.spyOn(adminApi, "listExternalEventDetails");
    const {wrapper} = createQueryHarness();
    const eventId = "ext-moonmoth-202503151800-nightfall-run-rave-e99b5e2138";
    const {result} = renderHook(() => useEventPageController("imported", eventId), {wrapper});
    await waitFor(() => expect(result.current.loadState).toBe("ready"));
    expect(result.current.record).toMatchObject({source: "imported", event: {eventId}});
    expect(reads).toHaveBeenCalledWith({eventId});
    reads.mockRestore();
  });

  it("reports an imported event that is not there", async () => {
    const {wrapper} = createQueryHarness();
    const {result} = renderHook(() => useEventPageController("imported", "ext-missing"), {wrapper});
    await waitFor(() => expect(result.current.loadState).toBe("error"));
    expect(result.current.loadError).toBe("Imported event not found.");
  });
});
