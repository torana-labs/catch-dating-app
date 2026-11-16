import {cleanup, render, screen} from "@testing-library/react";
import {afterEach, describe, expect, it} from "vitest";
import {CatchStoryCard} from "./CatchStoryCard";

afterEach(cleanup);

describe("CatchStoryCard", () => {
  it("is an article named by its h3 title, with meta, body and stat in order", () => {
    render(<CatchStoryCard body="A sample body." meta="Sample meta" stat={{label: "A figure", value: "[N]"}} title="A sample story" />);
    const article = screen.getByRole("article", {name: "A sample story"});
    expect(screen.getByRole("heading", {level: 3, name: "A sample story"})).toBeTruthy();
    const order = ["Sample meta", "A sample story", "A sample body.", "A figure", "[N]"].map((text) => screen.getByText(text));
    for (let index = 1; index < order.length; index += 1) {
      expect(order[index - 1].compareDocumentPosition(order[index]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }
    expect(article.dataset.pressable).toBeUndefined();
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("links the title when it has an href, and takes level 2", () => {
    render(<CatchStoryCard href="/stories/sample" level={2} title="Linked story" />);
    expect(screen.getByRole("link", {name: "Linked story"}).getAttribute("href")).toBe("/stories/sample");
    expect(screen.getByRole("heading", {level: 2})).toBeTruthy();
    expect(screen.getByRole("article").dataset.pressable).toBe("");
  });

  it("shows a photo with its alternative text, or the ground without one", () => {
    const {container, rerender} = render(<CatchStoryCard image="/photo.jpg" imageAlt="A sample photo" title="Story" />);
    expect(screen.getByRole("img", {name: "A sample photo"}).getAttribute("src")).toBe("/photo.jpg");
    rerender(<CatchStoryCard ground="mint" title="Story" />);
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("[data-ground='mint']")).not.toBeNull();
  });
});
