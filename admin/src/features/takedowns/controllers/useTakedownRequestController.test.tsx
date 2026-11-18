import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {act, renderHook, waitFor} from "@testing-library/react";
import type {PropsWithChildren} from "react";
import {describe, expect, it, vi} from "vitest";
import {sampleTakedownDetail, type TakedownStep} from "../api/takedownRepository";
import {useTakedownRequestController} from "./useTakedownRequestController";

const steps = vi.hoisted(() => [] as TakedownStep[]);

vi.mock("../api/takedownRepository", async (original) => {
  const actual = await original<typeof import("../api/takedownRepository")>();
  return {
    ...actual,
    getTakedownRequest: vi.fn(async () => actual.sampleTakedownDetail),
    updateTakedownRequest: vi.fn(async (step: TakedownStep) => {
      steps.push(step);
      return actual.sampleTakedownDetail.request;
    }),
  };
});

function setup() {
  const client = new QueryClient({defaultOptions: {queries: {retry: false}, mutations: {retry: false}}});
  const notices: string[] = [];
  const onChanged = vi.fn();
  const wrapper = ({children}: PropsWithChildren) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  const hook = renderHook(() => useTakedownRequestController({requestId: sampleTakedownDetail.request.requestId,
    onError: () => undefined, onNotice: (notice) => notices.push(notice), onChanged}), {wrapper});
  return {...hook, notices, onChanged};
}

describe("useTakedownRequestController", () => {
  it("offers an action only with an allowed outcome and, for removal, a well-formed case id", async () => {
    steps.length = 0;
    const {result, notices, onChanged} = setup();
    await waitFor(() => expect(result.current.detail).not.toBeNull());
    expect(result.current.action).toBeNull();
    act(() => result.current.setOutcome("removedAndSuppressed"));
    expect(result.current.caseNeeded).toBe(true);
    expect(result.current.action).toBeNull();
    act(() => result.current.setCaseId("lantern-lane-social"));
    expect(result.current.caseIdError).toMatch(/TD-0001/u);
    act(() => {
      result.current.setCaseId("TD-0042");
      result.current.setNote("Suspended same day");
    });
    act(() => result.current.action?.());
    await waitFor(() => expect(steps).toEqual([{requestId: sampleTakedownDetail.request.requestId, action: "action",
      outcome: "removedAndSuppressed", caseId: "TD-0042", note: "Suspended same day"}]));
    await waitFor(() => expect(onChanged).toHaveBeenCalled());
    expect(notices[0]).toMatch(/Actioned/u);
  });

  it("asks for more and declines only with their fixed choices", async () => {
    steps.length = 0;
    const {result} = setup();
    await waitFor(() => expect(result.current.detail).not.toBeNull());
    expect([result.current.requestInfo, result.current.decline]).toEqual([null, null]);
    act(() => {
      result.current.setInfoTemplate("replyFromDomainEmail");
      result.current.setDeclineReason("couldNotVerify");
    });
    act(() => result.current.requestInfo?.());
    await waitFor(() => expect(steps).toHaveLength(1));
    act(() => result.current.decline?.());
    await waitFor(() => expect(steps.map((step) => [step.action, step.infoTemplate ?? step.declineReason])).toEqual(
      [["requestInfo", "replyFromDomainEmail"], ["decline", "couldNotVerify"]]));
  });
});
