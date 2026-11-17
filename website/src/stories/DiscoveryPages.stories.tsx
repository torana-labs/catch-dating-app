import type {Meta, StoryObj} from "@storybook/react-vite";
import type {ReactNode} from "react";
import {MemoryRouter} from "react-router";
import {expect, within} from "storybook/test";
import {CityFormatPage} from "../features/discovery/CityFormatPage";
import {mumbaiDiscoveryCatalog, mumbaiQuietCatalog} from "../features/discovery/discoveryCatalogFixtures";
import type {DiscoveryFormatKey} from "../features/discovery/discoveryTypes";
import {NewToCityPage} from "../features/discovery/NewToCityPage";
import type {HomeCatalog} from "../features/home/homeTypes";
import {mumbaiLiveCatalog} from "./fixtures/homeCatalogs";

/**
 * The redesign's guest discovery pages, bound to a city's cityPlans read
 * model: /<city>/<format>/ (PlaybookCityFormat) above and below the
 * indexing bar, and /new-to-<city>/ (PlaybookNewToCity): the city_format
 * and new_to_city routes in design/website/routes.json.
 */
const meta = {
  title: "Marketing Website/Discovery pages",
  parameters: {
    a11y: {test: "error"},
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

const cityFormat = (catalog: HomeCatalog, format: DiscoveryFormatKey, url: string, width: 390 | 1280 = 1280) => (
  <MemoryRouter initialEntries={[url]}><Width width={width}><CityFormatPage catalog={catalog} format={format} /></Width></MemoryRouter>
);
const newToCity = (catalog: HomeCatalog, width: 390 | 1280 = 1280) => (
  <MemoryRouter initialEntries={["/new-to-mumbai/"]}><Width width={width}><NewToCityPage catalog={catalog} /></Width></MemoryRouter>
);

/** Run clubs in Mumbai, above the bar: the backend's counts, the runs, the clubs, first time, questions and the capture. */
export const CityFormatIndexed: Story = {
  name: "/mumbai/run-clubs/ · indexed · 1280",
  parameters: {
    catchRoute: {id: "city_format", reviewStates: ["indexed", "phone", "below-the-bar", "unavailable", "not-found"],
      stateCoverage: {storybook: ["indexed", "phone", "below-the-bar", "unavailable"], manual: ["not-found"]}},
  },
  render: () => cityFormat(mumbaiDiscoveryCatalog, "runClubs", "/mumbai/run-clubs/"),
  play: async ({canvasElement}) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("heading", {level: 1, name: "Run clubs in Mumbai"})).toBeInTheDocument();
    await expect(canvas.getByText("runs in the next 30 days")).toBeInTheDocument();
  },
};

/** The indexed page on a 390px page. */
export const CityFormatIndexed390: Story = {
  name: "/mumbai/run-clubs/ · indexed · 390",
  render: () => cityFormat(mumbaiDiscoveryCatalog, "runClubs", "/mumbai/run-clubs/", 390),
};

/** Pickleball in Mumbai, below the bar: noindex, what is here so far and what else is popular. */
export const CityFormatThin: Story = {
  name: "/mumbai/pickleball/ · below the bar · 1280",
  render: () => cityFormat(mumbaiDiscoveryCatalog, "pickleball", "/mumbai/pickleball/"),
};

/** A city read without its format pages: plans unavailable, no counts shown. */
export const CityFormatUnavailable: Story = {
  name: "/mumbai/run-clubs/ · unavailable · 1280",
  render: () => cityFormat(mumbaiLiveCatalog, "runClubs", "/mumbai/run-clubs/"),
};

/** New to Mumbai: this week's newcomer plans and the board's authored bands. */
export const NewToCity: Story = {
  name: "/new-to-mumbai/ · 1280",
  parameters: {
    catchRoute: {id: "new_to_city", reviewStates: ["page", "phone", "quiet-week"],
      stateCoverage: {storybook: ["page", "phone", "quiet-week"], manual: []}},
  },
  render: () => newToCity(mumbaiDiscoveryCatalog),
  play: async ({canvasElement}) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("heading", {level: 1, name: "Just moved? Your first friends here are at a table this week."})).toBeInTheDocument();
    await expect(canvas.queryByText(/came alone/iu)).toBeNull();
  },
};

/** New to Mumbai on a 390px page. */
export const NewToCity390: Story = {
  name: "/new-to-mumbai/ · 390",
  render: () => newToCity(mumbaiDiscoveryCatalog, 390),
};

/** A quiet week: the next two weeks' newcomer plans. */
export const NewToCityQuietWeek: Story = {
  name: "/new-to-mumbai/ · quiet week · 1280",
  render: () => newToCity(mumbaiQuietCatalog),
};
