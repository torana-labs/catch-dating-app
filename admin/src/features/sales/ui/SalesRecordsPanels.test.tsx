import {cleanup, fireEvent, render, screen, waitFor} from "@testing-library/react";
import {afterEach, expect, it, vi} from "vitest";
import {SalesRecordsWorkspace} from "./SalesRecordsPanels";
import type {SalesWorkspaceController} from "../controllers/useSalesWorkspaceController";
import type {SalesAccountDetail, SalesContact} from "../api/salesTypes";

afterEach(cleanup);

function detail(revision = 1, suppressionStatus: "clear" | "held" | "suppressed" =
  "clear"): SalesAccountDetail {
  return {account: {organizerId: "host-one", revision,
    researchStatus: "needs_research", suppressionStatus},
  organizerSummary: {name: "Example Host"}, activities: [], opportunities: [], tasks: []};
}

function contact(revision: number,
  contactabilityStatus: SalesContact["relationship"]["contactabilityStatus"]): SalesContact {
  return {contactId: "contact-one", displayName: "Asha",
    relationship: {revision, role: "owner", decisionInfluence: "decision_maker",
      primary: true, contactabilityStatus, sendAuthority: false}};
}

it("creates internal work without a contact and requires one for outbound tasks", async () => {
  const saveTask = vi.fn().mockResolvedValue(false);
  const controller = {isSaving: false, saveTask,
    contacts: {data: {rows: [] as SalesContact[], nextCursor: null}}};
  const props = {section: "tasks" as const, detail: detail(), currentUserUid: "staff-one"};
  const {rerender} = render(<SalesRecordsWorkspace {...props}
    controller={controller as unknown as SalesWorkspaceController} />);
  fireEvent.change(screen.getByLabelText("New task"),
    {target: {value: "Check venue details"}});
  fireEvent.change(screen.getByLabelText("Due"),
    {target: {value: "2026-10-01T10:00"}});
  fireEvent.click(screen.getByRole("button", {name: "Add task"}));
  await waitFor(() => expect(saveTask).toHaveBeenCalledWith(expect.objectContaining({
    task: expect.objectContaining({kind: "research", contactId: null}),
  })));
  fireEvent.change(screen.getByLabelText("Task purpose"),
    {target: {value: "follow_up"}});
  expect(screen.getByRole("button", {name: "Add task"}))
    .toHaveProperty("disabled", true);
  controller.contacts.data.rows = [contact(3, "draft_reviewed")];
  rerender(<SalesRecordsWorkspace {...props}
    controller={controller as unknown as SalesWorkspaceController} />);
  fireEvent.change(screen.getByLabelText("Reviewed contact on this page"),
    {target: {value: "contact-one"}});
  fireEvent.click(screen.getByRole("button", {name: "Add task"}));
  await waitFor(() => expect(saveTask).toHaveBeenCalledWith(expect.objectContaining({
    task: expect.objectContaining({kind: "follow_up", contactId: "contact-one"}),
  })));
});
