import {act, renderHook} from "@testing-library/react";
import {describe, expect, it, vi} from "vitest";
import {useSafetyActionSheetController} from
  "./useSafetyActionSheetController";

const reasons = [
  {code: "harassment", label: "Harassment", severe: false, takedown: false,
    active: true},
  {code: "spam", label: "Spam", severe: false, takedown: false,
    active: false},
];
const target = {uid: "user_829", displayName: "Arjun M.",
  caseTargetPath: "reports/r1", caseTitle: "Harassment in chat",
  reasonCode: "harassment"};

describe("useSafetyActionSheetController", () => {
  it("rewrites the message as the step changes until someone edits it",
    () => {
      const {result} = renderHook(() => useSafetyActionSheetController({
        job: "ops", reasons, take: vi.fn()}));
      act(() => result.current.open(target));
      expect(result.current.reasons.map((reason) => reason.code))
        .toEqual(["harassment"]);
      expect(result.current.draft.messageToUser).toContain("for 7 days");
      act(() => result.current.setDuration(30));
      expect(result.current.draft.messageToUser).toContain("for 30 days");
      act(() => result.current.setMessage("My own words."));
      act(() => result.current.setKind("warn"));
      expect(result.current.draft.messageToUser).toBe("My own words.");
      expect(result.current.draft.durationDays).toBeNull();
    });

  it("refuses an owner-only step for ops and sends a valid one", async () => {
    const take = vi.fn().mockResolvedValue(true);
    const {result} = renderHook(() => useSafetyActionSheetController({
      job: "ops", reasons, take}));
    act(() => result.current.open(target));
    act(() => result.current.setKind("ban"));
    act(() => result.current.setNote("Repeated harassment."));
    await act(async () => {
      expect(await result.current.submit()).toBe(false);
    });
    expect(result.current.error)
      .toBe("Only the owner can suspend or ban an account.");
    act(() => result.current.setKind("restrict"));
    await act(async () => {
      expect(await result.current.submit()).toBe(true);
    });
    expect(take).toHaveBeenCalledWith(expect.objectContaining({
      uid: "user_829", kind: "restrict", durationDays: 7,
      caseTargetPath: "reports/r1", notifyReporter: true}));
    expect(result.current.target).toBeNull();
  });
});
