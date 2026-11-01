import {act, renderHook, waitFor} from "@testing-library/react";
import {describe, expect, it} from "vitest";
import {createQueryHarness} from "../../../shared/test/queryHarness";
import {useEventDirectoryController} from "./useEventDirectoryController";
import {
  eventBookedLabel,
  eventOriginLabel,
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
      {upcoming: 7, past: 2, cancelled: 1});
    expect(result.current.rows.map((row) => row.key)).toEqual([
      "imported:takeoff", "catch:trivia", "catch:supper", "catch:padel-mixer",
      "imported:rooftop-social", "imported:rooftop", "imported:neon",
    ]);
    expect(result.current.facets?.needsCheck).toBe(2);

    act(() => result.current.toggleSource("imported"));
    act(() => result.current.toggleNeedsCheck());
    await waitFor(() => expect(result.current.total).toBe(2));
    expect(result.current.facets?.catch).toBe(0);
  });

  it("reads one organizer's events for its page", async () => {
    const {wrapper} = createQueryHarness();
    const {result} = renderHook(() => useEventDirectoryController(
      {organizerId: "lantern"}), {wrapper});
    await waitFor(() => expect(result.current.loadState).toBe("ready"));
    expect(result.current.rows.map((row) => row.eventId))
      .toEqual(["trivia", "supper"]);
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
  });
});
