import {cleanup, fireEvent, render, screen, within} from "@testing-library/react";
import {afterEach, describe, expect, it, vi} from "vitest";
import {CatchFormatMatrix, type CatchFormatMatrixProps} from "./CatchFormatMatrix";

afterEach(cleanup);

const props: CatchFormatMatrixProps = {
  heading: "How Catch reads each one",
  note: "Same app, five different nights.",
  formats: [{format: "run", title: "Run clubs"}, {format: "courts", title: "Pickleball"}],
  properties: [{key: "Phones", label: "When phones come out"}, {key: "Groups", label: "How people are grouped"}],
  values: {run: {Phones: "Before and after only", Groups: "Pace groups of 6 to 8"}, courts: {Phones: "Between rounds"}},
  selected: 1,
};

describe("CatchFormatMatrix", () => {
  it("lays every format's properties out as a table named by its heading", () => {
    render(<CatchFormatMatrix {...props} />);
    const table = screen.getByRole("table", {name: "How Catch reads each one"});
    expect(within(table).getAllByRole("columnheader").map((cell) => cell.textContent)).toEqual(["Run clubs", "Pickleball"]);
    expect(within(table).getAllByRole("rowheader").map((cell) => cell.textContent)).toEqual(["When phones come out", "How people are grouped"]);
    expect(within(table).getByText("Pace groups of 6 to 8")).toBeTruthy();
  });

  it("marks the selected format's column, and a missing value is an empty cell", () => {
    render(<CatchFormatMatrix {...props} />);
    const table = screen.getByRole("table");
    expect(within(table).getByRole("button", {name: "Pickleball"}).getAttribute("aria-pressed")).toBe("true");
    expect(within(table).getByRole("button", {name: "Run clubs"}).getAttribute("aria-pressed")).toBe("false");
    const selected = table.querySelectorAll("tbody [data-selected]");
    expect([...selected].map((cell) => cell.textContent)).toEqual(["Between rounds", ""]);
  });

  it("reports a pick from the table or from the chips", () => {
    const onSelect = vi.fn();
    render(<CatchFormatMatrix {...props} onSelect={onSelect} />);
    fireEvent.click(within(screen.getByRole("table")).getByRole("button", {name: "Run clubs"}));
    expect(onSelect).toHaveBeenLastCalledWith(0, "table");
    const chips = screen.getByRole("radiogroup", {name: "How Catch reads each one"});
    fireEvent.click(within(chips).getByRole("radio", {name: "Run clubs"}));
    expect(onSelect).toHaveBeenLastCalledWith(0, "chips");
  });

  it("lists the selected format's properties for a phone-width band", () => {
    const {container} = render(<CatchFormatMatrix {...props} selected={0} />);
    const list = container.querySelector("dl")!;
    expect([...list.querySelectorAll("dt")].map((term) => term.textContent)).toEqual(["When phones come out", "How people are grouped"]);
    expect([...list.querySelectorAll("dd")].map((value) => value.textContent)).toEqual(["Before and after only", "Pace groups of 6 to 8"]);
  });
});
