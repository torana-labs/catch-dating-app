import {act, renderHook} from "@testing-library/react";
import {afterEach, describe, expect, it, vi} from "vitest";

// The market's public counter, driven by each test through the watcher's callbacks.
const watch = vi.hoisted(() => ({
  markets: [] as string[],
  onValue: undefined as ((value: unknown) => void) | undefined,
  onError: undefined as ((error: Error) => void) | undefined,
  stop: vi.fn(),
}));
vi.mock("../../firebase", () => ({
  watchPublicFoundingHostOffer: (marketId: string, onValue: (value: unknown) => void, onError: (error: Error) => void) => {
    watch.markets.push(marketId);
    watch.onValue = onValue;
    watch.onError = onError;
    return Promise.resolve(watch.stop);
  },
}));

import {foundingHostOfferIsOpen, useFoundingHostOffer} from "./useFoundingHostOffer";

const now = Date.UTC(2026, 10, 17);

afterEach(() => {
  watch.markets = [];
  watch.onValue = undefined;
  watch.onError = undefined;
  watch.stop.mockReset();
});

describe("foundingHostOfferIsOpen", () => {
  it("is open only with places left and no passed deadline", () => {
    expect(foundingHostOfferIsOpen({status: "open", placesLeft: 3, endsAtMillis: null}, now)).toBe(true);
    expect(foundingHostOfferIsOpen({status: "open", placesLeft: 3}, now)).toBe(true);
    expect(foundingHostOfferIsOpen({status: "open", placesLeft: 3, endsAtMillis: now + 1}, now)).toBe(true);
    // A counter written before its deadline still reads open, so the deadline is checked here.
    expect(foundingHostOfferIsOpen({status: "open", placesLeft: 3, endsAtMillis: now}, now)).toBe(false);
    expect(foundingHostOfferIsOpen({status: "open", placesLeft: 0, endsAtMillis: null}, now)).toBe(false);
    expect(foundingHostOfferIsOpen({status: "closed", placesLeft: 3, endsAtMillis: null}, now)).toBe(false);
    expect(foundingHostOfferIsOpen({status: "open", placesLeft: "3"}, now)).toBe(false);
    expect(foundingHostOfferIsOpen(null, now)).toBe(false);
  });
});

describe("useFoundingHostOffer", () => {
  it("reads no counter without a market", () => {
    const {result} = renderHook(() => useFoundingHostOffer(undefined));
    expect(result.current).toBe(false);
    expect(watch.markets).toEqual([]);
  });

  it("stays closed until the market's counter reads open, and closes again on an error", async () => {
    const {result, unmount} = renderHook(() => useFoundingHostOffer("in-mh-pune"));
    expect(result.current).toBe(false);
    expect(watch.markets).toEqual(["in-mh-pune"]);
    // Let the watcher's subscription resolve, so unmounting has something to stop.
    await act(async () => {});
    act(() => watch.onValue?.({status: "open", placesLeft: 12, endsAtMillis: null}));
    expect(result.current).toBe(true);
    act(() => watch.onError?.(new Error("permission-denied")));
    expect(result.current).toBe(false);
    expect(watch.stop).not.toHaveBeenCalled();
    unmount();
    expect(watch.stop).toHaveBeenCalledTimes(1);
  });
});
