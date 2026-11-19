import {cleanup, render, screen} from "@testing-library/react";
import {afterEach, describe, expect, it} from "vitest";
import {CatchAppCaptureImage} from "./CatchAppCaptureImage";

afterEach(cleanup);

describe("CatchAppCaptureImage", () => {
  it("draws the capture with its caption in one figure", () => {
    render(
      <CatchAppCaptureImage
        src="/capture.png"
        alt="Live operations screen"
        width={804}
        height={1748}
        caption="Confirm guest arrivals."
      />,
    );

    const figure = screen.getByRole("figure");
    const image = screen.getByRole("img", {name: "Live operations screen"});
    expect(figure.contains(image)).toBe(true);
    expect(figure.querySelector("figcaption")?.textContent).toBe("Confirm guest arrivals.");
    expect(image.getAttribute("width")).toBe("804");
    expect(image.getAttribute("height")).toBe("1748");
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
    render(<CatchAppCaptureImage alt="Host today" bleed caption="Today" height={1748} size="md" src="/today.png" tilt="right" width={804} />);
    const figure = screen.getByRole("figure");
    expect(figure.dataset).toMatchObject({size: "md", tilt: "right", bleed: ""});
    expect(figure.querySelector("figcaption")).toBeNull();
  });

  it("fills its column upright and bare by default", () => {
    render(<CatchAppCaptureImage alt="Door" height={1748} src="/door.png" width={804} />);
    const figure = screen.getByRole("figure");
    expect(figure.dataset).toMatchObject({size: "fill", tilt: "none"});
    expect(figure.hasAttribute("data-bleed")).toBe(false);
    expect(figure.hasAttribute("data-device")).toBe(false);
    expect(screen.getByRole("img", {name: "Door"}).parentElement).toBe(figure);
  });

  it("with a device, draws the screen in that device's frame, the only frame, turned with it", () => {
    render(<CatchAppCaptureImage alt="Explore" bleed device="phone" height={1748} loading="eager" size="hero" src="/explore.png" tilt="left" width={804} />);
    const figure = screen.getByRole("figure");
    expect(figure.dataset).toMatchObject({device: "phone", size: "hero", tilt: "left", bleed: ""});
    const frame = figure.querySelector("[data-kind]") as HTMLElement;
    expect(frame.dataset).toMatchObject({kind: "phone", tilt: "left"});
    expect(frame.contains(screen.getByRole("img", {name: "Explore"}))).toBe(true);
    expect(figure.querySelectorAll("[data-kind]")).toHaveLength(1);
  });

  it("draws a tablet capture in the tablet frame", () => {
    render(<CatchAppCaptureImage alt="Tablet" device="tablet" height={1668} src="/tablet.png" width={2388} />);
    const frame = screen.getByRole("figure").querySelector("[data-kind]") as HTMLElement;
    expect(frame.dataset).toMatchObject({kind: "tablet", orientation: "landscape"});
  });
});
