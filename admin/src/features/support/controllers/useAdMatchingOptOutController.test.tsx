import {act, renderHook} from "@testing-library/react";
import {beforeEach, describe, expect, it, vi} from "vitest";
import {createQueryHarness} from "../../../shared/test/queryHarness";
import {resetSampleAdMatchingOptOuts} from
  "../api/adMatchingOptOutRepository";
import {
  adMatchingKindsLabel,
  adMatchingStatusLabel,
  useAdMatchingOptOutController,
} from "./useAdMatchingOptOutController";

const contact = {phone: "+919800001234", email: "guest@example.com",
  note: "WhatsApp request"};

describe("useAdMatchingOptOutController", () => {
  beforeEach(() => resetSampleAdMatchingOptOuts());

  it("records, checks and removes an opt-out, naming only the kinds",
    async () => {
      const {wrapper} = createQueryHarness();
      const onNotice = vi.fn();
      const onError = vi.fn();
      const {result} = renderHook(() => useAdMatchingOptOutController({
        onError, onNotice}), {wrapper});
      await act(async () => {
        expect(await result.current.record(contact)).toBe(true);
      });
      expect(onNotice).toHaveBeenLastCalledWith(
        "Ad matching stopped for the phone number and email.");
      expect(adMatchingStatusLabel(result.current.result)).toBe(
        "Ad matching is off for the phone number and email.");
      await act(async () => {
        await result.current.remove({...contact, email: ""});
      });
      expect(onNotice).toHaveBeenLastCalledWith(
        "Ad matching resumed for the phone number.");
      await act(async () => {
        await result.current.check(contact);
      });
      expect(result.current.result?.optedOut).toEqual(["email"]);
      act(() => result.current.clear());
      expect(result.current.result).toBeNull();
    });

  it("asks for a phone or email before calling the server", async () => {
    const {wrapper} = createQueryHarness();
    const onError = vi.fn();
    const {result} = renderHook(() => useAdMatchingOptOutController({
      onError, onNotice: vi.fn()}), {wrapper});
    await act(async () => {
      expect(await result.current.record({phone: " ", email: "",
        note: ""})).toBe(false);
    });
    expect(onError).toHaveBeenCalledWith(
      "Enter the phone number or email the request names.");
    expect(adMatchingKindsLabel([])).toBe("");
  });
});
