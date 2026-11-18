import {cleanup, render, screen, within} from "@testing-library/react";
import {afterEach, describe, expect, it} from "vitest";
import {CatchOrganizerCard} from "./CatchOrganizerCard";
import {fireEvent} from "@testing-library/react";
import {vi} from "vitest";

afterEach(cleanup);

describe("CatchOrganizerCard", () => {
  it("names the organiser in a heading that links to their page, with the next plan and the action", () => {
    render(
      <CatchOrganizerCard action={<button type="button">Follow</button>} footnote="212 followers" href="/organizers/carter/"
        monogramGround="coral" name="Driftwood Bay Runners" next="Next: Fri 6:30 AM · Salt Air Social Run" subtitle="Sunday social runs" />,
    );
    const card = screen.getByRole("article");
    expect(within(card).getByRole("heading", {level: 3, name: "Driftwood Bay Runners"})).toBeTruthy();
    expect(within(card).getByRole("link", {name: "Driftwood Bay Runners"}).getAttribute("href")).toBe("/organizers/carter/");
    expect(card.textContent).toContain("Next: Fri 6:30 AM · Salt Air Social Run");
    expect(card.textContent).toContain("212 followers");
    expect(within(card).getByRole("button", {name: "Follow"})).toBeTruthy();
    expect(card.dataset.ground).toBe("paper");
  });

  it("names an organiser without a page in plain text", () => {
    render(<CatchOrganizerCard footnote="Joining at launch" monogramGround="yellow" name="Pune Board Gamers" next="Next: first plan announced when Catch opens" subtitle="Board game nights" />);
    expect(screen.getByRole("heading", {name: "Pune Board Gamers"})).toBeTruthy();
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("draws the kit's Follow card on the white ground, with no footnote when none is given", () => {
    render(
      <CatchOrganizerCard action={<a href="/organizers/carter/">Follow</a>} ground="white" monogramGround="coral" name="Driftwood Bay Runners"
        next="Next: Sun 23 · Social run" subtitle="Sunday social runs" />,
    );
    const card = screen.getByRole("article");
    expect(card.dataset.ground).toBe("white");
    expect(card.textContent).toBe("Driftwood Bay RunnersSunday social runsNext: Sun 23 · Social runFollow");
  });
});

describe("CatchOrganizerCard as the system OrganiserCard", () => {
  it("draws the logo square, name and meta as one link, and follows", () => {
    const follow = vi.fn();
    render(<CatchOrganizerCard color="run" href="/organizers/crr/" initials="DB" meta="Sunday social runs" name="Driftwood Bay Runners" onFollow={follow} />);
    const link = screen.getByRole("link");
    expect(link.getAttribute("href")).toBe("/organizers/crr/");
    expect(link.querySelector('[data-format="run"]')?.textContent).toBe("DB");
    fireEvent.click(screen.getByRole("button", {name: "Follow"}));
    expect(follow).toHaveBeenCalledOnce();
  });

  it("shows Following and no button without onFollow", () => {
    render(<><CatchOrganizerCard following name="Khar Table" onFollow={() => undefined} /><CatchOrganizerCard name="Bandra Book Swap" /></>);
    expect(screen.getAllByRole("button")).toHaveLength(1);
    expect(screen.getByRole("button", {name: "Following"})).toBeTruthy();
  });
});
