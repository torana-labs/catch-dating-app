import {cleanup, render, screen} from "@testing-library/react";
import {afterEach, describe, expect, it} from "vitest";
import {CatchStorySection} from "./CatchStorySection";

afterEach(cleanup);

describe("CatchStorySection", () => {
  it("is a section named by the storyteller's name, their words a block quote", () => {
    const {container} = render(<CatchStorySection kicker="Kicker" meta="Sample meta" quote="Sample words." title="Sample Organiser" />);
    expect(screen.getByRole("region", {name: "Sample Organiser"}).tagName).toBe("SECTION");
    expect(screen.getByRole("heading", {level: 2, name: "Sample Organiser"})).toBeTruthy();
    expect(container.querySelector("blockquote")!.textContent).toBe("“Sample words.”");
    expect(container.querySelector("header")).toBeNull();
  });

  it("draws initials on a ground, or a photo", () => {
    const {container, rerender} = render(<CatchStorySection avatar={{ground: "pink"}} quote="Words." title="Sample Organiser" />);
    expect(container.querySelector("[data-recipe='monogram'] [data-initials='SO']")).not.toBeNull();
    rerender(<CatchStorySection avatar={{image: "/face.jpg", initials: "SO"}} quote="Words." title="Sample Organiser" />);
    expect(container.querySelector("img")!.getAttribute("src")).toBe("/face.jpg");
  });

  it("draws metrics with their source and footnote marks, and the link", () => {
    const {container} = render(
      <CatchStorySection
        link={{label: "Read the story", href: "/stories/sample"}}
        metrics={[{label: "A figure", value: "[N]", source: "From sample records", footnote: {label: "1", href: "#footnote-1"}}, {label: "Another", value: "[N]"}]}
        quote="Words."
        title="Sample"
      />,
    );
    expect(screen.getByText("From sample records")).toBeTruthy();
    expect(container.querySelector("sup a")!.getAttribute("href")).toBe("#footnote-1");
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getByRole("link", {name: "Read the story"}).dataset.variant).toBe("secondary");
  });

  it("sets media beside the copy and paints its ground", () => {
    render(<CatchStorySection ground="paper" media={<div data-testid="photo" />} quote="Words." title="Sample" />);
    expect(screen.getByTestId("photo")).toBeTruthy();
    expect(screen.getByRole("region").dataset.band).toBe("tile");
  });
});
