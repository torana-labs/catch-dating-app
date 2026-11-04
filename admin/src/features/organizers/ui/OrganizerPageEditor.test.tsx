import {cleanup, fireEvent, render, screen} from "@testing-library/react";
import {afterEach, describe, expect, it, vi} from "vitest";
import {sampleOrganizerDetails} from "../../../shared/api/sampleData";
import {
  emptyPublishChecklist,
  formFromOrganizerProfile,
  validateOrganizerPublishingForm,
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

  it("shows ordinary save readiness separately from publication requirements", () => {
    const original = {...formFromOrganizerProfile(organizer), publishStatus: "published" as const,
      description: "", area: "", headline: "", summary: "", sourceConfidence: "seedOnly" as const,
      verificationStatus: "unverified" as const};
    const form = {...original, email: "new@example.com", reviewNote: "Corrected contact"};
    const state = editor({form, issues: validateOrganizerPublishingForm(form, {original, requireReviewNote: true}),
      publishIssues: validateOrganizerPublishingForm(form, {publishing: true, requireReviewNote: true})});
    render(<><organizerPageEditorPanels.OrganizerPageEditorForm editor={state} />
      <organizerPageEditorPanels.OrganizerPageEditorSide editor={state} /></>);
    expect(screen.getByText("Ready to save")).toBeTruthy();
    expect(screen.queryByText("Ready to publish")).toBeNull();
    expect(screen.getByText(/Before publishing: Description is required/)).toBeTruthy();
    expect(screen.getByText(/Before publishing: Select Source backed/)).toBeTruthy();
    expect(screen.queryByText("Description is required for a canonical organizer listing.")).toBeNull();
  });

  it("does not claim publication readiness while a shared save blocker remains", () => {
    const form = {...formFromOrganizerProfile(organizer), sourceConfidence: "high" as const,
      verificationStatus: "sourceBacked" as const, reviewNote: ""};
    const issues = validateOrganizerPublishingForm(form, {requireReviewNote: true});
    render(<organizerPageEditorPanels.OrganizerPageEditorSide editor={editor({form, issues,
      publishIssues: validateOrganizerPublishingForm(form, {publishing: true, requireReviewNote: true})})} />);
    expect(screen.queryByText("Ready to publish")).toBeNull();
    expect(screen.queryByText("Ready to save")).toBeNull();
    expect(screen.getByText("Review note")).toBeTruthy();
  });

  it("shows changed-field and audit-note errors inline from save validation", () => {
    const form = {...formFromOrganizerProfile(organizer), email: "invalid", reviewNote: ""};
    const state = editor({form, issues: validateOrganizerPublishingForm(form, {requireReviewNote: true}),
      publishIssues: []});
    render(<organizerPageEditorPanels.OrganizerPageEditorForm editor={state} />);
    expect(screen.getByText("Enter a complete email address or leave the field empty.")).toBeTruthy();
    expect(screen.getByText("Explain what you verified or changed; this becomes the audited operator context.")).toBeTruthy();
  });

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
