import {cleanup, render, screen} from "@testing-library/react";
import {afterEach, describe, expect, it} from "vitest";
import {CatchCtaSection} from "./CatchCtaSection";
import {CatchRoot} from "./CatchRoot";

afterEach(cleanup);

describe("CatchCtaSection", () => {
  it("is a section named by its h2, with no header landmark", () => {
    const {container} = render(<CatchCtaSection lead="A lead." title="Sample closing headline" />);
    expect(screen.getByRole("region", {name: "Sample closing headline"}).tagName).toBe("SECTION");
    expect(screen.getByRole("heading", {level: 2})).toBeTruthy();
    expect(container.querySelector("header")).toBeNull();
  });

  it("draws actions, then the capture slot, then the store badges", () => {
    render(
      <CatchCtaSection
        actions={[{label: "Start", href: "/start"}]}
        capture={<form aria-label="Sample capture" />}
        stores={[
          {store: "appStore", label: "Download on the App Store", badgeSrc: "/app-store.svg", href: "https://example.com/app"},
          {store: "googlePlay", label: "Get it on Google Play", badgeSrc: "/google-play.png"},
        ]}
        title="Headline"
      />,
    );
    const action = screen.getByRole("link", {name: "Start"});
    const form = screen.getByRole("form", {name: "Sample capture"});
    const store = screen.getByRole("link", {name: "Download on the App Store"});
    expect(action.compareDocumentPosition(form) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(form.compareDocumentPosition(store) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    // A store with no link stays on the page as a button.
    expect(screen.getByRole("button", {name: "Get it on Google Play"})).toBeTruthy();
  });

  it("sets media beside the copy on an expanded page and runs it flush", () => {
    render(
      <CatchRoot size="expanded" theme="day">
        <CatchCtaSection flush ground="pink" media={<div data-testid="media" />} title="Headline" />
      </CatchRoot>,
    );
    const section = screen.getByRole("region");
    expect(section.dataset).toMatchObject({band: "dinner", pad: "none", flush: ""});
    expect(section.querySelector("[data-direction='row']")).not.toBeNull();
    expect(screen.getByTestId("media")).toBeTruthy();
  });

  it("sets a form beside the copy in place of media", () => {
    render(
      <CatchRoot size="expanded" theme="day">
        <CatchCtaSection form={<form aria-label="Sample form" />} ground="mint" title="Headline" />
      </CatchRoot>,
    );
    const row = screen.getByRole("region").querySelector("[data-direction='row']");
    expect(row).not.toBeNull();
    expect(row!.contains(screen.getByRole("form", {name: "Sample form"}))).toBe(true);
  });

  it("takes the dark theme on the ink ground", () => {
    render(<CatchCtaSection ground="ink" title="Headline" />);
    expect(screen.getByRole("region").querySelector("[data-catch-theme='dark']")).not.toBeNull();
  });

  it("sets the copy in a bento grid: two tiles, the copy, the other tiles, then the wide ones", () => {
    const {container} = render(
      <CatchCtaSection capture={<form aria-label="Notify" />} tiles={[
        {id: "book", ground: "coral", tag: "Book", body: "Book in a couple of taps.", aside: <span>Sunday run</span>},
        {id: "remind", ground: "yellow", tag: "Reminders", body: "A nudge the day before."},
        {id: "chat", ground: "ink", tag: "Group chat", body: "Your group chat stays open."},
        {id: "follow", ground: "mint", tag: "Follow", body: "The hosts you like."},
        {id: "solo", ground: "pink", tag: "On your own?", body: "Hosts plan a first hello.", wide: true},
        {id: "free", ground: "magenta", tag: "Free to use", body: "Browsing is free.", wide: true},
      ]} title="Be first in the app" />,
    );
    const grid = (container.querySelector("[data-wide='start']") as HTMLElement).parentElement as HTMLElement;
    const order = Array.from(grid.children).map((child) => (child as HTMLElement).dataset.ground ?? "copy");
    expect(order).toEqual(["coral", "yellow", "copy", "ink", "mint", "pink", "magenta"]);
    expect(Array.from(grid.children).map((child) => (child as HTMLElement).dataset.wide ?? "")).toEqual(["", "", "", "", "", "start", "end"]);
    expect(screen.getByRole("form", {name: "Notify"})).toBeTruthy();
    expect(screen.getByText("Sunday run")).toBeTruthy();
  });
});
