import {act, cleanup, render, waitFor} from "@testing-library/react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {AdminQueryProvider} from "../shared/query/queryClient";
import {useMessagingBudgetController} from "../features/settings/controllers/useMessagingBudgetController";

const mocks = vi.hoisted(() => ({
  loadMessagingBudgetReview: vi.fn(), recordMessagingBudgetDecision: vi.fn(),
  stageApprovedMessagingBudget: vi.fn(),
}));
vi.mock("../features/settings/api/grantedPlansRepository", () => mocks);
const baseReview = {
  review: {
    runtime: {sourceHash: "a"}, sender: {reviewHash: "b"},
    budgets: {kind: "reviewed", currency: "INR", sourceHash: "c"},
  },
  decision: null,
};
afterEach(cleanup);
beforeEach(() => {
  mocks.loadMessagingBudgetReview.mockResolvedValue(baseReview);
});

describe("Retired session controller requests", () => {
  it("does not start a follow-up budget review after the old decision completes", async () => {
    let controller!: ReturnType<typeof useMessagingBudgetController>;
    let complete!: (value: unknown) => void;
    mocks.recordMessagingBudgetDecision.mockReturnValue(new Promise((resolve) => { complete = resolve; }));
    function Probe() {
      controller = useMessagingBudgetController({onError: vi.fn(), onNotice: vi.fn()});
      return null;
    }
    const view = render(<AdminQueryProvider sessionKey="owner:1" isCurrentSession={() => true}><Probe /></AdminQueryProvider>);
    act(() => {
      controller.setScope("organizerId", "private-organizer");
      controller.setScope("eventId", "private-event");
      controller.setScope("senderId", "private-sender");
    });
    await act(async () => { await controller.review(); });
    act(() => controller.setDecisionNote("Synthetic hold decision"));
    let save!: Promise<boolean>;
    act(() => { save = controller.decide(); });
    await waitFor(() => expect(mocks.recordMessagingBudgetDecision).toHaveBeenCalledOnce());
    view.rerender(<AdminQueryProvider sessionKey="finance:2" isCurrentSession={() => true}><p>Next session</p></AdminQueryProvider>);
    await act(async () => { complete({}); expect(await save).toBe(false); });
    expect(mocks.loadMessagingBudgetReview).toHaveBeenCalledOnce();
  });

});
