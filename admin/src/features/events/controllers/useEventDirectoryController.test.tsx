import {act, renderHook, waitFor} from "@testing-library/react";
import {describe, expect, it} from "vitest";
import {createQueryHarness} from "../../../shared/test/queryHarness";
import {useEventDirectoryController} from "./useEventDirectoryController";
import {
  eventBookedLabel,
  eventOriginLabel,
  eventPriceLabel,
  eventSourceLabel,
  eventStatusLabel,
} from "./eventRecordLabels";

describe("useEventDirectoryController", () => {
  it("lists Catch and imported events in one table", async () => {
    const {wrapper} = createQueryHarness();
    const {result} = renderHook(() => useEventDirectoryController(),
      {wrapper});

    await waitFor(() => expect(result.current.loadState).toBe("ready"));
    expect(result.current.views).toEqual(
      {upcoming: 5, past: 0, cancelled: 0});
    expect(result.current.rows.map((row) => row.key)).toEqual([
      "catch:afterfly-social-run-1", "catch:bandra-sunset-run-1",
      "catch:mumbai-padel-mixer-1",
      "imported:ext-afterfly-202503151800-takeoff-run-rave-e99b5e2138",
      "imported:ext-mumbai-editorial-mixer-1",
    ]);
    expect(result.current.facets?.needsCheck).toBe(1);

    act(() => result.current.toggleSource("imported"));
    act(() => result.current.toggleNeedsCheck());
    await waitFor(() => expect(result.current.total).toBe(1));
    expect(result.current.facets?.catch).toBe(0);
  });

  it("reads one organizer's events for its page", async () => {
    const {wrapper} = createQueryHarness();
    const {result} = renderHook(() => useEventDirectoryController(
      {organizerId: "afterfly"}), {wrapper});
    await waitFor(() => expect(result.current.loadState).toBe("ready"));
    expect(result.current.rows.map((row) => row.eventId)).toEqual([
      "afterfly-social-run-1",
      "ext-afterfly-202503151800-takeoff-run-rave-e99b5e2138",
    ]);
  });
});

describe("event record labels", () => {
  it("names the source, state and bookings", () => {
    expect(eventSourceLabel({source: "imported", platform: "luma"}))
      .toEqual({label: "Luma", tone: "neutral"});
    expect(eventSourceLabel({source: "catch", platform: null}).label)
      .toBe("Catch");
    expect(eventOriginLabel({source: "imported", platform: "district"}))
      .toBe("From District");
    expect(eventStatusLabel("needsCheck"))
      .toEqual({text: "Needs a check", tone: "warning"});
    expect(eventBookedLabel({bookedCount: 26, capacityLimit: 32}))
      .toBe("26 of 32");
    expect(eventBookedLabel({bookedCount: null, capacityLimit: null}))
      .toBe("—");
    expect(eventPriceLabel(49900)).toBe("₹499");
    expect(eventPriceLabel(0)).toBe("Free");
  });
});
