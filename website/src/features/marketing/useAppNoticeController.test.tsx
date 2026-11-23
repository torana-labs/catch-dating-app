import {act, renderHook} from "@testing-library/react";
import type {FormEvent} from "react";
import {describe, expect, it, vi} from "vitest";
import {useAppNoticeController} from "./useAppNoticeController";

const submitEvent = () => ({preventDefault: vi.fn()}) as unknown as FormEvent<HTMLFormElement>;

describe("useAppNoticeController", () => {
  it("asks for the app-launch notice, with new plans only when ticked and never marketing", async () => {
    const submit = vi.fn().mockResolvedValue({ok: true, alreadyJoined: false});
    const {result} = renderHook(() => useAppNoticeController("Mumbai", submit, {slug: "mumbai", source: "picked"}));
    act(() => result.current.setPhone("98765 43210"));
    await act(() => result.current.handleSubmit(submitEvent()));
    expect(submit.mock.calls[0][0]).toMatchObject({
      city: "Mumbai", cityId: "in-mh-mumbai", role: "member",
      whatsapp: {phone: "+919876543210", launchNotice: true, notice: "appLaunch", newPlans: false, marketing: false, consentVersion: "app-launch-whatsapp-v3"},
    });
    expect(result.current.joined).toBe(true);
    expect(result.current.status.message).toBe("Done. We’ll message you on WhatsApp the day the Catch app launches.");
  });

  it("sends the new-plans choice as made, and refuses a short number without sending", async () => {
    const submit = vi.fn().mockResolvedValue({ok: true, alreadyJoined: true});
    const {result} = renderHook(() => useAppNoticeController("Mumbai", submit));
    act(() => result.current.setPhone("98765"));
    await act(() => result.current.handleSubmit(submitEvent()));
    expect(submit).not.toHaveBeenCalled();
    expect(result.current.status).toMatchObject({tone: "is-error", message: "Enter your 10-digit mobile number."});
    act(() => {
      result.current.setPhone("9876543210");
      result.current.setNewPlans(true);
    });
    await act(() => result.current.handleSubmit(submitEvent()));
    expect(submit.mock.calls[0][0].whatsapp.newPlans).toBe(true);
    expect(result.current.status.message).toBe("You’re already on the list. We’ve kept your latest choice.");
  });
});
