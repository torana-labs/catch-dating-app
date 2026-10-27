import {cleanup, render, screen} from "@testing-library/react";
import {afterEach, describe, expect, it} from "vitest";
import {CatchStepList} from "./CatchStepList";

afterEach(cleanup);

describe("CatchStepList", () => {
  it("numbers the steps in an ordered list", () => {
    render(<CatchStepList steps={[{body: "Check in with the host.", title: "Arrive"}, {title: "Meet"}, {title: "Follow up"}]} />);
    const items = screen.getAllByRole("listitem");
    expect(items.map((item) => item.textContent)).toEqual(["01ArriveCheck in with the host.", "02Meet", "03Follow up"]);
  });

  it("puts markers in place of numbers and shows a tag in the accent", () => {
    const {container} = render(
      <CatchStepList accent="#8A2F12" steps={[{marker: "5:45", tag: "Bag drop and water", title: "Meet at the jetty"}, {marker: "10:30", tag: "  ", title: "Breakfast"}]} />,
    );
    expect(screen.getAllByRole("listitem").map((item) => item.textContent)).toEqual(["5:45Meet at the jettyBag drop and water", "10:30Breakfast"]);
    expect((container.firstElementChild as HTMLElement).style.getPropertyValue("--catch-step-accent")).toBe("#8A2F12");
  });

  it("renders nothing without steps", () => {
    const {container} = render(<CatchStepList steps={[]} />);
    expect(container.childElementCount).toBe(0);
  });
});
