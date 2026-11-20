import {cleanup, render, screen, within} from "@testing-library/react";
import {afterEach, describe, expect, it} from "vitest";
import {CatchRoot} from "./CatchRoot";
import {CatchSplitSection} from "./CatchSplitSection";

afterEach(cleanup);

const columns = (section: HTMLElement) => section.querySelector<HTMLElement>("[data-direction]")!;

describe("CatchSplitSection", () => {
  it("is a section named by its h2, the copy alone when there is no second column", () => {
    const {container} = render(<CatchSplitSection id="anchor" lead="A lead." title="Sample headline" />);
    const section = screen.getByRole("region", {name: "Sample headline"});
    expect(section.tagName).toBe("SECTION");
    expect(section.id).toBe("anchor");
    expect(screen.getByRole("heading", {level: 2, name: "Sample headline"})).toBeTruthy();
    expect(container.querySelector("header")).toBeNull();
    expect(container.querySelector("[data-equal]")).toBeNull();
  });

  it("sets the media beside the copy, centred by default and at the start when asked", () => {
    const {rerender} = render(
      <CatchRoot size="expanded" theme="day">
        <CatchSplitSection media={<div data-testid="media" />} title="Headline" />
      </CatchRoot>,
    );
    const section = screen.getByRole("region");
    expect(columns(section).dataset).toMatchObject({direction: "row", align: "center"});
    expect(screen.getByTestId("media")).toBeTruthy();
    rerender(
      <CatchRoot size="expanded" theme="day">
        <CatchSplitSection align="start" media={<div />} title="Headline" />
      </CatchRoot>,
    );
    expect(columns(screen.getByRole("region")).dataset.align).toBe("start");
  });

  it("draws ticks, groups (h3 under an h2), a metric, a body and actions in the copy", () => {
    render(
      <CatchSplitSection
        actions={[{label: "Act", href: "/act"}]}
        body="A closing paragraph."
        groups={[{title: "First group", marker: "01", list: ["Line one", "Line two"], link: {label: "More", href: "/more"}}]}
        metric={{value: "3", label: "A figure", note: "A note"}}
        ticks={["First tick", "Second tick"]}
        title="Headline"
      />,
    );
    expect(screen.getByText("First tick")).toBeTruthy();
    expect(screen.getByRole("heading", {level: 3, name: "01First group"})).toBeTruthy();
    expect(screen.getByRole("link", {name: "More"}).getAttribute("href")).toBe("/more");
    expect(screen.getByText("A figure")).toBeTruthy();
    expect(screen.getByText("A closing paragraph.").tagName).toBe("P");
    expect(screen.getByRole("link", {name: "Act"}).dataset.variant).toBe("primary");
  });

  it("makes a group's title its link when the link has no words of its own, with no second link under it", () => {
    render(<CatchSplitSection groups={[{title: "Your page", marker: "1", list: ["Line one"], link: {href: "/your-page/"}}]} title="Headline" />);
    const heading = screen.getByRole("heading", {level: 3});
    const link = within(heading).getByRole("link", {name: "Your page"});
    expect(link.getAttribute("href")).toBe("/your-page/");
    expect(screen.getAllByRole("link")).toHaveLength(1);
  });

  it("puts steps in the second column without media, and under the copy beside media", () => {
    const steps = [{title: "First step", marker: "8:00 PM", body: "A note"}, {title: "Second step"}];
    const {rerender, container} = render(
      <CatchRoot size="expanded" theme="day"><CatchSplitSection steps={steps} title="Headline" /></CatchRoot>,
    );
    const row = columns(screen.getByRole("region"));
    expect(within(row.children[1] as HTMLElement).getByText("First step")).toBeTruthy();
    expect(screen.getByText("8:00 PM")).toBeTruthy();
    rerender(
      <CatchRoot size="expanded" theme="day"><CatchSplitSection media={<div data-testid="media" />} steps={steps} title="Headline" /></CatchRoot>,
    );
    const next = columns(screen.getByRole("region"));
    expect(within(next.children[0] as HTMLElement).getByText("First step")).toBeTruthy();
    expect(within(next.children[1] as HTMLElement).getByTestId("media")).toBeTruthy();
    expect(container.querySelectorAll("ol")).toHaveLength(1);
  });

  it("draws unmarked steps as the canvas's numbered step cards, on the ink panel too", () => {
    const steps = [{title: "Find a plan", body: "Who is hosting"}, {title: "Show up"}];
    const {rerender} = render(<CatchSplitSection ground="ink" kicker="How a night works" steps={steps} title="Headline" />);
    const list = screen.getByRole("list");
    expect(list.dataset.on).toBe("night");
    expect(within(list).getAllByRole("listitem").map((item) => item.textContent)).toEqual(["1Find a planWho is hosting", "2Show up"]);
    expect(screen.getByRole("heading", {level: 3, name: "Find a plan"}).dataset.variant).toBe("title-bar");
    expect(screen.getByText("How a night works").dataset).toMatchObject({accent: "coral", on: "night"});
    rerender(<CatchSplitSection ground="mint" steps={steps} title="Headline" />);
    expect(screen.getByRole("list").dataset.on).toBe("colour");
    rerender(<CatchSplitSection kicker="Safety" steps={steps} title="Headline" />);
    expect(screen.getByRole("list").dataset.on).toBe("day");
    expect(screen.getByText("Safety").dataset).toMatchObject({accent: "indigo", on: "day"});
  });

  it("draws a checklist of white tiles", () => {
    render(<CatchSplitSection checks={[{title: "First check", body: "Why"}, {title: "Second check"}]} ground="paper" title="Headline" />);
    const tile = screen.getByText("First check").closest("li")!;
    expect(tile.dataset.ground).toBe("white");
    expect(screen.getByRole("region").dataset.band).toBe("tile");
  });

  it("runs flush media to the band's bottom edge", () => {
    render(<CatchSplitSection flush ground="ink" media={<div />} title="Headline" />);
    const section = screen.getByRole("region");
    expect(section.dataset).toMatchObject({pad: "none", flush: "", band: "ink"});
    expect(section.querySelector("[data-catch-theme='dark']")).not.toBeNull();
  });

  it("ignores flush without media", () => {
    render(<CatchSplitSection flush title="Headline" />);
    expect(screen.getByRole("region").dataset.pad).toBe("lg");
  });
});
