import {cleanup, fireEvent, render, screen} from "@testing-library/react";
import {afterEach, describe, expect, it, vi} from "vitest";
import {CatchFeeCalculator} from "./CatchFeeCalculator";

afterEach(cleanup);

const props = {
  label: "Sales", valueText: "[40]", value: 40, min: 0, max: 100, step: 10, minLabel: "[0]", maxLabel: "[100]",
  tiles: [{label: "Fee", value: "[2]", note: "after the trial"}, {label: "Rate", value: "[5%]"}],
};

describe("CatchFeeCalculator", () => {
  it("draws the page's figures and hands the slider's value back to the page", () => {
    const onChange = vi.fn();
    render(<CatchFeeCalculator {...props} fine={["Fine print."]} onChange={onChange} />);
    expect(screen.getByText("[40]")).toBeTruthy();
    expect(screen.getAllByRole("listitem").map((item) => item.textContent)).toEqual(["Fee[2]after the trial", "Rate[5%]"]);
    expect(screen.getByText("Fine print.")).toBeTruthy();
    expect(screen.getByRole("status").textContent).toBe("");
    fireEvent.change(screen.getByRole("slider", {name: "Sales"}), {target: {value: "70"}});
    expect(onChange).toHaveBeenCalledWith(70);
  });

  it("says what the figures mean now in a status line", () => {
    render(<CatchFeeCalculator {...props} onChange={() => undefined} status="Capped." />);
    expect(screen.getByRole("status").textContent).toBe("Capped.");
  });
});
