import type {Meta, StoryObj} from "@storybook/react-vite";
import type {ReactNode} from "react";
import {MemoryRouter} from "react-router";
import {expect, userEvent, within} from "storybook/test";
import {ExplorePage} from "../features/home/ExplorePage";
import type {HomeCatalog} from "../features/home/homeTypes";
import {mumbaiEmptyMonthCatalog, mumbaiQuietCatalog} from "../features/discovery/discoveryCatalogFixtures";
import {homeCatalogFixture, mumbaiLiveCatalog, puneLaunchingSoonCatalog} from "./fixtures/homeCatalogs";

const meta = {
  title: "Marketing Website/Explore",
  parameters: {
    a11y: {test: "error"},
    catchComponentRegistry: {path: "design/website/components.json"},
    catchRouteContract: {path: "design/website/routes.json"},
    layout: "fullscreen",
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** The page at the board's widths: the bands' container queries read the frame. */
function Width({children, width}: {children: ReactNode; width: 390 | 1280}) {
  return <div style={{margin: "0 auto", width}}>{children}</div>;
}

const page = (catalog: HomeCatalog, url: string, width: 390 | 1280 = 1280) => (
  <MemoryRouter initialEntries={[url]}><Width width={width}><ExplorePage catalog={catalog} /></Width></MemoryRouter>
);

/** Mumbai's city page: the plans for the next two weeks, then who runs them. */
export const CityPlans: Story = {
  name: "/mumbai/ · plans · 1280",
  parameters: {
    catchRoute: {id: "visitor_discovery", path: "/explore/", reviewStates: ["city-plans", "phone", "search-and-filters", "organisers", "launching-soon", "no-results", "catalog-unavailable"],
      stateCoverage: {storybook: ["city-plans", "phone", "search-and-filters", "organisers", "launching-soon", "no-results", "catalog-unavailable"], manual: []}},
    catchComponent: {id: "route_visitor_discovery", routeIds: ["visitor_discovery"], states: ["city-plans"]},
  },
  render: () => page(mumbaiLiveCatalog, "/mumbai/"),
};

/** The city page on a 390px page. */
export const CityPlans390: Story = {
  name: "/mumbai/ · plans · 390",
  parameters: {catchComponent: {id: "explore_page_sections", routeIds: ["visitor_discovery"], states: ["phone"]}},
  render: () => page(mumbaiLiveCatalog, "/mumbai/", 390),
};

/** A quiet week: nothing in the next seven days, so the next two weeks, the hosts to follow and the WhatsApp capture. */
export const QuietWeek: Story = {
  name: "/mumbai/ · quiet week · 1280",
  render: () => page(mumbaiQuietCatalog, "/mumbai/"),
};

/** The quiet week on a 390px page. */
export const QuietWeek390: Story = {
  name: "/mumbai/ · quiet week · 390",
  render: () => page(mumbaiQuietCatalog, "/mumbai/", 390),
};

/** Nothing in the next 30 days: the hosts and Get notified lead, and What's on leaves the header. */
export const EmptyWindow: Story = {
  name: "/mumbai/ · nothing on · 1280",
  render: () => page(mumbaiEmptyMonthCatalog, "/mumbai/"),
  play: async ({canvasElement}) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("heading", {level: 1, name: "Nothing on in Mumbai in the next two weeks."})).toBeInTheDocument();
    await expect(within(canvas.getByRole("banner")).queryByRole("link", {name: "What’s on"})).toBeNull();
  },
};

/** Search, format and date narrow the plans and stay in the URL. */
export const SearchAndFilters: Story = {
  name: "Search and filters · 1280",
  parameters: {catchComponent: {id: "route_visitor_discovery", routeIds: ["visitor_discovery"], states: ["search-and-filters"]}},
  render: () => page(mumbaiLiveCatalog, "/mumbai/?format=games&when=weekend"),
  play: async ({canvasElement}) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("2 plans")).toBeInTheDocument();
    await userEvent.click(canvas.getByRole("radio", {name: "Everything"}));
    await expect(canvas.getByText("6 plans")).toBeInTheDocument();
    await expect(canvas.getByRole("tab", {name: "Plans 6"})).toHaveAttribute("aria-selected", "true");
  },
};

/** The Organisers tab, where the old directory now lands. */
export const Organisers: Story = {
  name: "/explore/?show=organisers · 1280",
  parameters: {catchComponent: {id: "city_site_chrome", routeIds: ["visitor_discovery"], states: ["organisers-link"]}},
  render: () => page(mumbaiLiveCatalog, "/explore/?show=organisers"),
};

/** A city that has not opened: who is joining, and the live city meanwhile. */
export const LaunchingSoon: Story = {
  name: "/pune/ · launching soon · 1280",
  parameters: {catchComponent: {id: "route_visitor_discovery", routeIds: ["visitor_discovery"], states: ["launching-soon"]}},
  render: () => page(puneLaunchingSoonCatalog, "/pune/?show=organisers"),
};

/** Filters that match nothing offer to clear them. */
export const NoResults: Story = {
  name: "No results · 1280",
  parameters: {catchComponent: {id: "route_visitor_discovery", routeIds: ["visitor_discovery"], states: ["no-results"]}},
  render: () => page(mumbaiLiveCatalog, "/mumbai/?q=sailing"),
};

/** Nothing could be read: the page says so and keeps the filters. */
export const CatalogUnavailable: Story = {
  name: "Plans unavailable · 1280",
  parameters: {catchComponent: {id: "route_visitor_discovery", routeIds: ["visitor_discovery"], states: ["catalog-unavailable"]}},
  render: () => page({...homeCatalogFixture("mumbai"), phase: "unavailable"}, "/mumbai/"),
};
