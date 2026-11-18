import {cleanup, render, screen, within} from "@testing-library/react";
import {afterEach, describe, expect, it} from "vitest";
import {CatchStepCards} from "./CatchStepCards";

afterEach(cleanup);

const steps = [{title: "Download the app", body: "On any phone."}, {title: "Set up your page"}, {title: "Open the doors"}];

describe("CatchStepCards", () => {
  it("numbers each step beside its title and line, every card filled by default", () => {
    render(<CatchStepCards on="night" steps={steps} />);
    const list = screen.getByRole("list");
    expect(list.dataset.on).toBe("night");
    const items = within(list).getAllByRole("listitem");
    expect(items.map((item) => item.textContent)).toEqual(["1Download the appOn any phone.", "2Set up your page", "3Open the doors"]);
    expect(items.every((item) => item.hasAttribute("data-filled"))).toBe(true);
    expect(screen.getByRole("heading", {level: 3, name: "Download the app"}).dataset.variant).toBe("title-bar");
  });

  it("fills only the current step", () => {
    render(<CatchStepCards current={0} headingLevel={2} on="colour" steps={steps} />);
    expect(screen.getAllByRole("listitem").map((item) => item.hasAttribute("data-filled"))).toEqual([true, false, false]);
    expect(screen.getAllByRole("heading", {level: 2})).toHaveLength(3);
  });
});
