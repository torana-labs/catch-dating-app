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

  it("with a date, takes the canvas card: the date square beside the title, the label read but not shown", () => {
    render(<CatchPlanCard date={{weekday: "Sun", day: "23", month: "Nov"}} detail="Carter Road Runners · Bandra" format="run" href="/events/run/"
      label="Run clubs · Sun 6:30 AM" posterLabel="Run club" price="Free" availability="18 left" title="Carter Road Social Run" />);
    const card = screen.getByRole("link", {name: /Carter Road Social Run/});
    expect(card.dataset.layout).toBe("kit");
    const date = card.querySelector("time") as HTMLElement;
    expect(date.dataset).toMatchObject({size: "sm", ground: "coral"});
    expect(card.textContent).toContain("Run clubs · Sun 6:30 AM");
    expect(card.textContent).toContain("18 left");
  });

  it("shows a badge on the media, read after the host line, in either layout", () => {
    const {rerender} = render(<CatchPlanCard badge=" Women-led " date={{weekday: "Tue", day: "25", month: "Nov"}} detail="Her Pace · Bandra" format="run"
      href="/events/her-pace/" label="Run clubs · Tue 6:30 AM" posterLabel="Run club" price="Free" title="Women’s Evening Run" />);
    const badge = screen.getByText("Women-led");
    expect(badge.dataset.variant).toBe("label-badge");
    expect(screen.getByRole("link", {name: /Women’s Evening Run Run clubs · Tue 6:30 AM Her Pace · Bandra Women-led Free$/u})).toBeTruthy();
    rerender(<CatchPlanCard badge="Women-led" detail="Her Pace · Bandra" href="/events/her-pace/" label="Tue 6:30 AM" posterLabel="Run club" price="Free"
      title="Women’s Evening Run" />);
    expect(screen.getByRole("link", {name: "Tue 6:30 AM Women’s Evening Run Her Pace · Bandra Women-led Free"})).toBeTruthy();
  });

  it("draws no badge when there is none, or only spaces", () => {
    render(<CatchPlanCard badge="  " detail="Her Pace · Bandra" href="/events/her-pace/" label="Tue 6:30 AM" posterLabel="Run club" price="Free"
      title="Women’s Evening Run" />);
    expect(screen.getByRole("link", {name: "Tue 6:30 AM Women’s Evening Run Her Pace · Bandra Free"}).querySelector("[data-variant='label-badge']")).toBeNull();
  });
});
