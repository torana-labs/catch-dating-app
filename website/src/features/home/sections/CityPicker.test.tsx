import {cleanup, fireEvent, render, screen, within} from "@testing-library/react";
import {afterEach, beforeAll, describe, expect, it, vi} from "vitest";
import {mumbaiLiveCatalog, twentyFiveCityCatalog, twoCityCatalog} from "../../../stories/fixtures/homeCatalogs";
import {CityPicker} from "./CityPicker";

// jsdom has no modal dialog; these stand in for the browser's open state.
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.removeAttribute("open");
  };
});

describe("CityPicker", () => {
  afterEach(cleanup);
  it("opens a menu under the trigger for one country with a few cities", () => {
    render(<CityPicker cities={twoCityCatalog.cities} onChoose={vi.fn()} selected={twoCityCatalog.selected} />);
    fireEvent.click(screen.getByRole("button", {name: twoCityCatalog.selected.label}));
    const list = screen.getByRole("listbox");
    expect(within(list).getAllByRole("option")).toHaveLength(2);
    expect(screen.queryByRole("searchbox")).toBeNull();
  });

  it("groups many cities by country, searches them, and says launching soon once for a country with none open", () => {
    const onChoose = vi.fn();
    const catalog = twentyFiveCityCatalog;
    render(<CityPicker cities={catalog.cities} onChoose={onChoose} selected={catalog.selected} />);
    fireEvent.click(screen.getByRole("button", {name: catalog.selected.label}));
    const headings = screen.getAllByRole("heading", {level: 3}).map((heading) => heading.textContent);
    expect(headings).toEqual(["India", "Nepal", "Australia", "United States"]);
    expect(screen.getByText("Launching soon in Nepal")).toBeTruthy();
    expect(screen.getByText("Launching soon in United States")).toBeTruthy();
    expect(screen.queryByText("Launching soon in India")).toBeNull();

    const search = screen.getByRole("searchbox");
    fireEvent.change(search, {target: {value: "san"}});
    expect(screen.getAllByRole("option").map((option) => option.textContent)).toEqual([
      expect.stringContaining(catalog.cities.find((city) => city.slug === "san-francisco")!.label),
    ]);
    fireEvent.click(screen.getAllByRole("option")[0]);
    expect(onChoose).toHaveBeenCalledWith("san-francisco");

    fireEvent.click(screen.getByRole("button", {name: catalog.selected.label}));
    fireEvent.change(screen.getByRole("searchbox"), {target: {value: "zz"}});
    expect(screen.getByText("No city matches “zz”.")).toBeTruthy();
  });

  it("keeps a live city's honest count in the menu", () => {
    render(<CityPicker cities={mumbaiLiveCatalog.cities} onChoose={vi.fn()} selected={mumbaiLiveCatalog.selected} />);
    fireEvent.click(screen.getByRole("button", {name: mumbaiLiveCatalog.selected.label}));
    expect(screen.getByRole("option", {name: /plans? this week|New/u, selected: true})).toBeTruthy();
  });
});
