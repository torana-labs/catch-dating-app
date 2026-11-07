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

describe("CatchOrganizerCard as the system OrganiserCard", () => {
  it("draws the logo square, name and meta as one link, and follows", () => {
    const follow = vi.fn();
    render(<CatchOrganizerCard color="run" href="/organizers/crr/" initials="CR" meta="Sunday social runs" name="Carter Road Runners" onFollow={follow} />);
    const link = screen.getByRole("link");
    expect(link.getAttribute("href")).toBe("/organizers/crr/");
    expect(link.querySelector('[data-format="run"]')?.textContent).toBe("CR");
    fireEvent.click(screen.getByRole("button", {name: "Follow"}));
    expect(follow).toHaveBeenCalledOnce();
  });

  it("shows Following and no button without onFollow", () => {
    render(<><CatchOrganizerCard following name="Khar Table" onFollow={() => undefined} /><CatchOrganizerCard name="Bandra Book Swap" /></>);
    expect(screen.getAllByRole("button")).toHaveLength(1);
    expect(screen.getByRole("button", {name: "Following"})).toBeTruthy();
  });
});
