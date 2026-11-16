import {cleanup, render, screen, within} from "@testing-library/react";
import {afterEach, describe, expect, it} from "vitest";
import {CatchArticleBody} from "./CatchArticleBody";

afterEach(cleanup);

const sections = [
  {id: "first", title: "A first section", paragraphs: ["A first paragraph.", "A second paragraph."], list: ["A ticked line"], tip: {label: "Tip:", text: "A sample tip."}},
  {id: "second", title: "A second section", paragraphs: ["Another paragraph."]},
];

describe("CatchArticleBody", () => {
  it("is an article named by its h1, its sections anchored and named by their h2s", () => {
    const {container} = render(<CatchArticleBody meta="A sample meta line" sections={sections} title="A sample guide" />);
    expect(screen.getByRole("article", {name: "A sample guide"})).toBeTruthy();
    const first = screen.getByRole("region", {name: "A first section"});
    expect(first.id).toBe("first");
    expect(screen.getByRole("heading", {level: 2, name: "A second section"})).toBeTruthy();
    expect(within(first).getAllByRole("paragraph").length).toBeGreaterThanOrEqual(2);
    expect(within(first).getByText("A ticked line")).toBeTruthy();
    expect(within(first).getByText("Tip:").tagName).toBe("STRONG");
    expect(container.querySelector("header")).toBeNull();
    expect(container.querySelector("nav")).toBeNull();
  });

  it("lists the contents in a named navigation landmark linking to each section", () => {
    render(<CatchArticleBody aside={<div data-testid="aside" />} sections={sections} title="Guide" tocLabel="In this sample" />);
    const nav = screen.getByRole("navigation", {name: "In this sample"});
    expect(within(nav).getAllByRole("link").map((link) => link.getAttribute("href"))).toEqual(["#first", "#second"]);
    expect(screen.getByTestId("aside")).toBeTruthy();
  });

  it("uses h3 section headings under a level-2 headline", () => {
    render(<CatchArticleBody level={2} sections={sections} title="Guide" />);
    expect(screen.getByRole("heading", {level: 3, name: "A first section"})).toBeTruthy();
  });

  it("is one centred column without contents or an aside", () => {
    const {container, rerender} = render(<CatchArticleBody sections={sections} title="Guide" />);
    expect(container.querySelector("[data-side]")).toBeNull();
    rerender(<CatchArticleBody sections={sections} title="Guide" tocLabel="Contents" />);
    expect(container.querySelector("[data-side]")).not.toBeNull();
  });
});
