import {cleanup, fireEvent, render, screen} from "@testing-library/react";
import {afterEach, describe, expect, it} from "vitest";
import {EventThumbnail} from "./EventThumbnail";

afterEach(cleanup);

describe("EventThumbnail", () => {
  it("shows the uploaded photo when there is one", () => {
    const {container} = render(<EventThumbnail photoUrl="/poster.jpg" activityKind="dinner" semanticLabel="Supper club poster" />);

    const photo = screen.getByRole("img", {name: "Supper club poster"});
    expect(photo.getAttribute("src")).toBe("/poster.jpg");
    expect(photo.getAttribute("loading")).toBe("lazy");
    expect(photo.dataset.fit).toBe("cover");
    expect(container.querySelector("[data-activity-kind]")).toBeNull();
  });

  it("draws the activity artwork without a photo, never a stand-in", () => {
    const {container} = render(<EventThumbnail photoUrl="  " activityKind="dinner" />);

    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("[data-activity-kind]")?.getAttribute("data-activity-kind")).toBe("dinner");
  });

  it("falls back to the artwork when the photo fails to load", () => {
    const {container} = render(<EventThumbnail photoUrl="/missing.jpg" activityKind="tennis" />);

    fireEvent.error(container.querySelector("img")!);
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("[data-activity-kind]")?.getAttribute("data-activity-kind")).toBe("tennis");
  });

  it("loads an above-the-fold poster eagerly, whole", () => {
    const {container} = render(<EventThumbnail photoUrl="/poster.jpg" activityKind="dinner" loading="eager" fit="contain" />);

    expect(container.querySelector("img")?.getAttribute("fetchpriority")).toBe("high");
    expect(container.querySelector("img")?.dataset.fit).toBe("contain");
  });
});
