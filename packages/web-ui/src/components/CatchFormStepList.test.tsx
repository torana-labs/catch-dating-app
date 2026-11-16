import {cleanup, fireEvent, render, screen, within} from "@testing-library/react";
import {afterEach, describe, expect, it, vi} from "vitest";
import {CatchFormStepList, type CatchFormStepListStatus} from "./CatchFormStepList";

afterEach(cleanup);

const items = [
  {index: 0, title: "First step", status: "complete" as const},
  {index: 1, title: "Second step", status: "needsInformation" as const},
  {index: 2, title: "Third step", status: "optional" as const},
];
const labels: Record<CatchFormStepListStatus, string> = {complete: "Done", needsInformation: "Needs information", optional: "Optional"};
const statusLabelBuilder = (status: CatchFormStepListStatus) => labels[status];

describe("CatchFormStepList", () => {
  it("lists each step with its status badge in the column", () => {
    render(<CatchFormStepList items={items} label="Sample steps" statusLabelBuilder={statusLabelBuilder} />);
    const list = screen.getByRole("list", {name: "Sample steps"});
    const rows = within(list).getAllByRole("listitem");
    expect(rows).toHaveLength(3);
    expect(within(rows[0]).getByText("Done")).toBeTruthy();
    expect(within(rows[1]).getByText("Needs information")).toBeTruthy();
    expect(within(rows[2]).getByText("Optional")).toBeTruthy();
    // Without a selection callback the rows are passive.
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("reports the chosen step's index and marks the current one", () => {
    const onStepSelected = vi.fn();
    render(<CatchFormStepList current={1} items={items} label="Steps" onStepSelected={onStepSelected} statusLabelBuilder={statusLabelBuilder} />);
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(3);
    fireEvent.click(buttons[2]);
    expect(onStepSelected).toHaveBeenCalledWith(2);
    expect(buttons[1].getAttribute("aria-current")).toBe("true");
  });

  it("draws the row as a progress rail with the current step and each status read aloud", () => {
    const {container} = render(<CatchFormStepList current={1} direction="row" items={items} label="Booking steps" statusLabelBuilder={statusLabelBuilder} />);
    const pills = within(screen.getByRole("list", {name: "Booking steps"})).getAllByRole("listitem");
    expect(pills[1].getAttribute("aria-current")).toBe("step");
    expect(pills[0].getAttribute("aria-current")).toBeNull();
    expect(pills[0].textContent).toContain("First step, Done");
    expect(pills.map((pill) => pill.dataset.status)).toEqual(["complete", "needsInformation", "optional"]);
    // A complete step shows a check instead of its number; the others their number.
    expect(pills[0].textContent).not.toContain("1");
    expect(pills[1].textContent).toContain("2");
    expect(container.querySelector("button")).toBeNull();
  });
});
