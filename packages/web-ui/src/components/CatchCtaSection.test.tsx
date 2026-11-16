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

  it("takes the dark theme on the ink ground", () => {
    render(<CatchCtaSection ground="ink" title="Headline" />);
    expect(screen.getByRole("region").querySelector("[data-catch-theme='dark']")).not.toBeNull();
  });
});
