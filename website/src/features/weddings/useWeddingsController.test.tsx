import {act, renderHook} from "@testing-library/react";
import {afterEach, describe, expect, it} from "vitest";
import {weddingsCopy as copy} from "@content/weddings";
import {useWeddingsApplicationController, useWeddingsLandingController} from "./useWeddingsController";
import {isIndianMobile, readStepOne, replyBadge, shortDate, stepOneIsComplete, type WeddingsStepOneDraft} from "./weddingsModel";

afterEach(() => window.sessionStorage.clear());

const stepOne: WeddingsStepOneDraft = {
  name: "Meher Shah", company: "Meher Shah Weddings", phone: "98201 44718", date: "2026-12-12",
  destination: "Udaipur", guests: "150 to 400", tools: ["Spreadsheets"],
};

describe("weddings model", () => {
  it("accepts a ten-digit Indian mobile and a complete step 1 only", () => {
    expect(isIndianMobile("98201 44718")).toBe(true);
    expect(isIndianMobile("12345 67890")).toBe(false);
    expect(stepOneIsComplete(stepOne)).toBe(true);
    expect(stepOneIsComplete({...stepOne, date: ""})).toBe(false);
  });

  it("draws replies as the planner's table does", () => {
    expect(replyBadge(4, 4)).toEqual({label: "4/4", tone: "success"});
    expect(replyBadge("maybe", 2)).toEqual({label: copy.follow.setUp.card.replies.maybe, tone: "warning"});
    expect(replyBadge(0, 1).label).toBe(copy.follow.setUp.card.replies.notComing);
    expect(shortDate("2026-12-12")).toBe("12 Dec");
  });
});

describe("weddings controllers", () => {
  it("the landing hands a complete step 1 to the application page in this tab", () => {
    const {result} = renderHook(() => useWeddingsLandingController());
    expect(result.current.coming).toHaveLength(4);
    act(() => result.current.toggleComing("Kamla"));
    expect(result.current.coming).not.toContain("Kamla");
    for (const [key, value] of Object.entries(stepOne).filter(([key]) => key !== "tools" && key !== "guests")) {
      act(() => result.current.stepOne.update(key as "name", value as string));
    }
    expect(result.current.stepOne.complete).toBe(true);
    act(() => result.current.continueToApply());
    expect(readStepOne()).toMatchObject({name: stepOne.name, guests: copy.stepOne.guests.initial});
  });

  it("the application starts at step 2 with a handed-over step 1 and cannot send without a front door", () => {
    window.sessionStorage.setItem("catch_weddings_application_step_one_v1", JSON.stringify(stepOne));
    const {result} = renderHook(() => useWeddingsApplicationController());
    expect(result.current.stage).toBe("stepTwo");
    expect(result.current.canSend).toBe(false);
    act(() => result.current.toggleWant(copy.stepTwo.wants.options[0]));
    expect(result.current.stepTwo.wants).not.toContain(copy.stepTwo.wants.options[0]);
  });

  it("the application clears the handover once sent", async () => {
    window.sessionStorage.setItem("catch_weddings_application_step_one_v1", JSON.stringify(stepOne));
    const {result} = renderHook(() => useWeddingsApplicationController({submit: () => Promise.resolve()}));
    await act(() => result.current.send());
    expect(result.current.stage).toBe("sent");
    expect(readStepOne()).toBeNull();
  });
});
