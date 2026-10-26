import {cleanup, fireEvent, render, screen} from "@testing-library/react";
import {afterEach, describe, expect, it} from "vitest";
import {MapPreview} from "./MapPreview";

afterEach(cleanup);

const jetty = {latitude: 19.0656, longitude: 72.8226};

describe("MapPreview", () => {
  it("shows the provider's map named by the fallback label", () => {
    render(<MapPreview coordinate={jetty} fallbackLabel="Carter Road jetty" imageUrl="/maps/jetty.png" />);
    expect(screen.getByRole("img", {name: "Carter Road jetty"}).getAttribute("src")).toBe("/maps/jetty.png");
  });

  it("falls back without a coordinate or a map image", () => {
    const missing = render(<MapPreview fallbackLabel="Carter Road jetty" imageUrl="/maps/jetty.png" />);
    expect(missing.container.querySelector("img")).toBeNull();
    expect(missing.container.textContent).toBe("Carter Road jetty");
    cleanup();
    const noImage = render(<MapPreview coordinate={jetty} fallbackLabel="  " framed />);
    expect(noImage.container.querySelector("img")).toBeNull();
    expect(noImage.container.textContent).toBe("");
    expect((noImage.container.firstElementChild as HTMLElement).dataset.framed).toBe("true");
  });

  it("falls back when the map fails to load, and tries a new map again", () => {
    const {container, rerender} = render(<MapPreview coordinate={jetty} fallbackLabel="Carter Road jetty" imageUrl="/maps/jetty.png" />);
    fireEvent.error(screen.getByRole("img", {name: "Carter Road jetty"}));
    expect(container.querySelector("img")).toBeNull();
    expect(container.textContent).toBe("Carter Road jetty");
    rerender(<MapPreview coordinate={jetty} fallbackLabel="Carter Road jetty" imageUrl="/maps/jetty-2.png" />);
    expect(screen.getByRole("img", {name: "Carter Road jetty"}).getAttribute("src")).toBe("/maps/jetty-2.png");
  });
});
