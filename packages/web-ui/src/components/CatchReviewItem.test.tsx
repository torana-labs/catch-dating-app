import {cleanup, render, screen} from "@testing-library/react";
import {afterEach, describe, expect, it} from "vitest";
import {CatchReviewItem} from "./CatchReviewItem";

afterEach(cleanup);

const review = {
  body: "Came on my own, left with a pace group.",
  meta: "Sunday Social Run · 2 weeks ago",
  name: "Riya S.",
  rating: 5,
  ratingLabel: "5 out of 5",
};

describe("CatchReviewItem", () => {
  it("is an article named by the reviewer, with rating, badge and meta", () => {
    render(<CatchReviewItem {...review} avatar={<span>RS</span>} badge={<span>Booked on Catch</span>} />);
    const article = screen.getByRole("article", {name: "Riya S."});
    expect(article.dataset.variant).toBe("row");
    expect(screen.getByRole("heading", {level: 3, name: "Riya S."})).toBeTruthy();
    expect(screen.getByRole("img", {name: "5 out of 5"})).toBeTruthy();
    expect(screen.getByText("Booked on Catch")).toBeTruthy();
    expect(screen.getByText("RS")).toBeTruthy();
    expect(screen.getByText(review.meta)).toBeTruthy();
  });

  it("shows the organiser's reply and a footer", () => {
    render(<CatchReviewItem {...review} footer={<button type="button">Reply</button>} reply={{author: "Kabir", text: "See you Sunday!", verb: "replied:"}} />);
    expect(screen.getByText("Kabir").tagName).toBe("STRONG");
    expect(screen.getByText("Kabir").parentElement!.textContent).toBe("Kabir replied: See you Sunday!");
    expect(screen.getByRole("button", {name: "Reply"})).toBeTruthy();
  });

  it("puts the meta line last in the card recipe and drops the avatar slot", () => {
    render(<CatchReviewItem {...review} avatar={<span>RS</span>} nameElement="h4" variant="card" />);
    const article = screen.getByRole("article", {name: "Riya S."});
    expect(article.dataset.variant).toBe("card");
    expect(article.lastElementChild!.textContent).toBe(review.meta);
    expect(screen.queryByText("RS")).toBeNull();
    expect(screen.getByRole("heading", {level: 4})).toBeTruthy();
  });
});
