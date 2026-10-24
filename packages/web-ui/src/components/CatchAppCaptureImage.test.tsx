import {cleanup, render, screen} from "@testing-library/react";
import {afterEach, describe, expect, it} from "vitest";
import {CatchAppCaptureImage} from "./CatchAppCaptureImage";

afterEach(cleanup);

describe("CatchAppCaptureImage", () => {
  it("draws the capture with its caption and disclosure in one figure", () => {
    render(
      <CatchAppCaptureImage
        src="/capture.png"
        alt="Live operations screen"
        width={1020}
        height={1964}
        caption="Confirm guest arrivals."
        disclosure="Fictional app preview."
      />,
    );

    const figure = screen.getByRole("figure");
    const image = screen.getByRole("img", {name: "Live operations screen"});
    expect(figure.contains(image)).toBe(true);
    expect(figure.querySelector("figcaption")?.textContent).toBe("Confirm guest arrivals.Fictional app preview.");
    expect(image.getAttribute("width")).toBe("1020");
    expect(image.getAttribute("height")).toBe("1964");
    expect(image.getAttribute("loading")).toBe("lazy");
    expect(image.hasAttribute("fetchpriority")).toBe(false);
  });

  it("loads an above-the-fold capture eagerly at high priority", () => {
    render(<CatchAppCaptureImage src="/capture.png" alt="Today" width={10} height={20} loading="eager" />);

    const image = screen.getByRole("img", {name: "Today"});
    expect(image.getAttribute("loading")).toBe("eager");
    expect(image.getAttribute("fetchpriority")).toBe("high");
  });

  it("leaves out the caption when there is nothing to say", () => {
    const {container} = render(<CatchAppCaptureImage src="/capture.png" alt="Today" width={10} height={20} />);

    expect(container.querySelector("figcaption")).toBeNull();
  });
});
