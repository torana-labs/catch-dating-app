import {cleanup, fireEvent, render, screen} from "@testing-library/react";
import {afterEach, describe, expect, it} from "vitest";
import {OrganizerCover} from "./OrganizerCover";

afterEach(cleanup);

const organiser = {name: "AFTER FLY", city: "Mumbai", activityKind: "socialRun"};

describe("OrganizerCover", () => {
  it("shows the organiser's photo when there is one", () => {
    render(<OrganizerCover {...organiser} photoUrl="/run.jpg" semanticLabel="Runners at the start line" />);

    expect(screen.getByRole("img", {name: "Runners at the start line"}).getAttribute("src")).toBe("/run.jpg");
  });

  it("sets the typographic cover without a photo, never a grey box", () => {
    const {container} = render(<OrganizerCover {...organiser} />);

    expect(container.querySelector("img")).toBeNull();
    expect(container.textContent).toContain("MumbaiAFTER FLY");
  });

  it("falls back to the typographic cover when the photo fails to load", () => {
    const {container} = render(<OrganizerCover {...organiser} photoUrl="/missing.jpg" compact />);

    fireEvent.error(container.querySelector("img")!);
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("[data-compact]")?.textContent).toContain("AF");
  });
});
