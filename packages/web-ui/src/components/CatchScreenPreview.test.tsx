import {cleanup, render, screen} from "@testing-library/react";
import {afterEach, describe, expect, it} from "vitest";
import {CatchScreenPreview} from "./CatchScreenPreview";

afterEach(cleanup);

const focusable = "a, button, input, select, textarea, [tabindex], [contenteditable]";

describe("CatchScreenPreview", () => {
  it("is one image named by its label, with nothing in it that takes focus", () => {
    const {container} = render(
      <CatchScreenPreview
        buttons={[{label: "Sample action"}, {label: "Second action"}]}
        choices={[{label: "Pick one", options: ["First", "Second"], selected: 1}]}
        counters={[{title: "Places", value: "2"}]}
        fields={[{label: "Name", placeholder: "Your name"}]}
        rows={[{title: "Sample row", subtitle: "Second line", tag: "Done", tone: "success"}]}
        semanticsLabel="A sample screen"
        title="Sample screen"
      />,
    );
    const image = screen.getByRole("img", {name: "A sample screen"});
    expect(image.tagName).toBe("DIV");
    expect(container.querySelectorAll(focusable)).toHaveLength(0);
    // The buttons are drawn as non-interactive button labels.
    expect(screen.getByText("Sample action").closest("[data-static]")).not.toBeNull();
    expect(container.querySelector("figcaption")).toBeNull();
  });

  it("shows a caption under the screen", () => {
    render(<CatchScreenPreview caption="Illustrative screen" semanticsLabel="A sample screen" title="Sample" />);
    expect(screen.getByText("Illustrative screen").closest("figcaption")).not.toBeNull();
  });

  it("draws a card's parts in order: pill, title, subtitle, stats, rows, fine print", () => {
    render(
      <CatchScreenPreview
        fine="Fine print"
        label="Pill"
        rows={[{title: "Row title", value: "38"}]}
        semanticsLabel="Card"
        stats={[{value: "31", label: "counted"}]}
        subtitle="Subtitle"
        title="Title"
      />,
    );
    const order = ["Pill", "Title", "Subtitle", "31", "Row title", "38", "Fine print"].map((text) => screen.getByText(text));
    for (let index = 1; index < order.length; index += 1) {
      expect(order[index - 1].compareDocumentPosition(order[index]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }
  });

  it("marks the selected choices and clamps bar shares", () => {
    const {container} = render(
      <CatchScreenPreview
        bars={[{label: "Over", value: "120%", share: 140, accent: "mint"}]}
        choices={[{label: "Pick", options: ["A", "B", "C"], selected: [0, 2]}]}
        semanticsLabel="Card"
      />,
    );
    const options = [...container.querySelectorAll("[data-selected]")].map((node) => node.textContent);
    expect(options).toEqual(["A", "C"]);
    const fill = container.querySelector<HTMLElement>("[data-accent='mint']")!;
    expect(fill.style.getPropertyValue("--catch-preview-share")).toBe("100%");
  });

  it("frames an image in a phone or tablet and keeps it decorative", () => {
    const {container, rerender} = render(<CatchScreenPreview image="/phone.png" kind="phone" semanticsLabel="Phone screen" />);
    expect(container.querySelector("[data-kind='phone'] img")!.getAttribute("alt")).toBe("");
    rerender(<CatchScreenPreview image="/tablet.png" kind="tablet" semanticsLabel="Tablet screen" tilt="left" />);
    expect(container.querySelector("[data-kind='tablet']")).not.toBeNull();
    expect(screen.getByRole("img", {name: "Tablet screen"})).toBeTruthy();
  });

  it("puts the card on a phone screen for phonecard", () => {
    const {container} = render(<CatchScreenPreview kind="phonecard" semanticsLabel="On a phone" title="Phone card" />);
    expect(container.querySelector("[data-kind='phone']")!.textContent).toContain("Phone card");
  });

  it("draws a photo with its tag, and tiles on their grounds", () => {
    const {container, rerender} = render(<CatchScreenPreview image="/photo.jpg" kind="photo" semanticsLabel="Photo" tag="Sample tag" />);
    expect(screen.getByText("Sample tag")).toBeTruthy();
    rerender(<CatchScreenPreview kind="tiles" semanticsLabel="Tiles" tiles={[{title: "One", ground: "mint"}, {title: "Two"}]} />);
    expect([...container.querySelectorAll("[data-ground]:not([data-ground=ground])")].map((node) => node.getAttribute("data-ground"))).toEqual(["mint", "paper"]);
  });

  it("keeps the day theme on any band and takes a tone, tilt and flat card", () => {
    const {container} = render(<CatchScreenPreview flat semanticsLabel="Card" tilt="right" title="Toned" tone="yellow" />);
    expect(screen.getByRole("img").getAttribute("data-catch-theme")).toBe("light");
    const card = container.querySelector<HTMLElement>("[data-ground='yellow']")!;
    expect(card.dataset).toMatchObject({tilt: "right", flat: ""});
  });
});
