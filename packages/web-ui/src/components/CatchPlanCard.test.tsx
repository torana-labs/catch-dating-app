import {cleanup, fireEvent, render, screen} from "@testing-library/react";
import {afterEach, describe, expect, it, vi} from "vitest";
import {CatchPlanCard} from "./CatchPlanCard";

afterEach(cleanup);

describe("CatchPlanCard", () => {
  it("is one link reading the label, title, host, price and places left, with a hidden poster", () => {
    const click = vi.fn();
    const {container} = render(
      <CatchPlanCard availability="6 left" detail="The Quizzicals · Khar Social" format="games" href="/events/quiz/"
        label="Games and quizzes · Thu 7:30 PM" onClick={click} posterLabel="Quiz night" price="Free" title="Thursday Evening Pub Quiz" />,
    );
    const link = screen.getByRole("link", {name: "Games and quizzes · Thu 7:30 PM Thursday Evening Pub Quiz The Quizzicals · Khar Social Free 6 left"});
    expect(link.getAttribute("href")).toBe("/events/quiz/");
    const poster = container.querySelector("[aria-hidden='true']") as HTMLElement;
    expect(poster.textContent).toBe("Quiz night");
    expect(poster.dataset.ground).toBe("yellow");
    fireEvent.click(link);
    expect(click).toHaveBeenCalledOnce();
  });

  it("shows the plan's photo instead, and falls back to the poster when it fails", () => {
    const {container} = render(
      <CatchPlanCard detail="Khar Table · Khar West" href="/events/supper/" label="Thu 8:30 PM"
        photoUrl="https://example.test/supper.jpg" posterLabel="Supper club" price="₹1,800" title="Strangers’ Supper" />,
    );
    const photo = container.querySelector("img") as HTMLImageElement;
    expect(photo.getAttribute("alt")).toBe("");
    expect(screen.getByRole("link").textContent?.endsWith("₹1,800")).toBe(true);
    fireEvent.error(photo);
    expect(container.querySelector("img")).toBeNull();
    expect((container.querySelector("[aria-hidden='true']") as HTMLElement).dataset.ground).toBe("paper");
  });
});
