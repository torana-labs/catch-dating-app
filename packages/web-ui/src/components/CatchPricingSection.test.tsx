import {cleanup, render, screen} from "@testing-library/react";
import {afterEach, describe, expect, it} from "vitest";
import {CatchPricingSection} from "./CatchPricingSection";

afterEach(cleanup);

describe("CatchPricingSection", () => {
  it("is a section named by its h2, with the rate as a figure above it", () => {
    const {container} = render(<CatchPricingSection kicker="Kicker" rate="[N]%" title="of a sample amount" />);
    const section = screen.getByRole("region", {name: "of a sample amount"});
    const rate = screen.getByText("[N]%");
    expect(rate.tagName).toBe("P");
    expect(rate.dataset.variant).toBe("display-giant");
    expect(rate.compareDocumentPosition(screen.getByRole("heading", {level: 2})) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(section.tagName).toBe("SECTION");
    expect(container.querySelector("header")).toBeNull();
  });

  it("draws the cap, trial, actions and worked examples", () => {
    render(
      <CatchPricingSection
        actions={[{label: "Start", href: "/start", variant: "light"}]}
        cap="A sample cap line."
        examples={[{title: "A first example", value: "[N]", body: "How it is reached."}, {title: "A second example", value: "[N]"}]}
        rate="[N]%"
        title="Headline"
        trial="A sample trial line."
      />,
    );
    expect(screen.getByText("A sample cap line.")).toBeTruthy();
    expect(screen.getByText("A sample trial line.").dataset.tone).toBe("secondary");
    expect(screen.getByRole("link", {name: "Start"}).dataset.variant).toBe("light");
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getByText("How it is reached.")).toBeTruthy();
  });

  it("places the calculator slot, then numbered footnotes with their ids", () => {
    render(
      <CatchPricingSection
        calculator={<form aria-label="Sample calculator" />}
        footnotes={[{id: "footnote-1", body: "A first footnote."}, {body: "A second footnote."}]}
        rate="[N]%"
        title="Headline"
      />,
    );
    const form = screen.getByRole("form", {name: "Sample calculator"});
    const footnote = screen.getByText("A first footnote.").closest("li")!;
    expect(footnote.id).toBe("footnote-1");
    expect(footnote.parentElement!.tagName).toBe("OL");
    expect(form.compareDocumentPosition(footnote) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("takes the dark theme on the ink ground", () => {
    render(<CatchPricingSection ground="ink" rate="[N]%" title="Headline" />);
    expect(screen.getByRole("region").dataset.band).toBe("ink");
  });

  it("draws its kicker in the night accent on the ink band and the day accent on white", () => {
    const {rerender} = render(<CatchPricingSection ground="ink" kicker="Pricing" rate="[N]%" title="Headline" />);
    expect(screen.getByText("Pricing").dataset).toMatchObject({accent: "yellow", on: "night"});
    rerender(<CatchPricingSection kicker="Pricing" rate="[N]%" title="Headline" />);
    expect(screen.getByText("Pricing").dataset).toMatchObject({accent: "yellow", on: "day"});
  });
});
