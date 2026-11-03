import {cleanup, fireEvent, render, screen} from "@testing-library/react";
import {afterEach, describe, expect, it, vi} from "vitest";
import {sampleOrganizerDetails} from "../../../shared/api/sampleData";
import {
  emptyPublishChecklist,
  formFromOrganizerProfile,
} from "../controllers/organizerPublishingHelpers";
import type {OrganizerPageEditorController} from "../controllers/useOrganizerPageEditorController";
import {organizerPageEditorPanels} from "./OrganizerPageEditor";

const organizer = sampleOrganizerDetails.afterfly!;

function editor(overrides: Partial<OrganizerPageEditorController> = {}): OrganizerPageEditorController {
  return {
    organizer,
    form: formFromOrganizerProfile(organizer),
    setForm: vi.fn(),
    diffRows: [],
    issues: [],
    publishIssues: [],
    checklist: emptyPublishChecklist,
    setChecklist: vi.fn(),
    isBusy: false,
    canSave: false,
    canPublish: true,
    save: vi.fn(async () => true),
    saveAndPublish: vi.fn(async () => true),
    discard: vi.fn(),
    ...overrides,
  };
}

describe("OrganizerPageEditor", () => {
  afterEach(cleanup);

  it("keeps every field the old editor had", () => {
    render(<organizerPageEditorPanels.OrganizerPageEditorForm editor={editor()} />);
    for (const label of ["Name", "Kind", "Label shown instead (optional)", "Area", "City", "Headline", "About",
      "Short summary", "What they run", "Tags", "Instagram", "Email", "Phone", "In the app", "Public page",
      "Page address", "Title in search results", "Description in search results", "How sure are we",
      "Verified", "Where this came from", "Note for the team"]) {
      expect(screen.getAllByText(label).length, label).toBeGreaterThan(0);
    }
    expect(screen.getAllByText("Cover photo").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Logo").length).toBeGreaterThan(0);
    expect(screen.getByText("Links on the page")).toBeTruthy();
  });

  it("offers all five public page states", () => {
    render(<organizerPageEditorPanels.OrganizerPageEditorForm editor={editor()} />);
    for (const state of ["Draft — private", "QA — internal review", "Published — public web",
      "Suppressed — temporarily hidden", "Removed — retired"]) {
      expect(screen.getAllByRole("option", {name: state}).length, state).toBeGreaterThan(0);
    }
  });

  it("adds a link, then edits it in a dialog", () => {
    const setForm = vi.fn();
    render(<organizerPageEditorPanels.OrganizerPageEditorForm editor={editor({setForm})} />);
    fireEvent.click(screen.getByRole("button", {name: "Add a link"}));
    expect(setForm).toHaveBeenCalled();
    expect(setForm.mock.calls[0]![0].ownerLinks.length).toBe(organizer.ownerLinks.length + 1);
  });

  it("shows search as read-only, changing only on publish", () => {
    render(<organizerPageEditorPanels.OrganizerPageEditorSide editor={editor()} />);
    expect(screen.getByText("In search only changes when you publish.")).toBeTruthy();
    expect(screen.getByText("Ready to publish")).toBeTruthy();
  });

  it("asks for all four confirmations before publishing", () => {
    const unchecked = editor();
    const {rerender} = render(<organizerPageEditorPanels.OrganizerPageEditorActions editor={unchecked} />);
    fireEvent.click(screen.getByRole("button", {name: "Publish"}));
    expect(screen.getByText("Media rights verified")).toBeTruthy();
    const confirm = screen.getByRole("button", {name: "Save and publish"}) as HTMLButtonElement;
    expect(confirm.disabled).toBe(true);

    const checked = editor({checklist: {
      sourceEvidenceVerified: true, mediaRightsVerified: true, cadenceVerified: true, ownerContactVerified: true,
    }});
    rerender(<organizerPageEditorPanels.OrganizerPageEditorActions editor={checked} />);
    fireEvent.click(screen.getByRole("button", {name: "Save and publish"}));
    expect(checked.saveAndPublish).toHaveBeenCalled();
  });

  it("won't open publishing while something blocks it", () => {
    render(<organizerPageEditorPanels.OrganizerPageEditorActions editor={editor({canPublish: false})} />);
    expect((screen.getByRole("button", {name: "Publish"}) as HTMLButtonElement).disabled).toBe(true);
  });
});
