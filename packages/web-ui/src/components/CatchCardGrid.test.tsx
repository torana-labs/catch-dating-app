import {cleanup, render, screen, within} from "@testing-library/react";
import {afterEach, describe, expect, it} from "vitest";
import {CatchCardGrid} from "./CatchCardGrid";

afterEach(cleanup);

const plans = [
  {id: "one", href: "/plans/one", title: "First plan", label: "Sample label", detail: "Sample host · Sample area", price: "Free", posterLabel: "Sample"},
  {id: "two", href: "/plans/two", title: "Second plan", label: "Sample label", detail: "Sample host · Sample area", price: "Free", posterLabel: "Sample"},
];

describe("CatchCardGrid", () => {
  it("is a section named by its headline, the cards a list in the given columns", () => {
    const {container} = render(<CatchCardGrid columns={4} items={plans} kind="plan" title="Sample plans" />);
    const section = screen.getByRole("region", {name: "Sample plans"});
    expect(section.dataset.kind).toBe("plan");
    const list = container.querySelector<HTMLElement>("[data-columns]")!;
    expect(list.dataset.columns).toBe("4");
    expect(within(list).getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getByRole("link", {name: /First plan/}).getAttribute("href")).toBe("/plans/one");
  });

  it("takes a label when it has no headline", () => {
    render(<CatchCardGrid items={plans} kind="plan" label="Sample grid" />);
    expect(screen.getByRole("region", {name: "Sample grid"})).toBeTruthy();
    expect(screen.queryByRole("heading", {level: 2})).toBeNull();
  });

  it("places the filters slot and the links between the header and the cards", () => {
    render(
      <CatchCardGrid
        filters={<div role="group" aria-label="Sample filters" />}
        items={plans}
        kind="plan"
        links={[{label: "Other link", href: "/other"}]}
        title="Plans"
      />,
    );
    const filters = screen.getByRole("group", {name: "Sample filters"});
    const link = screen.getByRole("link", {name: "Other link"});
    const card = screen.getByRole("link", {name: /First plan/});
    expect(filters.compareDocumentPosition(link) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(link.compareDocumentPosition(card) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("shows the empty state, announced, when there are no items", () => {
    render(<CatchCardGrid empty={{title: "Nothing here yet", message: "Try another filter."}} items={[]} kind="plan" title="Plans" />);
    expect(screen.getByText("Nothing here yet")).toBeTruthy();
    expect(screen.getByRole("status")).toBeTruthy();
    expect(screen.queryByRole("list")).toBeNull();
  });

  it("draws city cards: live on white with a success tag and a primary action", () => {
    render(
      <CatchCardGrid
        items={[
          {id: "a", title: "First city", status: "Open", live: true, body: "A line", action: {label: "See more", href: "/a"}},
          {id: "b", title: "Second city", status: "Soon", action: {label: "Notify me", href: "/b"}},
        ]}
        kind="city"
        title="Cities"
      />,
    );
    expect(screen.getByRole("heading", {level: 3, name: "First city"}).closest("[data-ground]")!.getAttribute("data-ground")).toBe("white");
    expect(screen.getByRole("link", {name: "See more"}).dataset.variant).toBe("primary");
    expect(screen.getByRole("link", {name: "Notify me"}).dataset.variant).toBe("secondary");
  });

  it("draws person, story, review and organiser cards", () => {
    const {rerender} = render(<CatchCardGrid items={[{id: "p", name: "Sample person", role: "Sample role"}]} kind="person" title="People" />);
    expect(screen.getByRole("heading", {level: 3, name: "Sample person"})).toBeTruthy();
    rerender(<CatchCardGrid items={[{id: "s", title: "Sample story", href: "/s"}]} kind="story" title="Stories" />);
    expect(screen.getByRole("article", {name: "Sample story"})).toBeTruthy();
    rerender(<CatchCardGrid items={[{id: "r", name: "Sample reviewer", body: "A sample review.", rating: 5, ratingLabel: "5 out of 5"}]} kind="review" title="Reviews" />);
    expect(screen.getByText("A sample review.")).toBeTruthy();
    rerender(
      <CatchCardGrid
        items={[{id: "o", name: "Sample organiser", subtitle: "Sample runs", monogramGround: "coral", next: "Next: sample", footnote: "Sample footnote"}]}
        kind="org"
        title="Organisers"
      />,
    );
    expect(screen.getByText("Sample organiser")).toBeTruthy();
  });

  it("uses h2 card titles under a level-1 headline", () => {
    render(<CatchCardGrid items={[{id: "p", name: "Sample person"}]} kind="person" level={1} title="Directory" />);
    expect(screen.getByRole("heading", {level: 1, name: "Directory"})).toBeTruthy();
    expect(screen.getByRole("heading", {level: 2, name: "Sample person"})).toBeTruthy();
  });

  it("draws actions under the cards and paints its ground", () => {
    render(<CatchCardGrid actions={[{label: "See all", href: "/all"}]} ground="paper" items={plans} kind="plan" title="Plans" />);
    expect(screen.getByRole("link", {name: "See all"})).toBeTruthy();
    expect(screen.getByRole("region").dataset.band).toBe("tile");
  });
});
