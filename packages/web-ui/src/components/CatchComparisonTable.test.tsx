import {cleanup, fireEvent, render, screen, within} from "@testing-library/react";
import {afterEach, describe, expect, it} from "vitest";
import {CatchComparisonTable} from "./CatchComparisonTable";

afterEach(cleanup);

const props = {
  title: "A sample comparison",
  columns: ["Our option", "First option", "Second option"],
  rows: [
    {label: "First property", cells: ["Yes", {text: "Not offered", status: "no" as const}, {text: "Not published", status: "unknown" as const}]},
    {label: "Second property", cells: ["Yes", "Yes"]},
  ],
};

describe("CatchComparisonTable", () => {
  it("is a section named by its headline holding a table of the same name", () => {
    const {container} = render(<CatchComparisonTable {...props} />);
    expect(screen.getByRole("region", {name: "A sample comparison"}).tagName).toBe("SECTION");
    const table = screen.getByRole("table", {name: "A sample comparison"});
    expect(within(table).getAllByRole("columnheader").map((cell) => cell.textContent)).toEqual(["Our option", "First option", "Second option"]);
    expect(within(table).getAllByRole("rowheader").map((cell) => cell.textContent)).toEqual(["First property", "Second property"]);
    expect(container.querySelector("header")).toBeNull();
  });

  it("fills a missing cell, marks statuses and highlights a column", () => {
    const {container} = render(<CatchComparisonTable {...props} highlightColumn={0} />);
    const cells = within(screen.getByRole("table")).getAllByRole("cell");
    expect(cells).toHaveLength(6);
    expect(cells[1].dataset.status).toBe("no");
    expect(cells[2].dataset.status).toBe("unknown");
    expect(cells[5].textContent).toBe("Second option");
    expect([...container.querySelectorAll("[data-highlight]")].map((cell) => cell.textContent)).toEqual(["Our option", "Our optionYes", "Our optionYes"]);
  });

  it("repeats each column's name in its cells for the stacked phone layout, hidden from screen readers", () => {
    render(<CatchComparisonTable {...props} />);
    const label = within(screen.getAllByRole("cell")[0]).getByText("Our option");
    expect(label.closest("[aria-hidden='true']")).not.toBeNull();
  });

  it("joins the source and the checked date", () => {
    render(<CatchComparisonTable {...props} checked="Checked on a sample date" rowHeader="Property" source="Sample public pages" />);
    expect(screen.getByText("Sample public pages · Checked on a sample date").tagName).toBe("P");
    expect(screen.getAllByRole("columnheader")[0].textContent).toBe("Property");
  });

  it("as a ledger, sets the highlighted column beside one other the reader picks", () => {
    render(<CatchComparisonTable {...props} compareLabel="Compare our option with" highlightColumn={0} rowHeader="What you need" />);
    const picker = screen.getByRole("radiogroup", {name: "Compare our option with"});
    const table = screen.getByRole("table", {name: "A sample comparison"});
    expect(within(table).getAllByRole("columnheader").map((cell) => cell.textContent)).toEqual(["What you need", "Our option", "First option"]);
    const cells = within(table).getAllByRole("cell");
    expect(cells).toHaveLength(4);
    expect(cells[0].dataset.featured).toBe("");
    expect(cells[1].dataset.status).toBe("no");
    fireEvent.click(within(picker).getByRole("radio", {name: "Second option"}));
    expect(within(table).getAllByRole("columnheader").map((cell) => cell.textContent)).toEqual(["What you need", "Our option", "Second option"]);
    expect(within(table).getAllByRole("cell")[1].dataset.status).toBe("unknown");
  });
});
