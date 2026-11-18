import {act, renderHook} from "@testing-library/react";
import {describe, expect, it, vi} from "vitest";
import {listingRequestCopy as copy} from "@content/listingRequest";
import type {ListingRequestOutcome, ListingRequestSubmission} from "../../shared/api/listingRequest";
import {useListingRequestController} from "./useListingRequestController";

function submission(outcome: ListingRequestOutcome): ListingRequestSubmission & {submit: ReturnType<typeof vi.fn>} {
  return {submit: vi.fn(async () => outcome), reset: vi.fn()};
}

const sent: ListingRequestOutcome = {status: "sent", receipt: {requestId: `lr-${"a".repeat(40)}`, reference: "LR-K7Q2M9TX",
  requestType: "claim", isNew: true, ackDueAt: "2026-11-19T06:00:00.000Z", actionDueAt: null, resolveDueAt: "2026-11-20T06:00:00.000Z"}};

function fillClaim(result: {current: ReturnType<typeof useListingRequestController>}) {
  act(() => {
    result.current.update("name", "Asha Verma");
    result.current.update("role", "owner");
    result.current.update("email", "asha@lanternlane.example");
    result.current.update("proofMethod", "instagramCode");
    result.current.update("officialHandle", "lanternlanesocial");
  });
}

describe("useListingRequestController", () => {
  it("starts at the type step, and at the details when the link names a type", () => {
    expect(renderHook(() => useListingRequestController({search: "?organizer=lantern-lane-social"})).result.current.stage).toBe("type");
    const {result} = renderHook(() => useListingRequestController({search: "?organizer=lantern-lane-social&type=claim"}));
    expect([result.current.stage, result.current.prefilled, result.current.draft.target]).toEqual(
      ["details", true, {kind: "organizer", id: "lantern-lane-social"}]);
  });

  it("needs a type, then complete details, before the declarations", () => {
    const {result} = renderHook(() => useListingRequestController({search: "?organizer=lantern-lane-social"}));
    act(() => result.current.continueFromType());
    expect([result.current.stage, result.current.typeError]).toEqual(["type", copy.errors.type]);
    act(() => result.current.chooseType("claim"));
    act(() => result.current.continueFromType());
    act(() => result.current.continueFromDetails());
    expect(result.current.stage).toBe("details");
    expect(result.current.errors.name).toBe(copy.errors.name);
    fillClaim(result);
    act(() => result.current.continueFromDetails());
    expect(result.current.stage).toBe("declarations");
  });

  it("clears a role the new type does not take", () => {
    const {result} = renderHook(() => useListingRequestController({search: "?type=correctFact"}));
    act(() => result.current.update("role", "memberOfPublic"));
    act(() => result.current.chooseType("removeAndDoNotList"));
    expect(result.current.draft.role).toBeNull();
  });

  it("sends only with every declaration, then shows the receipt", async () => {
    const client = submission(sent);
    const {result} = renderHook(() => useListingRequestController({search: "?organizer=lantern-lane-social&type=claim", submission: client}));
    fillClaim(result);
    act(() => result.current.continueFromDetails());
    await act(() => result.current.send());
    expect([client.submit.mock.calls.length, result.current.declarationsError]).toEqual([0, copy.errors.declarations]);
    act(() => {
      for (const key of ["accurate", "authorised", "contactConsent"] as const) result.current.declare(key, true);
    });
    await act(() => result.current.send());
    expect(result.current.stage).toBe("sent");
    expect(result.current.receipt?.reference).toBe("LR-K7Q2M9TX");
    act(() => result.current.startAgain());
    expect([result.current.stage, result.current.draft.type]).toEqual(["type", null]);
    expect(client.reset).toHaveBeenCalled();
  });

  it("words a failure and keeps the answers", async () => {
    const client = submission({status: "busy", message: null});
    const {result} = renderHook(() => useListingRequestController({search: "?organizer=lantern-lane-social&type=claim", submission: client}));
    fillClaim(result);
    act(() => {
      result.current.continueFromDetails();
      for (const key of ["accurate", "authorised", "contactConsent"] as const) result.current.declare(key, true);
    });
    await act(() => result.current.send());
    expect([result.current.stage, result.current.error, result.current.draft.name]).toEqual(["declarations", copy.errors.busy, "Asha Verma"]);
  });
});
