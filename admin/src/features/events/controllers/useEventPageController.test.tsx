import {renderHook, waitFor} from "@testing-library/react";
import {describe, expect, it} from "vitest";
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

  it("finds an imported event by its id in the external list", async () => {
    const {wrapper} = createQueryHarness();
    const eventId = "ext-afterfly-202503151800-takeoff-run-rave-e99b5e2138";
    const {result} = renderHook(() => useEventPageController("imported", eventId), {wrapper});
    await waitFor(() => expect(result.current.loadState).toBe("ready"));
    expect(result.current.record).toMatchObject({source: "imported", event: {eventId}});
  });

  it("reports an imported event that is not there", async () => {
    const {wrapper} = createQueryHarness();
    const {result} = renderHook(() => useEventPageController("imported", "ext-missing"), {wrapper});
    await waitFor(() => expect(result.current.loadState).toBe("error"));
    expect(result.current.loadError).toBe("Imported event not found.");
  });
});
