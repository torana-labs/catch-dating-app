import {cleanup, render, screen} from "@testing-library/react";
import {afterEach, describe, expect, it} from "vitest";
import {CatchFlowLayout} from "./CatchFlowLayout";

afterEach(cleanup);

describe("CatchFlowLayout", () => {
  it("is a section named by its h1, with no header landmark", () => {
    const {container} = render(<CatchFlowLayout kicker="Kicker" lead="A lead." title="Review the sample" />);
    expect(screen.getByRole("region", {name: "Review the sample"}).tagName).toBe("SECTION");
    expect(screen.getByRole("heading", {level: 1, name: "Review the sample"})).toBeTruthy();
    expect(container.querySelector("header")).toBeNull();
  });

  it("orders banner, navigation, head, content and footer", () => {
    render(
      <CatchFlowLayout
        banner={<p>Sample banner</p>}
        footer={<p>Sample fine print</p>}
        navigation={<ol aria-label="Sample steps" />}
        title="Headline"
      >
        <p>Sample content</p>
      </CatchFlowLayout>,
    );
    const order = [
      screen.getByText("Sample banner"),
      screen.getByRole("list", {name: "Sample steps"}),
      screen.getByRole("heading", {name: "Headline"}),
      screen.getByText("Sample content"),
      screen.getByText("Sample fine print"),
    ];
    for (let index = 1; index < order.length; index += 1) {
      expect(order[index - 1].compareDocumentPosition(order[index]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }
  });

  it("widens the frame and takes level 2", () => {
    const {container} = render(<CatchFlowLayout level={2} title="Headline" wide><p>Content</p></CatchFlowLayout>);
    expect(container.querySelector("[data-wide] [data-wide]")).not.toBeNull();
    expect(screen.getByRole("heading", {level: 2})).toBeTruthy();
  });

  it("leaves out empty slots", () => {
    const {container} = render(<CatchFlowLayout title="Headline" />);
    expect(container.querySelectorAll("p")).toHaveLength(0);
    expect(container.textContent).toBe("Headline");
  });
});
