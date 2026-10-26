import {cleanup, fireEvent, render, screen} from "@testing-library/react";
import {afterEach, describe, expect, it} from "vitest";
import {CatchHeroImage} from "./CatchHeroImage";

afterEach(cleanup);

describe("CatchHeroImage", () => {
  it("shows the photo with its label under the scrim", () => {
    const {container} = render(<CatchHeroImage imageUrl=" /a.jpg " semanticLabel="Runners at sunset" />);
    expect(screen.getByRole("img", {name: "Runners at sunset"}).getAttribute("src")).toBe("/a.jpg");
    expect((container.firstElementChild as HTMLElement).dataset.scrim).toBe("true");
  });

  it("falls back to the gradient without a photo or when the photo fails", () => {
    const blank = render(<CatchHeroImage imageUrl="  " showScrim={false} />);
    expect(blank.container.querySelector("img")).toBeNull();
    expect((blank.container.firstElementChild as HTMLElement).dataset.scrim).toBeUndefined();
    cleanup();
    const failing = render(<CatchHeroImage imageUrl="/missing.jpg" />);
    fireEvent.error(failing.container.querySelector("img")!);
    expect(failing.container.querySelector("img")).toBeNull();
  });

  it("is decorative without a label and framed on request", () => {
    const {container} = render(<CatchHeroImage framed imageUrl="/a.jpg" />);
    expect(container.querySelector("img")!.getAttribute("alt")).toBe("");
    expect((container.firstElementChild as HTMLElement).dataset.framed).toBe("true");
  });
});
