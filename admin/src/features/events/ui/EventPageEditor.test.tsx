import {cleanup, fireEvent, render, screen} from "@testing-library/react";
import {afterEach, describe, expect, it, vi} from "vitest";
import {sampleEventDetails} from "../../../shared/api/sampleData";
import {formFromEventProfile} from "../controllers/eventPublishingHelpers";
import type {EventPageEditorController} from "../controllers/useEventPageEditorController";
import {eventPageEditorPanels} from "./EventPageEditor";

const event = sampleEventDetails["mumbai-padel-mixer-1"]!;

function editor(overrides: Partial<EventPageEditorController> = {}): EventPageEditorController {
  return {
    event,
    form: formFromEventProfile(event),
    update: vi.fn(),
    diffRows: [],
    issues: [],
    isSaving: false,
    canSave: false,
    save: vi.fn(async () => true),
    discard: vi.fn(),
    savePilotReview: vi.fn(async () => true),
    ...overrides,
  };
}

describe("EventPageEditor", () => {
  afterEach(cleanup);

  it("keeps the organizer's terms read-only", () => {
    render(<eventPageEditorPanels.EventPageEditorForm editor={editor()} />);
    expect(screen.getByText("Set by the organizer")).toBeTruthy();
    expect(screen.getByText("They change these in the host app")).toBeTruthy();
    expect(screen.queryByRole("textbox", {name: /^Price/u})).toBeNull();
    expect(screen.queryByRole("textbox", {name: /^Starts/u})).toBeNull();
  });

  it("shows distance and pace only for an activity with a route", () => {
    const form = formFromEventProfile(event);
    const {rerender} = render(
      <eventPageEditorPanels.EventPageEditorForm editor={editor({form: {...form, activityKind: "pubQuiz"}})} />
    );
    expect(screen.queryByText("Pace")).toBeNull();
    rerender(<eventPageEditorPanels.EventPageEditorForm editor={editor({form: {...form, activityKind: "running"}})} />);
    expect(screen.getAllByText("Pace").length).toBeGreaterThan(0);
  });

  it("lists what stops a save and what changed", () => {
    render(<eventPageEditorPanels.EventPageEditorSide editor={editor({
      diffRows: [{field: "Description", before: "Old", after: "New"}],
      issues: [{id: "review-note", label: "Review note", detail: "Add a review note.", severity: "blocker"}],
    })} />);
    expect(screen.getByText("Add a review note.")).toBeTruthy();
    expect(screen.getByText("Old → New")).toBeTruthy();
    expect(screen.queryByText("Ready to save")).toBeNull();
  });

  it("offers Save only when it can save, and Discard only with changes", () => {
    const can = editor({canSave: true, diffRows: [{field: "Description", before: "a", after: "b"}]});
    const {rerender} = render(<eventPageEditorPanels.EventPageEditorActions editor={can} />);
    fireEvent.click(screen.getByRole("button", {name: "Save changes"}));
    expect(can.save).toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", {name: "Discard"}));
    expect(can.discard).toHaveBeenCalled();
    rerender(<eventPageEditorPanels.EventPageEditorActions editor={editor()} />);
    expect((screen.getByRole("button", {name: "Save changes"}) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("button", {name: "Discard"}) as HTMLButtonElement).disabled).toBe(true);
  });

  it("asks for a note before marking a real pilot event", () => {
    const review = editor();
    render(<eventPageEditorPanels.EventPilotReviewSection editor={review} />);
    fireEvent.click(screen.getByRole("button", {name: "Mark as real"}));
    const confirms = screen.getAllByRole("button", {name: "Mark as real"});
    const confirm = confirms[confirms.length - 1] as HTMLButtonElement;
    expect(confirm.disabled).toBe(true);
    fireEvent.change(screen.getByRole("textbox", {name: /Note for the team/u}), {target: {value: "Real pilot"}});
    fireEvent.click(confirm);
    expect(review.savePilotReview).toHaveBeenCalledWith(true, "Real pilot");
  });
});
