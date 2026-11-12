import {act, renderHook} from "@testing-library/react";
import {afterEach, describe, expect, it} from "vitest";
import {weddingsCopy as copy} from "@content/weddings";
import {useWeddingsApplicationController, useWeddingsLandingController} from "./useWeddingsController";
import {
  initialStepTwoDraft,
  isIndianMobile,
  readStepOne,
  sentSummary,
  shortDate,
  stepOneErrors,
  stepOneIsComplete,
  stepTwoContact,
  stepTwoErrors,
  type WeddingsStepOneDraft,
} from "./weddingsModel";

afterEach(() => window.sessionStorage.clear());

const stepOne: WeddingsStepOneDraft = {
  who: "A wedding planner", what: "A wedding", name: "Meher Shah", company: "Meher Shah Weddings", phone: "98201 44718", date: "2026-12-12",
  destination: "Udaipur", guests: "150 to 400", tools: ["Spreadsheets"],
};
const storageKey = "catch_weddings_application_step_one_v2";

describe("weddings model", () => {
  it("requires who, what, name, a ten-digit Indian mobile, the date, the destination and the guests; company and tools are optional", () => {
    expect(isIndianMobile("98201 44718")).toBe(true);
    expect(isIndianMobile("12345 67890")).toBe(false);
    expect(stepOneIsComplete(stepOne)).toBe(true);
    expect(stepOneIsComplete({...stepOne, company: "", tools: []})).toBe(true);
    const empty = stepOneErrors({...stepOne, who: "", what: "", name: " ", phone: "", date: "", destination: "", guests: ""});
    expect(empty).toEqual({who: copy.stepOne.who.error, what: copy.stepOne.what.error, name: copy.stepOne.name.error, phone: copy.stepOne.phone.missing,
      date: copy.stepOne.date.error, destination: copy.stepOne.destination.error, guests: copy.stepOne.guests.error});
    expect(stepOneErrors({...stepOne, phone: "12345"}).phone).toBe(copy.stepOne.phone.invalid);
    expect(shortDate("2026-12-12")).toBe("12 Dec");
  });

  it("starts step 2 empty and requires every answer but the note, which has a limit", () => {
    expect(initialStepTwoDraft).toMatchObject({flying: "", wants: [], heard: "", lastTime: ""});
    expect(Object.keys(stepTwoErrors(initialStepTwoDraft)).sort()).toEqual(["flying", "heard", "wants"]);
    expect(stepTwoErrors({...initialStepTwoDraft, flying: "Under half", wants: ["Door check-in"], heard: "A hotel"})).toEqual({});
    expect(stepTwoErrors({...initialStepTwoDraft, lastTime: "x".repeat(601)}).lastTime).toBe("Keep it under 600 characters");
  });

  it("summarises step 1 for step 2 and step 2 for the sent state", () => {
    expect(stepTwoContact(stepOne)).toBe("Meher Shah · Meher Shah Weddings · +91 98201 44718");
    expect(stepTwoContact({...stepOne, company: ""})).toBe("Meher Shah · +91 98201 44718");
    expect(sentSummary({...initialStepTwoDraft, hotels: 1, flying: "More than half", wants: ["Door check-in"], heard: "A hotel"}))
      .toBe("5 functions · 1 hotel · a team of 24 · more than half flying in · wants: Door check-in");
  });
});

describe("weddings controllers", () => {
  it("the landing shows what step 1 still needs, then hands a complete step 1 to the application page", () => {
    const {result} = renderHook(() => useWeddingsLandingController());
    expect(result.current.stepOne.errors).toEqual({});
    act(() => result.current.continueToApply());
    expect(result.current.stepOne.errors.who).toBe(copy.stepOne.who.error);
    expect(readStepOne()).toBeNull();
    for (const [key, value] of Object.entries(stepOne).filter(([key]) => key !== "tools")) {
      act(() => result.current.stepOne.update(key as "name", value as string));
    }
    expect(result.current.stepOne.errors).toEqual({});
    act(() => result.current.continueToApply());
    expect(readStepOne()).toMatchObject({who: stepOne.who, name: stepOne.name, guests: stepOne.guests});
  });

  it("the application starts at step 2 with a handed-over step 1 and cannot send without a front door", () => {
    window.sessionStorage.setItem(storageKey, JSON.stringify(stepOne));
    const {result} = renderHook(() => useWeddingsApplicationController());
    expect(result.current.stage).toBe("stepTwo");
    expect(result.current.canSend).toBe(false);
    act(() => result.current.toggleWant(copy.stepTwo.wants.options[0]));
    expect(result.current.stepTwo.wants).toContain(copy.stepTwo.wants.options[0]);
  });

  it("the application shows step 2's errors on Send, sends once answered, clears the handover and can reopen", async () => {
    window.sessionStorage.setItem(storageKey, JSON.stringify(stepOne));
    const sent: unknown[] = [];
    const {result} = renderHook(() => useWeddingsApplicationController({submit: (application) => { sent.push(application); return Promise.resolve(); }}));
    await act(() => result.current.send());
    expect(result.current.stage).toBe("stepTwo");
    expect(result.current.stepTwoErrors.flying).toBe(copy.stepTwo.flying.error);
    act(() => {
      result.current.updateStepTwo("flying", "Under half");
      result.current.updateStepTwo("heard", "A hotel");
      result.current.toggleWant("Door check-in");
    });
    await act(() => result.current.send());
    expect(result.current.stage).toBe("sent");
    expect(sent).toHaveLength(1);
    expect(readStepOne()).toBeNull();
    act(() => result.current.reopen());
    expect(result.current.stage).toBe("stepTwo");
  });
});
