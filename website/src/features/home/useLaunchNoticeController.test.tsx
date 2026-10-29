import {act, renderHook} from "@testing-library/react";
import type {FormEvent} from "react";
import {describe, expect, it, vi} from "vitest";
import {useLaunchNoticeController} from "./useLaunchNoticeController";

const submitEvent = () => ({preventDefault: vi.fn()}) as unknown as FormEvent<HTMLFormElement>;

describe("useLaunchNoticeController", () => {
  it("sends the number with the launch notice and the marketing choice as made", async () => {
    const submit = vi.fn().mockResolvedValue({ok: true, alreadyJoined: false});
    const {result} = renderHook(() => useLaunchNoticeController("Pune", submit));
    act(() => result.current.setPhone("98765 43210"));
    await act(() => result.current.handleSubmit(submitEvent()));
    expect(submit).toHaveBeenCalledTimes(1);
    expect(submit.mock.calls[0][0]).toMatchObject({
      city: "Pune", role: "member",
      whatsapp: {phone: "+919876543210", launchNotice: true, marketing: false, consentVersion: "city-launch-whatsapp-v1"},
    });
    expect(result.current.joined).toBe(true);
    expect(result.current.status.message).toBe("Done. We’ll message you on WhatsApp the day Catch opens in Pune.");
  });

  it("refuses a short number without sending, and keeps the form after a failure", async () => {
    const submit = vi.fn().mockRejectedValue(new Error("Please try again."));
    const {result} = renderHook(() => useLaunchNoticeController("Pune", submit));
    act(() => result.current.setPhone("98765"));
    await act(() => result.current.handleSubmit(submitEvent()));
    expect(submit).not.toHaveBeenCalled();
    expect(result.current.status).toMatchObject({tone: "is-error", message: "Enter your 10-digit mobile number."});

    act(() => {
      result.current.setPhone("9876543210");
      result.current.setMarketing(true);
    });
    expect(result.current.status.message).toBe("");
    await act(() => result.current.handleSubmit(submitEvent()));
    expect(submit.mock.calls[0][0].whatsapp.marketing).toBe(true);
    expect(result.current.joined).toBe(false);
    expect(result.current.status).toMatchObject({tone: "is-error", message: "Please try again."});
  });
});
