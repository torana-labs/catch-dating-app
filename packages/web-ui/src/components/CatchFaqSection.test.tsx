import {cleanup, render, screen} from "@testing-library/react";
import {afterEach, describe, expect, it} from "vitest";
import {CatchFaqSection} from "./CatchFaqSection";

afterEach(cleanup);

const items = [
  {id: "first", question: "A first sample question?", answer: "A first sample answer."},
  {id: "second", question: "A second sample question?", answer: "A second sample answer."},
];

describe("CatchFaqSection", () => {
  it("is a section named by its h2, with the questions as native disclosures", () => {
    const {container} = render(<CatchFaqSection items={items} kicker="Kicker" title="Sample questions" />);
    expect(screen.getByRole("region", {name: "Sample questions"}).tagName).toBe("SECTION");
    expect(container.querySelectorAll("details")).toHaveLength(2);
    expect(container.querySelector("header")).toBeNull();
  });

  it("opens the first question by default, one at a time", () => {
    const {container} = render(<CatchFaqSection items={items} title="Questions" />);
    const details = [...container.querySelectorAll("details")];
    expect(details.map((item) => item.open)).toEqual([true, false]);
    expect(new Set(details.map((item) => item.getAttribute("name"))).size).toBe(1);
    expect(details[0].getAttribute("name")).toBeTruthy();
  });

  it("takes the open ids, including none", () => {
    const {container, rerender} = render(<CatchFaqSection defaultOpen={["second"]} items={items} title="Questions" />);
    expect([...container.querySelectorAll("details")].map((item) => item.open)).toEqual([false, true]);
    rerender(<CatchFaqSection defaultOpen={[]} items={items} key="none" title="Questions" />);
    expect([...container.querySelectorAll("details")].map((item) => item.open)).toEqual([false, false]);
  });

  it("puts the footer line under the header, before the questions", () => {
    render(<CatchFaqSection footer={<a href="/ask">Ask us</a>} items={items} title="Questions" />);
    const link = screen.getByRole("link", {name: "Ask us"});
    const question = screen.getByText("A first sample question?");
    expect(link.compareDocumentPosition(question) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("paints its ground and passes an id through", () => {
    render(<CatchFaqSection ground="paper" id="faq" items={items} title="Questions" />);
    const section = screen.getByRole("region");
    expect(section.dataset.band).toBe("tile");
    expect(section.id).toBe("faq");
  });
});
