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

  it("places the footer row under the cards and before the actions", () => {
    render(<CatchCardGrid actions={[{label: "See all", href: "/all"}]} footer={<form aria-label="Sample footer" />} items={plans} kind="plan" title="Plans" />);
    const card = screen.getByRole("link", {name: /First plan/});
    const footer = screen.getByRole("form", {name: "Sample footer"});
    const action = screen.getByRole("link", {name: "See all"});
    expect(card.compareDocumentPosition(footer) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(footer.compareDocumentPosition(action) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("draws entry tiles as links on their grounds, six across, with an icon and a heading each", () => {
    const {container} = render(
      <CatchCardGrid columns={6} items={[
        {id: "new", title: "New to Mumbai", body: "Plans that welcome first-timers.", href: "/mumbai/", ground: "coral", icon: "location"},
        {id: "safety", title: "Safety first", body: "Reviews from people who went.", href: "#safety", ground: "ink", icon: "safety"},
      ]} kind="entry" title="Whoever you are" />,
    );
    const tile = screen.getByRole("link", {name: /New to Mumbai/});
    expect(tile.dataset.ground).toBe("coral");
    expect(screen.getByRole("link", {name: /Safety first/}).dataset.catchTheme).toBe("dark");
    expect(screen.getByRole("heading", {level: 3, name: "New to Mumbai"})).toBeTruthy();
    expect((container.querySelector("ul") as HTMLElement).dataset).toMatchObject({kind: "entry", columns: "6"});
  });

  it("draws format cards with a photo, or the format's artwork without one, in a rail with chips and a header action", () => {
    const {container} = render(
      <CatchCardGrid chips={[{label: "Yoga and fitness", href: "/mumbai/?q=yoga", dot: "indigo"}]} columns={5}
        headerAction={{label: "See everything", href: "/mumbai/"}} items={[
          {id: "run", title: "Runs and walks", body: "Pace groups.", more: "Run clubs in Mumbai", href: "/mumbai/?format=run", ground: "coral", format: "run", photoUrl: "/run.jpg"},
          {id: "games", title: "Games and quizzes", body: "Teams and rounds.", more: "Quiz nights in Mumbai", href: "/mumbai/?format=games", ground: "yellow", format: "games"},
        ]} kind="format" layout="rail" title="Start with what you feel like doing" />,
    );
    const run = screen.getByRole("link", {name: /Runs and walks/});
    expect(run.querySelector("img")?.getAttribute("src")).toBe("/run.jpg");
    expect(screen.getByRole("link", {name: /Games and quizzes/}).querySelector("img[src='/run.jpg']")).toBeNull();
    expect((container.querySelector("ul") as HTMLElement).dataset).toMatchObject({kind: "format", layout: "rail"});
    expect(screen.getByRole("link", {name: "Yoga and fitness"}).getAttribute("href")).toBe("/mumbai/?q=yoga");
    const heading = screen.getByRole("heading", {level: 2});
    const action = screen.getByRole("link", {name: "See everything"});
    expect(heading.compareDocumentPosition(action) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(action.compareDocumentPosition(run) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("adds titled chip rows after the chips, each list named by its title, with a dot only where a chip names one", () => {
    render(
      <CatchCardGrid chipGroups={[{title: "By organisation", chips: [{label: "Venues", href: "/host/venues/"}]}, {title: "Empty row", chips: []}]}
        chips={[{label: "Studios", href: "/host/studios/", dot: "indigo"}]}
        items={[{id: "run", title: "Run clubs", body: "Pace groups.", more: "For run clubs", href: "/host/run-clubs/", ground: "coral", format: "run"}]}
        kind="format" layout="rail" title="Find your page" />,
    );
    const row = screen.getByRole("list", {name: "By organisation"});
    expect(within(row).getByRole("link", {name: "Venues"}).getAttribute("href")).toBe("/host/venues/");
    expect(within(row).getByRole("link", {name: "Venues"}).querySelector("[data-ground]")).toBeNull();
    expect(screen.getByRole("link", {name: "Studios"}).querySelector("[data-ground='indigo']")).toBeTruthy();
    expect(screen.queryByText("Empty row")).toBeNull();
  });
});
