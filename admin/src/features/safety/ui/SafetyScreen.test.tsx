import {fireEvent, render, screen, waitFor} from "@testing-library/react";
import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {beforeEach, describe, expect, it, vi} from "vitest";
import {AdminPendingOperationProvider} from
  "../../../shared/pendingOperation";
import {resetSampleSafety} from "../../../shared/api/sampleSafety";
import {SafetyRouteScreen} from "./SafetyRouteScreen";
import type {SafetyView} from "./SafetyScreen";

function mount(props: {view?: SafetyView; selectedTargetPath?: string | null;
  selectedActionId?: string | null; adminRoles?: string[]}) {
  const onNavigate = vi.fn();
  render(
    <QueryClientProvider client={new QueryClient()}>
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
  beforeEach(() => resetSampleSafety());

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
