import {cleanup, render, screen} from "@testing-library/react";
import {afterEach, describe, expect, it} from "vitest";
import {CatchRouteCard} from "./CatchRouteCard";

afterEach(cleanup);

describe("CatchRouteCard", () => {
  it("leads with an underlined link by default, opening a new tab when asked", () => {
    const {container} = render(<CatchRouteCard action={{label: "Book a walkthrough", href: "https://wa.me/1", newTab: true}} body="A person helps." ground="ink" title="Several nights a week?" />);
    expect(screen.getByRole("heading", {level: 3}).textContent).toBe("Several nights a week?");
    const link = screen.getByRole("link", {name: "Book a walkthrough"});
    expect([link.getAttribute("target"), link.getAttribute("rel")]).toEqual(["_blank", "noopener noreferrer"]);
    expect((container.firstElementChild as HTMLElement).dataset).toMatchObject({ground: "ink", kind: "link", catchTheme: "dark"});
  });

  it("draws a label, a picture and a button as a button card", () => {
    const {container} = render(<CatchRouteCard action={{label: "Start", href: "#start"}} kicker="Ready now" kind="button" media={<span>Picture</span>} title="Start your free trial" />);
    expect(screen.getByText("Ready now")).toBeTruthy();
    expect(screen.getByText("Picture")).toBeTruthy();
    expect(screen.getByRole("link", {name: "Start"}).getAttribute("href")).toBe("#start");
    expect((container.firstElementChild as HTMLElement).dataset.kind).toBe("button");
  });
});
