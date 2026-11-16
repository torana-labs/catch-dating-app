import {cleanup, render, screen} from "@testing-library/react";
import {afterEach, describe, expect, it} from "vitest";
import {CatchBandHeader} from "./CatchBandHeader";
import {CatchRoot} from "./CatchRoot";
import {CatchSurface} from "./CatchSurface";

afterEach(cleanup);

describe("CatchBandHeader", () => {
  it("renders an h2 headline in the page-title role by default, with no kicker or lead", () => {
    const {container} = render(<CatchBandHeader title="Sample headline" />);
    const heading = screen.getByRole("heading", {level: 2, name: "Sample headline"});
    expect(heading.tagName).toBe("H2");
    // Outside a root the size class is compact: page-title resolves to display-title (38px).
    expect(heading.dataset.variant).toBe("display-title");
    expect(container.querySelectorAll("p")).toHaveLength(0);
    const header = container.querySelector<HTMLElement>("[data-direction]")!;
    expect(header.dataset).toMatchObject({align: "start", direction: "column"});
    expect(header.dataset.ground).toBeUndefined();
    expect(header.hasAttribute("data-catch-theme")).toBe(false);
  });

  it("renders an h1 at level 1 and caps the headline at display-xl (64px) on an expanded page", () => {
    render(
      <CatchRoot size="expanded" theme="day">
        <CatchBandHeader level={1} title="Sample page headline" />
      </CatchRoot>,
    );
    const heading = screen.getByRole("heading", {level: 1, name: "Sample page headline"});
    expect(heading.dataset.variant).toBe("display-xl");
  });

  it("shows the kicker above the headline and the lead in the secondary ink", () => {
    const {container} = render(<CatchBandHeader kicker="Sample kicker" lead="A sample lead sentence." title="Sample headline" />);
    const kicker = screen.getByText("Sample kicker");
    const heading = screen.getByRole("heading", {name: "Sample headline"});
    const lead = screen.getByText("A sample lead sentence.");
    expect(kicker.dataset).toMatchObject({variant: "label-kicker", tone: "secondary"});
    expect(lead.tagName).toBe("P");
    expect(lead.dataset).toMatchObject({variant: "body-lead", tone: "secondary"});
    const order = [...container.querySelectorAll("[data-variant]")].map((node) => node.textContent);
    expect(order).toEqual(["Sample kicker", "Sample headline", "A sample lead sentence."]);
  });

  it("takes a kicker tone", () => {
    render(<CatchBandHeader kicker="Sample kicker" kickerTone="warning" title="Sample headline" />);
    expect(screen.getByText("Sample kicker").dataset.tone).toBe("warning");
  });

  it("centres a column header and its parts", () => {
    const {container} = render(<CatchBandHeader align="center" kicker="Kicker" lead="Lead." title="Headline" />);
    expect(container.querySelector<HTMLElement>("[data-direction]")!.dataset.align).toBe("center");
    for (const text of ["Kicker", "Headline", "Lead."]) {
      expect(screen.getByText(text).dataset.align).toBe("center");
    }
  });

  it("sets a row's lead across from the headline on a wide page and starts it at the edge", () => {
    const {container} = render(
      <CatchRoot size="expanded" theme="day">
        <CatchBandHeader align="center" direction="row" lead="Lead." title="Headline" />
      </CatchRoot>,
    );
    const header = container.querySelector<HTMLElement>("[data-direction]")!;
    expect(header.dataset).toMatchObject({align: "start", direction: "row"});
    const row = header.firstElementChild as HTMLElement;
    expect(row.dataset).toMatchObject({direction: "row", equal: ""});
    expect(screen.getByText("Lead.").dataset.align).toBeUndefined();
  });

  it("stacks a row on a compact page", () => {
    const {container} = render(<CatchBandHeader direction="row" lead="Lead." title="Headline" />);
    const row = container.querySelector<HTMLElement>("[data-direction]")!.firstElementChild as HTMLElement;
    expect(row.dataset.direction).toBe("column");
  });

  it("names the headline for the band's aria-labelledby and passes id and labels to the header", () => {
    render(
      <section aria-labelledby="sample-title">
        <CatchBandHeader id="sample-anchor" title="Labelled headline" titleId="sample-title" />
      </section>,
    );
    expect(screen.getByRole("region", {name: "Labelled headline"})).toBeTruthy();
    expect(document.getElementById("sample-anchor")!.tagName).toBe("DIV");
  });

  it("adds no landmark, so a page of bands keeps its single banner", () => {
    render(
      <>
        <CatchBandHeader title="First band" />
        <CatchBandHeader title="Second band" />
      </>,
    );
    expect(screen.queryByRole("banner")).toBeNull();
    expect(screen.getAllByRole("heading", {level: 2})).toHaveLength(2);
  });

  it("takes a given ground's inks and the dark theme on ink, without a fill of its own", () => {
    const {container, rerender} = render(<CatchBandHeader ground="ink" title="Headline" />);
    const header = () => container.querySelector<HTMLElement>("[data-direction]")!;
    expect(header().dataset).toMatchObject({ground: "ink", catchTheme: "dark"});
    rerender(<CatchBandHeader ground="mint" title="Headline" />);
    expect(header().dataset).toMatchObject({ground: "mint", catchTheme: "light"});
  });

  it("reads an ink band's theme from the surface when no ground is given", () => {
    render(
      <CatchSurface block="band" color="ink">
        <CatchBandHeader title="Night headline" />
      </CatchSurface>,
    );
    const heading = screen.getByRole("heading", {name: "Night headline"});
    expect(heading.closest("[data-catch-theme]")!.getAttribute("data-catch-theme")).toBe("dark");
    expect(heading.closest("[data-direction]")!.hasAttribute("data-catch-theme")).toBe(false);
  });
});
