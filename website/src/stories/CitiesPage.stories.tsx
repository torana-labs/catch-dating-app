import type {Meta, StoryObj} from "@storybook/react-vite";
import type {ReactNode} from "react";
import {MemoryRouter} from "react-router";
import {expect, userEvent, within} from "storybook/test";
import {CitiesPage} from "../features/home/CitiesPage";
import type {HomeCatalog} from "../features/home/homeTypes";
import {mumbaiLiveCatalog, twentyFiveCityCatalog, twoCityCatalog} from "./fixtures/homeCatalogs";

const meta = {
  title: "Marketing Website/Cities",
  parameters: {
    a11y: {test: "error"},
    catchComponentRegistry: {path: "design/website/components.json"},
    catchRouteContract: {path: "design/website/routes.json"},
    layout: "fullscreen",
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** The page at the review widths: the bands' container queries read the frame. */
function Width({children, width}: {children: ReactNode; width: 390 | 1440}) {
  return <div style={{margin: "0 auto", width}}>{children}</div>;
}

const page = (catalog: HomeCatalog, width: 390 | 1440 = 1440) => (
  <MemoryRouter initialEntries={["/cities/"]}><Width width={width}><CitiesPage catalog={catalog} /></Width></MemoryRouter>
);

/** Today's website: Mumbai and Indore open, four cities on the waitlist. */
export const Cities: Story = {
  name: "/cities/ · today · 1440",
  parameters: {
    catchRoute: {id: "cities", path: "/cities/", reviewStates: ["cities", "two-cities", "twenty-five-cities", "phone", "catalog-unavailable"],
      stateCoverage: {storybook: ["cities", "two-cities", "twenty-five-cities", "phone", "catalog-unavailable"], manual: []}},
    catchComponent: {id: "route_cities", routeIds: ["cities"], states: ["cities"]},
  },
  render: () => page(mumbaiLiveCatalog),
};

/** The smallest website: one open city and one on the waitlist. */
export const TwoCities: Story = {
  name: "/cities/ · 2 cities · 1440",
  parameters: {catchComponent: {id: "route_cities", routeIds: ["cities"], states: ["two-cities"]}},
  render: () => page(twoCityCatalog),
};

/** 25 cities in four countries; Nepal and the United States say launching soon once. */
export const TwentyFiveCities: Story = {
  name: "/cities/ · 25 cities · 1440",
  parameters: {catchComponent: {id: "route_cities", routeIds: ["cities"], states: ["twenty-five-cities"]}},
  render: () => page(twentyFiveCityCatalog),
  play: async ({canvasElement}) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Launching soon in Nepal")).toBeInTheDocument();
    await expect(canvas.queryByText("Launching soon in India")).toBeNull();
  },
};

/** 25 cities on a 390px page. */
export const TwentyFiveCities390: Story = {
  name: "/cities/ · 25 cities · 390",
  parameters: {catchComponent: {id: "cities_page_sections", routeIds: ["cities"], states: ["phone"]}},
  render: () => page(twentyFiveCityCatalog, 390),
};

/** 2 cities on a 390px page. */
export const TwoCities390: Story = {
  name: "/cities/ · 2 cities · 390",
  parameters: {catchComponent: {id: "cities_page_sections", routeIds: ["cities"], states: ["phone"]}},
  render: () => page(twoCityCatalog, 390),
};

/** Nothing could be read: the cities stay listed and the page says so. */
export const CatalogUnavailable: Story = {
  name: "/cities/ · unavailable · 1440",
  parameters: {catchComponent: {id: "route_cities", routeIds: ["cities"], states: ["catalog-unavailable"]}},
  render: () => page({...mumbaiLiveCatalog, phase: "unavailable"}),
};

/** The header picker with 25 cities: a sheet grouped by country, with search. */
export const PickerTwentyFiveCities: Story = {
  name: "City picker · 25 cities · 1440",
  parameters: {catchComponent: {id: "city_picker", routeIds: ["home", "visitor_discovery", "cities"], states: ["twenty-five-cities"]}},
  render: () => page(twentyFiveCityCatalog),
  play: async ({canvasElement}) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getAllByRole("button", {name: twentyFiveCityCatalog.selected.label})[0]);
    const sheet = within(canvasElement.ownerDocument.body);
    await expect(sheet.getByRole("searchbox")).toBeInTheDocument();
    await expect(sheet.getByRole("heading", {name: "Australia", level: 3})).toBeInTheDocument();
  },
};
