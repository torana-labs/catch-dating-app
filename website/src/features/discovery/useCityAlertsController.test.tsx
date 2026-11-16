import {act, renderHook} from "@testing-library/react";
import type {FormEvent} from "react";
import {describe, expect, it, vi} from "vitest";
import {useCityAlertsController} from "./useCityAlertsController";

vi.mock("../../analytics", async (original) => ({...await original<typeof import("../../analytics")>(), trackMarketingEvent: vi.fn()}));

const place = {citySlug: "mumbai", cityLabel: "Mumbai", sourcePage: "/mumbai/", entry: "ex-wa"};
const submitEvent = () => ({preventDefault: vi.fn()}) as unknown as FormEvent<HTMLFormElement>;
const receipt = {ok: true as const, alreadyJoined: false, lead: {leadId: "f".repeat(64), requestKind: "city_alerts" as const, isNew: true}};

describe("useCityAlertsController", () => {
  it("asks for a valid number before sending anything", async () => {
    const submit = vi.fn(async () => receipt);
    const {result} = renderHook(() => useCityAlertsController(place, ["runs"], submit));
    act(() => result.current.setPhone("12"));
    await act(() => result.current.handleSubmit(submitEvent()));
    expect(result.current.error).toBe("Enter your 10-digit mobile number.");
    expect(submit).not.toHaveBeenCalled();
  });

  it("sends the city_alerts lead with the market's dialling code and says a person replies", async () => {
    const submit = vi.fn(async () => receipt);
    const {result} = renderHook(() => useCityAlertsController(place, ["runs"], submit));
    act(() => result.current.setPhone("98000 00000"));
    await act(() => result.current.handleSubmit(submitEvent()));
    expect(submit).toHaveBeenCalledWith(expect.objectContaining({
      requestKind: "city_alerts", city: "Mumbai",
      lead: expect.objectContaining({phone: "+919800000000", entry: "ex-wa", sourcePage: "/mumbai/", cityAlerts: {interests: ["runs"]}}),
    }));
    expect(result.current.sent).toBe(true);
  });

  it("retries a failed send as the same lead, and a new number as a new one", async () => {
    const submit = vi.fn().mockRejectedValueOnce(new Error("Too many requests. Please try again later.")).mockResolvedValue(receipt);
    const {result} = renderHook(() => useCityAlertsController(place, [], submit));
    act(() => result.current.setPhone("9800000000"));
    await act(() => result.current.handleSubmit(submitEvent()));
    expect(result.current.error).toBe("Too many requests. Please try again later.");
    expect(result.current.sent).toBe(false);
    await act(() => result.current.handleSubmit(submitEvent()));
    const [first, second] = submit.mock.calls.map(([body]) => body.lead.requestId);
    expect(second).toBe(first);
    act(() => result.current.setPhone("9800000001"));
    submit.mockRejectedValueOnce(new Error("x"));
    await act(() => result.current.handleSubmit(submitEvent()));
    expect(submit.mock.calls[2][0].lead.requestId).not.toBe(first);
  });
});
