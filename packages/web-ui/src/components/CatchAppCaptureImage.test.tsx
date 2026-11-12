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

  it("sizes, turns and bleeds the capture when asked, and a bleeding capture drops its caption", () => {
    render(<CatchAppCaptureImage alt="Host today" bleed caption="Today" height={1924} size="md" src="/today.png" tilt="right" width={980} />);
    const figure = screen.getByRole("figure");
    expect(figure.dataset).toMatchObject({size: "md", tilt: "right", bleed: ""});
    expect(figure.querySelector("figcaption")).toBeNull();
  });

  it("fills its column upright by default", () => {
    render(<CatchAppCaptureImage alt="Door" height={1924} src="/door.png" width={980} />);
    const figure = screen.getByRole("figure");
    expect(figure.dataset).toMatchObject({size: "fill", tilt: "none"});
    expect(figure.hasAttribute("data-bleed")).toBe(false);
  });
});
