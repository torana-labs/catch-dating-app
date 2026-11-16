import {cleanup, render, screen} from "@testing-library/react";
import {afterEach, describe, expect, it} from "vitest";
import {CatchHeroSection} from "./CatchHeroSection";
import {CatchRoot} from "./CatchRoot";

afterEach(cleanup);

describe("CatchHeroSection", () => {
  it("is a section named by its h1, with no header landmark", () => {
    const {container} = render(<CatchHeroSection title="Sample headline" />);
    const heading = screen.getByRole("heading", {level: 1, name: "Sample headline"});
    const section = screen.getByRole("region", {name: "Sample headline"});
    expect(section.tagName).toBe("SECTION");
    expect(section.getAttribute("aria-labelledby")).toBe(heading.id);
    expect(container.querySelector("header")).toBeNull();
  });

  it("takes level 2 and caps the headline at 64px on an expanded page", () => {
    render(<CatchRoot size="expanded" theme="day"><CatchHeroSection level={2} title="Second" /></CatchRoot>);
    expect(screen.getByRole("heading", {level: 2, name: "Second"}).dataset.variant).toBe("display-xl");
  });

  it("draws the copy in order: kicker, headline, lead, labels, proof, actions, note, link", () => {
    const {container} = render(
      <CatchHeroSection
        actions={[{label: "Primary action", href: "/a"}, {label: "Second action", href: "/b"}]}
        kicker="Kicker"
        labels={["First label", "Second label"]}
        lead="A sample lead."
        link={{label: "Side link", href: "/side"}}
        note="A small note."
        proof={[{text: "First proof", footnote: {label: "1", href: "#footnote-1"}}, {text: "Second proof"}]}
        title="Headline"
      />,
    );
    const order = ["Kicker", "Headline", "A sample lead.", "First label", "First proof", "Primary action", "A small note.", "Side link"]
      .map((text) => screen.getByText(text));
    for (let index = 1; index < order.length; index += 1) {
      expect(order[index - 1].compareDocumentPosition(order[index]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }
    expect(screen.getByRole("link", {name: "Primary action"}).dataset.variant).toBe("primary");
    expect(screen.getByRole("link", {name: "Second action"}).dataset.variant).toBe("secondary");
    expect(container.querySelector("sup a")!.getAttribute("href")).toBe("#footnote-1");
    expect(screen.getByRole("link", {name: "Side link"}).getAttribute("href")).toBe("/side");
    expect(screen.getAllByRole("listitem")).toHaveLength(4);
  });

  it("sets the media beside the copy and floats the aside card over it", () => {
    render(
      <CatchHeroSection
        aside={{title: "Card title", rows: [{label: "First", value: "12"}, {label: "Second", value: "3"}]}}
        media={<div data-testid="media" />}
        title="Headline"
      />,
    );
    expect(screen.getByTestId("media")).toBeTruthy();
    expect(screen.getByText("First").closest("dt")).not.toBeNull();
    expect(screen.getByText("12").closest("dd")).not.toBeNull();
    expect(screen.getByRole("region").dataset.pad).toBe("none");
  });

  it("paints the ground as the band colour and the ink ground in the dark theme", () => {
    const {rerender} = render(<CatchHeroSection ground="coral" title="Headline" />);
    expect(screen.getByRole("region").dataset).toMatchObject({band: "run", format: "run"});
    rerender(<CatchHeroSection ground="ink" title="Headline" />);
    const section = screen.getByRole("region");
    expect(section.dataset.band).toBe("ink");
    expect(section.querySelector("[data-catch-theme='dark']")).not.toBeNull();
  });

  it("sets the photo layout's copy in the dark theme over the photo", () => {
    const {container} = render(<CatchHeroSection image="/photo.jpg" imageAlt="A sample photo" layout="photo" labels={["Tag"]} title="Photo headline" />);
    expect(screen.getByRole("region", {name: "Photo headline"}).dataset.layout).toBe("photo");
    expect(screen.getByRole("img", {name: "A sample photo"}).getAttribute("src")).toBe("/photo.jpg");
    expect(screen.getByRole("heading", {name: "Photo headline"}).closest("[data-catch-theme='dark']")).not.toBeNull();
    expect(container.querySelector("[data-ground='night']")).not.toBeNull();
  });

  it("passes an id through as the band's anchor", () => {
    render(<CatchHeroSection id="top" title="Headline" />);
    expect(screen.getByRole("region").id).toBe("top");
  });
});
