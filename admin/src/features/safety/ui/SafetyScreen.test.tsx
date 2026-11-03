import {cleanup, fireEvent, render, screen, waitFor} from "@testing-library/react";
import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {AdminPendingOperationProvider} from
  "../../../shared/pendingOperation";
import {resetSampleSafety} from "../../../shared/api/sampleSafety";
import {SafetyRouteScreen} from "./SafetyRouteScreen";
import type {SafetyView} from "./SafetyScreen";

// One client per test. No read or render may outlive the test: React work that
// runs after jsdom is torn down fails the run with "window is not defined",
// even when every test passed.
let queryClient: QueryClient;

function mount(props: {view?: SafetyView; selectedTargetPath?: string | null;
  selectedActionId?: string | null; adminRoles?: string[]}) {
  const onNavigate = vi.fn();
  render(
    <QueryClientProvider client={queryClient}>
      <AdminPendingOperationProvider>
        <SafetyRouteScreen
          adminRoles={props.adminRoles ?? ["support"]}
          onError={vi.fn()}
          onNavigate={onNavigate}
          onNotice={vi.fn()}
          selectedActionId={props.selectedActionId ?? null}
          selectedTargetPath={props.selectedTargetPath ?? null}
          view={props.view ?? "open"}
        />
      </AdminPendingOperationProvider>
    </QueryClientProvider>
  );
  return onNavigate;
}

describe("SafetyScreen", () => {
  beforeEach(() => {
    resetSampleSafety();
    queryClient = new QueryClient();
  });

  afterEach(async () => {
    cleanup();
    await waitFor(() => expect(queryClient.isFetching()).toBe(0),
      {timeout: 5000});
    queryClient.clear();
  });


  it("opening a report by its link shows the case beside the whole queue", async () => {
    mount({selectedTargetPath: "reports/report-2"});
    expect(await screen.findByRole("heading", {name: /Possible fake profile/}, {timeout: 4000})).toBeTruthy();
    await waitFor(() => expect(screen.getByRole("heading", {name: /Safety\s*7/})).toBeTruthy(), {timeout: 4000});
  });

  it("says so when a linked case has left the queue", async () => {
    queryClient.setDefaultOptions({queries: {retry: false}});
    mount({selectedTargetPath: "reports/no-such-report"});
    expect(await screen.findByText("This case is no longer available.", {}, {timeout: 4000})).toBeTruthy();
  });

  it("lists open cases with launch access and opens one in the URL",
    async () => {
      const onNavigate = mount({});
      await screen.findByRole("table", {name: "Open safety cases"});
      expect(screen.getAllByText("Access").length).toBeGreaterThan(0);
      fireEvent.click(screen.getAllByRole("row")[1]);
      expect(onNavigate).toHaveBeenCalledWith(
        expect.stringMatching(/^\/safety\/.+/u));
    });

  it("shows account actions and an appeal its decider cannot review",
    async () => {
      mount({view: "appeals", selectedActionId: "sample-action-vikram",
        adminRoles: ["adminOwner"]});
      await waitFor(() => expect(screen.getByText("Their appeal"))
        .toBeTruthy());
      expect(screen.getByText(/someone else reviews the appeal/u))
        .toBeTruthy();
    });
});
