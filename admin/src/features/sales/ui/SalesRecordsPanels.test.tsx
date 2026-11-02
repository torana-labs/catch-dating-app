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

it("does not submit an old contact decision with a refreshed revision", async () => {
  const saveContactability = vi.fn().mockResolvedValue(false);
  const controller = {isSaving: false, saveContactability,
    contacts: {data: {rows: [contact(1, "unknown"),], nextCursor: null},
      isPending: false, error: null},
    evidence: {data: {rows: [], nextCursor: null}},
    hasPreviousContactPage: false, previousContactPage: vi.fn(),
    nextContactPage: vi.fn(), saveContact: vi.fn()};
  const props = {section: "people" as const, detail: detail()};
  const {rerender} = render(<SalesRecordsWorkspace {...props}
    controller={controller as unknown as SalesWorkspaceController} />);
  fireEvent.change(screen.getByLabelText("Contact on this page"),
    {target: {value: "contact-one"}});
  fireEvent.change(screen.getByLabelText("New status"), {target: {value: "held"}});
  fireEvent.change(screen.getByLabelText("Reason for decision"),
    {target: {value: "Hold requested"}});
  controller.contacts.data.rows = [contact(2, "suppressed")];
  rerender(<SalesRecordsWorkspace {...props}
    controller={controller as unknown as SalesWorkspaceController} />);
  expect(screen.getByRole("button", {name: "Record contact decision"}))
    .toHaveProperty("disabled", true);
  fireEvent.submit(screen.getByRole("button", {name: "Record contact decision"})
    .closest("form")!);
  expect(saveContactability).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", {name: "Use latest contact decision"}));
  expect((screen.getByLabelText("New status") as HTMLSelectElement).value)
    .toBe("suppressed");
  fireEvent.change(screen.getByLabelText("Reason for decision"),
    {target: {value: "Keep suppression"}});
  fireEvent.click(screen.getByRole("button", {name: "Record contact decision"}));
  await waitFor(() => expect(saveContactability).toHaveBeenCalledWith({
    organizerId: "host-one", contactId: "contact-one", expectedRevision: 2,
    status: "suppressed", reason: "Keep suppression", evidenceId: undefined,
  }));
});

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

it("staff can add contacts without contactability approval controls", async () => {
  const saveContact = vi.fn().mockResolvedValue(true);
  const saveContactability = vi.fn();
  const controller = {isSaving: false, saveContact, saveContactability,
    contacts: {data: {rows: [contact(1, "unknown")]}, isPending: false},
    evidence: {data: {rows: []}}};
  render(<SalesRecordsWorkspace section="people" detail={detail()}
    assignedStaffOnly controller={controller as unknown as SalesWorkspaceController} />);
  expect(screen.queryByRole("button", {name: "Record contact decision"})).toBeNull();
  expect(screen.queryByLabelText("Contact on this page")).toBeNull();
  fireEvent.change(screen.getByLabelText("Name"), {target: {value: "Synthetic Contact"}});
  fireEvent.change(screen.getByLabelText("Role with host"), {target: {value: "operator"}});
  fireEvent.click(screen.getByRole("button", {name: "Add contact"}));
  await waitFor(() => expect(saveContact).toHaveBeenCalledWith(expect.objectContaining({
    organizerId: "host-one", contact: {displayName: "Synthetic Contact"},
  })));
  expect(saveContactability).not.toHaveBeenCalled();
});

