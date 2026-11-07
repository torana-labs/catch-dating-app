import {cleanup, render, screen} from "@testing-library/react";
import {afterEach, describe, expect, it} from "vitest";
import {CatchAccordion} from "./CatchAccordion";
import {CatchRoot} from "./CatchRoot";

afterEach(cleanup);

const items = [
  {answer: "No.", id: "app", question: "Do I need the app?"},
  {answer: "Yes.", id: "alone", question: "Can I come on my own?"},
];

describe("CatchAccordion", () => {
  it("renders each item as a native disclosure in one exclusive group", () => {
    const {container} = render(<CatchAccordion defaultOpen={["alone"]} items={items} name="faq" />);
    const details = [...container.querySelectorAll("details")];
    expect(details.map((item) => item.getAttribute("name"))).toEqual(["faq", "faq"]);
    expect(details.map((item) => item.open)).toEqual([false, true]);
    expect(details[0].querySelector("summary")!.textContent).toBe("Do I need the app?");
    expect(screen.getByText("Yes.").tagName).toBe("P");
  });

  it("lets items open independently when not exclusive", () => {
    const {container} = render(<CatchAccordion exclusive={false} items={items} />);
    expect([...container.querySelectorAll("details")].every((item) => !item.hasAttribute("name"))).toBe(true);
  });
});

describe("CatchAccordion as the system Accordion", () => {
  it("takes title and body items at a size, opening by position", () => {
    const {container} = render(<CatchRoot><CatchAccordion defaultOpen={[1]} items={[{title: "One", body: "First"}, {title: "Two", body: "Second"}]} size="lg" /></CatchRoot>);
    const details = container.querySelectorAll("details");
    expect(container.querySelector("details")?.parentElement?.getAttribute("data-size")).toBe("lg");
    expect([...details].map((item) => item.open)).toEqual([false, true]);
    expect(details[0].getAttribute("name")).toBe("catch-accordion");
    expect(screen.getByText("Second")).toBeTruthy();
  });

  it("lets several open with multiple", () => {
    const {container} = render(<CatchAccordion items={[{title: "One", body: "First"}]} multiple size="md" />);
    expect(container.querySelector("details")?.hasAttribute("name")).toBe(false);
  });
});
