import type {Meta, StoryObj} from "@storybook/react-vite";
import type {ReactNode} from "react";
import {expect, userEvent, within} from "storybook/test";
import {HomePage} from "../features/home/HomePage";
import type {HomeCatalog} from "../features/home/homeTypes";
import {homeCatalogFixture, mumbaiLiveCatalog, puneLaunchingSoonCatalog} from "./fixtures/homeCatalogs";

const meta = {
  title: "Marketing Website/Homepage",
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

// Storybook has no server: city changes stay on the story.
const stay = () => undefined;
const page = (catalog: HomeCatalog, width: 390 | 1280) => <Width width={width}><HomePage catalog={catalog} navigate={stay} /></Width>;

/** Mumbai live on a 1280px page, as the WebHomeV2 board's mumbai_live state. */
export const MumbaiLive1280: Story = {
  name: "Mumbai live · 1280",
  parameters: {
    catchRoute: {id: "home", path: "/", reviewStates: ["mumbai-live", "launching-soon", "thin-city", "catalog-unavailable", "format-filter", "city-picker"],
      stateCoverage: {storybook: ["mumbai-live", "launching-soon", "thin-city", "catalog-unavailable", "format-filter", "city-picker"], manual: []}},
    catchComponent: {id: "route_home", routeIds: ["home"], states: ["mumbai-live"]},
  },
  render: () => page(mumbaiLiveCatalog, 1280),
};

/** Mumbai live on a 390px page. */
export const MumbaiLive390: Story = {
  name: "Mumbai live · 390",
  parameters: {catchComponent: {id: "home_page_sections", routeIds: ["home"], states: ["phone-live"]}},
  render: () => page(mumbaiLiveCatalog, 390),
};

/** Pune launching soon on a 1280px page, as the board's launching_soon state. */
export const LaunchingSoon1280: Story = {
  name: "Pune launching soon · 1280",
  parameters: {catchComponent: {id: "route_home", routeIds: ["home"], states: ["launching-soon"]}},
  render: () => page(puneLaunchingSoonCatalog, 1280),
};

/** Pune launching soon on a 390px page. */
export const LaunchingSoon390: Story = {
  name: "Pune launching soon · 390",
  parameters: {catchComponent: {id: "home_page_sections", routeIds: ["home"], states: ["phone-launching-soon"]}},
  render: () => page(puneLaunchingSoonCatalog, 390),
};

/** A launched city with too few plans reads as launching soon, never a sparse page. */
export const ThinCity: Story = {
  name: "Indore, too few plans · 1280",
  parameters: {catchComponent: {id: "route_home", routeIds: ["home"], states: ["thin-city"]}},
  render: () => page(homeCatalogFixture("indore"), 1280),
};

/** Nothing could be read: the live city stays live and says so. */
export const CatalogUnavailable: Story = {
  name: "Mumbai, plans unavailable · 1280",
  parameters: {catchComponent: {id: "route_home", routeIds: ["home"], states: ["catalog-unavailable"]}},
  render: () => page({...mumbaiLiveCatalog, phase: "unavailable", plans: {...mumbaiLiveCatalog.plans, plans: [], organizers: []}}, 1280),
};

/** A format tile filters the week; the city picker lists every city with its status. */
export const FormatFilterAndCityPicker: Story = {
  name: "Format filter and city picker · 1280",
  parameters: {catchComponent: {id: "route_home", routeIds: ["home"], states: ["format-filter", "city-picker"]}},
  render: () => page(mumbaiLiveCatalog, 1280),
  play: async ({canvasElement}) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", {name: /3 this week.*Games and quizzes/}));
    await expect(canvas.getByText("Showing 3 of 3 this week · Games and quizzes")).toBeInTheDocument();
    await userEvent.click(canvas.getByRole("button", {name: "Mumbai"}));
    await expect(within(canvasElement.ownerDocument.body).getByRole("option", {name: /Pune/})).toBeInTheDocument();
  },
};
