import {cleanup, render, screen} from "@testing-library/react";
import {afterEach, describe, expect, it} from "vitest";
import {CatchNoteCard} from "./CatchNoteCard";

afterEach(cleanup);

describe("CatchNoteCard", () => {
  it("shows when it was posted and the note, unpinned and without a photo or link by default", () => {
    render(<CatchNoteCard body="Supper club tickets go to followers first." when="5 days ago" />);
    const note = screen.getByRole("article");
    expect(note.textContent).toContain("5 days ago");
    expect(note.textContent).toContain("Supper club tickets go to followers first.");
    expect(note.hasAttribute("data-pinned")).toBe(false);
    expect(screen.queryByText("Pinned")).toBeNull();
    expect(screen.queryByRole("img")).toBeNull();
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("marks a pinned note and carries its photo and link", () => {
    render(
      <CatchNoteCard action={{label: "Book Tuesday 3 Nov", href: "/events/tuesday-trivia/"}} body="Quizzy Rascals won for the third week running."
        photo={{src: "/team.png", alt: "The winning team holding up their answer sheet"}} pinned pinnedLabel="Pinned note" when="2 days ago" />,
    );
    expect(screen.getByRole("article").hasAttribute("data-pinned")).toBe(true);
    expect(screen.getByText("Pinned note")).toBeTruthy();
    expect(screen.getByRole("img", {name: "The winning team holding up their answer sheet"})).toBeTruthy();
    expect(screen.getByRole("link", {name: /Book Tuesday 3 Nov/}).getAttribute("href")).toBe("/events/tuesday-trivia/");
  });

  it("renders as a list item inside a list of notes", () => {
    render(<ul><CatchNoteCard as="li" body="Same time next week." when="Yesterday" /></ul>);
    expect(screen.getByRole("listitem").textContent).toContain("Same time next week.");
  });
});
