import {cleanup, fireEvent, render, screen} from "@testing-library/react";
import {afterEach, describe, expect, it, vi} from "vitest";
import {CatchPlanCard} from "./CatchPlanCard";

afterEach(cleanup);

describe("CatchPlanCard", () => {
  it("is one link reading the label, title, host, price and places left", () => {
    const click = vi.fn();
    render(
      <CatchPlanCard activityKind="pubQuiz" availability="6 left" detail="The Quizzicals · Khar Social" format="games"
        href="/events/quiz/" label="Games and quizzes · Thu 7:30 PM" onClick={click} price="Free" title="Thursday Evening Pub Quiz" />,
    );
    const link = screen.getByRole("link");
    expect(link.getAttribute("href")).toBe("/events/quiz/");
    expect(link.textContent).toBe("Games and quizzes · Thu 7:30 PM Thursday Evening Pub Quiz The Quizzicals · Khar Social Free 6 left");
    fireEvent.click(link);
    expect(click).toHaveBeenCalledOnce();
  });

  it("shows the plan's photo, described by the card, and leaves availability out when unknown", () => {
    const {container} = render(
      <CatchPlanCard activityKind="dinner" detail="Khar Table · Khar West" href="/events/supper/" label="Dinners · Thu 8:30 PM"
        photoUrl="https://example.test/supper.jpg" price="₹1,800" title="Strangers’ Supper" />,
    );
    expect(container.querySelector("img")?.getAttribute("alt")).toBe("");
    expect(screen.getByRole("link").textContent?.endsWith("₹1,800")).toBe(true);
  });
});
