import {cleanup, fireEvent, render, screen, waitFor} from "@testing-library/react";
import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {AdminPendingOperationProvider} from
  "../../../shared/pendingOperation";
import {resetSampleSupport} from "../../../shared/api/sampleSupport";
import {SupportRouteScreen} from "./SupportRouteScreen";

function mount(conversationId: string | null = null) {
  const onNavigate = vi.fn();
  render(
    <QueryClientProvider client={new QueryClient()}>
      <AdminPendingOperationProvider>
        <SupportRouteScreen conversationId={conversationId} onError={vi.fn()}
          onNavigate={onNavigate} onNotice={vi.fn()} userUid="sample-owner" />
      </AdminPendingOperationProvider>
    </QueryClientProvider>
  );
  return onNavigate;
}

describe("SupportScreen", () => {
  beforeEach(() => resetSampleSupport());
  afterEach(cleanup);

  it("lists conversations longest waiting first and opens one in the URL",
    async () => {
      const onNavigate = mount();
      await screen.findByRole("table", {name: "Support conversations"});
      const rows = screen.getAllByRole("row");
      expect(rows[1].textContent).toContain("A payout is not showing");
      fireEvent.click(rows[1]);
      expect(onNavigate).toHaveBeenCalledWith(
        expect.stringMatching(/^\/support\/whatsapp-/u));
    });

  it("shows the conversation with its link and records a reply",
    async () => {
      mount(`whatsapp-${"a1".padEnd(64, "0")}`);
      await waitFor(() => expect(screen.getByText("₹1,500 captured, no booking"))
        .toBeTruthy());
      fireEvent.change(screen.getByLabelText("Reply to Rhea Kapoor"),
        {target: {value: "Looking at it now."}});
      fireEvent.click(screen.getByRole("button", {name: "Record reply"}));
      await waitFor(() => expect(screen.getAllByText("Looking at it now.")
        .length).toBeGreaterThan(0));
    });
});
