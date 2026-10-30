import {cleanup, render, screen} from "@testing-library/react";
import {afterEach, describe, expect, it, vi} from "vitest";

import type {OrganizerIntakeController} from
  "../controllers/useOrganizerIntakeController";
import {OrganizerIntakeWorkspace} from "./OrganizerIntakeScreen";

vi.mock("./organizerIntakeWorkbench", () => ({
  organizerIntakeWorkbench: {
    OrganizerTaskWorkbench: () => <span>Healthy organizer review queue</span>,
  },
}));

afterEach(() => cleanup());

describe("OrganizerIntakeWorkspace unavailable inventory", () => {
  it("keeps unavailable diagnostics visible alongside the healthy queue", () => {
    const controller = {
      bridge: {unavailableRecords: [{documentId: "legacy-packet",
        reason: "invalid_record", issues: [{path: "/adminDecision/currentDecision",
          code: "required"}], issuesTruncated: false}]},
    } as unknown as OrganizerIntakeController;
    render(<OrganizerIntakeWorkspace controller={controller} />);

    expect(screen.getByRole("heading", {name: "Unavailable intake records"}))
      .toBeTruthy();
    expect(screen.getByText(/legacy-packet — invalid record/)).toBeTruthy();
    expect(screen.getByText(/publication totals are unavailable/)).toBeTruthy();
    expect(screen.getByText("Healthy organizer review queue")).toBeTruthy();
    expect(screen.queryByRole("button", {name: /legacy-packet/})).toBeNull();
  });

  it("supports healthy responses from before diagnostic metadata", () => {
    const controller = {bridge: {}} as unknown as OrganizerIntakeController;
    render(<OrganizerIntakeWorkspace controller={controller} />);
    expect(screen.queryByText("Unavailable intake records")).toBeNull();
    expect(screen.getByText("Healthy organizer review queue")).toBeTruthy();
  });
});
