import {cleanup, render, screen, within} from "@testing-library/react";
import {afterEach, describe, expect, it} from "vitest";
import {CatchOrganizerCard} from "./CatchOrganizerCard";

afterEach(cleanup);

describe("CatchOrganizerCard", () => {
  it("names the organiser in a heading that links to their page, with the next plan and the action", () => {
    render(
      <CatchOrganizerCard action={<button type="button">Follow</button>} footnote="212 followers" href="/organizers/carter/"
        monogramGround="coral" name="Carter Road Runners" next="Next: Fri 6:30 AM · Carter Road Social Run" subtitle="Sunday social runs" />,
    );
    const card = screen.getByRole("article");
    expect(within(card).getByRole("heading", {level: 3, name: "Carter Road Runners"})).toBeTruthy();
    expect(within(card).getByRole("link", {name: "Carter Road Runners"}).getAttribute("href")).toBe("/organizers/carter/");
    expect(card.textContent).toContain("Next: Fri 6:30 AM · Carter Road Social Run");
    expect(card.textContent).toContain("212 followers");
    expect(within(card).getByRole("button", {name: "Follow"})).toBeTruthy();
    expect(card.dataset.ground).toBe("paper");
  });

  it("names an organiser without a page in plain text", () => {
    render(<CatchOrganizerCard footnote="Joining at launch" monogramGround="yellow" name="Pune Board Gamers" next="Next: first plan announced when Catch opens" subtitle="Board game nights" />);
    expect(screen.getByRole("heading", {name: "Pune Board Gamers"})).toBeTruthy();
    expect(screen.queryByRole("link")).toBeNull();
  });
});
