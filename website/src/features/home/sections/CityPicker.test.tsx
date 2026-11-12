import {cleanup, fireEvent, render, screen, waitFor, within} from "@testing-library/react";
import {afterEach, beforeAll, beforeEach, describe, expect, it, vi} from "vitest";
import {homePageCopy} from "@content/homePage";
import {websiteCities} from "@content/markets";
import {readCityChoice} from "../cityChoice";
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
    // With "Use my location" below the cities, the list is a menu whose cities are radio items.
    const list = screen.getByRole("menu");
    expect(within(list).getAllByRole("menuitemradio")).toHaveLength(2);
    expect(within(list).getByRole("menuitem", {name: homePageCopy.header.locate.action})).toBeTruthy();
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
    expect(screen.getByText("No cities found for “zz”.")).toBeTruthy();
  });

  it("keeps a live city's honest count in the menu", () => {
    render(<CityPicker cities={mumbaiLiveCatalog.cities} onChoose={vi.fn()} selected={mumbaiLiveCatalog.selected} />);
    fireEvent.click(screen.getByRole("button", {name: mumbaiLiveCatalog.selected.label}));
    expect(screen.getByRole("menuitemradio", {name: /plans? this week|New/u, checked: true})).toBeTruthy();
  });

  it("remembers a city picked from the list", () => {
    const onChoose = vi.fn();
    render(<CityPicker cities={mumbaiLiveCatalog.cities} onChoose={onChoose} selected={mumbaiLiveCatalog.selected} />);
    const other = mumbaiLiveCatalog.cities.find((city) => city.slug !== mumbaiLiveCatalog.selected.slug)!;
    fireEvent.click(screen.getByRole("button", {name: mumbaiLiveCatalog.selected.label}));
    fireEvent.click(screen.getByRole("menuitemradio", {name: new RegExp(other.label, "u")}));
    expect(onChoose).toHaveBeenCalledWith(other.slug);
    expect(readCityChoice()).toEqual(expect.objectContaining({slug: other.slug, source: "picked"}));
  });
});

describe("CityPicker: Use my location", () => {
  const locate = homePageCopy.header.locate;
  const pune = websiteCities.find((city) => city.slug === "pune")!;
  let answer: {coords?: {latitude: number; longitude: number}; error?: number};
  const getCurrentPosition = vi.fn((success: PositionCallback, failure?: PositionErrorCallback | null) => {
    if (answer.coords) success({coords: answer.coords} as GeolocationPosition);
    else failure?.({code: answer.error, PERMISSION_DENIED: 1} as GeolocationPositionError);
  });
  beforeEach(() => {
    getCurrentPosition.mockClear();
    Object.defineProperty(navigator, "geolocation", {configurable: true, value: {getCurrentPosition}});
    window.localStorage.clear();
  });
  afterEach(cleanup);

  const openMenu = () => {
    render(<CityPicker cities={mumbaiLiveCatalog.cities} follow={follow} onChoose={onChoose} selected={mumbaiLiveCatalog.selected} />);
    expect(getCurrentPosition).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", {name: mumbaiLiveCatalog.selected.label}));
    fireEvent.click(screen.getByText(locate.action));
  };
  const onChoose = vi.fn();
  const follow = vi.fn();

  it("asks the browser only when tapped, then opens and remembers the nearest city", async () => {
    answer = {coords: {latitude: pune.latitude + 0.03, longitude: pune.longitude}};
    openMenu();
    await waitFor(() => expect(onChoose).toHaveBeenCalledWith("pune"));
    expect(getCurrentPosition).toHaveBeenCalledOnce();
    expect(readCityChoice()).toEqual({cityId: pune.id, slug: "pune", source: "precise"});
    expect(window.localStorage.getItem("catch_city_choice_v1")).not.toContain(String(pune.latitude).slice(0, 4));
  });

  it("offers every city when no listed city is near", async () => {
    answer = {coords: {latitude: 51.5, longitude: -0.12}};
    openMenu();
    expect(await screen.findByText(locate.otherTitle)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", {name: locate.otherAction}));
    expect(follow).toHaveBeenCalledWith("/cities/");
    expect(readCityChoice()).toBeNull();
  });

  it("says location is off when the browser refuses", async () => {
    answer = {error: 1};
    openMenu();
    expect(await screen.findByText(locate.deniedTitle)).toBeTruthy();
  });
});
