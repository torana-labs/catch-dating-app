import {cleanup, fireEvent, render, screen} from "@testing-library/react";
import {afterEach, describe, expect, it, vi} from "vitest";
import {CatchRangeInput} from "./CatchRangeInput";

afterEach(cleanup);

describe("CatchRangeInput", () => {
  it("reports one value from a labelled native range", () => {
    const changed = vi.fn();
    render(<CatchRangeInput label="Your ticket sales this month" max={500000} min={0} onChange={changed} step={10000} value={120000} />);
    const input = screen.getByRole("slider", {name: "Your ticket sales this month"}) as HTMLInputElement;
    expect(input.value).toBe("120000");
    fireEvent.change(input, {target: {value: "200000"}});
    expect(changed).toHaveBeenCalledWith(200000);
  });

  it("keeps a range's thumbs a step apart", () => {
    const changed = vi.fn();
    render(<CatchRangeInput label="Group size" max={100} onChange={changed} step={5} value={[20, 50]} />);
    fireEvent.change(screen.getByRole("slider", {name: "Group size, lowest"}), {target: {value: "60"}});
    expect(changed).toHaveBeenLastCalledWith([45, 50]);
    fireEvent.change(screen.getByRole("slider", {name: "Group size, highest"}), {target: {value: "10"}});
    expect(changed).toHaveBeenLastCalledWith([20, 25]);
  });

  it("keeps its own value when uncontrolled", () => {
    render(<CatchRangeInput defaultValue={30} label="Distance" />);
    const input = screen.getByRole("slider") as HTMLInputElement;
    fireEvent.change(input, {target: {value: "70"}});
    expect(input.value).toBe("70");
  });
});
